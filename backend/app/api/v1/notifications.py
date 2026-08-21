from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.notification import Notification, NotificationPreference

router = APIRouter()


@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    notifications = result.scalars().all()

    unread_count = (await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )).scalar() or 0

    return {
        "total": unread_count,
        "page": page,
        "page_size": page_size,
        "unread_count": unread_count,
        "notifications": [
            {
                "id": n.id,
                "type": n.notification_type,
                "title": n.title,
                "body": n.body,
                "is_read": n.is_read,
                "read_at": n.read_at,
                "reference_id": n.reference_id,
                "reference_type": n.reference_type,
                "action_url": n.action_url,
                "created_at": n.created_at,
            }
            for n in notifications
        ],
    }


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    from datetime import datetime, timezone
    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    await db.flush()
    return {"message": "Marked as read"}


@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime, timezone
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    await db.flush()
    return {"message": "All notifications marked as read"}


@router.get("/preferences")
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.user_id == current_user.id
        )
    )
    pref = result.scalar_one_or_none()

    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)
        await db.flush()

    return {
        "push_enabled": pref.push_enabled,
        "email_enabled": pref.email_enabled,
        "sms_enabled": pref.sms_enabled,
        "booking_reminders": pref.booking_reminders,
        "message_alerts": pref.message_alerts,
        "review_alerts": pref.review_alerts,
        "scam_report_updates": pref.scam_report_updates,
        "promotional_emails": pref.promotional_emails,
        "vacancy_alerts": pref.vacancy_alerts,
        "price_drop_alerts": pref.price_drop_alerts,
    }


@router.put("/preferences")
async def update_preferences(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.user_id == current_user.id
        )
    )
    pref = result.scalar_one_or_none()
    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)

    allowed = {
        "push_enabled", "email_enabled", "sms_enabled",
        "booking_reminders", "message_alerts", "review_alerts",
        "scam_report_updates", "promotional_emails",
        "vacancy_alerts", "price_drop_alerts",
    }
    for key, value in body.items():
        if key in allowed and isinstance(value, bool):
            setattr(pref, key, value)
    await db.flush()
    return {"message": "Preferences updated"}
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationPreference

# Map notification_type prefixes to the preference flag that controls them.
# Unknown types default to delivered (stored) — preferences only suppress.
TYPE_TO_PREF = {
    "booking": "booking_reminders",
    "viewing": "booking_reminders",
    "new_message": "message_alerts",
    "message": "message_alerts",
    "review": "review_alerts",
    "report": "scam_report_updates",
    "scam": "scam_report_updates",
    "vacancy": "vacancy_alerts",
    "price": "price_drop_alerts",
    "promo": "promotional_emails",
}


async def notify(
    db: AsyncSession,
    user_id: str,
    notification_type: str,
    title: str,
    body: str = None,
    reference_id: str = None,
    reference_type: str = None,
    action_url: str = None,
):
    pref_flag = None
    for prefix, flag in TYPE_TO_PREF.items():
        if notification_type.startswith(prefix):
            pref_flag = flag
            break
    if pref_flag:
        result = await db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user_id
            )
        )
        pref = result.scalar_one_or_none()
        if pref is not None and getattr(pref, pref_flag, True) is False:
            return None
    note = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        body=body,
        reference_id=reference_id,
        reference_type=reference_type,
        action_url=action_url,
    )
    db.add(note)
    return note
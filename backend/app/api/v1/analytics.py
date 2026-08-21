from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, timedelta, timezone, date
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_optional_user
from app.models.user import User
from app.models.property import Property, Room, OccupancyStatus
from app.models.analytics import (
    PropertyView, PropertyClick, PropertyCall,
    PropertyWhatsAppClick, OwnerAnalytics, SearchLog,
)

router = APIRouter()


@router.get("/property/{property_id}")
async def get_property_analytics(
    property_id: str,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    views_result = await db.execute(
        select(func.count(PropertyView.id)).where(
            PropertyView.property_id == property_id,
            PropertyView.created_at >= since,
        )
    )
    total_views = views_result.scalar() or 0

    clicks_result = await db.execute(
        select(func.count(PropertyClick.id)).where(
            PropertyClick.property_id == property_id,
            PropertyClick.created_at >= since,
        )
    )
    total_clicks = clicks_result.scalar() or 0

    calls_result = await db.execute(
        select(func.count(PropertyCall.id)).where(
            PropertyCall.property_id == property_id,
            PropertyCall.created_at >= since,
        )
    )
    total_calls = calls_result.scalar() or 0

    whatsapp_result = await db.execute(
        select(func.count(PropertyWhatsAppClick.id)).where(
            PropertyWhatsAppClick.property_id == property_id,
            PropertyWhatsAppClick.created_at >= since,
        )
    )
    total_whatsapp = whatsapp_result.scalar() or 0

    result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    prop = result.scalar_one_or_none()

    return {
        "property_id": property_id,
        "period_days": days,
        "total_views": total_views,
        "total_clicks": total_clicks,
        "total_calls": total_calls,
        "total_whatsapp_clicks": total_whatsapp,
        "vacant_rooms": prop.vacant_rooms if prop else 0,
        "total_rooms": prop.total_rooms if prop else 0,
        "occupancy_rate": prop.occupancy_rate if prop else 0,
    }


@router.get("/owner/dashboard")
async def get_owner_dashboard(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    properties_result = await db.execute(
        select(Property).where(
            Property.owner_id == current_user.id,
            Property.is_archived == False,
        )
    )
    properties = properties_result.scalars().all()
    property_ids = [p.id for p in properties]

    total_views = 0
    total_clicks = 0
    total_calls = 0
    total_bookings = 0

    if property_ids:
        views = await db.execute(
            select(func.count(PropertyView.id)).where(
                PropertyView.property_id.in_(property_ids),
                PropertyView.created_at >= since,
            )
        )
        total_views = views.scalar() or 0

        clicks = await db.execute(
            select(func.count(PropertyClick.id)).where(
                PropertyClick.property_id.in_(property_ids),
                PropertyClick.created_at >= since,
            )
        )
        total_clicks = clicks.scalar() or 0

    return {
        "period_days": days,
        "total_properties": len(properties),
        "total_views": total_views,
        "total_clicks": total_clicks,
        "total_calls": total_calls,
        "total_bookings": total_bookings,
        "properties": [
            {
                "id": p.id,
                "name": p.property_name,
                "type": p.property_type.value if hasattr(p.property_type, 'value') else p.property_type,
                "vacant_rooms": p.vacant_rooms,
                "total_rooms": p.total_rooms,
                "occupancy_rate": p.occupancy_rate,
                "total_views": p.total_views,
                "is_verified": p.status.value == "verified",
            }
            for p in properties
        ],
    }


@router.post("/track/view")
async def track_property_view(
    property_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    view = PropertyView(
        property_id=property_id,
        user_id=current_user.id if current_user else None,
    )
    db.add(view)

    await db.execute(
        Property.__table__.update().where(Property.id == property_id).values(
            total_views=Property.total_views + 1
        )
    )

    return {"message": "View tracked"}


@router.post("/track/click")
async def track_property_click(
    property_id: str,
    click_type: str = "phone",
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    click = PropertyClick(
        property_id=property_id,
        user_id=current_user.id if current_user else None,
        click_type=click_type,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(click)

    await db.execute(
        Property.__table__.update().where(Property.id == property_id).values(
            total_clicks=Property.total_clicks + 1
        )
    )

    return {"message": "Click tracked"}


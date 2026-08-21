from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_optional_user
from app.models.user import User
from app.models.ads import AdCampaign, AdImpression, AdClick, FeaturedListing
from app.models.property import Property, PropertyStatus
from app.models.payment import Payment, PaymentStatus
from app.services.safety_service import blacklist_exclusion, record_audit
from datetime import datetime, timezone, timedelta

router = APIRouter()


def _parse_date(value: str) -> datetime:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid ISO datetime: '{value}'",
        )
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@router.get("/featured")
async def get_featured_properties(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Property).join(
            FeaturedListing, Property.id == FeaturedListing.property_id
        ).where(
            FeaturedListing.is_active == True,
            FeaturedListing.expires_at > now,
            Property.is_active == True,
            Property.status == PropertyStatus.VERIFIED,
            blacklist_exclusion(),
        ).order_by(FeaturedListing.priority.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    props = result.scalars().all()

    return [
        {
            "id": p.id,
            "property_name": p.property_name,
            "property_type": p.property_type.value if hasattr(p.property_type, 'value') else p.property_type,
            "city": p.city,
            "county": p.county,
            "min_rent": p.min_rent,
            "max_rent": p.max_rent,
            "vacant_rooms": p.vacant_rooms,
            "has_verified_photos": p.has_verified_photos,
            "trust_score": p.trust_score,
            "average_rating": p.average_rating,
            "is_sponsored": True,
        }
        for p in props
    ]


@router.post("/campaigns", status_code=status.HTTP_201_CREATED)
async def create_ad_campaign(
    campaign_name: str,
    campaign_type: str,
    budget: float,
    start_date: str,
    end_date: str,
    target_url: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = AdCampaign(
        advertiser_id=current_user.id,
        campaign_name=campaign_name,
        campaign_type=campaign_type,
        target_url=target_url,
        budget=budget,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )
    db.add(campaign)
    await db.flush()

    return {"id": campaign.id, "message": "Campaign created"}


@router.get("/campaigns")
async def get_my_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AdCampaign).where(
            AdCampaign.advertiser_id == current_user.id
        ).order_by(AdCampaign.created_at.desc())
    )
    campaigns = result.scalars().all()

    return [
        {
            "id": c.id,
            "name": c.campaign_name,
            "type": c.campaign_type,
            "budget": c.budget,
            "spent": c.spent,
            "impressions": c.impressions,
            "clicks": c.clicks,
            "ctr": c.ctr,
            "status": c.status,
            "start_date": c.start_date,
            "end_date": c.end_date,
        }
        for c in campaigns
    ]


@router.post("/track/impression")
async def track_ad_impression(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    result = await db.execute(
        select(AdCampaign).where(AdCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.impressions = (campaign.impressions or 0) + 1
    impression = AdImpression(
        campaign_id=campaign_id,
        user_id=current_user.id if current_user else None,
    )
    db.add(impression)
    await db.flush()

    return {"message": "Impression tracked"}


@router.post("/track/click")
async def track_ad_click(
    campaign_id: str,
    impression_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    result = await db.execute(
        select(AdCampaign).where(AdCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.clicks = (campaign.clicks or 0) + 1
    campaign.ctr = round(
        (campaign.clicks or 0) / max(1, campaign.impressions or 0) * 100, 2
    )
    click = AdClick(
        campaign_id=campaign_id,
        impression_id=impression_id,
        user_id=current_user.id if current_user else None,
    )
    db.add(click)
    await db.flush()

    return {"message": "Click tracked"}


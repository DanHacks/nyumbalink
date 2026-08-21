from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.property import Property
from app.models.review import Review, ReviewCategory, ReviewMedia, PropertyHealthScore
from app.models.booking import Booking, BookingStatus

router = APIRouter()


class ReviewCreate(BaseModel):
    overall_rating: float = Field(..., ge=1, le=5)
    title: str = Field("", max_length=255)
    comment: str = Field("", max_length=3000)
    categories: dict = Field(default_factory=dict)
    is_anonymous: bool = False
    booking_id: Optional[str] = None


@router.post("/property/{property_id}", status_code=status.HTTP_201_CREATED)
async def create_review(
    property_id: str,
    request: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    existing = await db.execute(
        select(Review).where(
            Review.property_id == property_id,
            Review.tenant_id == current_user.id,
            Review.is_active == True,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reviewed this property.",
        )

    is_verified_tenant = False
    booking_id = request.booking_id
    if booking_id:
        booking_result = await db.execute(
            select(Booking).where(
                Booking.id == booking_id,
                Booking.tenant_id == current_user.id,
                Booking.property_id == property_id,
            )
        )
        booking = booking_result.scalar_one_or_none()
        if booking and booking.status in (
            BookingStatus.CHECKED_IN, BookingStatus.COMPLETED,
        ):
            is_verified_tenant = True
    else:
        visit_result = await db.execute(
            select(Booking.id).where(
                Booking.tenant_id == current_user.id,
                Booking.property_id == property_id,
                Booking.status == BookingStatus.CHECKED_IN,
            ).limit(1)
        )
        is_verified_tenant = visit_result.scalar_one_or_none() is not None

    review = Review(
        tenant_id=current_user.id,
        property_id=property_id,
        booking_id=booking_id,
        overall_rating=request.overall_rating,
        title=request.title,
        comment=request.comment,
        is_verified_tenant=is_verified_tenant,
        is_anonymous=request.is_anonymous,
    )
    db.add(review)
    await db.flush()

    for cat_name, cat_rating in request.categories.items():
        if isinstance(cat_rating, (int, float)) and 0 <= cat_rating <= 5:
            db.add(ReviewCategory(
                review_id=review.id,
                category=cat_name,
                rating=float(cat_rating),
            ))

    rating_result = await db.execute(
        select(func.avg(Review.overall_rating)).where(
            Review.property_id == property_id,
            Review.is_active == True,
        )
    )
    avg = rating_result.scalar()
    if avg is not None:
        prop.average_rating = round(float(avg), 2)

    return {
        "id": review.id,
        "is_verified_tenant": is_verified_tenant,
        "message": "Review created" + (" (verified review)" if is_verified_tenant else " (community review)"),
    }


@router.get("/property/{property_id}")
async def get_property_reviews(
    property_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Review)
        .where(
            Review.property_id == property_id,
            Review.is_active == True,
        )
        .options(selectinload(Review.tenant), selectinload(Review.categories))
        .order_by(Review.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    reviews = result.scalars().all()

    avg_result = await db.execute(
        select(func.avg(Review.overall_rating), func.count(Review.id)).where(
            Review.property_id == property_id,
            Review.is_active == True,
        )
    )
    avg_rating, total = avg_result.first()

    verified_count = await db.execute(
        select(func.count(Review.id)).where(
            Review.property_id == property_id,
            Review.is_active == True,
            Review.is_verified_tenant == True,
        )
    )

    return {
        "total": total or 0,
        "average_rating": float(avg_rating) if avg_rating else 0,
        "verified_review_count": verified_count.scalar() or 0,
        "page": page,
        "page_size": page_size,
        "reviews": [
            {
                "id": r.id,
                "tenant_name": r.tenant.full_name if r.tenant and not r.is_anonymous else "Verified tenant",
                "overall_rating": r.overall_rating,
                "title": r.title,
                "comment": r.comment,
                "categories": {c.category: c.rating for c in r.categories},
                "is_verified_tenant": r.is_verified_tenant,
                "created_at": r.created_at,
            }
            for r in reviews
        ],
    }


@router.get("/health/{property_id}")
async def get_property_health_score(
    property_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PropertyHealthScore).where(
            PropertyHealthScore.property_id == property_id
        )
    )
    score = result.scalar_one_or_none()

    if not score:
        return {
            "property_id": property_id,
            "message": "Health score not yet calculated",
        }

    return {
        "property_id": score.property_id,
        "water": score.water_score,
        "road": score.road_score,
        "security": score.security_score,
        "internet": score.internet_score,
        "parking": score.parking_score,
        "noise": score.noise_score,
        "cleanliness": score.cleanliness_score,
        "lighting": score.lighting_score,
        "accessibility": score.accessibility_score,
        "overall": score.overall_score,
        "total_reviews": score.total_reviews,
        "calculated_at": score.calculated_at,
    }
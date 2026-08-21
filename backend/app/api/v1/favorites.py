from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.property import Property, PropertyStatus
from app.models.trust import Favorite
from app.services.safety_service import blacklist_exclusion

router = APIRouter()


@router.get("")
async def list_favorites(
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Favorite, Property)
        .join(Property, Favorite.property_id == Property.id)
        .where(
            Favorite.user_id == current_user.id,
            Property.is_active == True,
            Property.is_archived == False,
            Property.status == PropertyStatus.VERIFIED,
            blacklist_exclusion(),
        )
        .order_by(Favorite.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    rows = result.all()

    count_result = await db.execute(
        select(func.count(Favorite.id)).where(Favorite.user_id == current_user.id)
    )

    return {
        "total": count_result.scalar() or 0,
        "page": page,
        "page_size": page_size,
        "favorites": [
            {
                "favorited_at": fav.created_at,
                "property": {
                    "id": prop.id,
                    "property_name": prop.property_name,
                    "property_code": prop.property_code,
                    "city": prop.city,
                    "county": prop.county,
                    "min_rent": prop.min_rent,
                    "max_rent": prop.max_rent,
                    "currency": prop.currency,
                    "vacant_rooms": prop.vacant_rooms,
                    "total_rooms": prop.total_rooms,
                    "has_verified_photos": prop.has_verified_photos,
                    "has_video": prop.has_video,
                    "trust_score": prop.trust_score,
                    "average_rating": prop.average_rating,
                    "latitude": prop.latitude,
                    "longitude": prop.longitude,
                    "is_featured": prop.is_featured,
                },
            }
            for fav, prop in rows
        ],
    }


@router.post("/{property_id}", status_code=status.HTTP_201_CREATED)
async def add_favorite(
    property_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Property).where(
            Property.id == property_id,
            Property.status == PropertyStatus.VERIFIED,
            blacklist_exclusion(),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Property not found")

    existing = await db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.property_id == property_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Already in favorites"}

    db.add(Favorite(user_id=current_user.id, property_id=property_id))
    await db.flush()
    return {"message": "Added to favorites"}


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    property_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        delete(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.property_id == property_id,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    await db.flush()
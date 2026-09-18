from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, String, cast
from sqlalchemy.orm import selectinload
from geoalchemy2 import Geography
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import get_optional_user
from app.models.user import User
from app.models.property import Property, Room, PropertyStatus, OccupancyStatus
from app.services.safety_service import blacklist_exclusion
from app.services.location_service import visible_coordinates

router = APIRouter()

PRICE_BANDS = {
    "budget": "Below median rent",
    "standard": "Median rent",
    "upscale": "Above median rent",
    "luxury": "Top 10% rent",
}


@router.get("/smart")
async def smart_search(
    q: str = "",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_km: float = 5,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    property_type: Optional[str] = None,
    house_type: Optional[str] = None,
    pet_friendly: Optional[bool] = None,
    student_friendly: Optional[bool] = None,
    parking: Optional[bool] = None,
    internet: Optional[bool] = None,
    water: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    query = select(Room).join(Property, Room.property_id == Property.id).where(
        Property.status == PropertyStatus.VERIFIED,
        Property.is_active == True,
        Property.is_archived == False,
        blacklist_exclusion(),
        Room.occupancy_status == OccupancyStatus.VACANT,
        Room.is_active == True,
    )

    if q:
        search_terms = q.split()
        filters = []
        for term in search_terms:
            term_filter = or_(
                Property.property_name.ilike(f"%{term}%"),
                Property.description.ilike(f"%{term}%"),
                Property.city.ilike(f"%{term}%"),
                Property.county.ilike(f"%{term}%"),
                Property.landmark.ilike(f"%{term}%"),
                Room.room_number.ilike(f"%{term}%"),
                cast(Room.house_type, String).ilike(f"%{term}%"),
            )
            filters.append(term_filter)
        query = query.where(and_(*filters))

    if lat is not None and lon is not None and radius_km:
        point = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
        query = query.where(
            func.ST_DWithin(
                Property.location.cast(Geography),
                point.cast(Geography),
                radius_km * 1000,
            )
        )

    if min_price is not None:
        query = query.where(Room.rent_amount >= min_price)
    if max_price is not None:
        query = query.where(Room.rent_amount <= max_price)
    if property_type:
        query = query.where(Property.property_type == property_type)
    if house_type:
        query = query.where(cast(Room.house_type, String).ilike(f"%{house_type}%"))
    if pet_friendly is not None:
        query = query.where(Room.pet_friendly == pet_friendly)
    if student_friendly is not None:
        query = query.where(Room.student_friendly == student_friendly)
    if parking is not None:
        query = query.where(Room.parking_available == parking)
    if internet is not None:
        query = query.where(Room.internet_available == internet)
    if water is not None:
        query = query.where(Room.water_available == water)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.options(
        selectinload(Room.building),
        selectinload(Room.floor),
        selectinload(Room.property_rel),
    )
    query = query.order_by(Room.rent_amount.asc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rooms = result.scalars().all()

    results = []
    for room in rooms:
        prop = room.property_rel
        lat_out, lon_out, visibility = None, None, None
        if prop and prop.latitude is not None and prop.longitude is not None:
            lat_out, lon_out, visibility = await visible_coordinates(db, prop, current_user)
        results.append({
            "id": room.id,
            "property_id": room.property_id,
            "room_number": room.room_number,
            "house_type": room.house_type.value if hasattr(room.house_type, 'value') else room.house_type,
            "rent_amount": room.rent_amount,
            "currency": room.currency,
            "property_name": prop.property_name if prop else None,
            "building_name": room.building.building_name if room.building else None,
            "floor_number": room.floor.floor_number if room.floor else None,
            "city": prop.city if prop else None,
            "county": prop.county if prop else None,
            "latitude": lat_out,
            "longitude": lon_out,
            "location_visibility": visibility,
            "pet_friendly": room.pet_friendly,
            "student_friendly": room.student_friendly,
            "parking_available": room.parking_available,
            "internet_available": room.internet_available,
            "water_available": room.water_available,
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "query": q,
        "results": results,
    }


@router.get("/price-categories")
async def price_categories(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Classify the rent market into budget/standard/upscale/luxury bands."""
    rents_result = await db.execute(
        select(func.percentile_cont(0.5).within_group(Room.rent_amount.asc())).join(
            Property, Room.property_id == Property.id
        ).where(
            Property.status == PropertyStatus.VERIFIED,
            Property.is_active == True,
            blacklist_exclusion(),
            Room.is_active == True,
            Room.occupancy_status == OccupancyStatus.VACANT,
        )
    )
    median = rents_result.scalar()

    p90_result = await db.execute(
        select(func.percentile_cont(0.9).within_group(Room.rent_amount.asc())).join(
            Property, Room.property_id == Property.id
        ).where(
            Property.status == PropertyStatus.VERIFIED,
            Property.is_active == True,
            blacklist_exclusion(),
            Room.is_active == True,
            Room.occupancy_status == OccupancyStatus.VACANT,
        )
    )
    p90 = p90_result.scalar()

    bands_result = await db.execute(
        select(
            func.count(Room.id),
            func.avg(Room.rent_amount),
        ).join(
            Property, Room.property_id == Property.id
        ).where(
            Property.status == PropertyStatus.VERIFIED,
            Property.is_active == True,
            blacklist_exclusion(),
            Room.is_active == True,
            Room.occupancy_status == OccupancyStatus.VACANT,
        )
    )
    total, avg_rent = bands_result.first()

    async def band_count(cond):
        sub = select(func.count(Room.id)).join(
            Property, Room.property_id == Property.id
        ).where(
            Property.status == PropertyStatus.VERIFIED,
            Property.is_active == True,
            blacklist_exclusion(),
            Room.is_active == True,
            Room.occupancy_status == OccupancyStatus.VACANT,
            cond,
        )
        return (await db.execute(sub)).scalar() or 0

    if not median:
        return {
            "currency": "KES",
            "median_rent": None,
            "p90_rent": None,
            "total_rooms": 0,
            "categories": [],
        }

    budget_count = await band_count(Room.rent_amount < median)
    standard_count = await band_count((Room.rent_amount >= median) & (Room.rent_amount < p90))
    upscale_count = await band_count(Room.rent_amount >= p90)

    return {
        "currency": "KES",
        "median_rent": round(float(median), 2),
        "p90_rent": round(float(p90), 2) if p90 else None,
        "average_rent": round(float(avg_rent), 2) if avg_rent else None,
        "total_rooms": total or 0,
        "categories": [
            {
                "name": "budget",
                "label": PRICE_BANDS["budget"],
                "count": budget_count,
            },
            {
                "name": "standard",
                "label": PRICE_BANDS["standard"],
                "count": standard_count,
            },
            {
                "name": "upscale",
                "label": PRICE_BANDS["upscale"],
                "count": upscale_count,
            },
            {
                "name": "luxury",
                "label": PRICE_BANDS["luxury"],
                "count": max(0, (total or 0) - budget_count - standard_count - upscale_count),
            },
        ],
    }


@router.get("/autocomplete")
async def autocomplete(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
):
    if not q:
        return {"suggestions": []}

    property_result = await db.execute(
        select(Property.property_name).where(
            Property.property_name.ilike(f"%{q}%"),
            Property.status == PropertyStatus.VERIFIED,
            Property.is_active == True,
            blacklist_exclusion(),
        ).distinct().limit(5)
    )
    properties = [row[0] for row in property_result.all()]

    city_result = await db.execute(
        select(Property.city).where(
            Property.city.ilike(f"%{q}%"),
            Property.status == PropertyStatus.VERIFIED,
            Property.is_active == True,
            Property.is_archived == False,
            blacklist_exclusion(),
        ).distinct().limit(5)
    )
    cities = [row[0] for row in city_result.all()]

    county_result = await db.execute(
        select(Property.county).where(
            Property.county.ilike(f"%{q}%"),
            Property.status == PropertyStatus.VERIFIED,
            Property.is_active == True,
            Property.is_archived == False,
            blacklist_exclusion(),
        ).distinct().limit(5)
    )
    counties = [row[0] for row in county_result.all()]

    landmark_result = await db.execute(
        select(Property.landmark).where(
            Property.landmark.ilike(f"%{q}%"),
            Property.landmark.is_not(None),
            Property.status == PropertyStatus.VERIFIED,
            Property.is_active == True,
            Property.is_archived == False,
            blacklist_exclusion(),
        ).distinct().limit(5)
    )
    landmarks = [row[0] for row in landmark_result.all()]

    return {
        "suggestions": {
            "properties": properties,
            "cities": cities,
            "counties": counties,
            "landmarks": landmarks,
        }
    }

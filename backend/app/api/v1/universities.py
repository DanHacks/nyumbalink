from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, cast, String
from sqlalchemy.orm import selectinload
from geoalchemy2 import Geography

from app.core.database import get_db
from app.core.dependencies import get_optional_user, get_current_admin
from app.models.user import User
from app.models.university import University, Campus
from app.models.property import Property, Room, PropertyStatus, OccupancyStatus, RoomAmenity
from app.services.safety_service import blacklist_exclusion

router = APIRouter()

DEFAULT_RADIUS_KM = 5.0


def _university_dict(u: University) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "short_name": u.short_name,
        "county": u.county,
        "city": u.city,
        "logo_url": u.logo_url,
        "latitude": u.latitude,
        "longitude": u.longitude,
        "campuses": [
            {
                "id": c.id,
                "name": c.name,
                "city": c.city,
                "address": c.address,
                "latitude": c.latitude,
                "longitude": c.longitude,
                "student_population": c.student_population,
            }
            for c in (u.campuses or [])
            if c.is_active
        ],
    }


@router.get("")
async def list_universities(
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(University).where(University.is_active == True)
    if q:
        query = query.where(
            or_(
                University.name.ilike(f"%{q}%"),
                University.short_name.ilike(f"%{q}%"),
                University.county.ilike(f"%{q}%"),
            )
        )
    query = query.order_by(University.name.asc())
    result = await db.execute(query)
    return {"universities": [_university_dict(u) for u in result.scalars().unique().all()]}


@router.get("/{university_id}")
async def get_university(
    university_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(University).where(
            University.id == university_id,
            University.is_active == True,
        )
    )
    uni = result.scalar_one_or_none()
    if not uni:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found")
    return _university_dict(uni)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_university(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="name is required",
        )
    lat = payload.get("latitude")
    lon = payload.get("longitude")
    uni = University(
        name=name,
        short_name=payload.get("short_name"),
        county=payload.get("county"),
        city=payload.get("city"),
        website=payload.get("website"),
        logo_url=payload.get("logo_url"),
        latitude=lat,
        longitude=lon,
    )
    if lat is not None and lon is not None:
        uni.location = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
    db.add(uni)
    await db.flush()
    return _university_dict(uni)


@router.post("/{university_id}/campuses", status_code=status.HTTP_201_CREATED)
async def create_campus(
    university_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(University).where(University.id == university_id)
    )
    uni = result.scalar_one_or_none()
    if not uni:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found")

    name = (payload.get("name") or "").strip()
    lat = payload.get("latitude")
    lon = payload.get("longitude")
    if not name or lat is None or lon is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="name, latitude and longitude are required",
        )

    campus = Campus(
        university_id=university_id,
        name=name,
        city=payload.get("city") or uni.city,
        address=payload.get("address"),
        latitude=float(lat),
        longitude=float(lon),
        student_population=payload.get("student_population"),
    )
    campus.location = func.ST_SetSRID(func.ST_MakePoint(float(lon), float(lat)), 4326)
    db.add(campus)
    await db.flush()
    return {
        "id": campus.id,
        "university_id": campus.university_id,
        "name": campus.name,
        "city": campus.city,
        "address": campus.address,
        "latitude": campus.latitude,
        "longitude": campus.longitude,
        "student_population": campus.student_population,
    }


@router.get("/campuses/{campus_id}/nearby-accommodation")
async def nearby_student_accommodation(
    campus_id: str,
    radius_km: float = Query(DEFAULT_RADIUS_KM, gt=0, le=50),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    house_type: Optional[str] = None,
    gender_restriction: Optional[str] = None,
    wifi: Optional[bool] = None,
    water: Optional[bool] = None,
    security: Optional[bool] = None,
    furnished: Optional[bool] = None,
    meals: Optional[bool] = None,
    laundry: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Uber-style student discovery: University → Campus → nearby available rooms."""
    result = await db.execute(
        select(Campus).where(Campus.id == campus_id, Campus.is_active == True)
    )
    campus = result.scalar_one_or_none()
    if not campus:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campus not found")

    query = (
        select(Room, Property, func.ST_Distance(
            Property.location.cast(Geography),
            campus.location.cast(Geography),
        ).label("distance_m"))
        .join(Property, Room.property_id == Property.id)
        .where(
            Property.status == PropertyStatus.VERIFIED,
            Property.is_active == True,
            Property.is_archived == False,
            blacklist_exclusion(),
            Room.occupancy_status == OccupancyStatus.VACANT,
            Room.is_active == True,
            func.ST_DWithin(
                Property.location.cast(Geography),
                campus.location.cast(Geography),
                radius_km * 1000,
            ),
        )
    )

    if min_price is not None:
        query = query.where(Room.rent_amount >= min_price)
    if max_price is not None:
        query = query.where(Room.rent_amount <= max_price)
    if house_type:
        query = query.where(cast(Room.house_type, String).ilike(f"%{house_type}%"))
    if gender_restriction:
        query = query.where(
            or_(
                Room.gender_restriction == gender_restriction,
                Room.gender_restriction == "any",
                Room.gender_restriction.is_(None),
            )
        )
    if wifi is not None:
        query = query.where(Room.internet_available == wifi)
    if water is not None:
        query = query.where(Room.water_available == water)
    if security is not None:
        query = query.where(Room.security_available == security)
    if furnished is not None:
        query = query.where(
            Room.furnishing == "furnished" if furnished else Room.furnishing != "furnished"
        )

    def amenity_exists(name: str):
        sub = select(RoomAmenity.id).where(
            RoomAmenity.room_id == Room.id,
            RoomAmenity.amenity_name.ilike(name),
        ).exists()
        return sub

    if meals is not None:
        cond = amenity_exists("meals")
        query = query.where(cond if meals else ~cond)
    if laundry is not None:
        cond = amenity_exists("laundry")
        query = query.where(cond if laundry else ~cond)

    count_query = select(func.count()).select_from(
        query.order_by(None).subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.options(
        selectinload(Room.building),
        selectinload(Room.floor),
    )
    query = query.order_by(Room.rent_amount.asc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rows = result.unique().all()

    results = []
    for room, prop, distance_m in rows:
        results.append({
            "id": room.id,
            "room_number": room.room_number,
            "house_type": room.house_type.value if hasattr(room.house_type, "value") else room.house_type,
            "rent_amount": room.rent_amount,
            "currency": room.currency,
            "property_name": prop.property_name,
            "property_id": prop.id,
            "city": prop.city,
            "county": prop.county,
            "latitude": prop.latitude,
            "longitude": prop.longitude,
            "distance_km": round(float(distance_m) / 1000, 2) if distance_m is not None else None,
            "gender_restriction": getattr(room, "gender_restriction", None),
            "student_friendly": room.student_friendly,
            "internet_available": room.internet_available,
            "water_available": room.water_available,
            "security_available": getattr(room, "security_available", None),
        })

    return {
        "campus": {
            "id": campus.id,
            "name": campus.name,
            "latitude": campus.latitude,
            "longitude": campus.longitude,
        },
        "total": total,
        "page": page,
        "page_size": page_size,
        "radius_km": radius_km,
        "results": results,
    }

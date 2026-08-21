from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_optional_user
from app.models.property import Property, PropertyNearbyPlace, PropertyStatus, PropertyType, Room
from app.models.user import User
from app.models.media import VerificationPhoto, VerificationStatus
from app.models.trust import PropertyBlacklist, BlacklistState
from app.services.location_service import visible_coordinates
from app.services.media_service import build_media_url
from app.services.safety_service import blacklist_exclusion

router = APIRouter()

HOUSE_TYPE_LABELS = {
    "bedsitter": "Bedsitter",
    "one_bedroom": "1 Bedroom",
    "two_bedroom": "2 Bedroom",
    "three_bedroom": "3 Bedroom",
    "four_bedroom": "4 Bedroom",
    "studio": "Studio",
    "single_room": "Single Room",
    "shared": "Shared",
    "duplex": "Duplex",
    "maisonette": "Maisonette",
    "villa": "Villa",
    "townhouse": "Townhouse",
}

KIND_BY_TYPE = {
    "house": "rental",
    "apartment": "apartment",
    "hostel": "hostel",
    "guest_house": "guest_house",
    "airbnb": "airbnb",
    "commercial": "commercial",
}


def _label(htype) -> str:
    value = htype.value if hasattr(htype, "value") else htype
    return HOUSE_TYPE_LABELS.get(value, str(value).replace("_", " ").title())


@router.get("/nearby/{property_id}")
async def get_nearby_places(
    property_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    prop = result.scalar_one_or_none()

    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    places_result = await db.execute(
        select(PropertyNearbyPlace).where(
            PropertyNearbyPlace.property_id == property_id
        )
    )
    places = places_result.scalars().all()

    return {
        "property_id": property_id,
        "latitude": prop.latitude,
        "longitude": prop.longitude,
        "places": [
            {
                "type": p.place_type,
                "name": p.place_name,
                "distance_km": p.distance_km,
                "latitude": p.latitude,
                "longitude": p.longitude,
            }
            for p in places
        ],
    }


@router.get("/properties-in-bounds")
async def get_properties_in_bounds(
    south: float = Query(...),
    west: float = Query(...),
    north: float = Query(...),
    east: float = Query(...),
    zoom: Optional[int] = Query(None, ge=0, le=22),
    property_type: Optional[str] = None,
    house_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    available_only: bool = False,
    verified_only: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    request: Request = None,
):
    bbox = func.ST_MakeEnvelope(west, south, east, north, 4326)

    query = select(Property).where(
        Property.is_active == True,
        Property.is_archived == False,
        Property.status == PropertyStatus.VERIFIED,
        func.ST_Within(Property.location, bbox),
        blacklist_exclusion(),
    )

    if property_type:
        query = query.where(Property.property_type == property_type)
    if min_price is not None:
        query = query.where(Property.max_rent >= min_price)
    if max_price is not None:
        query = query.where(Property.min_rent <= max_price)
    if available_only:
        query = query.where(Property.vacant_rooms > 0)

    query = query.order_by(Property.is_featured.desc(), Property.trust_score.desc())

    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar() or 0

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    properties = result.scalars().all()

    property_ids = [p.id for p in properties]
    house_types: dict = {}
    if property_ids:
        rooms_result = await db.execute(
            select(Room.property_id, Room.house_type).where(
                Room.property_id.in_(property_ids),
                Room.is_active == True,
            )
        )
        for pid, htype in rooms_result.all():
            if pid not in house_types:
                house_types[pid] = htype.value if hasattr(htype, "value") else htype

    photo_urls: dict = {}
    if property_ids:
        photo_result = await db.execute(
            select(VerificationPhoto.property_id, VerificationPhoto.storage_url)
            .where(
                VerificationPhoto.property_id.in_(property_ids),
                VerificationPhoto.verification_status == VerificationStatus.APPROVED,
                VerificationPhoto.is_replacement == False,
            )
            .order_by(VerificationPhoto.created_at.asc())
        )
        seen = set()
        for pid, url in photo_result.all():
            if pid in seen:
                continue
            seen.add(pid)
            photo_urls[pid] = build_media_url(url, request)

    items = []
    for p in properties:
        lat, lon, visibility = await visible_coordinates(db, p, current_user)
        ptype = p.property_type.value if hasattr(p.property_type, "value") else p.property_type
        items.append({
            "id": p.id,
            "property_name": p.property_name,
            "property_type": ptype,
            "kind": KIND_BY_TYPE.get(ptype, "rental"),
            "house_type": house_types.get(p.id),
            "house_type_label": _label(house_types.get(p.id)) if house_types.get(p.id) else None,
            "latitude": lat,
            "longitude": lon,
            "min_rent": p.min_rent,
            "max_rent": p.max_rent,
            "currency": p.currency,
            "city": p.city,
            "county": p.county,
            "vacant_rooms": p.vacant_rooms,
            "total_rooms": p.total_rooms,
            "has_verified_photos": p.has_verified_photos,
            "has_video": p.has_video,
            "trust_score": p.trust_score,
            "average_rating": p.average_rating,
            "property_code": p.property_code,
            "location_visibility": visibility,
            "is_sponsored": bool(p.is_featured),
            "photo_url": photo_urls.get(p.id),
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "zoom": zoom,
        "properties": items,
    }


@router.get("/directions")
async def get_directions(
    property_id: str = Query(...),
    origin_lat: float = Query(...),
    origin_lon: float = Query(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    prop = result.scalar_one_or_none()

    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    return {
        "property_id": property_id,
        "origin": {"lat": origin_lat, "lon": origin_lon},
        "destination": {"lat": prop.latitude, "lon": prop.longitude},
        "google_maps_url": (
            f"https://www.google.com/maps/dir/?api=1"
            f"&origin={origin_lat},{origin_lon}"
            f"&destination={prop.latitude},{prop.longitude}"
        ),
        "walking_distance_km": round(_haversine_km(origin_lat, origin_lon, prop.latitude, prop.longitude), 2),
        "driving_distance_km": round(_haversine_km(origin_lat, origin_lon, prop.latitude, prop.longitude) * 1.25, 2),
    }


@router.get("/geocode")
async def geocode_place(
    q: str = Query(..., min_length=2, max_length=120),
):
    """Free geocoding via OpenStreetMap Nominatim (no API key)."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": q,
                    "format": "json",
                    "limit": 1,
                    "countrycodes": "ke",
                    "addressdetails": "0",
                },
                headers={"User-Agent": "NyumbaLink/1.0 (local demo)"},
            )
            resp.raise_for_status()
            data = resp.json()
            if not data:
                return {"found": False}
            first = data[0]
            return {
                "found": True,
                "name": first.get("display_name", q),
                "latitude": float(first["lat"]),
                "longitude": float(first["lon"]),
            }
    except Exception:
        return {"found": False}


@router.get("/config")
async def get_maps_config():
    return {
        "google_maps_api_key": settings.GOOGLE_MAPS_API_KEY or "",
        "default_center": {"lat": -0.2867, "lng": 36.0719},
        "default_zoom": 12,
        "styles": "default",
    }


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import radians, sin, cos, asin, sqrt
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * asin(sqrt(a))
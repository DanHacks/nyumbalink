from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from geoalchemy2 import Geography, functions as geo_func
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_optional_user, get_current_verified_owner
from app.models.user import User
from app.models.property import (
    Property, Building, Floor, Room, RoomAmenity,
    PropertyNearbyPlace, PropertyHistory, PropertyStatus,
    PropertyType, OccupancyStatus,
)
from app.models.media import VerificationPhoto, VerificationStatus
from app.models.trust import PropertyBlacklist, BlacklistState
from app.schemas.property import (
    PropertyCreate, PropertyUpdate, PropertyResponse,
    PropertyDetailResponse, BuildingCreate, FloorCreate,
    RoomCreate, RoomUpdate, RoomResponse, PropertySearchParams,
)
from app.services.safety_service import (
    blacklist_exclusion, compute_property_trust, get_blacklist_entry, record_audit,
)
from app.services.location_service import visible_coordinates
from app.services.media_service import build_media_url
from datetime import datetime, timezone
import uuid

router = APIRouter()


def generate_property_code(county: str, city: str) -> str:
    county_code = county[:3].upper()
    city_code = city[:3].upper()
    unique = str(uuid.uuid4())[:6].upper()
    return f"NL-{county_code}-{city_code}-{unique}"


async def _owned_property(db: AsyncSession, property_id: str, owner_id: str) -> Property:
    result = await db.execute(
        select(Property).where(
            Property.id == property_id,
            Property.owner_id == owner_id,
        )
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found or access denied",
        )
    return prop


@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    request: PropertyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_owner),
):
    property_code = generate_property_code(request.address.county, request.address.city)

    prop = Property(
        owner_id=current_user.id,
        property_type=request.property_type,
        property_name=request.property_name,
        description=request.description,
        year_built=request.year_built,
        latitude=request.location.latitude,
        longitude=request.location.longitude,
        location=func.ST_SetSRID(
            func.ST_MakePoint(request.location.longitude, request.location.latitude),
            4326,
        ),
        plus_code=request.location.plus_code,
        what3words=request.location.what3words,
        address_line1=request.address.address_line1,
        address_line2=request.address.address_line2,
        city=request.address.city,
        county=request.address.county,
        sub_county=request.address.sub_county,
        ward=request.address.ward,
        constituency=request.address.constituency,
        postal_code=request.address.postal_code,
        landmark=request.address.landmark,
        property_code=property_code,
        status=PropertyStatus.DRAFT,
        location_privacy=request.location_privacy,
    )
    db.add(prop)
    await db.flush()

    trust = await compute_property_trust(db, prop)
    prop.trust_score = trust["score"]

    await record_audit(
        db, current_user.id, "property_created",
        resource_type="property", resource_id=prop.id,
        details={"property_name": prop.property_name},
    )
    await db.flush()

    return prop


@router.get("", response_model=List[PropertyResponse])
async def list_properties(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    property_type: Optional[str] = None,
    county: Optional[str] = None,
    city: Optional[str] = None,
    verified_only: bool = False,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_km: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    query = select(Property).where(
        Property.status == PropertyStatus.VERIFIED,
        Property.is_active == True,
        Property.is_archived == False,
        blacklist_exclusion(),
    )

    if property_type:
        query = query.where(Property.property_type == property_type)
    if county:
        query = query.where(Property.county.ilike(f"%{county}%"))
    if city:
        query = query.where(Property.city.ilike(f"%{city}%"))
    if verified_only:
        query = query.where(Property.has_verified_photos == True)

    if lat is not None and lon is not None and radius_km:
        point = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
        query = query.where(
            func.ST_DWithin(
                Property.location.cast(Geography),
                point.cast(Geography),
                radius_km * 1000,
            )
        )

    query = query.order_by(Property.is_featured.desc(), Property.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    properties = result.scalars().all()

    items = []
    for p in properties:
        lat_out, lon_out, _ = await visible_coordinates(db, p, current_user)
        item = {
            "id": p.id,
            "property_type": p.property_type.value if hasattr(p.property_type, "value") else p.property_type,
            "property_name": p.property_name,
            "property_code": p.property_code,
            "status": p.status.value if hasattr(p.status, "value") else p.status,
            "latitude": lat_out,
            "longitude": lon_out,
            "city": p.city,
            "county": p.county,
            "min_rent": p.min_rent,
            "max_rent": p.max_rent,
            "currency": p.currency,
            "total_rooms": p.total_rooms,
            "vacant_rooms": p.vacant_rooms,
            "last_vacancy_update": p.last_vacancy_update,
            "has_verified_photos": p.has_verified_photos,
            "has_video": p.has_video,
            "is_featured": p.is_featured,
            "total_views": p.total_views,
            "occupancy_rate": p.occupancy_rate,
            "trust_score": p.trust_score,
            "average_rating": p.average_rating,
            "created_at": p.created_at,
        }
        items.append(item)

    return items


@router.get("/search", response_model=dict)
async def search_properties(
    params: PropertySearchParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    query = select(Property).where(
        Property.status == PropertyStatus.VERIFIED,
        Property.is_active == True,
        Property.is_archived == False,
        blacklist_exclusion(),
    )

    if params.query:
        search_filter = or_(
            Property.property_name.ilike(f"%{params.query}%"),
            Property.description.ilike(f"%{params.query}%"),
            Property.city.ilike(f"%{params.query}%"),
            Property.county.ilike(f"%{params.query}%"),
            Property.landmark.ilike(f"%{params.query}%"),
        )
        query = query.where(search_filter)

    if params.property_type:
        query = query.where(Property.property_type == params.property_type)
    if params.house_type:
        query = query.where(
            Property.id.in_(
                select(Room.property_id).where(Room.house_type == params.house_type)
            )
        )
    if params.county:
        query = query.where(Property.county.ilike(f"%{params.county}%"))
    if params.city:
        query = query.where(Property.city.ilike(f"%{params.city}%"))

    if params.min_price is not None:
        query = query.where(Property.max_rent >= params.min_price)
    if params.max_price is not None:
        query = query.where(Property.min_rent <= params.max_price)

    if params.latitude and params.longitude and params.radius_km:
        point = func.ST_SetSRID(
            func.ST_MakePoint(params.longitude, params.latitude), 4326
        )
        query = query.where(
            func.ST_DWithin(
                Property.location.cast(Geography),
                point.cast(Geography),
                params.radius_km * 1000,
            )
        )

    if params.verified_only:
        query = query.where(Property.has_verified_photos == True)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    sort_col = getattr(Property, params.sort_by, Property.created_at)
    if params.sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    query = query.offset((params.page - 1) * params.page_size).limit(params.page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    results = []
    for p in items:
        lat_out, lon_out, visibility = await visible_coordinates(db, p, current_user)
        results.append({
            "id": p.id,
            "property_name": p.property_name,
            "property_code": p.property_code,
            "property_type": p.property_type.value if hasattr(p.property_type, "value") else p.property_type,
            "latitude": lat_out,
            "longitude": lon_out,
            "location_visibility": visibility,
            "city": p.city,
            "county": p.county,
            "min_rent": p.min_rent,
            "max_rent": p.max_rent,
            "currency": p.currency,
            "total_rooms": p.total_rooms,
            "vacant_rooms": p.vacant_rooms,
            "has_verified_photos": p.has_verified_photos,
            "has_video": p.has_video,
            "is_featured": p.is_featured,
            "trust_score": p.trust_score,
            "average_rating": p.average_rating,
            "occupancy_rate": p.occupancy_rate,
            "created_at": p.created_at,
        })

    return {
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "results": results,
    }


@router.get("/{property_id}", response_model=dict)
async def get_property(
    property_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    request: Request = None,
):
    query = select(Property).where(Property.id == property_id)
    query = query.options(
        selectinload(Property.buildings).selectinload(Building.floors).selectinload(Floor.rooms),
        selectinload(Property.nearby_places),
        selectinload(Property.owner),
    )
    result = await db.execute(query)
    prop = result.scalar_one_or_none()

    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )

    lat_out, lon_out, visibility = await visible_coordinates(db, prop, current_user)

    photo_result = await db.execute(
        select(VerificationPhoto).where(
            VerificationPhoto.property_id == property_id,
            VerificationPhoto.verification_status == VerificationStatus.APPROVED,
        ).order_by(VerificationPhoto.created_at.asc())
    )
    photos = [
        {
            "id": ph.id,
            "url": build_media_url(ph.storage_url, request),
            "caption": ph.caption,
            "is_replacement": ph.is_replacement,
        }
        for ph in photo_result.scalars().all()
    ]

    blacklist_entry = await get_blacklist_entry(db, property_id)
    trust = await compute_property_trust(db, prop)

    owner = prop.owner
    return {
        "id": prop.id,
        "property_name": prop.property_name,
        "property_code": prop.property_code,
        "description": prop.description,
        "property_type": prop.property_type.value if hasattr(prop.property_type, "value") else prop.property_type,
        "year_built": prop.year_built,
        "latitude": lat_out,
        "longitude": lon_out,
        "location_visibility": visibility,
        "location_privacy": prop.location_privacy,
        "address_line1": prop.address_line1,
        "address_line2": prop.address_line2,
        "city": prop.city,
        "county": prop.county,
        "sub_county": prop.sub_county,
        "ward": prop.ward,
        "constituency": prop.constituency,
        "landmark": prop.landmark,
        "postal_code": prop.postal_code,
        "min_rent": prop.min_rent,
        "max_rent": prop.max_rent,
        "currency": prop.currency,
        "total_rooms": prop.total_rooms,
        "vacant_rooms": prop.vacant_rooms,
        "occupancy_rate": prop.occupancy_rate,
        "has_verified_photos": prop.has_verified_photos,
        "has_video": prop.has_video,
        "is_featured": prop.is_featured,
        "total_views": prop.total_views,
        "status": prop.status.value if hasattr(prop.status, "value") else prop.status,
        "trust_score": trust["score"],
        "trust_breakdown": trust["breakdown"],
        "average_rating": prop.average_rating,
        "created_at": prop.created_at,
        "owner": {
            "id": owner.id if owner else None,
            "full_name": owner.full_name if owner else None,
            "is_identity_verified": owner.is_identity_verified if owner else False,
            "is_verified_owner": owner.is_verified_owner if owner else False,
        },
        "blacklist": {
            "state": blacklist_entry.state.value if blacklist_entry else "ACTIVE",
            "reason": blacklist_entry.reason if blacklist_entry else None,
            "visibility": blacklist_entry.blacklist_metadata.get("visibility", "PUBLIC") if blacklist_entry else "PUBLIC",
        },
        "photos": photos,
        "nearby_places": [
            {
                "type": np.place_type,
                "name": np.place_name,
                "distance_km": np.distance_km,
            }
            for np in prop.nearby_places
        ],
        "buildings": [
            {
                "id": b.id,
                "building_name": b.building_name,
                "building_code": b.building_code,
                "total_floors": b.total_floors,
                "floors": [
                    {
                        "id": f.id,
                        "floor_number": f.floor_number,
                        "floor_name": f.floor_name,
                        "rooms": [
                            {
                                "id": r.id,
                                "room_number": r.room_number,
                                "room_name": r.room_name,
                                "house_type": r.house_type.value if hasattr(r.house_type, "value") else r.house_type,
                                "rent_amount": r.rent_amount,
                                "deposit_amount": r.deposit_amount,
                                "currency": r.currency,
                                "occupancy_status": r.occupancy_status.value if hasattr(r.occupancy_status, "value") else r.occupancy_status,
                                "furnishing": r.furnishing,
                                "size_sqm": r.size_sqm,
                                "water_available": r.water_available,
                                "electricity_available": r.electricity_available,
                                "internet_available": r.internet_available,
                                "parking_available": r.parking_available,
                                "security_available": r.security_available,
                                "pet_friendly": r.pet_friendly,
                                "student_friendly": r.student_friendly,
                                "family_friendly": r.family_friendly,
                            }
                            for r in f.rooms
                        ],
                    }
                    for f in b.floors
                ],
            }
            for b in prop.buildings
        ],
    }


@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: str,
    request: PropertyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = await _owned_property(db, property_id, current_user.id)

    if request.property_name is not None:
        prop.property_name = request.property_name
    if request.description is not None:
        prop.description = request.description
    if request.year_built is not None:
        prop.year_built = request.year_built
    if request.location_privacy is not None:
        prop.location_privacy = request.location_privacy
    if request.address is not None:
        prop.address_line1 = request.address.address_line1
        prop.address_line2 = request.address.address_line2
        prop.city = request.address.city
        prop.county = request.address.county
        prop.sub_county = request.address.sub_county
        prop.ward = request.address.ward
        prop.constituency = request.address.constituency
        prop.postal_code = request.address.postal_code
        prop.landmark = request.address.landmark

    await record_audit(
        db, current_user.id, "property_updated",
        resource_type="property", resource_id=prop.id,
    )
    await db.flush()
    return prop


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = await _owned_property(db, property_id, current_user.id)

    prop.is_archived = True
    prop.is_active = False

    await record_audit(
        db, current_user.id, "property_archived",
        resource_type="property", resource_id=prop.id,
    )
    await db.flush()


@router.post("/{property_id}/buildings", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_building(
    property_id: str,
    request: BuildingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _owned_property(db, property_id, current_user.id)

    building = Building(
        property_id=property_id,
        building_name=request.building_name,
        building_code=request.building_code,
        total_floors=request.total_floors,
    )
    db.add(building)
    await db.flush()
    return {"id": building.id, "building_name": building.building_name}


@router.post("/buildings/{building_id}/floors", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_floor(
    building_id: str,
    request: FloorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Building).where(Building.id == building_id)
    )
    building = result.scalar_one_or_none()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    await _owned_property(db, building.property_id, current_user.id)

    floor = Floor(
        building_id=building_id,
        floor_number=request.floor_number,
        floor_name=request.floor_name,
    )
    db.add(floor)
    await db.flush()
    return {"id": floor.id, "floor_number": floor.floor_number}


@router.post("/floors/{floor_id}/rooms", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_room(
    floor_id: str,
    request: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Floor).where(Floor.id == floor_id)
    )
    floor = result.scalar_one_or_none()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")

    building_result = await db.execute(
        select(Building).where(Building.id == floor.building_id)
    )
    building = building_result.scalar_one_or_none()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    await _owned_property(db, building.property_id, current_user.id)

    room = Room(
        building_id=building.id,
        floor_id=floor_id,
        property_id=building.property_id,
        room_number=request.room_number,
        room_name=request.room_name,
        house_type=request.house_type,
        rent_amount=request.rent_amount,
        deposit_amount=request.deposit_amount,
        negotiable=request.negotiable,
        size_sqm=request.size_sqm,
        furnishing=request.furnishing,
        water_available=request.water_available,
        electricity_available=request.electricity_available,
        internet_available=request.internet_available,
        parking_available=request.parking_available,
        security_available=request.security_available,
        pet_friendly=request.pet_friendly,
        student_friendly=request.student_friendly,
        family_friendly=request.family_friendly,
    )
    db.add(room)
    await db.flush()

    await _recount_vacancy(db, building.property_id)
    return {"id": room.id, "room_number": room.room_number}


@router.put("/rooms/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: str,
    request: RoomUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Room).where(Room.id == room_id)
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    await _owned_property(db, room.property_id, current_user.id)

    if request.rent_amount is not None:
        room.rent_amount = request.rent_amount
    if request.deposit_amount is not None:
        room.deposit_amount = request.deposit_amount
    if request.negotiable is not None:
        room.negotiable = request.negotiable
    if request.occupancy_status is not None:
        room.occupancy_status = request.occupancy_status
    if request.furnishing is not None:
        room.furnishing = request.furnishing

    await db.flush()
    await _recount_vacancy(db, room.property_id)
    return room


async def _recount_vacancy(db: AsyncSession, property_id: str):
    result = await db.execute(
        select(func.count(Room.id)).where(
            Room.property_id == property_id,
            Room.is_active == True,
        )
    )
    total_rooms = result.scalar() or 0

    vacant_result = await db.execute(
        select(func.count(Room.id)).where(
            Room.property_id == property_id,
            Room.is_active == True,
            Room.occupancy_status == OccupancyStatus.VACANT,
        )
    )
    vacant = vacant_result.scalar() or 0

    min_rent = None
    if vacant:
        min_rent = float((await db.execute(
            select(func.min(Room.rent_amount)).where(
                Room.property_id == property_id,
                Room.is_active == True,
                Room.occupancy_status == OccupancyStatus.VACANT,
            )
        )).scalar())

    max_rent = (await db.execute(
        select(func.max(Room.rent_amount)).where(
            Room.property_id == property_id,
            Room.is_active == True,
        )
    )).scalar()

    prop_result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    prop = prop_result.scalar_one_or_none()
    if prop:
        prop.total_rooms = total_rooms
        prop.vacant_rooms = vacant
        prop.last_vacancy_update = datetime.now(timezone.utc)
        prop.occupancy_rate = round(
            ((total_rooms - vacant) / max(1, total_rooms)) * 100, 1
        )
        prop.min_rent = min_rent
        prop.max_rent = float(max_rent) if max_rent else None
    await db.flush()

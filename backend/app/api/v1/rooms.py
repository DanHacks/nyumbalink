from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.property import (
    Room, RoomAmenity, Building, Floor,
    OccupancyStatus, HouseType, Property, PropertyStatus,
)
from app.schemas.property import RoomCreate, RoomUpdate, RoomResponse
from app.services.safety_service import blacklist_exclusion, record_audit
from app.api.v1.properties import _recount_vacancy
from datetime import datetime, timezone

router = APIRouter()


async def _owned_room(db: AsyncSession, room_id: str, user: User) -> Room:
    result = await db.execute(
        select(Room).where(Room.id == room_id)
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    prop_result = await db.execute(
        select(Property).where(Property.id == room.property_id)
    )
    prop = prop_result.scalar_one_or_none()
    if not prop or prop.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the property owner can modify rooms",
        )
    return room


@router.get("/property/{property_id}", response_model=List[RoomResponse])
async def list_property_rooms(
    property_id: str,
    status_filter: Optional[str] = None,
    house_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Room).where(
        Room.property_id == property_id,
        Room.is_active == True,
        Room.is_archived == False,
    )

    if status_filter:
        try:
            query = query.where(Room.occupancy_status == OccupancyStatus(status_filter))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid occupancy status: {status_filter}",
            )
    if house_type:
        try:
            query = query.where(Room.house_type == HouseType(house_type))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid house type: {house_type}",
            )
    if min_price is not None:
        query = query.where(Room.rent_amount >= min_price)
    if max_price is not None:
        query = query.where(Room.rent_amount <= max_price)

    query = query.options(
        selectinload(Room.building),
        selectinload(Room.floor),
    )

    result = await db.execute(query)
    rooms = result.scalars().all()

    response = []
    for room in rooms:
        response.append(RoomResponse(
            id=room.id,
            room_number=room.room_number,
            room_name=room.room_name,
            house_type=room.house_type.value if hasattr(room.house_type, 'value') else room.house_type,
            rent_amount=room.rent_amount,
            deposit_amount=room.deposit_amount,
            currency=room.currency,
            occupancy_status=room.occupancy_status.value if hasattr(room.occupancy_status, 'value') else room.occupancy_status,
            furnishing=room.furnishing,
            size_sqm=room.size_sqm,
            water_available=room.water_available,
            electricity_available=room.electricity_available,
            internet_available=room.internet_available,
            parking_available=room.parking_available,
            pet_friendly=room.pet_friendly,
            student_friendly=room.student_friendly,
            building_name=room.building.building_name if room.building else None,
            floor_number=room.floor.floor_number if room.floor else None,
        ))

    return response


@router.get("/vacant", response_model=List[RoomResponse])
async def list_vacant_rooms(
    county: Optional[str] = None,
    city: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    house_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Room).join(Property, Room.property_id == Property.id).where(
        Room.occupancy_status == OccupancyStatus.VACANT,
        Room.is_active == True,
        Room.is_archived == False,
        Property.status == PropertyStatus.VERIFIED,
        Property.is_active == True,
        blacklist_exclusion(),
    )

    if county:
        query = query.where(Property.county.ilike(f"%{county}%"))
    if city:
        query = query.where(Property.city.ilike(f"%{city}%"))
    if min_price is not None:
        query = query.where(Room.rent_amount >= min_price)
    if max_price is not None:
        query = query.where(Room.rent_amount <= max_price)
    if house_type:
        try:
            query = query.where(Room.house_type == HouseType(house_type))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid house type: {house_type}",
            )

    query = query.options(selectinload(Room.building), selectinload(Room.floor))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rooms = result.scalars().all()

    return [
        RoomResponse(
            id=room.id,
            room_number=room.room_number,
            room_name=room.room_name,
            house_type=room.house_type.value if hasattr(room.house_type, 'value') else room.house_type,
            rent_amount=room.rent_amount,
            deposit_amount=room.deposit_amount,
            currency=room.currency,
            occupancy_status=room.occupancy_status.value if hasattr(room.occupancy_status, 'value') else room.occupancy_status,
            furnishing=room.furnishing,
            size_sqm=room.size_sqm,
            water_available=room.water_available,
            electricity_available=room.electricity_available,
            internet_available=room.internet_available,
            parking_available=room.parking_available,
            pet_friendly=room.pet_friendly,
            student_friendly=room.student_friendly,
            building_name=room.building.building_name if room.building else None,
            floor_number=room.floor.floor_number if room.floor else None,
        )
        for room in rooms
    ]


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(
    room_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Room).where(Room.id == room_id, Room.is_active == True)
        .options(selectinload(Room.building), selectinload(Room.floor), selectinload(Room.amenities))
    )
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )

    return RoomResponse(
        id=room.id,
        room_number=room.room_number,
        room_name=room.room_name,
        house_type=room.house_type.value if hasattr(room.house_type, 'value') else room.house_type,
        rent_amount=room.rent_amount,
        deposit_amount=room.deposit_amount,
        currency=room.currency,
        occupancy_status=room.occupancy_status.value if hasattr(room.occupancy_status, 'value') else room.occupancy_status,
        furnishing=room.furnishing,
        size_sqm=room.size_sqm,
        water_available=room.water_available,
        electricity_available=room.electricity_available,
        internet_available=room.internet_available,
        parking_available=room.parking_available,
        pet_friendly=room.pet_friendly,
        student_friendly=room.student_friendly,
        building_name=room.building.building_name if room.building else None,
        floor_number=room.floor.floor_number if room.floor else None,
    )


@router.put("/{room_id}", response_model=dict)
async def update_room(
    room_id: str,
    request: RoomUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = await _owned_room(db, room_id, current_user)

    if request.rent_amount is not None:
        room.previous_rent = room.rent_amount
        room.rent_amount = request.rent_amount
    if request.deposit_amount is not None:
        room.deposit_amount = request.deposit_amount
    if request.negotiable is not None:
        room.negotiable = request.negotiable
    if request.occupancy_status is not None:
        try:
            new_status = OccupancyStatus(request.occupancy_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid occupancy status: {request.occupancy_status}",
            )
        old_status = room.occupancy_status
        room.occupancy_status = new_status
        if new_status == OccupancyStatus.OCCUPIED:
            room.last_occupied_at = datetime.now(timezone.utc)
        elif new_status == OccupancyStatus.VACANT:
            room.last_vacated_at = datetime.now(timezone.utc)
    if request.furnishing is not None:
        room.furnishing = request.furnishing

    await db.flush()
    await _recount_vacancy(db, room.property_id)
    await record_audit(
        db, current_user.id, "room_updated",
        resource_type="room", resource_id=room.id,
        details={"property_id": room.property_id},
    )
    await db.flush()

    return {"message": "Room updated successfully"}


@router.post("/{room_id}/mark-occupied")
async def mark_room_occupied(
    room_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = await _owned_room(db, room_id, current_user)

    room.occupancy_status = OccupancyStatus.OCCUPIED
    room.last_occupied_at = datetime.now(timezone.utc)
    await db.flush()
    await _recount_vacancy(db, room.property_id)
    await db.flush()

    return {"message": "Room marked as occupied"}


@router.post("/{room_id}/mark-vacant")
async def mark_room_vacant(
    room_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = await _owned_room(db, room_id, current_user)

    room.occupancy_status = OccupancyStatus.VACANT
    room.last_vacated_at = datetime.now(timezone.utc)
    await db.flush()
    await _recount_vacancy(db, room.property_id)
    await db.flush()

    return {"message": "Room marked as vacant"}

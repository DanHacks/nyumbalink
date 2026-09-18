from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.property import Room, OccupancyStatus, Property
from app.models.booking import Booking, BookingStatus, BookingCheckIn, QRCode
from app.schemas.booking import (
    BookingCreate, BookingResponse, BookingStatusUpdate,
    CheckInRequest,
)
from app.services.safety_service import (
    blacklist_exclusion, get_blacklist_entry, record_audit,
)
from datetime import datetime, timezone, timedelta
from math import radians, sin, cos, asin, sqrt
import uuid

router = APIRouter()

CHECK_IN_PROXIMITY_M = 150.0


def _parse_dt(value: str, field_name: str) -> datetime:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be a valid ISO datetime, got '{value}'",
        )
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * asin(sqrt(a))


def _serialize(booking: Booking) -> dict:
    status_val = booking.status.value if hasattr(booking.status, "value") else booking.status
    return {
        "id": booking.id,
        "property_id": booking.property_id,
        "room_id": booking.room_id,
        "status": status_val,
        "scheduled_date": booking.scheduled_date,
        "scheduled_time_start": booking.scheduled_time_start,
        "scheduled_time_end": booking.scheduled_time_end,
        "actual_check_in": booking.actual_check_in,
        "qr_code": booking.qr_code,
        "qr_code_scanned": booking.qr_code_scanned,
        "created_at": booking.created_at,
        "tenant_name": booking.tenant.full_name if booking.tenant else None,
        "property_name": booking.property.property_name if booking.property else None,
        "house_type": (
            booking.room.house_type.value if booking.room and hasattr(booking.room.house_type, "value")
            else booking.room.house_type if booking.room else None
        ),
        "tenant_notes": booking.tenant_notes,
        "owner_notes": booking.owner_notes,
    }


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    request: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Property).where(
            Property.id == request.property_id,
            blacklist_exclusion(),
        )
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found or currently restricted",
        )

    if prop.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot book your own property",
        )

    room = None
    if request.room_id:
        result = await db.execute(
            select(Room).where(
                Room.id == request.room_id,
                Room.property_id == request.property_id,
            )
        )
        room = result.scalar_one_or_none()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found in this property",
            )
        if room.occupancy_status != OccupancyStatus.VACANT:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This room is currently occupied",
            )
    elif prop.vacant_rooms <= 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No vacant rooms at this property",
        )

    scheduled_date = _parse_dt(request.scheduled_date, "scheduled_date")
    time_start = _parse_dt(request.scheduled_time_start, "scheduled_time_start")
    time_end = _parse_dt(request.scheduled_time_end, "scheduled_time_end")

    if time_end <= time_start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="scheduled_time_end must be after scheduled_time_start",
        )

    overlap = await db.execute(
        select(Booking.id).where(
            Booking.property_id == request.property_id,
            Booking.room_id == request.room_id,
            Booking.status.in_([
                BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN,
            ]),
            or_(
                and_(Booking.scheduled_time_start < time_end, Booking.scheduled_time_end > time_start),
                and_(
                    Booking.scheduled_date == scheduled_date,
                    Booking.scheduled_time_start <= time_end,
                    Booking.scheduled_time_end >= time_start,
                ),
            ),
        ).limit(1)
    )
    if overlap.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This property is already booked for the selected time slot",
        )

    booking = Booking(
        tenant_id=current_user.id,
        property_id=request.property_id,
        room_id=request.room_id,
        owner_id=prop.owner_id,
        caretaker_id=prop.caretaker_id,
        status=BookingStatus.PENDING,
        scheduled_date=scheduled_date,
        scheduled_time_start=time_start,
        scheduled_time_end=time_end,
        tenant_notes=request.tenant_notes,
    )
    db.add(booking)
    await db.flush()

    await record_audit(
        db, current_user.id, "booking_created",
        resource_type="booking", resource_id=booking.id,
        details={"property_id": request.property_id},
    )
    await db.flush()
    result = await db.execute(
        select(Booking).where(Booking.id == booking.id).options(
            selectinload(Booking.property), selectinload(Booking.room), selectinload(Booking.tenant),
        )
    )
    booking = result.scalar_one()
    try:
        from app.tasks.notifications import send_booking_confirmation
        send_booking_confirmation.delay(booking.id)
    except Exception:
        pass
    return _serialize(booking)


@router.get("/my-bookings", response_model=List[BookingResponse])
async def get_my_bookings(
    status_filter: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Booking).where(
        Booking.tenant_id == current_user.id
    ).options(selectinload(Booking.property), selectinload(Booking.room), selectinload(Booking.tenant))

    if status_filter:
        try:
            query = query.where(Booking.status == BookingStatus(status_filter))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid booking status: {status_filter}",
            )

    query = query.order_by(Booking.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    return [_serialize(b) for b in result.scalars().all()]


@router.get("/my-property-bookings", response_model=List[BookingResponse])
async def get_my_property_bookings(
    status_filter: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Booking).where(
        Booking.owner_id == current_user.id
    ).options(selectinload(Booking.property), selectinload(Booking.room), selectinload(Booking.tenant))

    if status_filter:
        try:
            query = query.where(Booking.status == BookingStatus(status_filter))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid booking status: {status_filter}",
            )

    query = query.order_by(Booking.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    return [_serialize(b) for b in result.scalars().all()]


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id).options(
            selectinload(Booking.property), selectinload(Booking.room), selectinload(Booking.tenant),
        )
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.tenant_id != current_user.id and booking.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return _serialize(booking)


@router.put("/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    request: BookingStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can update booking status",
        )

    try:
        new_status = BookingStatus(request.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid booking status: {request.status}",
        )

    booking.status = new_status
    if request.notes:
        booking.owner_notes = request.notes

    if new_status == BookingStatus.CONFIRMED:
        qr_data = str(uuid.uuid4())
        qr_code_url = f"nyumbalink://verify-booking/{booking.id}/{qr_data}"

        qr = QRCode(
            booking_id=booking.id,
            code=qr_data,
            code_url=qr_code_url,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
            generated_by=current_user.id,
        )
        db.add(qr)
        booking.qr_code = qr_code_url

    await record_audit(
        db, current_user.id, "booking_status_changed",
        resource_type="booking", resource_id=booking.id,
        details={"status": request.status},
    )
    await db.flush()

    return {"message": f"Booking {request.status}", "status": request.status}


@router.post("/{booking_id}/check-in")
async def check_in_booking(
    booking_id: str,
    request: CheckInRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request.booking_id and request.booking_id != booking_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="booking_id in path and body must match",
        )
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id).options(
            selectinload(Booking.property), selectinload(Booking.check_ins),
        )
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.tenant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the tenant can check in")

    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking must be confirmed first",
        )

    qr_result = await db.execute(
        select(QRCode).where(
            QRCode.booking_id == booking.id,
            QRCode.is_used == False,
        ).order_by(QRCode.created_at.desc()).limit(1)
    )
    qr = qr_result.scalar_one_or_none()
    if not qr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active QR code found for this booking",
        )
    if qr.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR code has expired",
        )

    prop = booking.property
    if prop and prop.latitude is not None and prop.longitude is not None:
        distance_m = _haversine_km(
            request.gps_latitude, request.gps_longitude,
            prop.latitude, prop.longitude,
        ) * 1000
        tolerance = CHECK_IN_PROXIMITY_M
        if request.gps_accuracy and request.gps_accuracy > 20:
            tolerance += request.gps_accuracy
        if distance_m > tolerance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"You appear to be {round(distance_m)}m from the property. "
                    f"Check-in is only possible within {round(tolerance)}m."
                ),
            )

    qr.is_used = True
    qr.used_at = datetime.now(timezone.utc)

    check_in = BookingCheckIn(
        booking_id=booking.id,
        check_in_type="qr_scan",
        qr_code_scanned=True,
        gps_latitude=request.gps_latitude,
        gps_longitude=request.gps_longitude,
        gps_accuracy=request.gps_accuracy,
        selfie_url=request.selfie_url,
        device_id=request.device_id,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(check_in)

    booking.status = BookingStatus.CHECKED_IN
    booking.actual_check_in = datetime.now(timezone.utc)
    booking.qr_code_scanned = True
    booking.qr_code_scanned_at = datetime.now(timezone.utc)

    await record_audit(
        db, current_user.id, "booking_checked_in",
        resource_type="booking", resource_id=booking.id,
        details={"distance_m": round(distance_m, 1) if prop else None},
    )
    await db.flush()

    return {"message": "Check-in successful", "status": "checked_in"}


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    reason: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.tenant_id != current_user.id and booking.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if booking.status in (BookingStatus.COMPLETED, BookingStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booking is already {booking.status.value}",
        )

    booking.status = BookingStatus.CANCELLED
    booking.cancellation_reason = reason
    booking.cancelled_by = current_user.id

    await record_audit(
        db, current_user.id, "booking_cancelled",
        resource_type="booking", resource_id=booking.id,
        details={"reason": reason},
    )
    await db.flush()

    return {"message": "Booking cancelled", "status": "cancelled"}
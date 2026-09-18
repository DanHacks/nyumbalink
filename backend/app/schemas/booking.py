from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class BookingCreate(BaseModel):
    property_id: str
    room_id: Optional[str] = None
    scheduled_date: str
    scheduled_time_start: str
    scheduled_time_end: str
    tenant_notes: Optional[str] = None


class BookingResponse(BaseModel):
    id: str
    property_id: str
    room_id: Optional[str]
    status: str
    scheduled_date: datetime
    scheduled_time_start: datetime
    scheduled_time_end: datetime
    actual_check_in: Optional[datetime]
    qr_code: Optional[str]
    qr_code_scanned: bool
    created_at: Optional[datetime] = None
    tenant_name: Optional[str] = None
    property_name: Optional[str] = None
    house_type: Optional[str] = None
    tenant_notes: Optional[str] = None
    owner_notes: Optional[str] = None

    class Config:
        from_attributes = True


class BookingStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class QRCodeResponse(BaseModel):
    booking_id: str
    code: str
    code_url: str
    expires_at: datetime


class CheckInRequest(BaseModel):
    booking_id: Optional[str] = None
    gps_latitude: float
    gps_longitude: float
    gps_accuracy: Optional[float] = None
    selfie_url: Optional[str] = None
    device_id: Optional[str] = None

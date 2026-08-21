from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class PhotoMetadataRequest(BaseModel):
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    accuracy: Optional[float] = None
    heading: Optional[float] = None
    timestamp: datetime
    device_id: Optional[str] = None
    device_model: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None


class PhotoUploadResponse(BaseModel):
    id: str
    category: str
    storage_url: str
    thumbnail_url: Optional[str]
    verification_status: str
    metadata: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class AIVerificationResult(BaseModel):
    photo_id: str
    is_authentic: bool
    confidence: float
    flags: List[str]
    details: Dict[str, Any]


class VideoUploadResponse(BaseModel):
    id: str
    storage_url: str
    thumbnail_url: Optional[str]
    duration_seconds: int
    verification_status: str

    class Config:
        from_attributes = True


class VerificationStatusResponse(BaseModel):
    property_id: str
    photos_verified: int
    photos_pending: int
    photos_rejected: int
    total_photos_required: int
    video_verified: bool
    video_pending: bool
    overall_status: str
    is_complete: bool

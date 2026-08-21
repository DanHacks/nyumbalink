import enum
from datetime import datetime

from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, Float, Enum as SAEnum,
    ForeignKey, JSON, Integer, LargeBinary
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, IdMixin, utcnow


class PhotoCategory(str, enum.Enum):
    EXTERIOR = "exterior"
    GATE = "gate"
    PARKING = "parking"
    COMPOUND = "compound"
    KITCHEN = "kitchen"
    BEDROOM = "bedroom"
    BATHROOM = "bathroom"
    LIVING_ROOM = "living_room"
    CORRIDOR = "corridor"
    WATER_POINT = "water_point"
    ELECTRIC_METER = "electric_meter"
    WINDOWS = "windows"
    VIEW_OUTSIDE = "view_outside"
    OTHER = "other"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"
    REVIEW_REQUIRED = "review_required"


class VerificationPhoto(IdMixin, TimestampMixin, Base):
    __tablename__ = "verification_photos"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    room_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rooms.id"), nullable=True, index=True
    )
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    uploaded_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

    category: Mapped[PhotoCategory] = mapped_column(
        SAEnum(PhotoCategory), nullable=False
    )

    storage_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    thumbnail_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    compressed_url: Mapped[str] = mapped_column(String(1000), nullable=True)

    width: Mapped[int] = mapped_column(Integer, nullable=True)
    height: Mapped[int] = mapped_column(Integer, nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=True)
    file_hash: Mapped[str] = mapped_column(String(128), nullable=True)
    format: Mapped[str] = mapped_column(String(20), nullable=True)

    verification_status: Mapped[VerificationStatus] = mapped_column(
        SAEnum(VerificationStatus), default=VerificationStatus.PENDING, nullable=False
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    metadata_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("photo_metadata.id"), nullable=True
    )

    ai_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_confidence: Mapped[float] = mapped_column(Float, nullable=True)
    ai_flags: Mapped[dict] = mapped_column(JSON, default=dict)
    reviewed_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str] = mapped_column(Text, nullable=True)

    is_replacement: Mapped[bool] = mapped_column(Boolean, default=False)
    replaced_photo_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("verification_photos.id"), nullable=True
    )

    property = relationship("Property", back_populates="photos", foreign_keys=[property_id])
    metadata_rel = relationship("PhotoMetadata", back_populates="photo", uselist=False)


class PhotoMetadata(IdMixin, Base):
    __tablename__ = "photo_metadata"

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    altitude: Mapped[float] = mapped_column(Float, nullable=True)
    accuracy: Mapped[float] = mapped_column(Float, nullable=True)
    altitude_accuracy: Mapped[float] = mapped_column(Float, nullable=True)
    heading: Mapped[float] = mapped_column(Float, nullable=True)
    heading_accuracy: Mapped[float] = mapped_column(Float, nullable=True)
    speed: Mapped[float] = mapped_column(Float, nullable=True)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    device_id: Mapped[str] = mapped_column(String(255), nullable=True)
    device_model: Mapped[str] = mapped_column(String(255), nullable=True)
    os_version: Mapped[str] = mapped_column(String(50), nullable=True)
    app_version: Mapped[str] = mapped_column(String(20), nullable=True)

    gps_satellites: Mapped[int] = mapped_column(Integer, nullable=True)
    is_gps_fake: Mapped[bool] = mapped_column(Boolean, default=False)
    gps_spoof_confidence: Mapped[float] = mapped_column(Float, nullable=True)

    digital_signature: Mapped[str] = mapped_column(Text, nullable=True)
    exif_data: Mapped[dict] = mapped_column(JSON, default=dict)

    network_location_lat: Mapped[float] = mapped_column(Float, nullable=True)
    network_location_lon: Mapped[float] = mapped_column(Float, nullable=True)

    photo = relationship("VerificationPhoto", back_populates="metadata_rel")


class WalkthroughVideo(IdMixin, TimestampMixin, Base):
    __tablename__ = "walkthrough_videos"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )

    storage_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    thumbnail_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    preview_url: Mapped[str] = mapped_column(String(1000), nullable=True)

    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=True)
    file_hash: Mapped[str] = mapped_column(String(128), nullable=True)

    width: Mapped[int] = mapped_column(Integer, nullable=True)
    height: Mapped[int] = mapped_column(Integer, nullable=True)
    format: Mapped[str] = mapped_column(String(20), nullable=True)

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    device_id: Mapped[str] = mapped_column(String(255), nullable=True)

    verification_status: Mapped[VerificationStatus] = mapped_column(
        SAEnum(VerificationStatus), default=VerificationStatus.PENDING, nullable=False
    )
    ai_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_confidence: Mapped[float] = mapped_column(Float, nullable=True)
    ai_flags: Mapped[dict] = mapped_column(JSON, default=dict)

    property = relationship("Property", back_populates="videos")


class MediaAuditLog(IdMixin, TimestampMixin, Base):
    __tablename__ = "media_audit_logs"

    media_type: Mapped[str] = mapped_column(String(20), nullable=False)
    media_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    performed_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)

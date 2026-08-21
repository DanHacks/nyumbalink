from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, Float, Enum as SAEnum,
    ForeignKey, JSON, Integer
)
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, IdMixin, ActiveMixin, utcnow
import enum


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"


class Booking(IdMixin, TimestampMixin, Base):
    __tablename__ = "bookings"

    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    room_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rooms.id"), nullable=True, index=True
    )
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    caretaker_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    status: Mapped[BookingStatus] = mapped_column(
        SAEnum(BookingStatus), default=BookingStatus.PENDING, nullable=False
    )

    scheduled_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    scheduled_time_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    scheduled_time_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    actual_check_in: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actual_check_out: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    tenant_notes: Mapped[str] = mapped_column(Text, nullable=True)
    owner_notes: Mapped[str] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[str] = mapped_column(Text, nullable=True)
    cancelled_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    qr_code: Mapped[str] = mapped_column(String(500), nullable=True)
    qr_code_scanned: Mapped[bool] = mapped_column(Boolean, default=False)
    qr_code_scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    booking_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    tenant = relationship("User", foreign_keys=[tenant_id])
    property = relationship("Property")
    room = relationship("Room")
    check_ins = relationship("BookingCheckIn", back_populates="booking", lazy="selectin")


class BookingCheckIn(IdMixin, TimestampMixin, Base):
    __tablename__ = "booking_check_ins"

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bookings.id"), nullable=False, index=True
    )
    check_in_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    qr_code_scanned: Mapped[bool] = mapped_column(Boolean, default=False)
    gps_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    gps_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    gps_accuracy: Mapped[float] = mapped_column(Float, nullable=True)
    selfie_url: Mapped[str] = mapped_column(String(500), nullable=True)
    device_id: Mapped[str] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    booking = relationship("Booking", back_populates="check_ins")


class QRCode(IdMixin, TimestampMixin, Base):
    __tablename__ = "qr_codes"

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bookings.id"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    code_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    generated_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

import enum
from datetime import datetime

from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, Float, Enum as SAEnum,
    ForeignKey, JSON, Integer
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, IdMixin, utcnow


class ScamReportStatus(str, enum.Enum):
    PENDING = "pending"
    INVESTIGATING = "investigating"
    CONFIRMED = "confirmed"
    DISMISSED = "dismissed"
    ACTION_TAKEN = "action_taken"


class ScamReport(IdMixin, TimestampMixin, Base):
    __tablename__ = "scam_reports"

    reporter_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    room_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rooms.id"), nullable=True
    )
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    status: Mapped[ScamReportStatus] = mapped_column(
        SAEnum(ScamReportStatus), default=ScamReportStatus.PENDING, nullable=False
    )

    report_category: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    wrong_photos: Mapped[bool] = mapped_column(Boolean, default=False)
    wrong_rent: Mapped[bool] = mapped_column(Boolean, default=False)
    wrong_location: Mapped[bool] = mapped_column(Boolean, default=False)
    occupied_room: Mapped[bool] = mapped_column(Boolean, default=False)
    broken_house: Mapped[bool] = mapped_column(Boolean, default=False)
    fake_listing: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_listing: Mapped[bool] = mapped_column(Boolean, default=False)
    other_issue: Mapped[bool] = mapped_column(Boolean, default=False)

    visited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reporter_gps_lat: Mapped[float] = mapped_column(Float, nullable=True)
    reporter_gps_lon: Mapped[float] = mapped_column(Float, nullable=True)

    investigated_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    investigated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    investigation_notes: Mapped[str] = mapped_column(Text, nullable=True)

    action_taken: Mapped[str] = mapped_column(String(50), nullable=True)
    warning_issued: Mapped[bool] = mapped_column(Boolean, default=False)
    listing_hidden: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_removed: Mapped[bool] = mapped_column(Boolean, default=False)
    account_suspended: Mapped[bool] = mapped_column(Boolean, default=False)
    permanent_ban: Mapped[bool] = mapped_column(Boolean, default=False)

    resolution_notes: Mapped[str] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    report_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    media = relationship("ScamReportMedia", back_populates="report", lazy="selectin")
    reporter = relationship("User", foreign_keys=[reporter_id])


class ScamReportMedia(IdMixin, TimestampMixin, Base):
    __tablename__ = "scam_report_media"

    report_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("scam_reports.id"), nullable=False, index=True
    )
    media_type: Mapped[str] = mapped_column(String(10), nullable=False)
    storage_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    gps_latitude: Mapped[float] = mapped_column(Float, nullable=True)
    gps_longitude: Mapped[float] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    report = relationship("ScamReport", back_populates="media")


class FraudHit(IdMixin, TimestampMixin, Base):
    __tablename__ = "fraud_hits"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=True, index=True
    )
    photo_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("verification_photos.id"), nullable=True
    )
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )

    fraud_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    detected_by: Mapped[str] = mapped_column(String(50), nullable=False)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    is_reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    reviewed_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class OwnerTrustScore(IdMixin, TimestampMixin, Base):
    __tablename__ = "owner_trust_scores"

    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True, unique=True
    )
    overall_score: Mapped[float] = mapped_column(Float, default=100.0)
    verification_score: Mapped[float] = mapped_column(Float, default=0.0)
    listing_accuracy_score: Mapped[float] = mapped_column(Float, default=100.0)
    response_score: Mapped[float] = mapped_column(Float, default=100.0)
    booking_completion_rate: Mapped[float] = mapped_column(Float, default=100.0)
    scam_report_ratio: Mapped[float] = mapped_column(Float, default=0.0)
    review_score: Mapped[float] = mapped_column(Float, default=0.0)
    total_listings: Mapped[int] = mapped_column(Integer, default=0)
    successful_rentals: Mapped[int] = mapped_column(Integer, default=0)
    total_reports: Mapped[int] = mapped_column(Integer, default=0)
    total_suspensions: Mapped[int] = mapped_column(Integer, default=0)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

import enum
from datetime import datetime

from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, Float, Enum as SAEnum,
    ForeignKey, JSON, Integer
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, IdMixin, utcnow


class BlacklistState(str, enum.Enum):
    ACTIVE = "active"
    FLAGGED = "flagged"
    UNDER_REVIEW = "under_review"
    RESTRICTED = "restricted"
    BLACKLISTED = "blacklisted"
    APPEALED = "appealed"
    REINSTATED = "reinstated"
    CONFIRMED_BLACKLIST = "confirmed_blacklist"


class PropertyServiceStatus(str, enum.Enum):
    VERIFIED = "verified"
    OWNER_REPORTED = "owner_reported"
    NOT_VERIFIED = "not_verified"


class PropertyService(IdMixin, TimestampMixin, Base):
    __tablename__ = "property_services"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    service_name: Mapped[str] = mapped_column(String(100), nullable=False)
    service_category: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[PropertyServiceStatus] = mapped_column(
        SAEnum(PropertyServiceStatus),
        default=PropertyServiceStatus.OWNER_REPORTED,
        nullable=False,
    )
    verified_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    added_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

    property = relationship("Property")


class PropertyRecommendation(IdMixin, TimestampMixin, Base):
    __tablename__ = "property_recommendations"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    recommendation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    comment: Mapped[str] = mapped_column(Text, nullable=True)
    is_verified_visitor: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User")


class PropertyBlacklist(IdMixin, TimestampMixin, Base):
    __tablename__ = "property_blacklist"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True, unique=True
    )
    state: Mapped[BlacklistState] = mapped_column(
        SAEnum(BlacklistState), default=BlacklistState.ACTIVE, nullable=False
    )
    unique_reporter_count: Mapped[int] = mapped_column(Integer, default=0)
    verified_positive_reviews: Mapped[int] = mapped_column(Integer, default=0)
    report_quality_score: Mapped[float] = mapped_column(Float, default=0.0)
    reason: Mapped[str] = mapped_column(Text, nullable=True)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reviewed_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    decision_notes: Mapped[str] = mapped_column(Text, nullable=True)
    blacklist_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    property = relationship("Property")


class PropertyAppeal(IdMixin, TimestampMixin, Base):
    __tablename__ = "property_appeals"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    appellant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    documents: Mapped[dict] = mapped_column(JSON, default=dict)
    request_physical_inspection: Mapped[bool] = mapped_column(Boolean, default=False)
    decided_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    decision_notes: Mapped[str] = mapped_column(Text, nullable=True)

    appellant = relationship("User", foreign_keys=[appellant_id])


class AuditLog(IdMixin, TimestampMixin, Base):
    __tablename__ = "audit_logs"

    actor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[str] = mapped_column(String(36), nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)

    actor = relationship("User")


class Favorite(IdMixin, TimestampMixin, Base):
    __tablename__ = "favorites"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )

    user = relationship("User")
    property = relationship("Property")


class OTPCode(IdMixin, TimestampMixin, Base):
    __tablename__ = "otp_codes"

    identifier: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    purpose: Mapped[str] = mapped_column(String(20), default="phone_verification")
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    attempts: Mapped[int] = mapped_column(Integer, default=0)
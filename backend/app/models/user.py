from typing import Optional

from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, Float, Enum as SAEnum,
    ForeignKey, JSON, Integer
)
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, IdMixin, ActiveMixin, utcnow
import enum


class UserRole(str, enum.Enum):
    STUDENT = "student"
    TENANT = "tenant"
    OWNER = "owner"
    CARETAKER = "caretaker"
    MANAGER = "manager"
    HOST = "host"
    AGENT = "agent"
    ADMIN = "admin"
    MODERATOR = "moderator"
    VERIFICATION_OFFICER = "verification_officer"
    SUPERADMIN = "superadmin"


class User(IdMixin, TimestampMixin, ActiveMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=True)
    phone_country_code: Mapped[str] = mapped_column(String(5), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    other_names: Mapped[str] = mapped_column(String(200), nullable=True)

    hashed_password: Mapped[str] = mapped_column(String(255), nullable=True)
    # Role is intentionally nullable: users who sign up via Google (or another
    # federated provider) start with no role and MUST complete role selection
    # before they can use role-restricted features. Self-service registration
    # only permits student/tenant/owner/agent; caretaker/manager/host/admin/
    # moderator/verification_officer/superadmin are assigned by other flows.
    role: Mapped[Optional[UserRole]] = mapped_column(
        SAEnum(UserRole), nullable=True
    )

    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified_owner: Mapped[bool] = mapped_column(Boolean, default=False)
    is_identity_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_badge: Mapped[bool] = mapped_column(Boolean, default=False)

    google_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
    apple_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)

    avatar_url: Mapped[str] = mapped_column(String(500), nullable=True)
    bio: Mapped[str] = mapped_column(Text, nullable=True)

    national_id_number: Mapped[str] = mapped_column(String(50), nullable=True)
    kra_pin: Mapped[str] = mapped_column(String(50), nullable=True)
    business_certificate_url: Mapped[str] = mapped_column(String(500), nullable=True)
    title_deed_url: Mapped[str] = mapped_column(String(500), nullable=True)

    mpesa_number: Mapped[str] = mapped_column(String(20), nullable=True)
    mpesa_number_country_code: Mapped[str] = mapped_column(String(5), nullable=True)

    trust_score: Mapped[float] = mapped_column(Float, default=100.0)
    total_successful_rentals: Mapped[int] = mapped_column(Integer, default=0)
    total_scam_reports: Mapped[int] = mapped_column(Integer, default=0)
    total_suspensions: Mapped[int] = mapped_column(Integer, default=0)
    total_reviews_received: Mapped[int] = mapped_column(Integer, default=0)

    last_login_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    last_active_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    premium_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    two_factor_secret: Mapped[str] = mapped_column(String(255), nullable=True)

    user_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)

    properties = relationship(
        "Property", back_populates="owner",
        foreign_keys="Property.owner_id", lazy="selectin",
    )
    devices = relationship("UserDevice", back_populates="user", lazy="selectin")
    sessions = relationship("UserSession", back_populates="user", lazy="selectin")
    verifications = relationship(
        "UserVerification", back_populates="user",
        foreign_keys="UserVerification.user_id", lazy="selectin",
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def is_superuser(self) -> bool:
        return self.role in (UserRole.SUPERADMIN, UserRole.ADMIN)


class UserVerification(IdMixin, TimestampMixin, Base):
    __tablename__ = "user_verifications"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    verification_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    document_url: Mapped[str] = mapped_column(String(500), nullable=True)
    selfie_url: Mapped[str] = mapped_column(String(500), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    verified_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str] = mapped_column(Text, nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)

    user = relationship("User", back_populates="verifications", foreign_keys=[user_id])


class UserDevice(IdMixin, TimestampMixin, Base):
    __tablename__ = "user_devices"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    device_id: Mapped[str] = mapped_column(String(255), nullable=False)
    device_type: Mapped[str] = mapped_column(String(50), nullable=True)
    device_name: Mapped[str] = mapped_column(String(255), nullable=True)
    os_version: Mapped[str] = mapped_column(String(50), nullable=True)
    app_version: Mapped[str] = mapped_column(String(20), nullable=True)
    fcm_token: Mapped[str] = mapped_column(String(500), nullable=True)
    is_trusted: Mapped[bool] = mapped_column(Boolean, default=False)
    last_ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    is_rooted: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="devices")


class UserSession(IdMixin, TimestampMixin, Base):
    __tablename__ = "user_sessions"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    refresh_token: Mapped[str] = mapped_column(String(500), nullable=False)
    access_token: Mapped[str] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str] = mapped_column(String(500), nullable=True)
    device_id: Mapped[str] = mapped_column(String(255), nullable=True)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user = relationship("User", back_populates="sessions")

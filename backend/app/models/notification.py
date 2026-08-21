from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, ForeignKey, JSON, Integer
)
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, IdMixin, utcnow


class Notification(IdMixin, TimestampMixin, Base):
    __tablename__ = "notifications"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=True)

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    reference_id: Mapped[str] = mapped_column(String(36), nullable=True)
    reference_type: Mapped[str] = mapped_column(String(50), nullable=True)

    image_url: Mapped[str] = mapped_column(String(500), nullable=True)
    action_url: Mapped[str] = mapped_column(String(500), nullable=True)

    is_push_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    is_email_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    is_sms_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    notification_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    user = relationship("User", foreign_keys=[user_id])


class NotificationPreference(IdMixin, TimestampMixin, Base):
    __tablename__ = "notification_preferences"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True, unique=True
    )
    push_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sms_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    booking_reminders: Mapped[bool] = mapped_column(Boolean, default=True)
    message_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    review_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    scam_report_updates: Mapped[bool] = mapped_column(Boolean, default=True)
    promotional_emails: Mapped[bool] = mapped_column(Boolean, default=False)
    vacancy_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    price_drop_alerts: Mapped[bool] = mapped_column(Boolean, default=True)

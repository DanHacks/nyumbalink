from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, String, Boolean, Text, Integer, Float, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, declarative_mixin
import uuid
from geoalchemy2 import Geometry

from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


def utcnow():
    return datetime.now(timezone.utc)


@declarative_mixin
class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
    deleted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)


@declarative_mixin
class IdMixin:
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )


@declarative_mixin
class ActiveMixin:
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

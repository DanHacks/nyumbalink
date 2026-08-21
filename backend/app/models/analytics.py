from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, Float, ForeignKey, JSON, Integer, Date
)
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, IdMixin, utcnow


class PropertyView(IdMixin, TimestampMixin, Base):
    __tablename__ = "property_views"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )
    session_id: Mapped[str] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str] = mapped_column(String(500), nullable=True)
    referrer: Mapped[str] = mapped_column(String(500), nullable=True)
    device_type: Mapped[str] = mapped_column(String(50), nullable=True)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(50), nullable=True)


class PropertyClick(IdMixin, TimestampMixin, Base):
    __tablename__ = "property_clicks"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    click_type: Mapped[str] = mapped_column(String(50), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class PropertyCall(IdMixin, TimestampMixin, Base):
    __tablename__ = "property_calls"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    caller_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    caller_phone: Mapped[str] = mapped_column(String(20), nullable=True)
    call_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=True)
    call_status: Mapped[str] = mapped_column(String(20), nullable=True)


class PropertyWhatsAppClick(IdMixin, TimestampMixin, Base):
    __tablename__ = "property_whatsapp_clicks"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    message_sent: Mapped[bool] = mapped_column(Boolean, default=False)


class OwnerAnalytics(IdMixin, TimestampMixin, Base):
    __tablename__ = "owner_analytics"

    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)

    total_views: Mapped[int] = mapped_column(Integer, default=0)
    unique_views: Mapped[int] = mapped_column(Integer, default=0)
    total_clicks: Mapped[int] = mapped_column(Integer, default=0)
    total_calls: Mapped[int] = mapped_column(Integer, default=0)
    total_whatsapp_clicks: Mapped[int] = mapped_column(Integer, default=0)
    total_bookings: Mapped[int] = mapped_column(Integer, default=0)
    total_favourites: Mapped[int] = mapped_column(Integer, default=0)

    occupancy_rate: Mapped[float] = mapped_column(Float, nullable=True)
    average_time_to_rent: Mapped[float] = mapped_column(Float, nullable=True)

    revenue_estimate: Mapped[float] = mapped_column(Float, default=0.0)
    ad_spend: Mapped[float] = mapped_column(Float, default=0.0)

    report_data: Mapped[dict] = mapped_column(JSON, default=dict)


class SearchLog(IdMixin, TimestampMixin, Base):
    __tablename__ = "search_logs"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )
    session_id: Mapped[str] = mapped_column(String(100), nullable=True)

    query_text: Mapped[str] = mapped_column(String(500), nullable=True)
    filters: Mapped[dict] = mapped_column(JSON, default=dict)

    property_type: Mapped[str] = mapped_column(String(50), nullable=True)
    house_type: Mapped[str] = mapped_column(String(50), nullable=True)
    min_price: Mapped[float] = mapped_column(Float, nullable=True)
    max_price: Mapped[float] = mapped_column(Float, nullable=True)
    location_lat: Mapped[float] = mapped_column(Float, nullable=True)
    location_lon: Mapped[float] = mapped_column(Float, nullable=True)
    radius_km: Mapped[float] = mapped_column(Float, nullable=True)

    results_count: Mapped[int] = mapped_column(Integer, nullable=True)
    clicked_property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=True
    )

    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)

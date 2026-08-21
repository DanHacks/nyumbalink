from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, Float, ForeignKey, JSON, Integer
)
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, IdMixin, ActiveMixin, utcnow


class AdCampaign(IdMixin, TimestampMixin, ActiveMixin, Base):
    __tablename__ = "ad_campaigns"

    advertiser_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    campaign_name: Mapped[str] = mapped_column(String(255), nullable=False)
    campaign_type: Mapped[str] = mapped_column(String(50), nullable=False)

    target_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    image_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    video_url: Mapped[str] = mapped_column(String(1000), nullable=True)

    budget: Mapped[float] = mapped_column(Float, nullable=False)
    spent: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="KES")

    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    end_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    target_location: Mapped[str] = mapped_column(String(255), nullable=True)
    target_property_type: Mapped[str] = mapped_column(String(50), nullable=True)
    target_audience: Mapped[dict] = mapped_column(JSON, default=dict)

    impressions: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    ctr: Mapped[float] = mapped_column(Float, default=0.0)

    status: Mapped[str] = mapped_column(String(20), default="active")

    advertiser = relationship("User", foreign_keys=[advertiser_id])


class AdImpression(IdMixin, TimestampMixin, Base):
    __tablename__ = "ad_impressions"

    campaign_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ad_campaigns.id"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str] = mapped_column(String(500), nullable=True)
    page_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    device_type: Mapped[str] = mapped_column(String(50), nullable=True)


class AdClick(IdMixin, TimestampMixin, Base):
    __tablename__ = "ad_clicks"

    campaign_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ad_campaigns.id"), nullable=False, index=True
    )
    impression_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ad_impressions.id"), nullable=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str] = mapped_column(String(500), nullable=True)
    click_cost: Mapped[float] = mapped_column(Float, default=0.0)


class FeaturedListing(IdMixin, TimestampMixin, Base):
    __tablename__ = "featured_listings"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    payment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("payments.id"), nullable=True
    )

    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)

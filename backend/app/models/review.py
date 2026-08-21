from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, Float, Enum as SAEnum,
    ForeignKey, JSON, Integer
)
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, IdMixin, ActiveMixin, utcnow


class Review(IdMixin, TimestampMixin, ActiveMixin, Base):
    __tablename__ = "reviews"

    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    room_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rooms.id"), nullable=True, index=True
    )
    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bookings.id"), nullable=True
    )

    overall_rating: Mapped[float] = mapped_column(Float, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=True)
    comment: Mapped[str] = mapped_column(Text, nullable=True)

    is_verified_tenant: Mapped[bool] = mapped_column(Boolean, default=False)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)

    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    helpful_count: Mapped[int] = mapped_column(Integer, default=0)

    tenant = relationship("User", foreign_keys=[tenant_id])
    categories = relationship("ReviewCategory", back_populates="review", lazy="selectin")
    media = relationship("ReviewMedia", back_populates="review", lazy="selectin")


class ReviewCategory(IdMixin, Base):
    __tablename__ = "review_categories"

    review_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("reviews.id"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    rating: Mapped[float] = mapped_column(Float, nullable=False)

    review = relationship("Review", back_populates="categories")


class ReviewMedia(IdMixin, TimestampMixin, Base):
    __tablename__ = "review_media"

    review_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("reviews.id"), nullable=False, index=True
    )
    media_type: Mapped[str] = mapped_column(String(10), nullable=False)
    storage_url: Mapped[str] = mapped_column(String(1000), nullable=False)

    review = relationship("Review", back_populates="media")


class PropertyHealthScore(IdMixin, TimestampMixin, Base):
    __tablename__ = "property_health_scores"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True, unique=True
    )
    water_score: Mapped[float] = mapped_column(Float, nullable=True)
    road_score: Mapped[float] = mapped_column(Float, nullable=True)
    security_score: Mapped[float] = mapped_column(Float, nullable=True)
    internet_score: Mapped[float] = mapped_column(Float, nullable=True)
    parking_score: Mapped[float] = mapped_column(Float, nullable=True)
    noise_score: Mapped[float] = mapped_column(Float, nullable=True)
    cleanliness_score: Mapped[float] = mapped_column(Float, nullable=True)
    lighting_score: Mapped[float] = mapped_column(Float, nullable=True)
    accessibility_score: Mapped[float] = mapped_column(Float, nullable=True)
    overall_score: Mapped[float] = mapped_column(Float, nullable=True)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

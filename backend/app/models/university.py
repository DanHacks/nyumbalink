from sqlalchemy import (
    String, Boolean, Float, ForeignKey, Integer
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.models.base import Base, TimestampMixin, IdMixin, ActiveMixin


class University(IdMixin, TimestampMixin, ActiveMixin, Base):
    __tablename__ = "universities"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    short_name: Mapped[str] = mapped_column(String(50), nullable=True)
    county: Mapped[str] = mapped_column(String(100), nullable=True, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=True)
    website: Mapped[str] = mapped_column(String(500), nullable=True)
    logo_url: Mapped[str] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)

    campuses = relationship(
        "Campus", back_populates="university", lazy="selectin"
    )


class Campus(IdMixin, TimestampMixin, ActiveMixin, Base):
    __tablename__ = "campuses"

    university_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("universities.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=True)
    address: Mapped[str] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    student_population: Mapped[int] = mapped_column(Integer, nullable=True)

    university = relationship("University", back_populates="campuses")

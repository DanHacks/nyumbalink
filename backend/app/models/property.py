from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, Float, Enum as SAEnum,
    ForeignKey, JSON, Integer, Numeric
)
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry
from app.models.base import Base, TimestampMixin, IdMixin, ActiveMixin, utcnow
import enum


class PropertyType(str, enum.Enum):
    APARTMENT = "apartment"
    HOUSE = "house"
    HOSTEL = "hostel"
    GUEST_HOUSE = "guest_house"
    AIRBNB = "airbnb"
    COMMERCIAL = "commercial"
    LAND = "land"
    OFFICE = "office"
    WAREHOUSE = "warehouse"
    STUDENT_HOUSING = "student_housing"


class HouseType(str, enum.Enum):
    BEDSITTER = "bedsitter"
    ONE_BEDROOM = "one_bedroom"
    TWO_BEDROOM = "two_bedroom"
    THREE_BEDROOM = "three_bedroom"
    FOUR_BEDROOM = "four_bedroom"
    STUDIO = "studio"
    SHARED = "shared"
    DUPLEX = "duplex"
    SINGLE_ROOM = "single_room"
    MAISONETTE = "maisonette"
    VILLA = "villa"
    TOWNHOUSE = "townhouse"


class OccupancyStatus(str, enum.Enum):
    VACANT = "vacant"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    MAINTENANCE = "maintenance"
    COMING_SOON = "coming_soon"


class PropertyStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED = "verified"
    FLAGGED = "flagged"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"


class Property(IdMixin, TimestampMixin, ActiveMixin, Base):
    __tablename__ = "properties"

    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    caretaker_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )
    manager_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )

    property_type: Mapped[PropertyType] = mapped_column(
        SAEnum(PropertyType), nullable=False
    )
    property_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    year_built: Mapped[int] = mapped_column(Integer, nullable=True)

    location: Mapped[str] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    plus_code: Mapped[str] = mapped_column(String(100), nullable=True)
    what3words: Mapped[str] = mapped_column(String(100), nullable=True)

    address_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line2: Mapped[str] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    county: Mapped[str] = mapped_column(String(100), nullable=False)
    sub_county: Mapped[str] = mapped_column(String(100), nullable=True)
    ward: Mapped[str] = mapped_column(String(100), nullable=True)
    constituency: Mapped[str] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=True)
    landmark: Mapped[str] = mapped_column(String(255), nullable=True)

    property_code: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )

    status: Mapped[PropertyStatus] = mapped_column(
        SAEnum(PropertyStatus), default=PropertyStatus.DRAFT, nullable=False
    )

    min_rent: Mapped[float] = mapped_column(Float, nullable=True)
    max_rent: Mapped[float] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="KES")

    total_rooms: Mapped[int] = mapped_column(Integer, default=0)
    vacant_rooms: Mapped[int] = mapped_column(Integer, default=0)
    last_vacancy_update: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    has_verified_photos: Mapped[bool] = mapped_column(Boolean, default=False)
    has_video: Mapped[bool] = mapped_column(Boolean, default=False)
    has_360_tour: Mapped[bool] = mapped_column(Boolean, default=False)

    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    featured_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    total_views: Mapped[int] = mapped_column(Integer, default=0)
    total_clicks: Mapped[int] = mapped_column(Integer, default=0)
    total_bookings: Mapped[int] = mapped_column(Integer, default=0)

    occupancy_rate: Mapped[float] = mapped_column(Float, default=0.0)
    average_stay_months: Mapped[float] = mapped_column(Float, nullable=True)
    average_time_to_rent_days: Mapped[float] = mapped_column(Float, nullable=True)

    trust_score: Mapped[float] = mapped_column(Float, default=50.0)
    average_rating: Mapped[float] = mapped_column(Float, default=0.0)
    location_privacy: Mapped[str] = mapped_column(
        String(20), default="approximate", nullable=False
    )

    property_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)

    owner = relationship("User", back_populates="properties", foreign_keys=[owner_id])
    caretaker = relationship("User", foreign_keys=[caretaker_id])
    manager = relationship("User", foreign_keys=[manager_id])
    buildings = relationship("Building", back_populates="property", lazy="selectin")
    photos = relationship(
        "VerificationPhoto", back_populates="property", lazy="selectin",
        foreign_keys="VerificationPhoto.property_id"
    )
    videos = relationship(
        "WalkthroughVideo", back_populates="property", lazy="selectin"
    )
    nearby_places = relationship("PropertyNearbyPlace", back_populates="property", lazy="selectin")
    history = relationship("PropertyHistory", back_populates="property", lazy="selectin")


class Building(IdMixin, TimestampMixin, ActiveMixin, Base):
    __tablename__ = "buildings"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    building_name: Mapped[str] = mapped_column(String(255), nullable=False)
    building_code: Mapped[str] = mapped_column(String(50), nullable=True)
    total_floors: Mapped[int] = mapped_column(Integer, default=0)
    total_rooms: Mapped[int] = mapped_column(Integer, default=0)
    vacant_rooms: Mapped[int] = mapped_column(Integer, default=0)

    property = relationship("Property", back_populates="buildings")
    floors = relationship("Floor", back_populates="building", lazy="selectin")


class Floor(IdMixin, TimestampMixin, ActiveMixin, Base):
    __tablename__ = "floors"

    building_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("buildings.id"), nullable=False, index=True
    )
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    floor_name: Mapped[str] = mapped_column(String(100), nullable=True)
    total_rooms: Mapped[int] = mapped_column(Integer, default=0)
    vacant_rooms: Mapped[int] = mapped_column(Integer, default=0)

    building = relationship("Building", back_populates="floors")
    rooms = relationship("Room", back_populates="floor", lazy="selectin")


class Room(IdMixin, TimestampMixin, ActiveMixin, Base):
    __tablename__ = "rooms"

    building_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("buildings.id"), nullable=False, index=True
    )
    floor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("floors.id"), nullable=False, index=True
    )
    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    caretaker_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )

    room_number: Mapped[str] = mapped_column(String(50), nullable=False)
    room_name: Mapped[str] = mapped_column(String(255), nullable=True)
    house_type: Mapped[HouseType] = mapped_column(SAEnum(HouseType), nullable=False)

    rent_amount: Mapped[float] = mapped_column(Float, nullable=False)
    deposit_amount: Mapped[float] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="KES")
    negotiable: Mapped[bool] = mapped_column(Boolean, default=False)

    occupancy_status: Mapped[OccupancyStatus] = mapped_column(
        SAEnum(OccupancyStatus), default=OccupancyStatus.VACANT, nullable=False
    )

    size_sqm: Mapped[float] = mapped_column(Float, nullable=True)
    furnishing: Mapped[str] = mapped_column(
        String(20), default="unfurnished", nullable=True
    )

    water_available: Mapped[bool] = mapped_column(Boolean, default=False)
    electricity_available: Mapped[bool] = mapped_column(Boolean, default=False)
    internet_available: Mapped[bool] = mapped_column(Boolean, default=False)
    parking_available: Mapped[bool] = mapped_column(Boolean, default=False)
    security_available: Mapped[bool] = mapped_column(Boolean, default=False)

    pet_friendly: Mapped[bool] = mapped_column(Boolean, default=False)
    student_friendly: Mapped[bool] = mapped_column(Boolean, default=False)
    family_friendly: Mapped[bool] = mapped_column(Boolean, default=False)

    last_occupied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_vacated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expected_vacancy_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    previous_rent: Mapped[float] = mapped_column(Float, nullable=True)
    total_tenants: Mapped[int] = mapped_column(Integer, default=0)
    average_stay_months: Mapped[float] = mapped_column(Float, nullable=True)

    room_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    floor = relationship("Floor", back_populates="rooms")
    building = relationship("Building")
    property_rel = relationship("Property")
    amenities = relationship("RoomAmenity", back_populates="room", lazy="selectin")


class RoomAmenity(IdMixin, TimestampMixin, Base):
    __tablename__ = "room_amenities"

    room_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rooms.id"), nullable=False, index=True
    )
    amenity_name: Mapped[str] = mapped_column(String(100), nullable=False)
    amenity_category: Mapped[str] = mapped_column(String(50), nullable=True)

    room = relationship("Room", back_populates="amenities")


class PropertyNearbyPlace(IdMixin, TimestampMixin, Base):
    __tablename__ = "property_nearby_places"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    place_type: Mapped[str] = mapped_column(String(50), nullable=False)
    place_name: Mapped[str] = mapped_column(String(255), nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)

    property = relationship("Property", back_populates="nearby_places")


class PropertyHistory(IdMixin, TimestampMixin, Base):
    __tablename__ = "property_histories"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    previous_value: Mapped[str] = mapped_column(Text, nullable=True)
    new_value: Mapped[str] = mapped_column(Text, nullable=True)
    changed_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    property = relationship("Property", back_populates="history")

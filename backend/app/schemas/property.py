from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class LocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    plus_code: Optional[str] = None
    what3words: Optional[str] = None


class AddressRequest(BaseModel):
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    county: str
    sub_county: Optional[str] = None
    ward: Optional[str] = None
    constituency: Optional[str] = None
    postal_code: Optional[str] = None
    landmark: Optional[str] = None


class PropertyCreate(BaseModel):
    property_type: str
    property_name: str
    description: Optional[str] = None
    year_built: Optional[int] = None
    location: LocationRequest
    address: AddressRequest
    location_privacy: str = "PUBLIC"


class PropertyUpdate(BaseModel):
    property_name: Optional[str] = None
    description: Optional[str] = None
    year_built: Optional[int] = None
    address: Optional[AddressRequest] = None
    location_privacy: Optional[str] = None


class BuildingCreate(BaseModel):
    building_name: str
    building_code: Optional[str] = None
    total_floors: int = 1


class FloorCreate(BaseModel):
    floor_number: int
    floor_name: Optional[str] = None


class RoomCreate(BaseModel):
    building_id: str
    floor_id: str
    room_number: str
    room_name: Optional[str] = None
    house_type: str
    rent_amount: float
    deposit_amount: Optional[float] = None
    negotiable: bool = False
    size_sqm: Optional[float] = None
    furnishing: str = "unfurnished"
    water_available: bool = False
    electricity_available: bool = False
    internet_available: bool = False
    parking_available: bool = False
    security_available: bool = False
    pet_friendly: bool = False
    student_friendly: bool = False
    family_friendly: bool = False


class RoomUpdate(BaseModel):
    rent_amount: Optional[float] = None
    deposit_amount: Optional[float] = None
    negotiable: Optional[bool] = None
    occupancy_status: Optional[str] = None
    furnishing: Optional[str] = None


class PropertyResponse(BaseModel):
    id: str
    property_type: str
    property_name: str
    property_code: str
    status: str
    latitude: float
    longitude: float
    city: str
    county: str
    min_rent: Optional[float]
    max_rent: Optional[float]
    currency: str
    total_rooms: int
    vacant_rooms: int
    last_vacancy_update: Optional[datetime]
    has_verified_photos: bool
    has_video: bool
    is_featured: bool
    total_views: int
    occupancy_rate: float
    created_at: datetime

    class Config:
        from_attributes = True


class PropertyDetailResponse(PropertyResponse):
    description: Optional[str]
    year_built: Optional[int]
    address_line1: str
    address_line2: Optional[str]
    sub_county: Optional[str]
    ward: Optional[str]
    constituency: Optional[str]
    landmark: Optional[str]
    owner: Optional[Dict[str, Any]]
    buildings: List[Dict[str, Any]] = []
    photos: List[Dict[str, Any]] = []
    nearby_places: List[Dict[str, Any]] = []


class RoomResponse(BaseModel):
    id: str
    room_number: str
    room_name: Optional[str]
    house_type: str
    rent_amount: float
    deposit_amount: Optional[float]
    currency: str
    occupancy_status: str
    furnishing: Optional[str]
    size_sqm: Optional[float]
    water_available: bool
    electricity_available: bool
    internet_available: bool
    parking_available: bool
    pet_friendly: bool
    student_friendly: bool
    building_name: Optional[str] = None
    floor_number: Optional[int] = None

    class Config:
        from_attributes = True


class PropertySearchParams(BaseModel):
    query: Optional[str] = None
    property_type: Optional[str] = None
    house_type: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    county: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = None
    pet_friendly: Optional[bool] = None
    student_friendly: Optional[bool] = None
    parking: Optional[bool] = None
    internet: Optional[bool] = None
    water: Optional[bool] = None
    verified_only: bool = False
    has_photos: bool = True
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: str = "created_at"
    sort_order: str = "desc"

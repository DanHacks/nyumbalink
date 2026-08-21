from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.models.property import (
    Property, Building, Floor, Room, PropertyStatus, OccupancyStatus,
)
from app.models.media import VerificationPhoto, VerificationStatus
from typing import List, Optional
from datetime import datetime, timezone


class PropertyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_vacancy_counts(self, property_id: str):
        result = await self.db.execute(
            select(func.count(Room.id)).where(
                Room.property_id == property_id,
                Room.occupancy_status == OccupancyStatus.VACANT,
                Room.is_active == True,
                Room.is_archived == False,
            )
        )
        vacant = result.scalar() or 0

        total_result = await self.db.execute(
            select(func.count(Room.id)).where(
                Room.property_id == property_id,
                Room.is_active == True,
                Room.is_archived == False,
            )
        )
        total = total_result.scalar() or 0

        occupancy = ((total - vacant) / total * 100) if total > 0 else 0

        await self.db.execute(
            update(Property).where(Property.id == property_id).values(
                vacant_rooms=vacant,
                total_rooms=total,
                occupancy_rate=round(occupancy, 2),
                last_vacancy_update=datetime.now(timezone.utc),
            )
        )

    async def update_building_vacancy(self, building_id: str):
        room_result = await self.db.execute(
            select(
                func.count(Room.id),
                func.sum(case((Room.occupancy_status == OccupancyStatus.VACANT, 1), else_=0)),
            ).where(
                Room.building_id == building_id,
                Room.is_active == True,
                Room.is_archived == False,
            )
        )
        total, vacant = room_result.one()
        vacant = vacant or 0

        await self.db.execute(
            update(Building).where(Building.id == building_id).values(
                total_rooms=total,
                vacant_rooms=vacant,
            )
        )

    async def can_verify_property(self, property_id: str) -> tuple:
        prop = await self.db.get(Property, property_id)
        if not prop:
            return False, "Property not found"

        photos = await self.db.execute(
            select(VerificationPhoto).where(
                VerificationPhoto.property_id == property_id,
                VerificationPhoto.verification_status == VerificationStatus.APPROVED,
                VerificationPhoto.is_replacement == False,
            )
        )
        approved_photos = photos.scalars().all()

        if len(approved_photos) < 12:
            return False, f"Minimum 12 approved photos required (have {len(approved_photos)})"

        return True, "Ready to verify"

    async def get_property_code(self, county: str, city: str) -> str:
        import uuid
        county_code = county[:3].upper()
        city_code = city[:3].upper()
        unique = str(uuid.uuid4())[:6].upper()
        return f"NL-{county_code}-{city_code}-{unique}"

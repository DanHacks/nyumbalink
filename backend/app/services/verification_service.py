from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.media import VerificationPhoto, PhotoMetadata, VerificationStatus, PhotoCategory
from app.models.property import Property, PropertyStatus
from app.models.scam import FraudHit
from typing import List, Optional
from datetime import datetime, timezone


class VerificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def verify_photo_metadata(self, photo: VerificationPhoto) -> dict:
        flags = []
        confidence = 1.0

        if not photo.metadata_id:
            return {"is_authentic": False, "confidence": 0.0, "flags": ["no_metadata"]}

        metadata = await self.db.get(PhotoMetadata, photo.metadata_id)
        if not metadata:
            return {"is_authentic": False, "confidence": 0.0, "flags": ["metadata_not_found"]}

        prop = await self.db.get(Property, photo.property_id)
        if prop:
            lat_diff = abs(metadata.latitude - prop.latitude)
            lon_diff = abs(metadata.longitude - prop.longitude)

            if lat_diff > 0.01 or lon_diff > 0.01:
                flags.append("gps_mismatch")
                confidence -= 0.3

            if lat_diff > 0.1 or lon_diff > 0.1:
                flags.append("gps_location_differs_significantly")
                confidence -= 0.3

        if metadata.is_gps_fake:
            flags.append("gps_spoofed")
            confidence -= 0.5

        return {
            "is_authentic": confidence >= 0.5,
            "confidence": max(0.0, confidence),
            "flags": flags,
        }

    async def check_duplicate_photo(self, file_hash: str, property_id: str) -> bool:
        result = await self.db.execute(
            select(VerificationPhoto).where(
                VerificationPhoto.file_hash == file_hash,
                VerificationPhoto.property_id != property_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def check_existing_property_at_location(
        self, latitude: float, longitude: float, owner_id: str
    ) -> bool:
        result = await self.db.execute(
            select(Property).where(
                Property.owner_id == owner_id,
                func.abs(Property.latitude - latitude) < 0.0001,
                func.abs(Property.longitude - longitude) < 0.0001,
                Property.is_active == True,
                Property.is_archived == False,
            )
        )
        return result.scalar_one_or_none() is not None

    async def flag_fraud(
        self,
        property_id: str,
        fraud_type: str,
        severity: str,
        confidence: float,
        description: str,
        photo_id: Optional[str] = None,
        owner_id: Optional[str] = None,
    ):
        fraud = FraudHit(
            property_id=property_id,
            photo_id=photo_id,
            owner_id=owner_id,
            fraud_type=fraud_type,
            severity=severity,
            confidence=confidence,
            description=description,
            detected_by="ai_verification",
            detected_at=datetime.now(timezone.utc),
        )
        self.db.add(fraud)
        return fraud

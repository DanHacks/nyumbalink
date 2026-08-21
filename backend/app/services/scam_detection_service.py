from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.scam import ScamReport, ScamReportStatus, FraudHit, OwnerTrustScore
from app.models.user import User
from app.models.property import Property, PropertyStatus
from typing import Optional
from datetime import datetime, timezone


class ScamDetectionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_owner_trust_score(self, owner_id: str) -> float:
        owner = await self.db.get(User, owner_id)
        if not owner:
            return 0.0

        score = 100.0

        if owner.is_identity_verified:
            score += 10
        if owner.verification_badge:
            score += 5
        if owner.total_successful_rentals > 0:
            score += min(owner.total_successful_rentals * 2, 20)

        score -= owner.total_scam_reports * 15
        score -= owner.total_suspensions * 25

        result = await self.db.execute(
            select(func.count(ScamReport.id)).where(
                ScamReport.owner_id == owner_id,
                ScamReport.status == ScamReportStatus.CONFIRMED,
            )
        )
        confirmed_reports = result.scalar() or 0
        score -= confirmed_reports * 10

        trust_score = await self.db.execute(
            select(OwnerTrustScore).where(
                OwnerTrustScore.owner_id == owner_id
            )
        )
        existing = trust_score.scalar_one_or_none()

        if existing:
            existing.overall_score = max(0.0, min(100.0, score))
            existing.calculated_at = datetime.now(timezone.utc)
            existing.total_reports = confirmed_reports
            existing.total_suspensions = owner.total_suspensions
        else:
            new_score = OwnerTrustScore(
                owner_id=owner_id,
                overall_score=max(0.0, min(100.0, score)),
                total_reports=confirmed_reports,
                total_suspensions=owner.total_suspensions,
            )
            self.db.add(new_score)

        return max(0.0, min(100.0, score))

    async def check_duplicate_listing(
        self, property_id: str, latitude: float, longitude: float
    ) -> bool:
        result = await self.db.execute(
            select(Property).where(
                Property.id != property_id,
                func.abs(Property.latitude - latitude) < 0.0005,
                func.abs(Property.longitude - longitude) < 0.0005,
                Property.is_active == True,
                Property.is_archived == False,
            )
        )
        return result.scalar_one_or_none() is not None

    async def check_suspicious_owner_behavior(self, owner_id: str) -> dict:
        risk_factors = []
        risk_score = 0

        owner = await self.db.get(User, owner_id)
        if not owner:
            return {"risk_score": 100, "risk_factors": ["user_not_found"]}

        days_since_creation = (
            datetime.now(timezone.utc) - owner.created_at
        ).days if owner.created_at else 0

        if days_since_creation < 7:
            risk_factors.append("new_account")
            risk_score += 15

        if not owner.is_phone_verified:
            risk_factors.append("phone_not_verified")
            risk_score += 10

        if not owner.is_email_verified:
            risk_factors.append("email_not_verified")
            risk_score += 10

        if owner.total_scam_reports > 3:
            risk_factors.append("multiple_scam_reports")
            risk_score += 30

        properties = await self.db.execute(
            select(func.count(Property.id)).where(
                Property.owner_id == owner_id,
                Property.is_active == True,
            )
        )
        active_properties = properties.scalar() or 0

        if active_properties > 50 and days_since_creation < 30:
            risk_factors.append("rapid_listing_growth")
            risk_score += 20

        return {
            "risk_score": min(100, risk_score),
            "risk_level": "high" if risk_score >= 50 else "medium" if risk_score >= 20 else "low",
            "risk_factors": risk_factors,
        }

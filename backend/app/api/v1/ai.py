from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.models.user import User
from app.models.media import VerificationPhoto, VerificationStatus, PhotoMetadata
from app.models.property import Property, PropertyStatus
from app.models.scam import FraudHit
from app.models.trust import PropertyRecommendation
from app.schemas.verification import AIVerificationResult
from app.services.safety_service import blacklist_exclusion, record_audit
from datetime import datetime, timezone
import hashlib

router = APIRouter()


@router.post("/verify-photo", response_model=AIVerificationResult)
async def ai_verify_photo(
    photo_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VerificationPhoto).where(VerificationPhoto.id == photo_id)
    )
    photo = result.scalar_one_or_none()

    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    if photo.uploaded_by != current_user.id and current_user.role.value not in ("verification_officer", "admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only run AI checks on your own uploads",
        )

    checks = []
    is_authentic = True
    confidence = 0.95
    flags = []

    if photo.metadata_id:
        metadata_result = await db.execute(
            select(PhotoMetadata).where(PhotoMetadata.id == photo.metadata_id)
        )
        metadata = metadata_result.scalar_one_or_none()

        if metadata:
            if metadata.is_gps_fake:
                flags.append("gps_spoof_detected")
                is_authentic = False
                confidence -= 0.3

            if metadata.gps_spoof_confidence and metadata.gps_spoof_confidence > 0.7:
                flags.append("gps_anomaly")
                confidence -= 0.15

    duplicate_check = await db.execute(
        select(VerificationPhoto).where(
            VerificationPhoto.file_hash == photo.file_hash,
            VerificationPhoto.id != photo.id,
            VerificationPhoto.property_id != photo.property_id,
        )
    )
    duplicate = duplicate_check.scalar_one_or_none()
    if duplicate:
        flags.append("duplicate_image")
        is_authentic = False
        confidence -= 0.5

    same_property_duplicate = await db.execute(
        select(VerificationPhoto).where(
            VerificationPhoto.file_hash == photo.file_hash,
            VerificationPhoto.id != photo.id,
            VerificationPhoto.property_id == photo.property_id,
            VerificationPhoto.category == photo.category,
        )
    )
    if same_property_duplicate.scalar_one_or_none():
        flags.append("same_category_duplicate")
        confidence -= 0.1

    photo.ai_verified = True
    photo.ai_confidence = max(0.0, confidence)
    photo.ai_flags = {"flags": flags, "checks_performed": checks}

    if not is_authentic or confidence < 0.6:
        photo.verification_status = VerificationStatus.FLAGGED
        fraud = FraudHit(
            property_id=photo.property_id,
            photo_id=photo.id,
            fraud_type="ai_flagged",
            severity="high" if confidence < 0.4 else "medium",
            confidence=max(0.0, confidence),
            detected_by="ai_verification",
            detected_at=datetime.now(timezone.utc),
            evidence={"flags": flags, "checks": checks},
        )
        db.add(fraud)

    return AIVerificationResult(
        photo_id=photo_id,
        is_authentic=is_authentic,
        confidence=max(0.0, confidence),
        flags=flags,
        details={"checks": checks, "verdict": "authentic" if is_authentic else "suspicious"},
    )


@router.post("/detect-duplicates")
async def detect_duplicate_listings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Property).where(
            Property.is_active == True,
            Property.is_archived == False,
        )
    )
    properties = result.scalars().all()

    duplicates = []
    for i, prop1 in enumerate(properties):
        for prop2 in properties[i + 1:]:
            if prop1.owner_id == prop2.owner_id:
                continue
            if (
                abs(prop1.latitude - prop2.latitude) < 0.0001
                and abs(prop1.longitude - prop2.longitude) < 0.0001
            ):
                duplicates.append({
                    "property_1": {"id": prop1.id, "name": prop1.property_name},
                    "property_2": {"id": prop2.id, "name": prop2.property_name},
                    "match_type": "same_location",
                    "confidence": 0.8,
                })

    return {
        "duplicates_found": len(duplicates),
        "duplicates": duplicates,
    }


@router.post("/detect-scam-owner")
async def detect_scam_owner(
    owner_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(User).where(User.id == owner_id)
    )
    owner = result.scalar_one_or_none()

    if not owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")

    risk_factors = []
    risk_score = 0

    if not owner.is_identity_verified:
        risk_factors.append("identity_not_verified")
        risk_score += 20

    if owner.total_scam_reports > 0:
        risk_factors.append(f"{owner.total_scam_reports}_scam_reports")
        risk_score += owner.total_scam_reports * 15

    if owner.total_suspensions > 0:
        risk_factors.append(f"{owner.total_suspensions}_suspensions")
        risk_score += owner.total_suspensions * 25

    if owner.trust_score < 50:
        risk_factors.append("low_trust_score")
        risk_score += 20

    if owner.created_at and (datetime.now(timezone.utc) - owner.created_at).days < 7:
        risk_factors.append("new_account")
        risk_score += 10

    if owner.total_successful_rentals == 0:
        risk_factors.append("no_rental_history")
        risk_score += 10

    return {
        "owner_id": owner_id,
        "risk_score": min(100, risk_score),
        "risk_level": "high" if risk_score >= 50 else "medium" if risk_score >= 20 else "low",
        "risk_factors": risk_factors,
        "trust_score": owner.trust_score,
        "scam_reports": owner.total_scam_reports,
        "suspensions": owner.total_suspensions,
    }


@router.post("/estimate-rent")
async def estimate_rent(
    property_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    prop = result.scalar_one_or_none()

    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    similar = await db.execute(
        select(Property).where(
            Property.property_type == prop.property_type,
            Property.county == prop.county,
            Property.city == prop.city,
            Property.status == PropertyStatus.VERIFIED,
            Property.id != prop.id,
            Property.min_rent.isnot(None),
        ).limit(20)
    )
    similar_properties = similar.scalars().all()

    if similar_properties:
        rents = [p.min_rent for p in similar_properties if p.min_rent]
        avg_rent = sum(rents) / len(rents) if rents else prop.min_rent or 0
        min_similar = min(rents) if rents else 0
        max_similar = max(rents) if rents else 0
    else:
        avg_rent = prop.min_rent or 0
        min_similar = 0
        max_similar = 0

    return {
        "property_id": property_id,
        "estimated_rent": round(avg_rent, 2),
        "rent_range": {
            "min": round(min_similar, 2),
            "max": round(max_similar, 2),
        },
        "similar_properties_analyzed": len(similar_properties),
        "confidence": min(0.9, len(similar_properties) * 0.05),
    }


@router.get("/recommendations/{user_id}")
async def get_recommendations(
    user_id: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Property).where(
            Property.status == PropertyStatus.VERIFIED,
            Property.is_active == True,
            Property.is_archived == False,
            blacklist_exclusion(),
        ).order_by(
            Property.is_featured.desc(),
            Property.trust_score.desc(),
            Property.occupancy_rate.desc(),
        ).limit(limit)
    )
    properties = result.scalars().all()

    recs = []
    for p in properties:
        score = round(
            min(1.0, (p.trust_score or 0) / 100 * 0.6 + (p.average_rating or 0) / 5 * 0.4), 3
        )
        db.add(PropertyRecommendation(
            property_id=p.id,
            user_id=user_id,
            recommendation_type="ai_ranked",
            is_verified_visitor=False,
        ))
        recs.append({
            "id": p.id,
            "property_name": p.property_name,
            "city": p.city,
            "county": p.county,
            "min_rent": p.min_rent,
            "max_rent": p.max_rent,
            "vacant_rooms": p.vacant_rooms,
            "has_verified_photos": p.has_verified_photos,
            "occupancy_rate": p.occupancy_rate,
            "trust_score": p.trust_score,
            "score": score,
        })
    await db.flush()

    return recs

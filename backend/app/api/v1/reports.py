from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.property import Property, PropertyStatus
from app.models.scam import ScamReport, ScamReportMedia, ScamReportStatus
from app.models.trust import (
    PropertyBlacklist, BlacklistState, PropertyAppeal,
)
from app.services.safety_service import (
    refresh_property_blacklist, get_blacklist_entry,
    compute_property_trust, compute_owner_trust, record_audit,
)
from app.services.notification_service import notify
from datetime import datetime, timezone

router = APIRouter()

REPORT_CATEGORIES = [
    "fake_property", "fake_photos", "fake_video", "wrong_location",
    "wrong_rent", "room_unavailable", "owner_fraud", "fake_airbnb",
    "fake_guest_house", "hidden_fees", "payment_scam",
    "misleading_description", "unsafe_property", "harassment", "other",
]

BLACKLIST_STATES = [
    "active", "flagged", "under_review", "restricted",
    "blacklisted", "appealed", "reinstated", "confirmed_blacklist",
]


class ReportRequest(BaseModel):
    report_category: str = Field(..., min_length=3, max_length=50)
    description: str = Field(..., min_length=5, max_length=3000)
    wrong_photos: bool = False
    wrong_rent: bool = False
    wrong_location: bool = False
    occupied_room: bool = False
    broken_house: bool = False
    fake_listing: bool = False
    duplicate_listing: bool = False
    other_issue: bool = False
    visited_at: Optional[str] = None
    reporter_gps_lat: Optional[float] = None
    reporter_gps_lon: Optional[float] = None
    evidence: List[str] = Field(default_factory=list, max_length=5)


class AppealRequest(BaseModel):
    explanation: str = Field(..., min_length=10, max_length=5000)
    updated_photo_urls: List[str] = Field(default_factory=list)
    new_video_url: Optional[str] = None
    property_documents: List[str] = Field(default_factory=list)
    request_physical_inspection: bool = False


@router.post("/properties/{property_id}/reports", status_code=status.HTTP_201_CREATED)
async def create_property_report(
    property_id: str,
    request: ReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    if request.report_category not in REPORT_CATEGORIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report category")

    if prop.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot report your own property",
        )

    existing = await db.execute(
        select(ScamReport).where(
            ScamReport.property_id == property_id,
            ScamReport.reporter_id == current_user.id,
        ).order_by(ScamReport.created_at.desc()).limit(1)
    )
    previous = existing.scalar_one_or_none()
    if previous and previous.status == ScamReportStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already submitted a report for this property that is under review.",
        )

    report = ScamReport(
        reporter_id=current_user.id,
        property_id=property_id,
        owner_id=prop.owner_id,
        status=ScamReportStatus.PENDING,
        report_category=request.report_category,
        description=request.description,
        wrong_photos=request.wrong_photos,
        wrong_rent=request.wrong_rent,
        wrong_location=request.wrong_location,
        occupied_room=request.occupied_room,
        broken_house=request.broken_house,
        fake_listing=request.fake_listing,
        duplicate_listing=request.duplicate_listing,
        other_issue=request.other_issue,
        reporter_gps_lat=request.reporter_gps_lat,
        reporter_gps_lon=request.reporter_gps_lon,
        report_metadata={
            "reporter_trust_score": current_user.trust_score,
            "is_verified_tenant": current_user.is_identity_verified,
        },
    )
    if request.visited_at:
        try:
            parsed = datetime.fromisoformat(str(request.visited_at).replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            report.visited_at = parsed
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="visited_at must be a valid ISO datetime",
            )
    db.add(report)
    await db.flush()

    for evidence_url in request.evidence:
        db.add(ScamReportMedia(
            report_id=report.id,
            media_type="photo",
            storage_url=evidence_url,
            timestamp=datetime.now(timezone.utc),
        ))

    await refresh_property_blacklist(db, property_id)

    entry = await get_blacklist_entry(db, property_id)
    await notify(
        db,
        prop.owner_id,
        "report_submitted",
        "A report was submitted for your property",
        f"{current_user.full_name if hasattr(current_user, 'full_name') else 'A user'} submitted a "
        f"{request.report_category.replace('_', ' ')} report for {prop.property_name}.",
        reference_id=property_id,
        reference_type="property",
    )

    return {
        "id": report.id,
        "message": "Report submitted. NyumbaLink will investigate. Reporter identity stays private.",
        "unique_reports": entry.unique_reporter_count if entry else 1,
        "blacklist_state": entry.state.value if entry else "active",
    }


@router.get("/properties/{property_id}/reports/status")
async def get_property_report_status(
    property_id: str,
    db: AsyncSession = Depends(get_db),
):
    entry = await get_blacklist_entry(db, property_id)

    reports_result = await db.execute(
        select(func.count(ScamReport.id)).where(
            ScamReport.property_id == property_id,
            ScamReport.status.in_([
                ScamReportStatus.CONFIRMED, ScamReportStatus.ACTION_TAKEN,
            ]),
        )
    )
    confirmed_reports = reports_result.scalar() or 0

    if not entry:
        return {
            "property_id": property_id,
            "state": "active",
            "restricted": False,
            "reports_count": confirmed_reports,
            "reason": None,
        }

    restricted = entry.state in (
        BlacklistState.UNDER_REVIEW, BlacklistState.RESTRICTED,
        BlacklistState.BLACKLISTED, BlacklistState.CONFIRMED_BLACKLIST,
    )

    return {
        "property_id": property_id,
        "state": entry.state.value,
        "restricted": restricted,
        "reports_count": confirmed_reports,
        "unique_reporter_count": entry.unique_reporter_count,
        "verified_positive_reviews": entry.verified_positive_reviews,
        "reason": entry.reason,
        "can_appeal": entry.state in (
            BlacklistState.UNDER_REVIEW, BlacklistState.RESTRICTED,
            BlacklistState.BLACKLISTED, BlacklistState.CONFIRMED_BLACKLIST,
        ),
    }


@router.post("/properties/{property_id}/appeals", status_code=status.HTTP_201_CREATED)
async def submit_appeal(
    property_id: str,
    request: AppealRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    if prop.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the property owner can appeal")

    entry = await get_blacklist_entry(db, property_id)
    if not entry or entry.state not in (
        BlacklistState.UNDER_REVIEW, BlacklistState.RESTRICTED,
        BlacklistState.BLACKLISTED, BlacklistState.CONFIRMED_BLACKLIST,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This property is not currently restricted, so no appeal is needed.",
        )

    existing = await db.execute(
        select(PropertyAppeal).where(
            PropertyAppeal.property_id == property_id,
            PropertyAppeal.status == "pending",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a pending appeal for this property.",
        )

    appeal = PropertyAppeal(
        property_id=property_id,
        appellant_id=current_user.id,
        status="pending",
        explanation=request.explanation,
        evidence={
            "updated_photo_urls": request.updated_photo_urls,
            "new_video_url": request.new_video_url,
        },
        documents={"property_documents": request.property_documents},
        request_physical_inspection=request.request_physical_inspection,
    )
    db.add(appeal)

    entry.state = BlacklistState.APPEALED
    await record_audit(
        db, current_user.id, "appeal_submitted",
        resource_type="property_appeal", resource_id=appeal.id,
        details={"property_id": property_id},
    )

    return {
        "appeal_id": appeal.id,
        "message": "Appeal submitted. A moderator will review it.",
    }


@router.get("/properties/{property_id}/trust")
async def get_property_trust(
    property_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    owner_result = await db.execute(
        select(User).where(User.id == prop.owner_id)
    )
    owner = owner_result.scalar_one_or_none()

    property_trust = await compute_property_trust(db, prop)
    owner_trust = await compute_owner_trust(db, owner) if owner else None

    caretaker = None
    if prop.caretaker_id:
        caretaker_result = await db.execute(
            select(User).where(User.id == prop.caretaker_id)
        )
        caretaker_user = caretaker_result.scalar_one_or_none()
        if caretaker_user:
            caretaker = {
                "name": caretaker_user.full_name,
                "score": round(caretaker_user.trust_score, 1),
                "is_verified": caretaker_user.is_identity_verified,
            }

    entry = await get_blacklist_entry(db, property_id)
    verification_level = "BASIC"
    if prop.has_verified_photos:
        verification_level = "VERIFIED"
    if prop.has_verified_photos and prop.has_video and prop.status == PropertyStatus.VERIFIED:
        verification_level = "GOLD"
    if prop.status == PropertyStatus.VERIFIED and prop.has_video and prop.has_verified_photos:
        inspection = (prop.property_metadata or {}).get("physical_inspection")
        if inspection:
            verification_level = "PLATINUM"

    return {
        "property": property_trust,
        "owner": owner_trust,
        "caretaker": caretaker,
        "verification_level": verification_level,
        "blacklist_state": entry.state.value if entry else "active",
        "rating": prop.average_rating,
    }
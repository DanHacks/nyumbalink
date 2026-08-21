from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.property import Property, PropertyStatus
from app.models.review import Review
from app.models.scam import ScamReport, ScamReportStatus
from app.models.trust import (
    PropertyBlacklist, BlacklistState, AuditLog, PropertyAppeal,
)
from app.models.user import User

REPORT_QUALITY_THRESHOLD = 30.0
BLACKLIST_REVIEW_TRIGGER = 10

RESTRICTED_BLACKLIST_STATES = (
    BlacklistState.UNDER_REVIEW,
    BlacklistState.RESTRICTED,
    BlacklistState.BLACKLISTED,
    BlacklistState.CONFIRMED_BLACKLIST,
)


def blacklist_exclusion():
    """SQL condition excluding properties currently restricted/blacklisted."""
    return ~Property.id.in_(
        select(PropertyBlacklist.property_id).where(
            PropertyBlacklist.state.in_(RESTRICTED_BLACKLIST_STATES)
        )
    )


async def record_audit(
    db: AsyncSession,
    actor_id: str,
    action: str,
    resource_type: str = None,
    resource_id: str = None,
    details: dict = None,
):
    db.add(AuditLog(
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
    ))


async def get_blacklist_entry(db: AsyncSession, property_id: str):
    result = await db.execute(
        select(PropertyBlacklist).where(PropertyBlacklist.property_id == property_id)
    )
    return result.scalar_one_or_none()


def _report_quality_score(report: ScamReport) -> float:
    score = 0.0
    description = (report.description or "").strip()
    if len(description) >= 20:
        score += 15
    elif len(description) >= 8:
        score += 8

    bool_flags = [
        report.wrong_photos, report.wrong_rent, report.wrong_location,
        report.occupied_room, report.broken_house, report.fake_listing,
        report.duplicate_listing, report.other_issue,
    ]
    score += min(15, sum(1 for f in bool_flags if f) * 3)

    if report.reporter_gps_lat and report.reporter_gps_lon:
        score += 10

    if report.media and len(report.media) > 0:
        score += min(15, len(report.media) * 5)

    return min(100.0, score)


async def refresh_property_blacklist(db: AsyncSession, property_id: str):
    """Re-evaluate the blacklist state machine after a report or review change.

    Trigger (per spec): >= 10 unique negative reports AND zero verified
    positive experiences AND sufficient report quality -> UNDER_REVIEW, not
    an automatic permanent blacklist.
    """
    entry = await get_blacklist_entry(db, property_id)
    if not entry:
        entry = PropertyBlacklist(property_id=property_id, state=BlacklistState.ACTIVE)
        db.add(entry)
        await db.flush()

    if entry.state in (
        BlacklistState.BLACKLISTED,
        BlacklistState.CONFIRMED_BLACKLIST,
        BlacklistState.REINSTATED,
    ):
        return entry

    reports_result = await db.execute(
        select(ScamReport.reporter_id)
        .where(ScamReport.property_id == property_id)
        .distinct()
    )
    unique_reporters = [row[0] for row in reports_result.all()]

    positive_result = await db.execute(
        select(func.count(Review.id)).where(
            Review.property_id == property_id,
            Review.is_active == True,
            Review.is_verified_tenant == True,
            Review.overall_rating >= 3,
        )
    )
    verified_positive = positive_result.scalar() or 0

    reports_result2 = await db.execute(
        select(ScamReport).where(ScamReport.property_id == property_id)
    )
    reports = reports_result2.scalars().all()
    quality = sum(_report_quality_score(r) for r in reports) / max(1, len(reports))

    entry.unique_reporter_count = len(unique_reporters)
    entry.verified_positive_reviews = verified_positive
    entry.report_quality_score = round(quality, 2)

    if (
        len(unique_reporters) >= BLACKLIST_REVIEW_TRIGGER
        and verified_positive == 0
        and quality >= REPORT_QUALITY_THRESHOLD
    ):
        entry.state = BlacklistState.UNDER_REVIEW
        entry.triggered_at = datetime.now(timezone.utc)
        entry.reason = (
            f"{len(unique_reporters)} unique negative reports with zero verified "
            "positive experiences triggered automated review."
        )
        prop_result = await db.execute(
            select(Property).where(Property.id == property_id)
        )
        prop = prop_result.scalar_one_or_none()
        if prop and prop.status == PropertyStatus.VERIFIED:
            prop.status = PropertyStatus.FLAGGED
        entry.blacklist_metadata["visibility"] = "RESTRICTED"
    elif len(unique_reporters) >= 3 and verified_positive == 0:
        if entry.state == BlacklistState.ACTIVE:
            entry.state = BlacklistState.FLAGGED

    return entry


async def resolve_appeal(
    db: AsyncSession,
    appeal_id: str,
    decision: str,
    decision_notes: str,
    admin: User,
):
    result = await db.execute(
        select(PropertyAppeal).where(PropertyAppeal.id == appeal_id)
    )
    appeal = result.scalar_one_or_none()
    if not appeal:
        return None

    appeal.status = decision
    appeal.decided_by = admin.id
    appeal.decided_at = datetime.now(timezone.utc)
    appeal.decision_notes = decision_notes

    entry = await get_blacklist_entry(db, appeal.property_id)
    if entry:
        if decision == "approved":
            entry.state = BlacklistState.REINSTATED
            prop_result = await db.execute(
                select(Property).where(Property.id == appeal.property_id)
            )
            prop = prop_result.scalar_one_or_none()
            if prop:
                prop.status = PropertyStatus.VERIFIED
            entry.blacklist_metadata["visibility"] = "PUBLIC"
        elif decision == "rejected":
            entry.state = BlacklistState.CONFIRMED_BLACKLIST
            entry.blacklist_metadata["visibility"] = "RESTRICTED"
        elif decision == "more_evidence_required":
            entry.state = BlacklistState.APPEALED

    await record_audit(
        db, admin.id, "appeal_decided",
        resource_type="property_appeal", resource_id=appeal.id,
        details={"decision": decision, "property_id": appeal.property_id},
    )
    return appeal


async def compute_property_trust(db: AsyncSession, property: Property) -> dict:
    """Explainable property trust score (0-100)."""
    score = 0.0
    breakdown = {}

    verification_level = 0
    if property.has_verified_photos:
        verification_level += 10
    if property.has_video:
        verification_level += 5
    if property.status == PropertyStatus.VERIFIED:
        verification_level += 10
    verification_level = min(25, verification_level)
    score += verification_level
    breakdown["verification"] = {"score": verification_level, "max": 25}

    review_result = await db.execute(
        select(func.avg(Review.overall_rating), func.count(Review.id)).where(
            Review.property_id == property.id,
            Review.is_active == True,
        )
    )
    avg_rating, review_count = review_result.first()
    avg_rating = float(avg_rating) if avg_rating else 0.0
    review_component = (avg_rating / 5) * 20 if review_count else 0.0
    score += review_component
    breakdown["reviews"] = {
        "score": round(review_component, 1),
        "max": 20,
        "average_rating": avg_rating,
        "review_count": review_count or 0,
    }

    entry = await get_blacklist_entry(db, property.id)
    report_component = 15.0
    if entry:
        report_component = max(0.0, 15.0 - entry.unique_reporter_count * 1.5)
        if entry.state in (
            BlacklistState.UNDER_REVIEW, BlacklistState.RESTRICTED,
            BlacklistState.BLACKLISTED, BlacklistState.CONFIRMED_BLACKLIST,
        ):
            report_component = 0.0
    score += report_component
    breakdown["reports"] = {
        "score": round(report_component, 1),
        "max": 15,
        "unique_reporters": entry.unique_reporter_count if entry else 0,
    }

    availability = 10.0 if property.total_rooms == 0 else 10.0 * min(
        1.0, (property.vacant_rooms / max(1, property.total_rooms)) + 0.3
    )
    availability = min(10.0, availability)
    score += availability
    breakdown["availability"] = {"score": round(availability, 1), "max": 10}

    age_days = (datetime.now(timezone.utc) - property.created_at).days if property.created_at else 0
    age_component = min(10.0, 10.0 * (age_days / 180))
    score += age_component
    breakdown["listing_history"] = {"score": round(age_component, 1), "max": 10, "age_days": age_days}

    accuracy_component = 10.0
    accuracy_visits = property.property_metadata or {}
    if accuracy_visits.get("listing_accuracy"):
        accuracy_component = float(accuracy_visits["listing_accuracy"])
    score += accuracy_component
    breakdown["listing_accuracy"] = {"score": round(accuracy_component, 1), "max": 10}

    return {
        "property_id": property.id,
        "score": round(min(100.0, score), 1),
        "breakdown": breakdown,
    }


async def compute_owner_trust(db: AsyncSession, owner: User) -> dict:
    score = 0.0
    breakdown = {}

    identity = 25.0 if owner.is_identity_verified else 10.0
    if owner.is_verified_owner:
        identity += 10
    score += identity
    breakdown["identity_verification"] = {"score": identity, "max": 35}

    owner_result = await db.execute(
        select(func.count(Property.id)).where(Property.owner_id == owner.id)
    )
    listing_count = owner_result.scalar() or 0
    listing_component = min(10.0, listing_count * 2.5)
    score += listing_component
    breakdown["listings"] = {"score": listing_component, "max": 10, "count": listing_count}

    review_result = await db.execute(
        select(func.avg(Review.overall_rating)).join(
            Property, Review.property_id == Property.id
        ).where(Property.owner_id == owner.id, Review.is_active == True)
    )
    owner_rating = float(review_result.scalar() or 0)
    review_component = (owner_rating / 5) * 20 if owner_rating else 0.0
    score += review_component
    breakdown["reviews"] = {"score": round(review_component, 1), "max": 20, "average_rating": owner_rating}

    report_component = 20.0 - min(20.0, owner.total_scam_reports * 4.0)
    if owner.total_suspensions > 0:
        report_component -= 10
    report_component = max(0.0, report_component)
    score += report_component
    breakdown["reports"] = {
        "score": round(report_component, 1),
        "max": 20,
        "total_scam_reports": owner.total_scam_reports,
        "total_suspensions": owner.total_suspensions,
    }

    history = 5.0 + min(10.0, owner.total_successful_rentals * 2.5)
    score += history
    breakdown["rental_history"] = {
        "score": round(history, 1),
        "max": 15,
        "successful_rentals": owner.total_successful_rentals,
    }

    return {
        "owner_id": owner.id,
        "score": round(min(100.0, score), 1),
        "breakdown": breakdown,
    }
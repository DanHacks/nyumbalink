from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User, UserVerification, UserRole
from app.models.property import Property, PropertyStatus
from app.models.media import VerificationPhoto, WalkthroughVideo, VerificationStatus
from app.models.scam import ScamReport, ScamReportStatus
from app.models.payment import Payment, PaymentStatus, PremiumSubscription
from app.models.ads import AdCampaign
from app.models.booking import Booking
from app.models.trust import PropertyBlacklist, BlacklistState, PropertyAppeal, AuditLog
from app.services.safety_service import record_audit, resolve_appeal, refresh_property_blacklist, get_blacklist_entry
from datetime import datetime, timezone

router = APIRouter()


@router.get("/dashboard")
async def admin_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    total_users = await db.execute(select(func.count(User.id)))
    total_properties = await db.execute(
        select(func.count(Property.id)).where(Property.is_archived == False)
    )
    pending_verifications = await db.execute(
        select(func.count(VerificationPhoto.id)).where(
            VerificationPhoto.verification_status == VerificationStatus.PENDING
        )
    )
    pending_scam_reports = await db.execute(
        select(func.count(ScamReport.id)).where(
            ScamReport.status == ScamReportStatus.PENDING
        )
    )
    pending_owner_verifications = await db.execute(
        select(func.count(UserVerification.id)).where(
            UserVerification.status == "pending"
        )
    )
    total_revenue = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == PaymentStatus.COMPLETED
        )
    )

    return {
        "total_users": total_users.scalar(),
        "total_properties": total_properties.scalar(),
        "pending_verifications": pending_verifications.scalar(),
        "pending_scam_reports": pending_scam_reports.scalar(),
        "pending_owner_verifications": pending_owner_verifications.scalar(),
        "total_revenue": float(total_revenue.scalar() or 0),
    }


@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    query = select(User)

    if role:
        try:
            query = query.where(User.role == UserRole(role))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role: {role}")
    if search:
        search_filter = (
            User.first_name.ilike(f"%{search}%")
            | User.last_name.ilike(f"%{search}%")
            | User.email.ilike(f"%{search}%")
            | User.phone.ilike(f"%{search}%")
        )
        query = query.where(search_filter)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0

    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    users = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "phone": u.phone,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "role": u.role.value if hasattr(u.role, 'value') else u.role,
                "is_active": u.is_active,
                "is_verified_owner": u.is_verified_owner,
                "verification_badge": u.verification_badge,
                "trust_score": u.trust_score,
                "is_premium": u.is_premium,
                "created_at": u.created_at,
                "last_login_at": u.last_login_at,
            }
            for u in users
        ],
    }


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if role not in [r.value for r in UserRole]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

    user.role = UserRole(role)
    await record_audit(
        db, current_user.id, "user_role_changed",
        resource_type="user", resource_id=user_id,
        details={"role": role},
    )
    await db.flush()

    return {"message": f"User role updated to {role}"}


@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = not user.is_active
    await record_audit(
        db, current_user.id, "user_active_toggled",
        resource_type="user", resource_id=user_id,
        details={"is_active": user.is_active},
    )
    await db.flush()

    return {
        "message": f"User {'activated' if user.is_active else 'deactivated'}"
    }


@router.get("/verification-queue")
async def get_verification_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    photos = await db.execute(
        select(VerificationPhoto).where(
            VerificationPhoto.verification_status == VerificationStatus.PENDING
        ).offset((page - 1) * page_size).limit(page_size)
    )

    owner_verifications = await db.execute(
        select(UserVerification).where(
            UserVerification.status == "pending"
        ).offset((page - 1) * page_size).limit(page_size)
    )

    return {
        "pending_photos": [
            {
                "id": p.id,
                "property_id": p.property_id,
                "category": p.category.value if hasattr(p.category, 'value') else p.category,
                "storage_url": p.storage_url,
                "uploaded_at": p.created_at,
            }
            for p in photos.scalars().all()
        ],
        "pending_owner_verifications": [
            {
                "id": v.id,
                "user_id": v.user_id,
                "type": v.verification_type,
                "created_at": v.created_at,
            }
            for v in owner_verifications.scalars().all()
        ],
    }


@router.get("/scam-reports")
async def list_scam_reports(
    status_filter: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    query = select(ScamReport).order_by(ScamReport.created_at.desc())

    if status_filter:
        query = query.where(ScamReport.status == status_filter)

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    reports = result.scalars().all()

    return [
        {
            "id": r.id,
            "reporter_id": r.reporter_id,
            "property_id": r.property_id,
            "category": r.report_category,
            "status": r.status.value if hasattr(r.status, 'value') else r.status,
            "description": r.description,
            "created_at": r.created_at,
        }
        for r in reports
    ]


@router.put("/scam-reports/{report_id}/resolve")
async def resolve_scam_report(
    report_id: str,
    action: str,
    notes: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(ScamReport).where(ScamReport.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    report.status = ScamReportStatus.ACTION_TAKEN
    report.investigated_by = current_user.id
    report.investigated_at = datetime.now(timezone.utc)
    report.investigation_notes = notes
    report.resolution_notes = notes
    report.resolved_at = datetime.now(timezone.utc)
    report.action_taken = action

    if action == "warning":
        report.warning_issued = True
    elif action == "hide":
        report.listing_hidden = True
        prop_result = await db.execute(
            select(Property).where(Property.id == report.property_id)
        )
        prop = prop_result.scalar_one_or_none()
        if prop:
            prop.status = PropertyStatus.FLAGGED
    elif action == "suspend":
        report.account_suspended = True
        owner_result = await db.execute(
            select(User).where(User.id == report.owner_id)
        )
        owner = owner_result.scalar_one_or_none()
        if owner:
            owner.is_active = False
    elif action == "ban":
        report.permanent_ban = True
        owner_result = await db.execute(
            select(User).where(User.id == report.owner_id)
        )
        owner = owner_result.scalar_one_or_none()
        if owner:
            owner.is_active = False

    await refresh_property_blacklist(db, report.property_id)
    await record_audit(
        db, current_user.id, "scam_report_resolved",
        resource_type="scam_report", resource_id=report_id,
        details={"action": action, "property_id": report.property_id},
    )
    await db.flush()

    return {"message": f"Report resolved with action: {action}"}


@router.get("/properties")
async def list_all_properties(
    status_filter: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    query = select(Property).where(Property.is_archived == False)

    if status_filter:
        query = query.where(Property.status == status_filter)

    query = query.order_by(Property.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    properties = result.scalars().all()

    return [
        {
            "id": p.id,
            "property_name": p.property_name,
            "property_code": p.property_code,
            "type": p.property_type.value if hasattr(p.property_type, 'value') else p.property_type,
            "status": p.status.value if hasattr(p.status, 'value') else p.status,
            "owner_id": p.owner_id,
            "city": p.city,
            "county": p.county,
            "vacant_rooms": p.vacant_rooms,
            "total_rooms": p.total_rooms,
            "created_at": p.created_at,
        }
        for p in properties
    ]


@router.get("/analytics/overview")
async def get_analytics_overview(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    users_by_role_rows = (await db.execute(
        select(User.role, func.count(User.id)).group_by(User.role)
    )).all()
    users_by_role = {
        (r.value if hasattr(r, "value") else (r or "unset")): c
        for r, c in users_by_role_rows
    }
    props_by_status_rows = (await db.execute(
        select(Property.status, func.count(Property.id))
        .where(Property.is_archived == False)
        .group_by(Property.status)
    )).all()
    properties_by_status = {
        (s.value if hasattr(s, "value") else str(s)): c
        for s, c in props_by_status_rows
    }
    revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == PaymentStatus.COMPLETED
        )
    )).scalar() or 0
    total_bookings = (await db.execute(select(func.count(Booking.id)))).scalar() or 0
    return {
        "period_days": days,
        "users_by_role": users_by_role,
        "properties_by_status": properties_by_status,
        "total_revenue": float(revenue),
        "total_bookings": total_bookings,
    }


@router.get("/audit-logs")
async def get_audit_logs(
    actor_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    query = select(AuditLog).order_by(AuditLog.created_at.desc())

    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)
    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)

    total = (await db.execute(
        select(func.count()).select_from(query.subquery())
    )).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "logs": [
            {
                "id": log.id,
                "actor_id": log.actor_id,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "created_at": log.created_at,
            }
            for log in logs
        ],
    }


@router.get("/fraud-center/overview")
async def fraud_center_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    blacklisted = await db.execute(
        select(func.count(PropertyBlacklist.id)).where(
            PropertyBlacklist.state.in_([
                BlacklistState.UNDER_REVIEW, BlacklistState.RESTRICTED,
                BlacklistState.BLACKLISTED, BlacklistState.CONFIRMED_BLACKLIST,
            ])
        )
    )
    flagged = await db.execute(
        select(func.count(PropertyBlacklist.id)).where(
            PropertyBlacklist.state == BlacklistState.FLAGGED
        )
    )
    appeals_pending = await db.execute(
        select(func.count(PropertyAppeal.id)).where(
            PropertyAppeal.status == "pending"
        )
    )
    flagged_properties = await db.execute(
        select(func.count(Property.id)).where(
            Property.status == PropertyStatus.FLAGGED
        )
    )

    return {
        "restricted_properties": blacklisted.scalar() or 0,
        "flagged_properties": flagged.scalar() or 0,
        "flagged_property_statuses": flagged_properties.scalar() or 0,
        "pending_appeals": appeals_pending.scalar() or 0,
    }


@router.get("/fraud-center/blacklist-queue")
async def blacklist_queue(
    state_filter: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    query = select(PropertyBlacklist).where(
        PropertyBlacklist.state.in_([
            BlacklistState.FLAGGED, BlacklistState.UNDER_REVIEW,
            BlacklistState.RESTRICTED, BlacklistState.BLACKLISTED,
            BlacklistState.APPEALED, BlacklistState.CONFIRMED_BLACKLIST,
            BlacklistState.REINSTATED,
        ])
    )
    if state_filter:
        query = query.where(PropertyBlacklist.state == state_filter)

    query = query.order_by(PropertyBlacklist.triggered_at.desc().nullslast(), PropertyBlacklist.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    entries = result.scalars().all()

    return {
        "page": page,
        "page_size": page_size,
        "entries": [
            {
                "id": e.id,
                "property_id": e.property_id,
                "state": e.state.value if hasattr(e.state, "value") else e.state,
                "unique_reporter_count": e.unique_reporter_count,
                "verified_positive_reviews": e.verified_positive_reviews,
                "report_quality_score": e.report_quality_score,
                "reason": e.reason,
                "triggered_at": e.triggered_at,
                "created_at": e.created_at,
            }
            for e in entries
        ],
    }


@router.post("/fraud-center/{property_id}/decide")
async def decide_blacklist(
    property_id: str,
    decision: str,
    notes: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    if decision not in ("blacklist", "reinstate", "dismiss"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="decision must be one of: blacklist, reinstate, dismiss",
        )

    entry = await get_blacklist_entry(db, property_id)
    if not entry:
        raise HTTPException(status_code=404, detail="No blacklist entry for this property")

    entry.reviewed_by = current_user.id
    entry.reviewed_at = datetime.now(timezone.utc)
    entry.decision_notes = notes

    if decision == "blacklist":
        entry.state = BlacklistState.CONFIRMED_BLACKLIST
        entry.blacklist_metadata["visibility"] = "RESTRICTED"
        prop_result = await db.execute(
            select(Property).where(Property.id == property_id)
        )
        prop = prop_result.scalar_one_or_none()
        if prop:
            prop.status = PropertyStatus.FLAGGED
    elif decision == "reinstate":
        entry.state = BlacklistState.REINSTATED
        entry.blacklist_metadata["visibility"] = "PUBLIC"
        prop_result = await db.execute(
            select(Property).where(Property.id == property_id)
        )
        prop = prop_result.scalar_one_or_none()
        if prop:
            prop.status = PropertyStatus.VERIFIED
    else:
        entry.state = BlacklistState.ACTIVE
        entry.blacklist_metadata["visibility"] = "PUBLIC"

    await record_audit(
        db, current_user.id, "blacklist_decision",
        resource_type="property", resource_id=property_id,
        details={"decision": decision, "notes": notes},
    )
    await db.flush()

    return {"message": f"Property {decision}d", "state": entry.state.value}


@router.get("/fraud-center/appeals")
async def list_appeals(
    status_filter: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    query = select(PropertyAppeal).order_by(PropertyAppeal.created_at.desc())
    if status_filter:
        query = query.where(PropertyAppeal.status == status_filter)

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    appeals = result.scalars().all()

    return {
        "page": page,
        "page_size": page_size,
        "appeals": [
            {
                "id": a.id,
                "property_id": a.property_id,
                "appellant_id": a.appellant_id,
                "explanation": a.explanation,
                "evidence": a.evidence,
                "documents": a.documents,
                "request_physical_inspection": a.request_physical_inspection,
                "status": a.status,
                "decision_notes": a.decision_notes,
                "created_at": a.created_at,
                "decided_at": a.decided_at,
            }
            for a in appeals
        ],
    }


@router.post("/fraud-center/appeals/{appeal_id}/decide")
async def decide_appeal(
    appeal_id: str,
    decision: str,
    notes: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    if decision not in ("approved", "rejected", "more_evidence_required"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="decision must be: approved, rejected, more_evidence_required",
        )

    appeal = await resolve_appeal(db, appeal_id, decision, notes, current_user)
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    await db.flush()

    return {"message": f"Appeal {decision}", "appeal_id": appeal.id}

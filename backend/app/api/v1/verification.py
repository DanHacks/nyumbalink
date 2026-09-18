from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_verification_officer
from app.core.config import settings
from app.models.user import User, UserVerification
from app.models.property import Property, PropertyStatus
from app.models.media import (
    VerificationPhoto, PhotoMetadata, WalkthroughVideo,
    PhotoCategory, VerificationStatus, MediaAuditLog,
)
from app.schemas.verification import (
    PhotoUploadResponse, AIVerificationResult,
    VideoUploadResponse, VerificationStatusResponse,
)
from app.services.media_service import save_upload, build_media_url
from app.services.safety_service import compute_property_trust, record_audit
from datetime import datetime, timezone
from math import radians, sin, cos, asin, sqrt
import hashlib

router = APIRouter()

MAX_PHOTO_GPS_DISTANCE_M = 600.0
MAX_PHOTO_AGE_MINUTES = 30


def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * asin(sqrt(a))


async def _validate_photo_gps(db: AsyncSession, property_id: str, latitude: float, longitude: float, photo_time: datetime):
    """Reject uploads whose GPS or capture time cannot be tied to the property."""
    result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    if prop.latitude is None or prop.longitude is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Property has no GPS coordinates yet — set them before uploading verification media.",
        )

    distance_m = _haversine_km(latitude, longitude, prop.latitude, prop.longitude) * 1000
    if distance_m > MAX_PHOTO_GPS_DISTANCE_M:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Photo GPS is {round(distance_m)}m from the property "
                f"(max {MAX_PHOTO_GPS_DISTANCE_M}m). Capture photos at the property."
            ),
        )

    age_minutes = (datetime.now(timezone.utc) - photo_time).total_seconds() / 60
    if age_minutes < -5 or age_minutes > MAX_PHOTO_AGE_MINUTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo timestamp is too old or in the future. Capture fresh media.",
        )

    return prop


@router.get("/property/{property_id}/status", response_model=VerificationStatusResponse)
async def get_verification_status(
    property_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    photos_result = await db.execute(
        select(VerificationPhoto).where(
            VerificationPhoto.property_id == property_id,
            VerificationPhoto.is_replacement == False,
        )
    )
    photos = photos_result.scalars().all()

    video_result = await db.execute(
        select(WalkthroughVideo).where(
            WalkthroughVideo.property_id == property_id,
        )
    )
    video = video_result.scalar_one_or_none()

    result = VerificationStatusResponse(
        property_id=property_id,
        photos_verified=sum(1 for p in photos if p.verification_status == VerificationStatus.APPROVED),
        photos_pending=sum(1 for p in photos if p.verification_status == VerificationStatus.PENDING),
        photos_rejected=sum(1 for p in photos if p.verification_status == VerificationStatus.REJECTED),
        total_photos_required=settings.PHOTO_MIN_COUNT,
        video_verified=video and video.verification_status == VerificationStatus.APPROVED,
        video_pending=video and video.verification_status == VerificationStatus.PENDING,
        overall_status="pending",
        is_complete=False,
    )

    all_approved = result.photos_verified >= settings.PHOTO_MIN_COUNT
    result.is_complete = all_approved
    result.overall_status = "complete" if all_approved else "incomplete"

    return result


@router.get("/pending", response_model=List[dict])
async def get_pending_verifications(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verification_officer),
    request: Request = None,
):
    query = select(VerificationPhoto).where(
        VerificationPhoto.verification_status == VerificationStatus.PENDING
    ).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    photos = result.scalars().all()

    return [
        {
            "id": p.id,
            "property_id": p.property_id,
            "category": p.category.value if hasattr(p.category, 'value') else p.category,
            "url": build_media_url(p.storage_url, request),
            "uploaded_at": p.created_at,
        }
        for p in photos
    ]


@router.post("/photos/upload", response_model=PhotoUploadResponse)
async def upload_verification_photo(
    property_id: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    accuracy: Optional[float] = Form(None),
    heading: Optional[float] = Form(None),
    timestamp: Optional[str] = Form(None),
    device_id: Optional[str] = Form(None),
    device_model: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image type. Allowed: {settings.ALLOWED_IMAGE_TYPES}",
        )

    try:
        photo_time = datetime.fromisoformat((timestamp or "").replace("Z", "+00:00"))
        if photo_time.tzinfo is None:
            photo_time = photo_time.replace(tzinfo=timezone.utc)
        photo_time = photo_time.astimezone(timezone.utc)
    except (ValueError, TypeError):
        photo_time = datetime.now(timezone.utc)

    await _validate_photo_gps(db, property_id, latitude, longitude, photo_time)

    try:
        photo_category = PhotoCategory(category)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid photo category: {category}",
        )

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE} bytes.",
        )
    file_hash = hashlib.sha256(content).hexdigest()
    storage_path = save_upload(content, property_id, file.filename or "photo.jpg")

    metadata = PhotoMetadata(
        latitude=latitude,
        longitude=longitude,
        accuracy=accuracy,
        heading=heading,
        timestamp=photo_time,
        device_id=device_id,
        device_model=device_model,
    )
    db.add(metadata)
    await db.flush()

    photo = VerificationPhoto(
        property_id=property_id,
        owner_id=current_user.id,
        uploaded_by=current_user.id,
        category=photo_category,
        storage_url=storage_path,
        file_hash=file_hash,
        file_size_bytes=len(content),
        format=file.content_type.split("/")[-1],
        verification_status=VerificationStatus.PENDING,
        metadata_id=metadata.id,
    )
    db.add(photo)
    await db.flush()

    try:
        from app.tasks.verification import process_photo_verification, check_duplicate_photos
        process_photo_verification.delay(photo.id)
        check_duplicate_photos.delay(property_id)
    except Exception:
        pass

    audit = MediaAuditLog(
        media_type="photo",
        media_id=photo.id,
        action="upload",
        performed_by=current_user.id,
        details={
            "property_id": property_id,
            "category": category,
            "file_hash": file_hash,
            "latitude": latitude,
            "longitude": longitude,
        },
    )
    db.add(audit)

    await db.flush()

    return PhotoUploadResponse(
        id=photo.id,
        category=photo_category.value,
        storage_url=build_media_url(photo.storage_url, request),
        thumbnail_url=photo.thumbnail_url,
        verification_status="pending",
    )


@router.post("/photos/{photo_id}/approve")
async def approve_photo(
    photo_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verification_officer),
):
    result = await db.execute(
        select(VerificationPhoto).where(VerificationPhoto.id == photo_id)
    )
    photo = result.scalar_one_or_none()

    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    photo.verification_status = VerificationStatus.APPROVED
    photo.reviewed_by = current_user.id
    photo.reviewed_at = datetime.now(timezone.utc)

    audit = MediaAuditLog(
        media_type="photo",
        media_id=photo.id,
        action="approved",
        performed_by=current_user.id,
    )
    db.add(audit)
    await db.flush()

    approved_count = (await db.execute(
        select(func.count(VerificationPhoto.id)).where(
            VerificationPhoto.property_id == photo.property_id,
            VerificationPhoto.verification_status == VerificationStatus.APPROVED,
            VerificationPhoto.is_replacement == False,
        )
    )).scalar() or 0

    if approved_count >= settings.PHOTO_MIN_COUNT:
        prop_result = await db.execute(
            select(Property).where(Property.id == photo.property_id)
        )
        prop = prop_result.scalar_one_or_none()
        if prop:
            prop.has_verified_photos = True
            trust = await compute_property_trust(db, prop)
            prop.trust_score = trust["score"]
            await record_audit(
                db, current_user.id, "photo_approval_completed",
                resource_type="property", resource_id=photo.property_id,
                details={"approved_photos": approved_count},
            )

    return {"message": "Photo approved"}


@router.post("/photos/{photo_id}/reject")
async def reject_photo(
    photo_id: str,
    reason: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verification_officer),
):
    result = await db.execute(
        select(VerificationPhoto).where(VerificationPhoto.id == photo_id)
    )
    photo = result.scalar_one_or_none()

    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    photo.verification_status = VerificationStatus.REJECTED
    photo.reviewed_by = current_user.id
    photo.reviewed_at = datetime.now(timezone.utc)
    photo.rejection_reason = reason

    audit = MediaAuditLog(
        media_type="photo",
        media_id=photo.id,
        action="rejected",
        performed_by=current_user.id,
        details={"reason": reason},
    )
    db.add(audit)

    return {"message": "Photo rejected"}


@router.post("/video/upload", response_model=VideoUploadResponse)
async def upload_walkthrough_video(
    property_id: str = Form(...),
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    timestamp: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    if file.content_type not in settings.ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid video type. Allowed: {settings.ALLOWED_VIDEO_TYPES}",
        )

    try:
        video_time = datetime.fromisoformat((timestamp or "").replace("Z", "+00:00"))
        if video_time.tzinfo is None:
            video_time = video_time.replace(tzinfo=timezone.utc)
        video_time = video_time.astimezone(timezone.utc)
    except (ValueError, TypeError):
        video_time = datetime.now(timezone.utc)

    await _validate_photo_gps(db, property_id, latitude, longitude, video_time)

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE} bytes.",
        )
    file_hash = hashlib.sha256(content).hexdigest()
    storage_path = save_upload(content, property_id, file.filename or "walkthrough.mp4")

    existing_result = await db.execute(
        select(WalkthroughVideo).where(WalkthroughVideo.property_id == property_id)
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing.storage_url = storage_path
        existing.file_hash = file_hash
        existing.file_size_bytes = len(content)
        existing.verification_status = VerificationStatus.PENDING
        existing.latitude = latitude
        existing.longitude = longitude
        existing.timestamp = video_time
        video = existing
        await db.flush()
    else:
        video = WalkthroughVideo(
            property_id=property_id,
            owner_id=current_user.id,
            storage_url=storage_path,
            file_hash=file_hash,
            file_size_bytes=len(content),
            format=file.content_type.split("/")[-1],
            duration_seconds=0,
            latitude=latitude,
            longitude=longitude,
            timestamp=video_time,
            verification_status=VerificationStatus.PENDING,
        )
        db.add(video)
        await db.flush()

    try:
        from app.tasks.verification import process_video_verification
        if video.id:
            process_video_verification.delay(video.id)
    except Exception:
        pass

    audit = MediaAuditLog(
        media_type="video",
        media_id=video.id,
        action="upload",
        performed_by=current_user.id,
        details={"property_id": property_id, "file_hash": file_hash},
    )
    db.add(audit)
    await db.flush()

    return VideoUploadResponse(
        id=video.id,
        storage_url=build_media_url(video.storage_url, request),
        verification_status="pending",
    )


@router.post("/video/{video_id}/approve")
async def approve_video(
    video_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verification_officer),
):
    result = await db.execute(
        select(WalkthroughVideo).where(WalkthroughVideo.id == video_id)
    )
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    video.verification_status = VerificationStatus.APPROVED

    prop_result = await db.execute(
        select(Property).where(Property.id == video.property_id)
    )
    prop = prop_result.scalar_one_or_none()
    if prop:
        prop.has_video = True
        trust = await compute_property_trust(db, prop)
        prop.trust_score = trust["score"]

    audit = MediaAuditLog(
        media_type="video",
        media_id=video.id,
        action="approved",
        performed_by=current_user.id,
    )
    db.add(audit)
    await db.flush()

    return {"message": "Video approved"}


@router.post("/video/{video_id}/reject")
async def reject_video(
    video_id: str,
    reason: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verification_officer),
):
    result = await db.execute(
        select(WalkthroughVideo).where(WalkthroughVideo.id == video_id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    video.verification_status = VerificationStatus.REJECTED
    audit = MediaAuditLog(
        media_type="video",
        media_id=video.id,
        action="rejected",
        performed_by=current_user.id,
        details={"reason": reason},
    )
    db.add(audit)
    await db.flush()
    return {"message": "Video rejected"}


@router.post("/property/{property_id}/verify")
async def verify_property(
    property_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verification_officer),
):
    result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    prop = result.scalar_one_or_none()

    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    photos_result = await db.execute(
        select(VerificationPhoto).where(
            VerificationPhoto.property_id == property_id,
            VerificationPhoto.verification_status == VerificationStatus.APPROVED,
            VerificationPhoto.is_replacement == False,
        )
    )
    approved_photos = photos_result.scalars().all()

    if len(approved_photos) < settings.PHOTO_MIN_COUNT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum {settings.PHOTO_MIN_COUNT} approved photos required. Found {len(approved_photos)}.",
        )

    prop.status = PropertyStatus.VERIFIED
    prop.has_verified_photos = True
    trust = await compute_property_trust(db, prop)
    prop.trust_score = trust["score"]

    audit = MediaAuditLog(
        media_type="property",
        media_id=property_id,
        action="verified",
        performed_by=current_user.id,
    )
    db.add(audit)
    await record_audit(
        db, current_user.id, "property_verified",
        resource_type="property", resource_id=property_id,
    )
    await db.flush()

    return {"message": "Property verified successfully", "trust_score": trust["score"]}


@router.post("/owner/verify-identity")
async def verify_owner_identity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(UserVerification).where(
            UserVerification.user_id == current_user.id,
            UserVerification.verification_type == "identity",
            UserVerification.status.in_(["pending", "approved"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An identity verification request is already pending or approved",
        )

    user_verification = UserVerification(
        user_id=current_user.id,
        verification_type="identity",
        status="pending",
    )
    db.add(user_verification)
    await db.flush()

    return {"message": "Identity verification submitted", "verification_id": user_verification.id}


@router.post("/owner/{user_id}/approve-identity")
async def approve_owner_identity(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verification_officer),
):
    result = await db.execute(
        select(UserVerification).where(
            UserVerification.user_id == user_id,
            UserVerification.verification_type == "identity",
            UserVerification.status == "pending",
        ).order_by(UserVerification.created_at.desc()).limit(1)
    )
    verification = result.scalar_one_or_none()

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending identity verification found",
        )

    verification.status = "approved"
    verification.verified_by = current_user.id
    verification.verified_at = datetime.now(timezone.utc)

    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    if user:
        user.is_identity_verified = True
        user.is_verified_owner = True

    await record_audit(
        db, current_user.id, "identity_approved",
        resource_type="user", resource_id=user_id,
    )
    await db.flush()

    return {"message": "Identity approved"}
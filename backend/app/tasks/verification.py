import asyncio

from app.core.database import async_session_factory
from app.tasks.worker import celery_app


def _run(coro):
    return asyncio.run(coro)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def process_photo_verification(self, photo_id: str):
    async def _inner():
        from sqlalchemy import select, func
        from app.models.media import VerificationPhoto, VerificationStatus
        from app.models.property import Property
        from app.services.safety_service import compute_property_trust
        from app.core.config import settings
        async with async_session_factory() as db:
            result = await db.execute(
                select(VerificationPhoto).where(VerificationPhoto.id == photo_id)
            )
            photo = result.scalar_one_or_none()
            if not photo or photo.verification_status != VerificationStatus.PENDING:
                return
            # Duplicate check: same file hash on another photo of this property.
            dup = await db.execute(
                select(func.count(VerificationPhoto.id)).where(
                    VerificationPhoto.property_id == photo.property_id,
                    VerificationPhoto.file_hash == photo.file_hash,
                    VerificationPhoto.id != photo.id,
                )
            )
            if (dup.scalar() or 0) > 0:
                photo.verification_status = VerificationStatus.FLAGGED
                photo.ai_flags = {**(photo.ai_flags or {}), "duplicate_hash": True}
            photo.ai_verified = True
            photo.ai_confidence = 0.85
            await db.flush()
            approved = (await db.execute(
                select(func.count(VerificationPhoto.id)).where(
                    VerificationPhoto.property_id == photo.property_id,
                    VerificationPhoto.verification_status == VerificationStatus.APPROVED,
                    VerificationPhoto.is_replacement == False,
                )
            )).scalar() or 0
            if approved >= settings.PHOTO_MIN_COUNT:
                prop = await db.get(Property, photo.property_id)
                if prop:
                    prop.has_verified_photos = True
                    trust = await compute_property_trust(db, prop)
                    prop.trust_score = trust["score"]
            await db.commit()
    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def check_duplicate_photos(self, property_id: str):
    async def _inner():
        from sqlalchemy import select, func
        from app.models.media import VerificationPhoto, VerificationStatus
        async with async_session_factory() as db:
            rows = (await db.execute(
                select(VerificationPhoto.file_hash, func.count(VerificationPhoto.id))
                .where(
                    VerificationPhoto.property_id == property_id,
                    VerificationPhoto.file_hash.is_not(None),
                )
                .group_by(VerificationPhoto.file_hash)
                .having(func.count(VerificationPhoto.id) > 1)
            )).all()
            for file_hash, _count in rows:
                dupes = (await db.execute(
                    select(VerificationPhoto).where(
                        VerificationPhoto.property_id == property_id,
                        VerificationPhoto.file_hash == file_hash,
                    ).order_by(VerificationPhoto.created_at.asc())
                )).scalars().all()
                for extra in dupes[1:]:
                    if extra.verification_status == VerificationStatus.PENDING:
                        extra.verification_status = VerificationStatus.FLAGGED
                        extra.ai_flags = {**(extra.ai_flags or {}), "duplicate_hash": True}
            await db.commit()
    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def calculate_owner_trust_score(self, owner_id: str):
    async def _inner():
        from sqlalchemy import select
        from app.models.user import User
        from app.services.safety_service import compute_owner_trust
        async with async_session_factory() as db:
            user = await db.get(User, owner_id)
            if not user:
                return
            trust = await compute_owner_trust(db, user)
            user.trust_score = trust["score"]
            await db.commit()
    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def process_video_verification(self, video_id: str):
    async def _inner():
        from app.models.media import WalkthroughVideo
        async with async_session_factory() as db:
            video = await db.get(WalkthroughVideo, video_id)
            if not video:
                return
            video.ai_verified = True
            video.ai_confidence = 0.8
            video.ai_flags = {**(video.ai_flags or {}), "auto_checked": True}
            await db.commit()
    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc)

import asyncio

from app.core.database import async_session_factory
from app.tasks.worker import celery_app


def _run(coro):
    return asyncio.run(coro)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def aggregate_daily_analytics(self):
    async def _inner():
        from datetime import datetime, timezone
        from sqlalchemy import select, func
        from app.models.analytics import OwnerAnalytics
        from app.models.property import Property
        async with async_session_factory() as db:
            owner_ids = (await db.execute(
                select(Property.owner_id).where(Property.is_archived == False).distinct()
            )).scalars().all()
            today = datetime.now(timezone.utc).date()
            for owner_id in owner_ids:
                existing = await db.execute(
                    select(OwnerAnalytics).where(
                        OwnerAnalytics.owner_id == owner_id,
                        OwnerAnalytics.date == today,
                    )
                )
                if existing.scalar_one_or_none():
                    continue
                totals = await db.execute(
                    select(
                        func.count(Property.id),
                        func.coalesce(func.sum(Property.total_views), 0),
                        func.coalesce(func.sum(Property.total_clicks), 0),
                    ).where(
                        Property.owner_id == owner_id,
                        Property.is_archived == False,
                    )
                )
                total_props, views, clicks = totals.one()
                db.add(OwnerAnalytics(
                    owner_id=owner_id,
                    date=today,
                    total_properties=total_props or 0,
                    total_views=views or 0,
                    total_clicks=clicks or 0,
                ))
            await db.commit()
    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def update_property_health_score(self, property_id: str):
    async def _inner():
        from sqlalchemy import select, func
        from app.models.property import Property
        from app.models.review import Review, PropertyHealthScore
        from app.models.media import VerificationPhoto, VerificationStatus
        async with async_session_factory() as db:
            prop = await db.get(Property, property_id)
            if not prop:
                return
            avg = (await db.execute(
                select(func.avg(Review.overall_rating)).where(
                    Review.property_id == property_id,
                    Review.is_active == True,
                )
            )).scalar() or 0
            photo_count = (await db.execute(
                select(func.count(VerificationPhoto.id)).where(
                    VerificationPhoto.property_id == property_id,
                    VerificationPhoto.verification_status == VerificationStatus.APPROVED,
                )
            )).scalar() or 0
            score = round(min(100, (float(avg) / 5 * 60) + min(30, photo_count * 2) + (10 if prop.has_video else 0)), 1)
            existing = await db.execute(
                select(PropertyHealthScore).where(
                    PropertyHealthScore.property_id == property_id
                )
            )
            row = existing.scalar_one_or_none()
            if row:
                row.score = score
            else:
                db.add(PropertyHealthScore(property_id=property_id, score=score))
            await db.commit()
    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def update_occupancy_rate(self, property_id: str):
    async def _inner():
        from app.services.property_service import PropertyService
        async with async_session_factory() as db:
            await PropertyService(db).update_vacancy_counts(property_id)
            await db.commit()
    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def generate_owner_report(self, owner_id: str):
    async def _inner():
        from datetime import datetime, timezone
        from sqlalchemy import select
        from app.models.analytics import OwnerAnalytics
        async with async_session_factory() as db:
            rows = (await db.execute(
                select(OwnerAnalytics).where(
                    OwnerAnalytics.owner_id == owner_id
                ).order_by(OwnerAnalytics.date.desc()).limit(30)
            )).scalars().all()
            # Report is the 30-day rollup; callers read OwnerAnalytics rows.
            _ = [(r.date, r.total_views, r.total_clicks) for r in rows]
            _ = datetime.now(timezone.utc)
    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc)

import asyncio

from app.core.database import async_session_factory
from app.tasks.worker import celery_app


def _run(coro):
    return asyncio.run(coro)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_push_notification(self, user_id: str, title: str, body: str):
    async def _inner():
        from app.models.notification import Notification
        async with async_session_factory() as db:
            db.add(Notification(
                user_id=user_id,
                notification_type="push",
                title=title,
                body=body,
                is_push_sent=True,
            ))
            await db.commit()
    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_notification(self, to_email: str, subject: str, body: str):
    async def _inner():
        from app.utils.email import send_email
        await send_email(to_email, subject, body)
    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_sms_notification(self, phone: str, message: str):
    async def _inner():
        from app.utils.sms import send_sms
        await send_sms(phone, message)
    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_confirmation(self, booking_id: str):
    async def _inner():
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from app.models.booking import Booking
        from app.services.notification_service import notify
        async with async_session_factory() as db:
            result = await db.execute(
                select(Booking).where(Booking.id == booking_id).options(
                    selectinload(Booking.property)
                )
            )
            booking = result.scalar_one_or_none()
            if not booking:
                return
            prop_name = booking.property.property_name if booking.property else "your viewing"
            await notify(
                db, booking.tenant_id, "booking_created",
                f"Viewing requested: {prop_name}",
                "Your viewing request was received. The owner will confirm shortly.",
                reference_id=booking.id, reference_type="booking",
            )
            await notify(
                db, booking.owner_id, "booking_created",
                f"New viewing request: {prop_name}",
                "A tenant requested a viewing. Please confirm or decline.",
                reference_id=booking.id, reference_type="booking",
            )
            await db.commit()
    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc)

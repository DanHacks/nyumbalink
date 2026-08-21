from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "nyumbalink",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.verification",
        "app.tasks.notifications",
        "app.tasks.analytics",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Nairobi",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    task_soft_time_limit=25 * 60,
)


@celery_app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")

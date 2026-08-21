from app.tasks.worker import celery_app


@celery_app.task
def process_photo_verification(photo_id: str):
    pass


@celery_app.task
def check_duplicate_photos(property_id: str):
    pass


@celery_app.task
def calculate_owner_trust_score(owner_id: str):
    pass


@celery_app.task
def process_video_verification(video_id: str):
    pass

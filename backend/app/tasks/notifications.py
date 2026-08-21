from app.tasks.worker import celery_app


@celery_app.task
def send_push_notification(user_id: str, title: str, body: str):
    pass


@celery_app.task
def send_email_notification(to_email: str, subject: str, body: str):
    pass


@celery_app.task
def send_sms_notification(phone: str, message: str):
    pass


@celery_app.task
def send_booking_confirmation(booking_id: str):
    pass

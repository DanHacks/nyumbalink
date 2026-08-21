from app.tasks.worker import celery_app


@celery_app.task
def aggregate_daily_analytics():
    pass


@celery_app.task
def update_property_health_score(property_id: str):
    pass


@celery_app.task
def update_occupancy_rate(property_id: str):
    pass


@celery_app.task
def generate_owner_report(owner_id: str):
    pass

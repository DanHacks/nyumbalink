from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def notify(
    db: AsyncSession,
    user_id: str,
    notification_type: str,
    title: str,
    body: str = None,
    reference_id: str = None,
    reference_type: str = None,
    action_url: str = None,
):
    db.add(Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        body=body,
        reference_id=reference_id,
        reference_type=reference_type,
        action_url=action_url,
    ))
from app.models.booking import Booking, BookingStatus
from app.models.user import User, UserRole
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def obfuscate_point(lat: float, lon: float, precision: float = 0.01) -> tuple:
    """Round coordinates to a precision box (~1.1 km at the equator for 0.01)."""
    return round(lat / precision) * precision, round(lon / precision) * precision


def user_is_admin(user: User) -> bool:
    return bool(user) and user.role in (
        UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR,
        UserRole.VERIFICATION_OFFICER,
    )


async def visible_coordinates(db: AsyncSession, property, user: User):
    """Privacy-preserving location visibility.

    PUBLIC            -> exact for everyone
    APPROXIMATE       -> exact for owner/staff, ~1km rounded otherwise
    VERIFIED_USER     -> exact for verified users, ~1km for anonymous
    BOOKED_USER       -> exact only for owner/staff and users with a
                         completed/confirmed booking or verified visit
    """
    privacy = property.location_privacy or "approximate"
    lat, lon = property.latitude, property.longitude

    if privacy == "public":
        return lat, lon, "public"

    if user:
        if user.id == property.owner_id or user_is_admin(user):
            return lat, lon, "exact"

    if privacy == "approximate":
        return *obfuscate_point(lat, lon), "approximate"

    if user and user.is_identity_verified and privacy == "verified_user":
        return lat, lon, "exact"

    if user and privacy == "booked_user":
        result = await db.execute(
            select(Booking.id).where(
                Booking.property_id == property.id,
                Booking.tenant_id == user.id,
                Booking.status.in_([
                    BookingStatus.CONFIRMED,
                    BookingStatus.CHECKED_IN,
                    BookingStatus.COMPLETED,
                ]),
            ).limit(1)
        )
        if result.scalar_one_or_none():
            return lat, lon, "exact"

    return *obfuscate_point(lat, lon), privacy
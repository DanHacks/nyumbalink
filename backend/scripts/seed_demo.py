"""Demo seed data for local development.

Creates clearly-labelled demo properties, rooms, services, reviews and
blacklist entries so the map, search and trust flows work on localhost.

Usage (from backend/):
    .venv\\Scripts\\python -m scripts.seed_demo          # add demo data
    .venv\\Scripts\\python -m scripts.seed_demo --reset  # wipe demo data first

NOTE: This is DEMO data. Property names get a "(demo)" suffix so live
listings can never be confused with sample listings.
"""

import argparse
import asyncio
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")  # allow `python -m scripts.seed_demo` from backend/

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.database import engine, get_db
from app.models.user import User, UserRole
from app.models.property import (
    Building, Floor, OccupancyStatus, Property, PropertyStatus, Room,
)
from app.models.review import Review
from app.models.trust import (
    BlacklistState, PropertyBlacklist, PropertyService, PropertyServiceStatus,
)
from app.models.media import VerificationStatus, VerificationPhoto

DEMO_OWNER_EMAIL = "demo-landlord@nyumbalink.local"
DEMO_TENANT_EMAIL = "demo-tenant@nyumbalink.local"
DEMO_OFFICER_EMAIL = "demo-officer@nyumbalink.local"
DEMO_PASSWORD = "demo-pass-123"

# (name, kind, house_type, estate, town, county, lat, lng, price, unit, units, available, verification)
# kind/house_type use the backend enum values; labels are added by the API.
SEEDS = [
    ("Green Heights", "house", "bedsitter", "Manyatta", "Kisumu", "Kisumu", -0.0982, 34.7712, 7500, "month", 12, 3, "gold"),
    ("Lakeview Court", "apartment", "one_bedroom", "Milimani", "Kisumu", "Kisumu", -0.1005, 34.7534, 18500, "month", 20, 2, "platinum"),
    ("Nyalenda Studios", "house", "single_room", "Nyalenda", "Kisumu", "Kisumu", -0.1163, 34.7639, 4200, "month", 16, 5, "verified"),
    ("Riat Hills Villa", "house", "villa", "Riat Hills", "Kisumu", "Kisumu", -0.0631, 34.7108, 95000, "month", 2, 1, "platinum"),
    ("Dunga Bay Stay", "airbnb", "studio", "Dunga", "Kisumu", "Kisumu", -0.1298, 34.7452, 3800, "night", 4, 2, "gold"),
    ("Mamboleo Hostel", "hostel", "single_room", "Mamboleo", "Kisumu", "Kisumu", -0.0517, 34.7861, 5200, "month", 40, 11, "verified"),
    ("Kisii Campus Rooms", "hostel", "bedsitter", "Nyanchwa", "Kisii", "Kisii", -0.6820, 34.7770, 6500, "month", 32, 7, "gold"),
    ("Daraja Mbili Homes", "house", "one_bedroom", "Daraja Mbili", "Kisii", "Kisii", -0.6693, 34.7657, 11000, "month", 10, 2, "verified"),
    ("Gusii Guest House", "guest_house", "shared", "Town Centre", "Kisii", "Kisii", -0.6773, 34.7796, 2700, "night", 18, 6, "verified"),
    ("Nyanchwa Ridge", "apartment", "two_bedroom", "Nyanchwa", "Kisii", "Kisii", -0.6905, 34.7842, 24000, "month", 14, 0, "gold"),
    ("Kilimani Terraces", "apartment", "two_bedroom", "Kilimani", "Nairobi", "Nairobi", -1.2894, 36.7855, 62000, "month", 30, 4, "platinum"),
    ("Ngara Bedsitters", "house", "bedsitter", "Ngara", "Nairobi", "Nairobi", -1.2745, 36.8306, 9800, "month", 24, 6, "verified"),
    ("Westlands Loft", "airbnb", "studio", "Westlands", "Nairobi", "Nairobi", -1.2649, 36.8032, 6200, "night", 6, 3, "gold"),
    ("South B Court", "apartment", "one_bedroom", "South B", "Nairobi", "Nairobi", -1.3080, 36.8330, 27000, "month", 18, 2, "verified"),
    ("Kasarani Student Hub", "hostel", "single_room", "Kasarani", "Nairobi", "Nairobi", -1.2202, 36.8968, 6800, "month", 60, 14, "verified"),
    ("CBD Executive Suites", "guest_house", "one_bedroom", "CBD", "Nairobi", "Nairobi", -1.2841, 36.8233, 4900, "night", 22, 5, "gold"),
    ("Karen Garden Villa", "house", "villa", "Karen", "Nairobi", "Nairobi", -1.3191, 36.7062, 240000, "month", 1, 1, "platinum"),
    ("Kahawa Sukari Homes", "house", "three_bedroom", "Kahawa Sukari", "Nairobi", "Nairobi", -1.1836, 36.9268, 45000, "month", 8, 1, "gold"),
    ("Nakuru Milimani Flats", "apartment", "one_bedroom", "Milimani", "Nakuru", "Nakuru", -0.2961, 36.0703, 16500, "month", 16, 3, "verified"),
    ("Lanet Bedsitters", "house", "bedsitter", "Lanet", "Nakuru", "Nakuru", -0.3159, 36.1373, 6900, "month", 20, 8, "basic"),
    ("Nyali Beach Stay", "airbnb", "one_bedroom", "Nyali", "Mombasa", "Mombasa", -4.0435, 39.7003, 7400, "night", 5, 2, "gold"),
    ("Bamburi Guest Lodge", "guest_house", "shared", "Bamburi", "Mombasa", "Mombasa", -3.9915, 39.7285, 3200, "night", 14, 4, "verified"),
    ("Eldoret Elgon View", "apartment", "two_bedroom", "Elgon View", "Eldoret", "Uasin Gishu", 0.5152, 35.2760, 29000, "month", 12, 2, "gold"),
    ("Langas Rooms", "house", "single_room", "Langas", "Eldoret", "Uasin Gishu", 0.4886, 35.2497, 3900, "month", 26, 9, "basic"),
    ("Thika Greens Plaza", "commercial", "shared", "Thika Town", "Thika", "Kiambu", -1.0388, 37.0834, 55000, "month", 9, 3, "verified"),
    ("Machakos Hilltop", "house", "one_bedroom", "Mumbuni", "Machakos", "Machakos", -1.5177, 37.2634, 13500, "month", 10, 4, "verified"),
]

TRUST_BY_LEVEL = {"basic": 62, "verified": 81, "gold": 93, "platinum": 98}
RATING_BY_LEVEL = {"basic": 3.7, "verified": 4.1, "gold": 4.6, "platinum": 4.9}

BLACKLISTED = {
    "Ngara Bedsitters": (BlacklistState.UNDER_REVIEW, "11 unique negative reports triggered automated review (demo)"),
    "Lanet Bedsitters": (BlacklistState.FLAGGED, "3 unique negative reports (demo)"),
}


def _code(town: str, estate: str, i: int) -> str:
    t = town[:3].upper()
    e = "".join(ch for ch in estate if ch.isalnum())[:3].upper()
    return f"NL-{t}-{e}-{str(i + 1).zfill(6)}"


async def reset(db):
    await db.execute(delete(Review))
    await db.execute(delete(PropertyBlacklist))
    await db.execute(delete(PropertyService))
    await db.execute(delete(Room))
    await db.execute(delete(Floor))
    await db.execute(delete(Building))
    await db.execute(delete(VerificationPhoto))
    await db.execute(delete(Property))
    await db.execute(
        delete(User).where(User.email.in_([
            DEMO_OWNER_EMAIL, DEMO_TENANT_EMAIL, DEMO_OFFICER_EMAIL,
        ]))
    )
    await db.commit()


async def run(reset_first: bool = False):
    async with engine.begin() as conn:
        pass  # ensure engine connects before use
    async for db in get_db():
        try:
            if reset_first:
                print("Resetting demo data…")
                await reset(db)

            owner = (await db.execute(
                select(User).where(User.email == DEMO_OWNER_EMAIL)
            )).scalar_one_or_none()
            if not owner:
                owner = User(
                    email=DEMO_OWNER_EMAIL,
                    first_name="Demo",
                    last_name="Landlord",
                    phone="+254700000001",
                    hashed_password="!",  # never log in by password; demo only
                    role=UserRole.OWNER,
                    is_identity_verified=True,
                    is_verified_owner=True,
                    verification_badge=True,
                    trust_score=88.0,
                    is_active=True,
                )
                db.add(owner)

            tenant = (await db.execute(
                select(User).where(User.email == DEMO_TENANT_EMAIL)
            )).scalar_one_or_none()
            if not tenant:
                tenant = User(
                    email=DEMO_TENANT_EMAIL,
                    first_name="Demo",
                    last_name="Tenant",
                    phone="+254700000002",
                    hashed_password="!",
                    role=UserRole.TENANT,
                    is_active=True,
                )
                db.add(tenant)

            officer = (await db.execute(
                select(User).where(User.email == DEMO_OFFICER_EMAIL)
            )).scalar_one_or_none()
            if not officer:
                officer = User(
                    email=DEMO_OFFICER_EMAIL,
                    first_name="Demo",
                    last_name="Officer",
                    phone="+254700000003",
                    hashed_password="!",
                    role=UserRole.VERIFICATION_OFFICER,
                    is_active=True,
                )
                db.add(officer)
            await db.flush()

            for i, (name, kind, house_type, estate, town, county, lat, lng, price, unit, units, available, level) in enumerate(SEEDS):
                demo_name = f"{name} (demo)"
                prop = (await db.execute(
                    select(Property).where(Property.property_name == demo_name)
                )).scalar_one_or_none()
                if prop:
                    continue  # already seeded

                occupied = units - available
                prop = Property(
                    owner_id=owner.id,
                    property_type=kind,
                    property_name=demo_name,
                    description=f"DEMO LISTING for local development. Based on {name} in {estate}, {town}.",
                    year_built=2015 + (i % 9),
                    latitude=lat,
                    longitude=lng,
                    location=func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326),
                    address_line1=f"{estate} area",
                    city=town,
                    county=county,
                    property_code=_code(town, estate, i),
                    status=PropertyStatus.VERIFIED,
                    currency="KES",
                    min_rent=price,
                    max_rent=price,
                    total_rooms=units,
                    vacant_rooms=available,
                    occupancy_rate=round(occupied / max(1, units) * 100, 1),
                    has_verified_photos=True,
                    has_video=level in ("gold", "platinum"),
                    is_featured=level == "platinum",
                    trust_score=TRUST_BY_LEVEL[level],
                    average_rating=RATING_BY_LEVEL[level],
                    location_privacy="PUBLIC",
                    property_metadata={"is_demo": True, "demo_source": name},
                )
                db.add(prop)
                await db.flush()

                building = Building(
                    property_id=prop.id,
                    building_name=f"{name} Block A (demo)",
                    total_floors=min(6, max(1, units // 6)),
                )
                db.add(building)
                await db.flush()

                floor_count = building.total_floors
                rooms_per_floor = max(1, units // floor_count)
                created_rooms = 0
                for f in range(floor_count):
                    if created_rooms >= units:
                        break
                    floor = Floor(building_id=building.id, floor_number=f + 1)
                    db.add(floor)
                    await db.flush()
                    for r in range(rooms_per_floor):
                        if created_rooms >= units:
                            break
                        created_rooms += 1
                        db.add(Room(
                            building_id=building.id,
                            floor_id=floor.id,
                            property_id=prop.id,
                            room_number=f"{f + 1}{'ABCDEFGHIJ'[r % 10]}{r // 10 + 1}",
                            house_type=house_type,
                            rent_amount=price,
                            currency="KES",
                            occupancy_status=(
                                OccupancyStatus.VACANT if created_rooms <= available
                                else OccupancyStatus.OCCUPIED
                            ),
                            furnishing="unfurnished" if price < 20000 else "furnished",
                            water_available=True,
                            internet_available=level in ("gold", "platinum"),
                            parking_available=level in ("gold", "platinum"),
                        ))

                for service_name, category in [
                    ("Water 24/7", "water"),
                    ("Security", "security"),
                    ("Wi-Fi", "internet"),
                ]:
                    if level in ("basic", "verified") and service_name == "Wi-Fi":
                        continue
                    db.add(PropertyService(
                        property_id=prop.id,
                        service_name=service_name,
                        service_category=category,
                        status=PropertyServiceStatus.VERIFIED,
                        added_by=officer.id,
                        verified_by=officer.id,
                        verified_at=datetime.now(timezone.utc),
                    ))

                if name in BLACKLISTED:
                    state, reason = BLACKLISTED[name]
                    db.add(PropertyBlacklist(
                        property_id=prop.id,
                        state=state,
                        unique_reporter_count=11 if state == BlacklistState.UNDER_REVIEW else 3,
                        verified_positive_reviews=0,
                        report_quality_score=42.0,
                        reason=reason,
                        triggered_at=datetime.now(timezone.utc) - timedelta(days=2),
                        blacklist_metadata={
                            "visibility": "RESTRICTED" if state == BlacklistState.UNDER_REVIEW else "PUBLIC",
                            "is_demo": True,
                        },
                    ))

                if level in ("gold", "platinum") and tenant.id:
                    db.add(Review(
                        tenant_id=tenant.id,
                        property_id=prop.id,
                        overall_rating=RATING_BY_LEVEL[level],
                        title=f"Demo review of {name}",
                        comment="DEMO REVIEW: sample verified-tenant review used for local development.",
                        is_verified_tenant=True,
                        is_anonymous=False,
                    ))

            await db.commit()
            print(f"Seeded {len(SEEDS)} demo properties, users, rooms, services, reviews and blacklist entries.")
            print(f"  Owner:   {DEMO_OWNER_EMAIL}")
            print(f"  Tenant:  {DEMO_TENANT_EMAIL}")
            print(f"  Officer: {DEMO_OFFICER_EMAIL}")
            print("Demo properties are marked '(demo)' and must never appear in production data.")
            return
        finally:
            await db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed demo data for local development")
    parser.add_argument("--reset", action="store_true", help="Delete existing demo data first")
    args = parser.parse_args()
    asyncio.run(run(reset_first=args.reset))
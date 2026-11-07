"""Seed a realistic, always-visible demo supply for the live site.

The production site had zero VERIFIED listings, so the map, tiers and
instant-request flow had nothing to work with. This script fills the map
with listings in real Kenyan estates, owned by clearly-labelled seed
accounts (local, non-deliverable mailboxes) so live data is never confused
with demo data.

Usage (from backend/):
    python -m scripts.seed_demo          # add anything missing (idempotent)
    python -m scripts.seed_demo --fresh  # remove seed data first, then add

Properties carry metadata.demo_seed = True and property_code NL-SEED-###.
"""

import argparse
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")  # allow `python -m scripts.seed_demo` from backend/

from sqlalchemy import delete, func, select

from app.core.config import settings
from app.core.database import engine, get_db
from app.models.booking import Booking, BookingCheckIn, QRCode
from app.models.media import PhotoCategory, VerificationPhoto, VerificationStatus
from app.models.property import (
    Building, Floor, OccupancyStatus, Property, PropertyStatus, PropertyType,
    Room, HouseType,
)
from app.models.review import Review
from app.models.trust import (
    BlacklistState, PropertyBlacklist, PropertyService, PropertyServiceStatus,
)
from app.models.user import User, UserRole

SEED_OWNERS = [
    ("seed-owner-1@seed.nyumbalink.local", "Wanjiru", "Kamau", "+254711000101"),
    ("seed-owner-2@seed.nyumbalink.local", "Otieno", "Odhiambo", "+254711000102"),
    ("seed-owner-3@seed.nyumbalink.local", "Amina", "Hassan", "+254711000103"),
]
SEED_TENANT_EMAIL = "seed-tenant@seed.nyumbalink.local"
SEED_OFFICER_EMAIL = "seed-officer@seed.nyumbalink.local"

# (name, type, house, estate, town, county, sub_county, lat, lng,
#  rent, units, vacant, owner_idx, trust, rating, landmark)
SEEDS = [
    # Nairobi
    ("Riverside Court Kilimani", PropertyType.APARTMENT, HouseType.TWO_BEDROOM,
     "Kilimani", "Nairobi", "Nairobi", "Dagoretti North", -1.2903, 36.7870,
     58000, 24, 5, 0, 94, 4.7, "Off Argwings Kodhek Road, near Yaya Centre"),
    ("Wood Avenue Studios", PropertyType.APARTMENT, HouseType.STUDIO,
     "Kilimani", "Nairobi", "Nairobi", "Dagoretti North", -1.2957, 36.7767,
     32000, 30, 8, 0, 88, 4.4, "Wood Avenue, a short walk from Kilimani Mall"),
    ("Westlands Heights", PropertyType.APARTMENT, HouseType.ONE_BEDROOM,
     "Westlands", "Nairobi", "Nairobi", "Westlands", -1.2649, 36.8032,
     45000, 40, 6, 0, 96, 4.8, "Ring Road Westlands, opposite Sarit Centre"),
    ("Parklands Bedsitters", PropertyType.APARTMENT, HouseType.BEDSITTER,
     "Parklands", "Nairobi", "Nairobi", "Westlands", -1.2621, 36.8168,
     18500, 36, 12, 0, 82, 4.2, "3rd Parklands Avenue, near Aga Khan Hospital"),
    ("Lavington Green Maisonette", PropertyType.HOUSE, HouseType.MAISONETTE,
     "Lavington", "Nairobi", "Nairobi", "Dagoretti North", -1.2750, 36.7690,
     135000, 4, 1, 0, 97, 4.9, "James Gichuru Road, Lavington"),
    ("Karen Blixen Villas", PropertyType.HOUSE, HouseType.VILLA,
     "Karen", "Nairobi", "Nairobi", "Langata", -1.3191, 36.7062,
     240000, 3, 1, 0, 98, 5.0, "Karen Road, near Karen Country Club"),
    ("Kasarani Student Village", PropertyType.STUDENT_HOUSING, HouseType.SINGLE_ROOM,
     "Kasarani", "Nairobi", "Nairobi", "Kasarani", -1.2202, 36.8968,
     7500, 80, 22, 1, 85, 4.1, "Near Kasarani Stadium, matatu to KU main campus"),
    ("Ruaka Bedsitters", PropertyType.APARTMENT, HouseType.BEDSITTER,
     "Ruaka", "Kiambu", "Kiambu", "Limuru", -1.2100, 36.7800,
     11000, 28, 9, 1, 80, 4.0, "Limuru Road, close to Two Rivers Mall"),
    ("South B Executive Flats", PropertyType.APARTMENT, HouseType.ONE_BEDROOM,
     "South B", "Nairobi", "Nairobi", "Starehe", -1.3080, 36.8330,
     27000, 20, 3, 1, 87, 4.3, "Jogoo Road, South B Shopping Centre"),
    ("Embakasi Green Court", PropertyType.APARTMENT, HouseType.TWO_BEDROOM,
     "Embakasi", "Nairobi", "Nairobi", "Embakasi South", -1.3160, 36.8940,
     22000, 32, 7, 1, 83, 4.0, "Utawala Road, near Signature Mall"),
    # Kisumu
    ("Milimani Lakeview Apartments", PropertyType.APARTMENT, HouseType.ONE_BEDROOM,
     "Milimani", "Kisumu", "Kisumu", "Kisumu Central", -0.1005, 34.7534,
     18500, 20, 4, 1, 92, 4.6, "Milimani Estate, 5 min from Kisumu CBD"),
    ("Nyalenda Family Homes", PropertyType.HOUSE, HouseType.THREE_BEDROOM,
     "Nyalenda", "Kisumu", "Kisumu", "Kisumu Central", -0.1163, 34.7639,
     25000, 12, 3, 1, 84, 4.2, "Nyalenda B, off Ring Road"),
    ("Mamboleo Student Hostel", PropertyType.HOSTEL, HouseType.SINGLE_ROOM,
     "Mamboleo", "Kisumu", "Kisumu", "Kisumu East", -0.0517, 34.7861,
     5200, 60, 18, 2, 79, 3.9, "Mamboleo, on the Kisumu–Kakamega highway"),
    ("Dunga Bay Cottages", PropertyType.AIRBNB, HouseType.STUDIO,
     "Dunga", "Kisumu", "Kisumu", "Kisumu West", -0.1298, 34.7452,
     4800, 6, 2, 2, 90, 4.7, "Dunga Beach, overlooking the lake"),
    # Mombasa
    ("Nyali Beachfront Apartments", PropertyType.APARTMENT, HouseType.TWO_BEDROOM,
     "Nyali", "Mombasa", "Mombasa", "Nyali", -4.0435, 39.7003,
     65000, 18, 4, 2, 95, 4.8, "Links Road, two minutes from Nyali Beach"),
    ("Bamburi Coastal Bedsitters", PropertyType.APARTMENT, HouseType.BEDSITTER,
     "Bamburi", "Mombasa", "Mombasa", "Kisauni", -3.9915, 39.7285,
     15000, 24, 6, 2, 81, 4.1, "Bamburi, along the Mombasa–Malindi Road"),
    ("Mtwapa Creek Villas", PropertyType.HOUSE, HouseType.VILLA,
     "Mtwapa", "Kilifi", "Kilifi", "Kikambala", -3.9426, 39.7438,
     110000, 3, 1, 2, 93, 4.7, "Mtwapa Creek, near Mtwapa Mall"),
    # Nakuru
    ("Milimani Nakuru Flats", PropertyType.APARTMENT, HouseType.ONE_BEDROOM,
     "Milimani", "Nakuru", "Nakuru", "Nakuru East", -0.2961, 36.0703,
     16500, 16, 5, 0, 86, 4.3, "Milimani, off Kenyatta Avenue"),
    ("Lanet Greens Maisonettes", PropertyType.HOUSE, HouseType.MAISONETTE,
     "Lanet", "Nakuru", "Nakuru", "Nakuru East", -0.3159, 36.1373,
     42000, 8, 2, 0, 89, 4.5, "Lanet, near Kenya Military Academy"),
    # Eldoret
    ("Elgon View Apartments", PropertyType.APARTMENT, HouseType.TWO_BEDROOM,
     "Elgon View", "Eldoret", "Uasin Gishu", "Soy", 0.5152, 35.2760,
     29000, 14, 3, 1, 88, 4.4, "Elgon View, 10 min from Eldoret CBD"),
    ("Moi University Annex Rooms", PropertyType.STUDENT_HOUSING, HouseType.SINGLE_ROOM,
     "Annex", "Eldoret", "Uasin Gishu", "Ainabkoi", 0.5100, 35.2700,
     6000, 50, 16, 1, 78, 3.8, "Annex, walking distance to Moi University"),
    # Thika
    ("Thika Greens Section 9", PropertyType.HOUSE, HouseType.TOWNHOUSE,
     "Section 9", "Thika", "Kiambu", "Thika Town", -1.0388, 37.0834,
     48000, 10, 2, 0, 91, 4.6, "Section 9, near Thika Greens Golf Estate"),
    ("Makongeni Bedsitters", PropertyType.APARTMENT, HouseType.BEDSITTER,
     "Makongeni", "Thika", "Kiambu", "Thika Town", -1.0330, 37.0700,
     9000, 22, 8, 2, 77, 3.9, "Makongeni, off Garissa Road"),
    # Kisii
    ("Nyanchwa Hills Apartments", PropertyType.APARTMENT, HouseType.TWO_BEDROOM,
     "Nyanchwa", "Kisii", "Kisii", "Kitutu Chache", -0.6905, 34.7842,
     22000, 14, 4, 2, 85, 4.2, "Nyanchwa, 5 min from Kisii town centre"),
]

SEED_CODE_PREFIX = "NL-SEED-"
DEMO_PHOTO_CATEGORIES = [
    (PhotoCategory.EXTERIOR, "exterior", "#1f3b57", "#f97316"),
    (PhotoCategory.LIVING_ROOM, "living", "#243447", "#fbbf24"),
    (PhotoCategory.KITCHEN, "kitchen", "#20304a", "#22d3ee"),
    (PhotoCategory.BEDROOM, "bedroom", "#2a2440", "#a78bfa"),
]

_PHOTO_TEMPLATE = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">'
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
    '<stop offset="0" stop-color="{bg}"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs>'
    '<rect width="1200" height="800" fill="url(#g)"/>'
    '<circle cx="950" cy="180" r="140" fill="{accent}" opacity="0.18"/>'
    '<rect x="120" y="330" width="420" height="300" fill="none" stroke="{accent}" stroke-width="6" opacity="0.85"/>'
    '<rect x="150" y="360" width="160" height="120" fill="{accent}" opacity="0.25"/>'
    '<rect x="350" y="360" width="160" height="120" fill="{accent}" opacity="0.25"/>'
    '<rect x="150" y="510" width="360" height="90" fill="{accent}" opacity="0.15"/>'
    '<text x="120" y="716" font-family="Inter,Segoe UI,sans-serif" font-size="44" fill="#ffffff" opacity="0.92">{title}</text>'
    '<text x="120" y="764" font-family="Inter,Segoe UI,sans-serif" font-size="26" fill="#ffffff" opacity="0.6">{label} · NyumbaLink sample</text>'
    '</svg>'
)


def _seed_code(i: int) -> str:
    return f"{SEED_CODE_PREFIX}{str(i + 1).zfill(3)}"


def _write_placeholder(root: str, code: str, title: str, category: PhotoCategory, slug: str, bg: str, accent: str) -> str:
    """Write a small branded SVG so seeded listings render a photo without
    shipping binaries or fetching external images."""
    rel = f"/seed/{code.lower()}/{slug}.svg"
    full = os.path.join(root, "seed", code.lower(), f"{slug}.svg")
    os.makedirs(os.path.dirname(full), exist_ok=True)
    label = category.value.replace("_", " ").title()
    with open(full, "w", encoding="utf-8") as fh:
        fh.write(_PHOTO_TEMPLATE.format(bg=bg, accent=accent, title=title[:40], label=label))
    return rel


async def fresh(db) -> None:
    """Delete every row owned by seed accounts, including their bookings."""
    seed_users = await db.execute(
        select(User.id).where(
            User.email.in_([o[0] for o in SEED_OWNERS] + [SEED_TENANT_EMAIL, SEED_OFFICER_EMAIL])
        )
    )
    user_ids = [u for u in seed_users.scalars().all()]
    prop_ids = [
        p for p in (await db.execute(
            select(Property.id).where(Property.owner_id.in_(user_ids))
        )).scalars().all()
    ] if user_ids else []

    if prop_ids:
        booking_ids = (await db.execute(
            select(Booking.id).where(Booking.property_id.in_(prop_ids))
        )).scalars().all()
        if booking_ids:
            await db.execute(delete(BookingCheckIn).where(BookingCheckIn.booking_id.in_(booking_ids)))
            await db.execute(delete(QRCode).where(QRCode.booking_id.in_(booking_ids)))
            await db.execute(delete(Booking).where(Booking.id.in_(booking_ids)))
        await db.execute(delete(Review).where(Review.property_id.in_(prop_ids)))
        await db.execute(delete(PropertyBlacklist).where(PropertyBlacklist.property_id.in_(prop_ids)))
        await db.execute(delete(PropertyService).where(PropertyService.property_id.in_(prop_ids)))
        await db.execute(delete(VerificationPhoto).where(VerificationPhoto.property_id.in_(prop_ids)))
        await db.execute(delete(Room).where(Room.property_id.in_(prop_ids)))
        await db.execute(delete(Floor).where(Floor.building_id.in_(
            select(Building.id).where(Building.property_id.in_(prop_ids))
        )))
        await db.execute(delete(Building).where(Building.property_id.in_(prop_ids)))
        await db.execute(delete(Property).where(Property.id.in_(prop_ids)))
    if user_ids:
        await db.execute(delete(User).where(User.id.in_(user_ids)))
    await db.commit()


async def _get_or_create_user(db, email, first, last, phone, role, **extra) -> User:
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user:
        return user
    user = User(
        email=email, first_name=first, last_name=last, phone=phone,
        hashed_password="!",  # seed account: no password login
        role=role, is_active=True, **extra,
    )
    db.add(user)
    await db.flush()
    return user


async def run(fresh_first: bool = False) -> None:
    async with engine.begin():
        pass  # fail early if the database is unreachable

    async for db in get_db():
        try:
            if fresh_first:
                print("Removing existing seed data…")
                await fresh(db)

            owners = []
            for email, first, last, phone in SEED_OWNERS:
                owners.append(await _get_or_create_user(
                    db, email, first, last, phone, UserRole.OWNER,
                    is_email_verified=True, is_phone_verified=True,
                    is_identity_verified=True, is_verified_owner=True,
                    verification_badge=True, trust_score=92.0,
                ))
            tenant = await _get_or_create_user(
                db, SEED_TENANT_EMAIL, "Seed", "Tenant", "+254711000201",
                UserRole.TENANT, is_email_verified=True,
            )
            officer = await _get_or_create_user(
                db, SEED_OFFICER_EMAIL, "Seed", "Officer", "+254711000301",
                UserRole.VERIFICATION_OFFICER, is_email_verified=True,
            )
            await db.flush()

            now = datetime.now(timezone.utc)
            created = skipped = 0

            for i, (name, ptype, house, estate, town, county, subcounty,
                    lat, lng, rent, units, vacant, owner_idx, trust, rating,
                    landmark) in enumerate(SEEDS):
                code = _seed_code(i)
                if (await db.execute(select(Property.id).where(Property.property_code == code))).scalar_one_or_none():
                    skipped += 1
                    continue

                owner = owners[owner_idx]
                occupied = units - vacant
                prop = Property(
                    owner_id=owner.id,
                    property_type=ptype,
                    property_name=name,
                    description=(
                        f"{house.value.replace('_', ' ').title()} units in {estate}, {town}. "
                        f"{landmark}. Verified listing with water, security and reliable power. "
                        f"Book a viewing in the app — no payment is needed until you meet the owner."
                    ),
                    year_built=2014 + (i % 10),
                    latitude=lat,
                    longitude=lng,
                    location=func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326),
                    address_line1=f"{estate} Estate",
                    address_line2=None,
                    city=town,
                    county=county,
                    sub_county=subcounty,
                    property_code=code,
                    status=PropertyStatus.VERIFIED,
                    currency="KES",
                    min_rent=rent,
                    max_rent=rent,
                    total_rooms=units,
                    vacant_rooms=vacant,
                    last_vacancy_update=now - timedelta(days=i % 5),
                    occupancy_rate=round(occupied / max(1, units) * 100, 1),
                    has_verified_photos=True,
                    has_video=trust >= 88,
                    is_featured=rating >= 4.6,
                    trust_score=float(trust),
                    average_rating=float(rating),
                    total_views=120 + i * 37,
                    total_bookings=max(0, vacant - 2),
                    location_privacy="public",
                    landmark=landmark,
                    property_metadata={
                        "demo_seed": True,
                        "amenities": ["Water 24/7", "Security", "Wi-Fi", "Parking"],
                    },
                )
                db.add(prop)
                await db.flush()

                for order, (category, slug, bg, accent) in enumerate(DEMO_PHOTO_CATEGORIES):
                    storage_url = _write_placeholder(
                        settings.UPLOAD_DIR, code, name, category, slug, bg, accent,
                    )
                    db.add(VerificationPhoto(
                        property_id=prop.id,
                        owner_id=owner.id,
                        uploaded_by=owner.id,
                        category=category,
                        storage_url=storage_url,
                        verification_status=VerificationStatus.APPROVED,
                        is_primary=order == 0,
                        ai_verified=True,
                        ai_confidence=0.97,
                        reviewed_by=officer.id,
                        reviewed_at=now,
                        format="svg",
                    ))

                building = Building(
                    property_id=prop.id,
                    building_name=f"{name} Block A",
                    building_code=f"{code}-A",
                    total_floors=min(6, max(1, units // 6)),
                    total_rooms=units,
                    vacant_rooms=vacant,
                )
                db.add(building)
                await db.flush()

                floors = building.total_floors
                per_floor = max(1, units // floors)
                room_no = 0
                for f in range(floors):
                    if room_no >= units:
                        break
                    floor = Floor(
                        building_id=building.id,
                        floor_number=f + 1,
                        floor_name=f"Floor {f + 1}",
                    )
                    db.add(floor)
                    await db.flush()
                    for r in range(per_floor):
                        if room_no >= units:
                            break
                        room_no += 1
                        db.add(Room(
                            building_id=building.id,
                            floor_id=floor.id,
                            property_id=prop.id,
                            room_number=f"{f + 1}{'ABCDEFGH'[r % 8]}",
                            house_type=house,
                            rent_amount=rent,
                            deposit_amount=rent,
                            currency="KES",
                            occupancy_status=(
                                OccupancyStatus.VACANT if room_no <= vacant
                                else OccupancyStatus.OCCUPIED
                            ),
                            size_sqm=float(28 + (i % 5) * 8),
                            furnishing="furnished" if rent >= 30000 else "semi-furnished",
                            water_available=True,
                            electricity_available=True,
                            internet_available=trust >= 83,
                            parking_available=trust >= 85,
                            security_available=True,
                            family_friendly=house in (HouseType.TWO_BEDROOM, HouseType.THREE_BEDROOM, HouseType.MAISONETTE, HouseType.TOWNHOUSE),
                            student_friendly=ptype in (PropertyType.STUDENT_HOUSING, PropertyType.HOSTEL),
                        ))

                for service_name, category in [
                    ("Water 24/7", "water"),
                    ("Security & CCTV", "security"),
                    ("Electricity (prepaid)", "electricity"),
                ] + ([("Fibre Wi-Fi", "internet")] if trust >= 83 else []) + (
                    [("Secure parking", "parking")] if trust >= 85 else []
                ):
                    db.add(PropertyService(
                        property_id=prop.id,
                        service_name=service_name,
                        service_category=category,
                        status=PropertyServiceStatus.VERIFIED,
                        added_by=officer.id,
                        verified_by=officer.id,
                        verified_at=now,
                    ))

                if rating >= 4.5:
                    db.add(Review(
                        tenant_id=tenant.id,
                        property_id=prop.id,
                        overall_rating=rating,
                        title=f"Great place in {estate}",
                        comment=(
                            "Clean unit, responsive caretaker and the landlord showed up "
                            "on time for the viewing. Water has been reliable."
                        ),
                        is_verified_tenant=True,
                        is_anonymous=False,
                    ))
                created += 1

            await db.commit()
            print(f"Seed complete: {created} created, {skipped} already present.")
            print(f"  Owners:  {', '.join(o[0] for o in SEED_OWNERS)}")
            print("  Seed listings use property_code NL-SEED-### and metadata.demo_seed=true.")
            return
        finally:
            await db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed realistic demo listings")
    parser.add_argument("--fresh", action="store_true", help="Remove existing seed data first")
    args = parser.parse_args()
    asyncio.run(run(fresh_first=args.fresh))

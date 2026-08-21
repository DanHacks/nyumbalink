from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_verification_officer
from app.models.user import User
from app.models.property import Property
from app.models.trust import PropertyService, PropertyServiceStatus
from app.services.safety_service import record_audit

router = APIRouter()

SERVICE_CATEGORIES = {
    "water": ["Water 24/7", "Water limited hours", "Borehole water"],
    "electricity": ["Electricity prepaid", "Electricity postpaid", "Solar backup"],
    "internet": ["Wi-Fi included", "Fiber ready"],
    "parking": ["Parking", "Secured parking", "Boda parking"],
    "security": ["Askari/guard", "CCTV", "Perimeter fence"],
    "other": ["Garbage collection", "Elevator", "Gym", "Water tank"],
}


@router.get("/categories")
async def get_service_categories():
    return SERVICE_CATEGORIES


@router.get("/property/{property_id}")
async def list_property_services(
    property_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PropertyService).where(PropertyService.property_id == property_id)
    )
    services = result.scalars().all()

    return {
        "property_id": property_id,
        "services": [
            {
                "id": s.id,
                "name": s.service_name,
                "category": s.service_category,
                "status": s.status.value if hasattr(s.status, "value") else s.status,
            }
            for s in services
        ],
    }


@router.post("/property/{property_id}", status_code=status.HTTP_201_CREATED)
async def add_property_service(
    property_id: str,
    service_name: str,
    service_category: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    if prop.owner_id != current_user.id and current_user.role.value not in ("verification_officer", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Only the owner can add services")

    if service_category not in SERVICE_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown category '{service_category}'. Allowed: {list(SERVICE_CATEGORIES)}",
        )

    existing = await db.execute(
        select(PropertyService).where(
            PropertyService.property_id == property_id,
            PropertyService.service_name == service_name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Service already listed for this property")

    service = PropertyService(
        property_id=property_id,
        service_name=service_name,
        service_category=service_category,
        status=PropertyServiceStatus.OWNER_REPORTED,
        added_by=current_user.id,
    )
    db.add(service)
    await db.flush()

    return {"id": service.id, "service_name": service.service_name, "status": "owner_reported"}


@router.post("/{service_id}/verify")
async def verify_service(
    service_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verification_officer),
):
    result = await db.execute(
        select(PropertyService).where(PropertyService.id == service_id)
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    from datetime import datetime, timezone
    service.status = PropertyServiceStatus.VERIFIED
    service.verified_by = current_user.id
    service.verified_at = datetime.now(timezone.utc)

    await record_audit(
        db, current_user.id, "service_verified",
        resource_type="property_service", resource_id=service.id,
        details={"service_name": service.service_name, "property_id": service.property_id},
    )
    await db.flush()

    return {"message": "Service verified", "service_name": service.service_name}
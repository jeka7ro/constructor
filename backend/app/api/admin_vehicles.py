"""
Admin API endpoints for Fleet Management (Vehicles & Machinery)
Supports Many-to-Many: Vehicle <-> Sites, Vehicle <-> Drivers
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, date

from app.database import get_db
from app.models import Vehicle, VehicleSiteAssignment, VehicleUserAssignment, ConstructionSite, User, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/vehicles", tags=["admin-fleet"])


# =================== PYDANTIC SCHEMAS ===================

class VehicleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    plate_number: Optional[str] = Field(None, max_length=20)
    type: str = "van"
    year: Optional[int] = None
    status: str = "active"
    notes: Optional[str] = None
    site_ids: List[str] = []
    user_ids: List[str] = []


class VehicleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    plate_number: Optional[str] = Field(None, max_length=20)
    type: Optional[str] = None
    year: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    site_ids: Optional[List[str]] = None
    user_ids: Optional[List[str]] = None


class VehicleResponse(BaseModel):
    id: str
    name: str
    plate_number: Optional[str] = None
    type: str
    year: Optional[int] = None
    status: str
    notes: Optional[str] = None
    site_ids: List[str] = []
    user_ids: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


def get_vehicle_with_ids(vehicle: Vehicle, db: Session) -> dict:
    """Build response dict with associated site_ids and user_ids."""
    site_ids = [
        a.site_id for a in db.query(VehicleSiteAssignment)
        .filter(VehicleSiteAssignment.vehicle_id == vehicle.id, VehicleSiteAssignment.is_active == True)
        .all()
    ]
    user_ids = [
        a.user_id for a in db.query(VehicleUserAssignment)
        .filter(VehicleUserAssignment.vehicle_id == vehicle.id, VehicleUserAssignment.is_active == True)
        .all()
    ]
    return {
        "id": vehicle.id,
        "name": vehicle.name,
        "plate_number": vehicle.plate_number,
        "type": vehicle.type,
        "year": vehicle.year,
        "status": vehicle.status,
        "notes": vehicle.notes,
        "site_ids": site_ids,
        "user_ids": user_ids,
        "created_at": vehicle.created_at,
    }


def sync_assignments(vehicle_id: str, new_site_ids: List[str], new_user_ids: List[str], db: Session):
    """Sync site and user assignments for a vehicle (replace all)."""
    # Sites — deactivate all, then re-create active ones
    db.query(VehicleSiteAssignment).filter(
        VehicleSiteAssignment.vehicle_id == vehicle_id
    ).delete(synchronize_session=False)

    for sid in new_site_ids:
        db.add(VehicleSiteAssignment(vehicle_id=vehicle_id, site_id=sid, is_active=True))

    # Users — same
    db.query(VehicleUserAssignment).filter(
        VehicleUserAssignment.vehicle_id == vehicle_id
    ).delete(synchronize_session=False)

    for uid in new_user_ids:
        db.add(VehicleUserAssignment(vehicle_id=vehicle_id, user_id=uid, is_active=True))


# =================== ENDPOINTS ===================

@router.get("", response_model=List[dict])
def list_vehicles(
    status: Optional[str] = None,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all vehicles, optionally filtered by status."""
    q = db.query(Vehicle).filter(Vehicle.organization_id == current_admin.organization_id)
    if status:
        q = q.filter(Vehicle.status == status)
    vehicles = q.order_by(Vehicle.name).all()
    return [get_vehicle_with_ids(v, db) for v in vehicles]


@router.get("/{vehicle_id}", response_model=dict)
def get_vehicle(
    vehicle_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")
    return get_vehicle_with_ids(v, db)


@router.post("", response_model=dict, status_code=201)
def create_vehicle(
    payload: VehicleCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    import uuid
    v = Vehicle(
        id=str(uuid.uuid4()),
        organization_id=current_admin.organization_id,
        name=payload.name,
        plate_number=payload.plate_number,
        type=payload.type,
        year=payload.year,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(v)
    db.flush()  # get ID before sync
    sync_assignments(v.id, payload.site_ids, payload.user_ids, db)
    db.commit()
    db.refresh(v)
    return get_vehicle_with_ids(v, db)


@router.put("/{vehicle_id}", response_model=dict)
def update_vehicle(
    vehicle_id: str,
    payload: VehicleUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")

    if payload.name is not None:
        v.name = payload.name
    if payload.plate_number is not None:
        v.plate_number = payload.plate_number
    if payload.type is not None:
        v.type = payload.type
    if payload.year is not None:
        v.year = payload.year
    if payload.status is not None:
        v.status = payload.status
    if payload.notes is not None:
        v.notes = payload.notes

    if payload.site_ids is not None or payload.user_ids is not None:
        sync_assignments(
            v.id,
            payload.site_ids if payload.site_ids is not None else [],
            payload.user_ids if payload.user_ids is not None else [],
            db,
        )

    db.commit()
    db.refresh(v)
    return get_vehicle_with_ids(v, db)


@router.delete("/{vehicle_id}", status_code=204)
def delete_vehicle(
    vehicle_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")

    # Cascade handled by DB relationships
    db.delete(v)
    db.commit()
    return None


@router.get("/by-site/{site_id}", response_model=List[dict])
def vehicles_for_site(
    site_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get all vehicles currently assigned to a specific site."""
    assignments = db.query(VehicleSiteAssignment).filter(
        VehicleSiteAssignment.site_id == site_id,
        VehicleSiteAssignment.is_active == True,
    ).all()
    result = []
    for a in assignments:
        v = db.query(Vehicle).filter(Vehicle.id == a.vehicle_id).first()
        if v:
            result.append(get_vehicle_with_ids(v, db))
    return result


@router.get("/by-user/{user_id}", response_model=List[dict])
def vehicles_for_user(
    user_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get all vehicles assigned to a specific user (driver/operator)."""
    assignments = db.query(VehicleUserAssignment).filter(
        VehicleUserAssignment.user_id == user_id,
        VehicleUserAssignment.is_active == True,
    ).all()
    result = []
    for a in assignments:
        v = db.query(Vehicle).filter(Vehicle.id == a.vehicle_id).first()
        if v:
            result.append(get_vehicle_with_ids(v, db))
    return result

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

from app.database import get_db
from app.models import Accommodation, AccommodationAssignment, User, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/accommodations", tags=["Admin - Cazari"])


class AccommodationCreate(BaseModel):
    name: str
    address: Optional[str] = None
    capacity: Optional[int] = None
    notes: Optional[str] = None


class AccommodationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    capacity: Optional[int] = None
    notes: Optional[str] = None


class AssignmentCreate(BaseModel):
    user_id: str
    assigned_from: Optional[date] = None
    assigned_until: Optional[date] = None


def accommodation_to_dict(a: Accommodation, include_assignments: bool = False) -> dict:
    result = {
        "id": a.id,
        "name": a.name,
        "address": a.address,
        "capacity": a.capacity,
        "notes": a.notes,
        "created_at": str(a.created_at),
        "occupants_count": len(a.assignments) if a.assignments else 0,
    }
    if include_assignments:
        result["assignments"] = [
            {
                "id": asgn.id,
                "user_id": asgn.user_id,
                "user_name": asgn.user.full_name if asgn.user else "N/A",
                "assigned_from": str(asgn.assigned_from) if asgn.assigned_from else None,
                "assigned_until": str(asgn.assigned_until) if asgn.assigned_until else None,
                "created_at": str(asgn.created_at),
            }
            for asgn in a.assignments
        ]
    return result


@router.get("/")
def list_accommodations(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    accs = db.query(Accommodation).filter(
        Accommodation.organization_id == current_admin.organization_id
    ).order_by(Accommodation.name).all()
    return [accommodation_to_dict(a) for a in accs]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_accommodation(
    body: AccommodationCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    acc = Accommodation(
        organization_id=current_admin.organization_id,
        name=body.name,
        address=body.address,
        capacity=body.capacity,
        notes=body.notes,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return accommodation_to_dict(acc)


@router.get("/{acc_id}")
def get_accommodation(
    acc_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    acc = db.query(Accommodation).filter(
        Accommodation.id == acc_id,
        Accommodation.organization_id == current_admin.organization_id,
    ).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cazarea nu a fost gasita")
    return accommodation_to_dict(acc, include_assignments=True)


@router.put("/{acc_id}")
def update_accommodation(
    acc_id: str,
    body: AccommodationUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    acc = db.query(Accommodation).filter(
        Accommodation.id == acc_id,
        Accommodation.organization_id == current_admin.organization_id,
    ).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cazarea nu a fost gasita")

    if body.name is not None: acc.name = body.name
    if body.address is not None: acc.address = body.address
    if body.capacity is not None: acc.capacity = body.capacity
    if body.notes is not None: acc.notes = body.notes
    acc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(acc)
    return accommodation_to_dict(acc, include_assignments=True)


@router.delete("/{acc_id}")
def delete_accommodation(
    acc_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    acc = db.query(Accommodation).filter(
        Accommodation.id == acc_id,
        Accommodation.organization_id == current_admin.organization_id,
    ).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cazarea nu a fost gasita")
    db.delete(acc)
    db.commit()
    return {"ok": True}


@router.post("/{acc_id}/assign", status_code=status.HTTP_201_CREATED)
def assign_worker(
    acc_id: str,
    body: AssignmentCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Repartizeaza un muncitor la cazare"""
    acc = db.query(Accommodation).filter(
        Accommodation.id == acc_id,
        Accommodation.organization_id == current_admin.organization_id,
    ).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cazarea nu a fost gasita")

    # Verifica daca muncitorul e deja alocat
    existing = db.query(AccommodationAssignment).filter(
        AccommodationAssignment.accommodation_id == acc_id,
        AccommodationAssignment.user_id == body.user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Muncitorul este deja repartizat la aceasta cazare")

    asgn = AccommodationAssignment(
        accommodation_id=acc_id,
        user_id=body.user_id,
        assigned_from=body.assigned_from,
        assigned_until=body.assigned_until,
    )
    db.add(asgn)
    db.commit()
    db.refresh(asgn)
    return {
        "id": asgn.id,
        "user_id": asgn.user_id,
        "user_name": asgn.user.full_name if asgn.user else "N/A",
        "assigned_from": str(asgn.assigned_from) if asgn.assigned_from else None,
        "assigned_until": str(asgn.assigned_until) if asgn.assigned_until else None,
    }


@router.delete("/{acc_id}/assign/{assignment_id}")
def remove_assignment(
    acc_id: str,
    assignment_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Elimina repartizarea unui muncitor de la cazare"""
    asgn = db.query(AccommodationAssignment).filter(
        AccommodationAssignment.id == assignment_id,
        AccommodationAssignment.accommodation_id == acc_id,
    ).first()
    if not asgn:
        raise HTTPException(status_code=404, detail="Repartizarea nu a fost gasita")
    db.delete(asgn)
    db.commit()
    return {"ok": True}

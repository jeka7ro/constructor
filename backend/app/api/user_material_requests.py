from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models import MaterialRequest, User, Timesheet, TimesheetSegment
from app.api.auth import get_current_user

router = APIRouter(prefix="/user/material-requests", tags=["User - Necesar Materiale"])

class MaterialRequestCreate(BaseModel):
    items_text: str
    notes: Optional[str] = None

def get_user_active_site_id(db: Session, user_id: str) -> Optional[str]:
    # Look for an open timesheet segment for this user
    active_segment = db.query(TimesheetSegment).join(
        Timesheet, TimesheetSegment.timesheet_id == Timesheet.id
    ).filter(
        Timesheet.owner_user_id == user_id,
        TimesheetSegment.check_out_time.is_(None)
    ).first()
    
    if active_segment:
        return active_segment.site_id
    return None

@router.get("/")
def get_my_material_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    requests = db.query(MaterialRequest).filter(
        MaterialRequest.user_id == current_user.id
    ).order_by(MaterialRequest.created_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "items_text": r.items_text,
            "notes": r.notes,
            "status": r.status,
            "admin_response": r.admin_response,
            "responded_at": str(r.responded_at) if r.responded_at else None,
            "created_at": str(r.created_at)
        } for r in requests
    ]

@router.post("/")
def create_material_request(
    body: MaterialRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    site_id = get_user_active_site_id(db, current_user.id)
    
    new_request = MaterialRequest(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        site_id=site_id,
        items_text=body.items_text,
        notes=body.notes,
        status="pending"
    )
    
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    return {"id": new_request.id, "success": True}

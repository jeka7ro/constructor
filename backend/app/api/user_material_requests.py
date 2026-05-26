from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models import MaterialRequest, User, Timesheet, TimesheetSegment, WarehouseItem, WarehouseTransaction
import json
from app.api.auth import get_current_user

router = APIRouter(prefix="/user/material-requests", tags=["User - Necesar Materiale"])

class MaterialRequestCreate(BaseModel):
    items_text: str
    items_json: Optional[str] = None
    site_id: Optional[str] = None
    notes: Optional[str] = None

class MaterialRequestConfirm(BaseModel):
    action: str
    reason: Optional[str] = None

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
    # If the app sends a specific site_id, use it. Otherwise find the active site.
    site_id = body.site_id
    if not site_id:
        site_id = get_user_active_site_id(db, current_user.id)
    
    new_request = MaterialRequest(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        site_id=site_id,
        items_text=body.items_text,
        items_json=body.items_json,
        notes=body.notes,
        status="pending",
        is_fulfilled=False
    )
    
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    return {"id": new_request.id, "status": "pending"}

@router.put("/{mr_id}/confirm")
def confirm_material_request(
    mr_id: str,
    body: MaterialRequestConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(MaterialRequest).filter(
        MaterialRequest.id == mr_id,
        MaterialRequest.user_id == current_user.id
    ).first()
    
    if not c:
        raise HTTPException(status_code=404, detail="Cerere negasita")
        
    if c.status != "delivered":
        raise HTTPException(status_code=400, detail="Cererea nu este in stadiul de livrare si nu poate fi confirmata")
        
    if body.action == "reject":
        c.status = "disputed"
        c.admin_response = (c.admin_response or "") + f"\n[Refuzat Angajat]: {body.reason or 'Nu am primit materialele.'}"
    elif body.action == "confirm":
        c.status = "completed"
        # Process automated warehouse fulfillment
        if not c.is_fulfilled and c.items_json:
            try:
                items = json.loads(c.items_json)
                for item in items:
                    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item["id"]).first()
                    if not db_item:
                        continue
                        
                    if item["type"] == "warehouse":
                        qty = float(item.get("qty", 0))
                        
                        if db_item.inventory_code:
                            db_tx = WarehouseTransaction(
                                item_id=db_item.id,
                                transaction_type="OUT",
                                quantity=1.0,
                                date=datetime.utcnow().date(),
                                operated_by_id=current_user.id,
                                assigned_to_user_id=c.user_id,
                                site_id=c.site_id,
                                notes="Preluat automat din cerere necesar (Confirmat Muncitor)"
                            )
                            db.add(db_tx)
                            db_item.total_quantity -= 1.0
                            db_item.current_holder_id = c.user_id
                            db_item.current_site_id = c.site_id
                        else:
                            db_tx = WarehouseTransaction(
                                item_id=db_item.id,
                                transaction_type="OUT",
                                quantity=qty,
                                date=datetime.utcnow().date(),
                                operated_by_id=current_user.id,
                                assigned_to_user_id=c.user_id,
                                site_id=c.site_id,
                                notes="Eliberat automat din cerere necesar (Confirmat Muncitor)"
                            )
                            db.add(db_tx)
                            db_item.total_quantity -= qty
                            
                    elif item["type"] == "site_transfer":
                        if db_item.inventory_code:
                            db_item.current_holder_id = c.user_id
                            db_item.current_site_id = c.site_id
                
                c.is_fulfilled = True
            except Exception as e:
                print("Error processing automated fulfillment on confirm:", e)
                
    db.commit()
    db.refresh(c)
    return {"ok": True, "status": c.status}

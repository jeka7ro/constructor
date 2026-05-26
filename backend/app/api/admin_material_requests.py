from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import MaterialRequest, Admin, WarehouseItem, WarehouseTransaction
import json
from app.api.admin_auth import get_current_admin
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/admin/material-requests", tags=["Admin - Necesar Materiale"])

class MaterialStatusBody(BaseModel):
    status: str  # pending, approved, rejected, delivered
    admin_response: Optional[str] = None

def mr_to_dict(mr: MaterialRequest) -> dict:
    return {
        "id": mr.id,
        "items_text": mr.items_text,
        "notes": mr.notes,
        "status": mr.status,
        "admin_response": mr.admin_response,
        "responded_at": str(mr.responded_at) if mr.responded_at else None,
        "responder_name": mr.responder.full_name if mr.responder else None,
        "created_at": str(mr.created_at),
        "updated_at": str(mr.updated_at),
        "user_id": mr.user_id,
        "user_name": mr.user.full_name if mr.user else "N/A",
        "site_id": mr.site_id,
        "site_name": mr.site.name if mr.site else "N/A"
    }

def check_mr_permission(admin: Admin):
    allowed_roles = ["LOGISTIC", "SEF_SANTIER", "ADMIN", "SUPER_ADMIN", "VERIFICATOR_SANTIER", "SUPERVIZOR"]
    # Check if role is among allowed OR if user is super admin
    if admin.is_super_admin:
        return
    if admin.role.upper() not in allowed_roles:
        raise HTTPException(status_code=403, detail="Nu aveți permisiunea de a vedea necesarul de materiale.")

@router.get("/")
def list_material_requests(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_mr_permission(current_admin)
    q = db.query(MaterialRequest).options(
        joinedload(MaterialRequest.site),
        joinedload(MaterialRequest.user)
    ).filter(MaterialRequest.organization_id == current_admin.organization_id)
    if status_filter and status_filter != "all":
        q = q.filter(MaterialRequest.status == status_filter)
    requests = q.order_by(MaterialRequest.created_at.desc()).all()
    return [mr_to_dict(c) for c in requests]

@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    try:
        check_mr_permission(current_admin)
    except HTTPException:
        return {"count": 0}
        
    count = db.query(MaterialRequest).filter(
        MaterialRequest.organization_id == current_admin.organization_id,
        MaterialRequest.status == "pending"
    ).count()
    return {"count": count}

@router.put("/{mr_id}/status")
def change_status(
    mr_id: str,
    body: MaterialStatusBody,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_mr_permission(current_admin)
    valid_statuses = ["pending", "approved", "rejected", "delivered"]
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status invalid. Valori acceptate: {valid_statuses}")

    c = db.query(MaterialRequest).filter(
        MaterialRequest.id == mr_id,
        MaterialRequest.organization_id == current_admin.organization_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cerere negasita")

    c.status = body.status
    if body.admin_response is not None:
        c.admin_response = body.admin_response
    c.responded_by = current_admin.id
    c.responded_at = datetime.utcnow()
    c.updated_at = datetime.utcnow()
    
    # Process automated warehouse fulfillment
    if c.status in ["approved", "delivered"] and not c.is_fulfilled and c.items_json:
        try:
            items = json.loads(c.items_json)
            for item in items:
                db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item["id"]).first()
                if not db_item:
                    continue
                    
                if item["type"] == "warehouse":
                    # Deduct from warehouse, assign to user/site
                    qty = float(item.get("qty", 0))
                    
                    if db_item.inventory_code:
                        # Unique Tool
                        db_tx = WarehouseTransaction(
                            item_id=db_item.id,
                            transaction_type="OUT",
                            quantity=1.0,
                            date=datetime.utcnow().date(),
                            operated_by_id=current_admin.id,
                            assigned_to_user_id=c.user_id,
                            site_id=c.site_id,
                            notes="Preluat automat din cerere necesar"
                        )
                        db.add(db_tx)
                        db_item.total_quantity -= 1.0
                        db_item.current_holder_id = c.user_id
                        db_item.current_site_id = c.site_id
                    else:
                        # Bulk / Consumable
                        db_tx = WarehouseTransaction(
                            item_id=db_item.id,
                            transaction_type="OUT",
                            quantity=qty,
                            date=datetime.utcnow().date(),
                            operated_by_id=current_admin.id,
                            assigned_to_user_id=c.user_id,
                            site_id=c.site_id,
                            notes="Eliberat automat din cerere necesar"
                        )
                        db.add(db_tx)
                        db_item.total_quantity -= qty
                        
                elif item["type"] == "site_transfer":
                    # Item is already at the site, just transfer ownership
                    if db_item.inventory_code:
                        db_item.current_holder_id = c.user_id
                        db_item.current_site_id = c.site_id # Should be the same, but just in case
            
            c.is_fulfilled = True
        except Exception as e:
            print("Error processing automated fulfillment:", e)
    
    db.commit()
    db.refresh(c)
    return mr_to_dict(c)

@router.delete("/{mr_id}")
def delete_mr(
    mr_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    check_mr_permission(current_admin)
    c = db.query(MaterialRequest).filter(
        MaterialRequest.id == mr_id,
        MaterialRequest.organization_id == current_admin.organization_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cerere negasita")
    db.delete(c)
    db.commit()
    return {"ok": True}

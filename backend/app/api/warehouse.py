from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime

from app.database import get_db
from app.models import WarehouseItem, WarehouseTransaction, Admin, Vehicle, User
from app.api.admin_auth import get_current_admin
from app.storage import upload_file, get_content_type
import os
import uuid

router = APIRouter()

def is_admin_or_logistic(admin: Admin):
    # Currently Admin table does not have roles, all Admins are allowed.
    # If role-based access is added to Admin in the future, check here.
    return True

# Schemas
class WarehouseItemCreate(BaseModel):
    name: str
    category: str
    unit: str
    model: Optional[str] = None
    inventory_code: Optional[str] = None

class WarehouseItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    model: Optional[str] = None
    inventory_code: Optional[str] = None

class WarehouseTransactionCreate(BaseModel):
    item_id: str
    transaction_type: str  # "IN" or "OUT"
    quantity: float
    date: date
    assigned_to_user_id: Optional[str] = None
    assigned_to_vehicle_id: Optional[str] = None
    site_id: Optional[str] = None
    notes: Optional[str] = None

# GET items
@router.get("/warehouse/items")
def get_items(category: Optional[str] = None, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    query = db.query(WarehouseItem, User.full_name.label("holder_name")).outerjoin(User, WarehouseItem.current_holder_id == User.id).filter(WarehouseItem.organization_id == current_admin.organization_id)
    if category:
        query = query.filter(WarehouseItem.category == category)
    items = query.order_by(WarehouseItem.name).all()
    
    # Calculate Total IN and OUT
    in_map = {}
    out_map = {}
    if items:
        from sqlalchemy import func
        from app.models import WarehouseTransaction
        stats = db.query(
            WarehouseTransaction.item_id,
            WarehouseTransaction.transaction_type,
            func.sum(WarehouseTransaction.quantity).label('total')
        ).filter(WarehouseTransaction.item_id.in_([i.id for i in items])).group_by(WarehouseTransaction.item_id, WarehouseTransaction.transaction_type).all()
        
        for i, holder_name in items:
            if tx_type == "IN":
                in_map[item_id] = total
            else:
                out_map[item_id] = total

    return [
        {
            "id": i.id,
            "name": i.name,
            "category": i.category,
            "unit": i.unit,
            "total_quantity": i.total_quantity,
            "model": i.model,
            "inventory_code": i.inventory_code,
            "current_holder_id": i.current_holder_id,
            "current_holder_name": holder_name,
            "checked_out_at": i.checked_out_at,
            "total_in": in_map.get(i.id, 0),
            "total_out": out_map.get(i.id, 0)
        } for i, holder_name in items
    ]

# CREATE item
@router.post("/warehouse/items")
def create_item(item: WarehouseItemCreate, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    
    db_item = WarehouseItem(
        organization_id=current_admin.organization_id,
        name=item.name,
        category=item.category,
        unit=item.unit,
        model=item.model,
        inventory_code=item.inventory_code,
        total_quantity=1.0 if item.inventory_code else 0.0
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"id": db_item.id, "name": db_item.name}

# UPDATE item
@router.put("/warehouse/items/{item_id}")
def update_item(item_id: str, item: WarehouseItemUpdate, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
        
    if item.name is not None:
        db_item.name = item.name
    if item.category is not None:
        db_item.category = item.category
    if item.unit is not None:
        db_item.unit = item.unit
    if item.model is not None:
        db_item.model = item.model
    if item.inventory_code is not None:
        db_item.inventory_code = item.inventory_code
        
    db.commit()
    return {"success": True}

# DELETE item
@router.delete("/warehouse/items/{item_id}")
def delete_item(item_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
        
    db.delete(db_item)
    db.commit()
    return {"success": True}

# GET transactions for item
@router.get("/warehouse/items/{item_id}/transactions")
def get_item_transactions(item_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    
    transactions = db.query(WarehouseTransaction).filter(WarehouseTransaction.item_id == item_id).order_by(desc(WarehouseTransaction.created_at)).all()
    
    result = []
    
    # Pre-fetch all admins and users to match operator_id
    all_admins = {a.id: a.full_name for a in db.query(Admin).all()}
    all_users = {u.id: u.full_name for u in db.query(User).all()}

    for t in transactions:
        assigned_user = t.assigned_to_user.full_name if t.assigned_to_user else None
        assigned_vehicle = t.assigned_to_vehicle.name if t.assigned_to_vehicle else None
        assigned_site = t.site.name if t.site else None
        
        # Look up operator in admins first, then users
        operator = all_admins.get(t.operated_by_id) or all_users.get(t.operated_by_id) or "Necunoscut"
        
        result.append({
            "id": t.id,
            "transaction_type": t.transaction_type,
            "quantity": t.quantity,
            "date": t.date,
            "assigned_user": assigned_user,
            "assigned_vehicle": assigned_vehicle,
            "assigned_site": assigned_site,
            "assigned_to_user_id": t.assigned_to_user_id,
            "assigned_to_vehicle_id": t.assigned_to_vehicle_id,
            "site_id": t.site_id,
            "operator": operator,
            "notes": t.notes,
            "attachment_url": t.attachment_url,
            "created_at": t.created_at
        })
    return result

# ADD transaction
@router.post("/warehouse/transactions")
async def add_transaction(
    item_id: str = Form(...),
    transaction_type: str = Form(...),
    quantity: float = Form(...),
    date: str = Form(...),
    assigned_to_user_id: Optional[str] = Form(None),
    assigned_to_vehicle_id: Optional[str] = Form(None),
    site_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), 
    current_admin: Admin = Depends(get_current_admin)
):
    is_admin_or_logistic(current_admin)
    
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
        
    if transaction_type not in ["IN", "OUT"]:
        raise HTTPException(status_code=400, detail="Tip tranzacție invalid")
        
    if transaction_type == "OUT" and db_item.total_quantity < quantity:
        raise HTTPException(status_code=400, detail="Stoc insuficient")
        
    attachment_url = None
    if file:
        content = await file.read()
        filename = file.filename
        storage_path = f"warehouse/{uuid.uuid4()}_{filename}"
        attachment_url = upload_file(content, storage_path, get_content_type(filename))
        
    # convert date string to date object
    from datetime import date as dt_date
    date_obj = dt_date.fromisoformat(date)
        
    db_tx = WarehouseTransaction(
        item_id=item_id,
        transaction_type=transaction_type,
        quantity=quantity,
        date=date_obj,
        operated_by_id=current_admin.id,
        assigned_to_user_id=assigned_to_user_id,
        assigned_to_vehicle_id=assigned_to_vehicle_id,
        site_id=site_id,
        notes=notes,
        attachment_url=attachment_url
    )
    db.add(db_tx)
    
    if transaction_type == "IN":
        db_item.total_quantity += quantity
    else:
        db_item.total_quantity -= quantity
        
    db.commit()
    return {"success": True, "new_total": db_item.total_quantity}

# DELETE transaction
@router.delete("/warehouse/transactions/{tx_id}")
def delete_transaction(tx_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    
    tx = db.query(WarehouseTransaction).filter(WarehouseTransaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Tranzacția nu a fost găsită")
        
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == tx.item_id).first()
    if db_item:
        if tx.transaction_type == "IN":
            db_item.total_quantity -= tx.quantity
        else:
            db_item.total_quantity += tx.quantity
            
    db.delete(tx)
    db.commit()
    return {"success": True}

# EDIT transaction
@router.put("/warehouse/transactions/{tx_id}")
async def edit_transaction(
    tx_id: str,
    quantity: float = Form(...),
    date: str = Form(...),
    assigned_to_user_id: Optional[str] = Form(None),
    assigned_to_vehicle_id: Optional[str] = Form(None),
    site_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    is_admin_or_logistic(current_admin)
    
    tx = db.query(WarehouseTransaction).filter(WarehouseTransaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Tranzacția nu a fost găsită")
        
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == tx.item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")

    qty_diff = quantity - tx.quantity
    
    if tx.transaction_type == "OUT" and db_item.total_quantity - qty_diff < 0:
        raise HTTPException(status_code=400, detail="Stoc insuficient pentru modificare")
        
    attachment_url = tx.attachment_url
    if file:
        content = await file.read()
        filename = file.filename
        storage_path = f"warehouse/{uuid.uuid4()}_{filename}"
        attachment_url = upload_file(content, storage_path, get_content_type(filename))
        
    from datetime import date as dt_date
    date_obj = dt_date.fromisoformat(date)
    
    # Adjust item stock
    if tx.transaction_type == "IN":
        db_item.total_quantity += qty_diff
    else:
        db_item.total_quantity -= qty_diff

    tx.quantity = quantity
    tx.date = date_obj
    tx.assigned_to_user_id = assigned_to_user_id if assigned_to_user_id != "null" and assigned_to_user_id != "" else None
    tx.assigned_to_vehicle_id = assigned_to_vehicle_id if assigned_to_vehicle_id != "null" and assigned_to_vehicle_id != "" else None
    tx.site_id = site_id if site_id != "null" and site_id != "" else None
    tx.notes = notes
    if file:
        tx.attachment_url = attachment_url
        
    db.commit()
    return {"success": True, "new_total": db_item.total_quantity}

class ToolCheckout(BaseModel):
    user_id: str
    date: str

@router.post("/warehouse/items/{item_id}/checkout")
def checkout_tool(item_id: str, data: ToolCheckout, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
    if db_item.current_holder_id:
        raise HTTPException(status_code=400, detail="Scula este deja predată")

    # update status
    db_item.current_holder_id = data.user_id
    from datetime import datetime
    db_item.checked_out_at = datetime.utcnow()

    # create OUT transaction representing check-out
    from datetime import date as dt_date
    date_obj = dt_date.fromisoformat(data.date)
    
    tx = WarehouseTransaction(
        item_id=item_id,
        transaction_type="OUT",
        quantity=1.0,
        date=date_obj,
        operated_by_id=current_admin.id,
        assigned_to_user_id=data.user_id,
        notes="Predare sculă"
    )
    db.add(tx)
    # the total_quantity goes from 1 to 0 (since it's an individual item)
    db_item.total_quantity = 0.0
    db.commit()
    return {"success": True}

class ToolCheckin(BaseModel):
    date: str

@router.post("/warehouse/items/{item_id}/checkin")
def checkin_tool(item_id: str, data: ToolCheckin, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
    if not db_item.current_holder_id:
        raise HTTPException(status_code=400, detail="Scula este deja în magazie")

    # record who returned it based on who had it
    returned_from_user_id = db_item.current_holder_id

    # clear status
    db_item.current_holder_id = None
    db_item.checked_out_at = None

    # create IN transaction representing check-in
    from datetime import date as dt_date
    date_obj = dt_date.fromisoformat(data.date)
    
    tx = WarehouseTransaction(
        item_id=item_id,
        transaction_type="IN",
        quantity=1.0,
        date=date_obj,
        operated_by_id=current_admin.id,
        assigned_to_user_id=returned_from_user_id,
        notes="Primire sculă"
    )
    db.add(tx)
    # item comes back to warehouse, so qty=1
    db_item.total_quantity = 1.0
    db.commit()
    return {"success": True}

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime

from app.database import get_db
from app.models import WarehouseItem, WarehouseTransaction, Admin, Vehicle, User, Site, MaterialRequest
from app.api.admin_auth import get_current_admin
from app.storage import upload_file, get_content_type
import os
import uuid

router = APIRouter()

def is_admin_or_logistic(admin: Admin):
    if admin.role not in ["ADMIN", "LOGISTIC"]:
        raise HTTPException(status_code=403, detail="Nu aveți permisiunea de a accesa această secțiune")
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
def get_items(category: Optional[str] = None, site_id: Optional[str] = None, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    query = db.query(WarehouseItem, Site.name.label("site_name"), User.full_name.label("holder_name"))\
              .outerjoin(Site, WarehouseItem.current_site_id == Site.id)\
              .outerjoin(User, WarehouseItem.current_holder_id == User.id)\
              .filter(WarehouseItem.organization_id == current_admin.organization_id)
              
    if category:
        query = query.filter(WarehouseItem.category == category)
        
    items_with_relations = query.order_by(WarehouseItem.name).all()
    item_ids = [i[0].id for i in items_with_relations]
    
    in_map = {}
    out_map = {}
    site_stock_map = {}
    
    if item_ids:
        stats = db.query(
            WarehouseTransaction.item_id,
            WarehouseTransaction.transaction_type,
            func.sum(WarehouseTransaction.quantity).label('total'),
            WarehouseTransaction.site_id
        ).filter(WarehouseTransaction.item_id.in_(item_ids)).group_by(WarehouseTransaction.item_id, WarehouseTransaction.transaction_type, WarehouseTransaction.site_id).all()
        
        for i_id, tx_type, total, tx_site_id in stats:
            if tx_type == "IN":
                in_map[i_id] = in_map.get(i_id, 0) + total
            elif tx_type == "OUT":
                out_map[i_id] = out_map.get(i_id, 0) + total
                
            if tx_site_id:
                if i_id not in site_stock_map:
                    site_stock_map[i_id] = {}
                if tx_site_id not in site_stock_map[i_id]:
                    site_stock_map[i_id][tx_site_id] = 0
                
                if tx_type == "OUT": 
                    site_stock_map[i_id][tx_site_id] += total
                elif tx_type == "IN" or tx_type == "CONSUME":
                    site_stock_map[i_id][tx_site_id] -= total

    results = []
    for i, site_name, holder_name in items_with_relations:
        if site_id:
            if i.inventory_code: 
                if i.current_site_id != site_id:
                    continue 
                effective_qty = 1
            else: 
                stock_at_site = site_stock_map.get(i.id, {}).get(site_id, 0)
                if stock_at_site <= 0:
                    continue 
                effective_qty = stock_at_site
        else:
            effective_qty = i.total_quantity

        results.append({
            "id": i.id,
            "name": i.name,
            "category": i.category,
            "unit": i.unit,
            "total_quantity": effective_qty,
            "model": i.model,
            "inventory_code": i.inventory_code,
            "current_site_id": i.current_site_id,
            "current_site_name": site_name,
            "current_holder_id": i.current_holder_id,
            "current_holder_name": holder_name,
            "checked_out_at": i.checked_out_at,
            "is_defective": i.is_defective,
            "total_in": in_map.get(i.id, 0),
            "total_out": out_map.get(i.id, 0)
        })
        
    return results


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
    
    # Pre-fetch all entities to match IDs
    all_admins = {a.id: a.full_name for a in db.query(Admin).all()}
    all_users = {u.id: u.full_name for u in db.query(User).all()}
    all_vehicles = {v.id: v.name for v in db.query(Vehicle).all()}
    all_sites = {s.id: s.name for s in db.query(Site).all()}

    for t in transactions:
        assigned_user = all_users.get(t.assigned_to_user_id) if t.assigned_to_user_id else None
        assigned_vehicle = all_vehicles.get(t.assigned_to_vehicle_id) if t.assigned_to_vehicle_id else None
        assigned_site = all_sites.get(t.site_id) if t.site_id else None
        
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
    site_id: Optional[str] = None
    user_id: Optional[str] = None
    date: str

@router.post("/warehouse/items/{item_id}/checkout")
def checkout_tool(item_id: str, data: ToolCheckout, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
    if db_item.current_site_id or db_item.current_holder_id:
        raise HTTPException(status_code=400, detail="Scula este deja repartizată")
    if db_item.is_defective:
        raise HTTPException(status_code=400, detail="Nu se poate repartiza o sculă defectă")

    site_id_val = data.site_id if data.site_id and data.site_id != "null" else None
    user_id_val = data.user_id if data.user_id and data.user_id != "null" else None

    if not site_id_val and not user_id_val:
        raise HTTPException(status_code=400, detail="Trebuie să selectezi un șantier sau un angajat")

    # update status
    db_item.current_site_id = site_id_val
    db_item.current_holder_id = user_id_val
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
        site_id=site_id_val,
        assigned_to_user_id=user_id_val,
        notes="Repartizare"
    )
    db.add(tx)
    # the total_quantity goes from 1 to 0 (since it's an individual item)
    db_item.total_quantity = 0.0
    db.commit()
    return {"success": True}

@router.post("/warehouse/items/{item_id}/force-assign")
def force_assign_tool(item_id: str, data: ToolCheckout, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    """Force-set current holder/site for a warehouse item, even if already assigned. Used to correct data."""
    is_admin_or_logistic(current_admin)
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")

    site_id_val = data.site_id if data.site_id and data.site_id != "null" else None
    user_id_val = data.user_id if data.user_id and data.user_id != "null" else None

    db_item.current_site_id = site_id_val
    db_item.current_holder_id = user_id_val
    from datetime import datetime
    db_item.checked_out_at = datetime.utcnow()
    db_item.total_quantity = 0.0 if (site_id_val or user_id_val) else 1.0

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
    if not db_item.current_site_id and not db_item.current_holder_id:
        raise HTTPException(status_code=400, detail="Scula este deja în magazie")

    # record from where it returned
    returned_from_site_id = db_item.current_site_id
    returned_from_user_id = db_item.current_holder_id

    # clear status
    db_item.current_site_id = None
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
        site_id=returned_from_site_id,
        assigned_to_user_id=returned_from_user_id,
        notes="Primire din șantier"
    )
    db.add(tx)
    db_item.total_quantity = 1.0
    db.commit()
    return {"success": True}

@router.post("/warehouse/items/{item_id}/toggle-defective")
def toggle_defective(item_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    is_admin_or_logistic(current_admin)
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_admin.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
        
    db_item.is_defective = not db_item.is_defective
    db.commit()
    return {"success": True, "is_defective": db_item.is_defective}

@router.get("/warehouse/items/{item_id}/linked-request")
def get_linked_request(item_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    """Find the most recent completed material request linked to this warehouse item by inventory_code."""
    is_admin_or_logistic(current_admin)
    db_item = db.query(WarehouseItem).filter(
        WarehouseItem.id == item_id,
        WarehouseItem.organization_id == current_admin.organization_id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")

    import json

    # Search all material requests for this org, look for inventory_code in items_json or items_text
    requests = db.query(MaterialRequest).filter(
        MaterialRequest.organization_id == current_admin.organization_id
    ).order_by(desc(MaterialRequest.created_at)).all()

    matched = None
    for req in requests:
        # Check items_json first
        if req.items_json:
            try:
                items = json.loads(req.items_json)
                for it in items:
                    if (db_item.inventory_code and str(it.get("id", "")) == db_item.id) or \
                       (db_item.inventory_code and db_item.inventory_code in str(it.get("name", ""))) or \
                       (db_item.name and db_item.name.lower() in str(it.get("name", "")).lower()):
                        matched = req
                        break
            except Exception:
                pass
        # Check items_text
        if not matched and req.items_text:
            if (db_item.inventory_code and db_item.inventory_code in req.items_text) or \
               (db_item.name and db_item.name.lower() in req.items_text.lower()):
                matched = req
        if matched:
            break

    if not matched:
        return None

    # Get current holder info
    holder = None
    if db_item.current_holder_id:
        holder = db.query(User).filter(User.id == db_item.current_holder_id).first()
    elif matched.user_id:
        # fallback: if request is completed, the requester likely has it
        if matched.status in ("completed", "delivered"):
            holder = db.query(User).filter(User.id == matched.user_id).first()

    holder_site = None
    if db_item.current_site_id:
        holder_site = db.query(Site).filter(Site.id == db_item.current_site_id).first()
    elif matched.site_id:
        holder_site = db.query(Site).filter(Site.id == matched.site_id).first()

    responder_name = matched.responder.full_name if matched.responder else None

    return {
        "request_id": matched.id,
        "status": matched.status,
        "requested_by": matched.user.full_name if matched.user else None,
        "requested_by_id": matched.user_id,
        "requested_at": matched.created_at.isoformat() if matched.created_at else None,
        "site_name": matched.site.name if matched.site else None,
        "approved_by": responder_name,
        "approved_at": matched.responded_at.isoformat() if matched.responded_at else None,
        "confirmed_by": matched.user.full_name if matched.status in ("completed", "delivered") else None,
        "confirmed_at": matched.updated_at.isoformat() if matched.status in ("completed", "delivered") else None,
        "current_holder": holder.full_name if holder else None,
        "current_site": holder_site.name if holder_site else None,
        "items_text": matched.items_text,
    }


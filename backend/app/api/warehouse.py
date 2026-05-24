from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime

from app.database import get_db
from app.models import WarehouseItem, WarehouseTransaction, User, Vehicle
from app.api.auth import get_current_user

router = APIRouter()

def is_admin_or_logistic(user: User):
    if user.role.code not in ["ADMIN", "SUPER_ADMIN", "LOGISTIC"]:
        raise HTTPException(status_code=403, detail="Nu ai permisiunea necesară pentru magazie.")
    return True

# Schemas
class WarehouseItemCreate(BaseModel):
    name: str
    category: str
    unit: str

class WarehouseItemUpdate(BaseModel):
    name: Optional[str]
    category: Optional[str]
    unit: Optional[str]

class WarehouseTransactionCreate(BaseModel):
    item_id: str
    transaction_type: str  # "IN" or "OUT"
    quantity: float
    date: date
    assigned_to_user_id: Optional[str] = None
    assigned_to_vehicle_id: Optional[str] = None
    notes: Optional[str] = None

# GET items
@router.get("/warehouse/items")
def get_items(category: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin_or_logistic(current_user)
    query = db.query(WarehouseItem).filter(WarehouseItem.organization_id == current_user.organization_id)
    if category:
        query = query.filter(WarehouseItem.category == category)
    items = query.order_by(WarehouseItem.name).all()
    
    return [
        {
            "id": i.id,
            "name": i.name,
            "category": i.category,
            "unit": i.unit,
            "total_quantity": i.total_quantity
        } for i in items
    ]

# CREATE item
@router.post("/warehouse/items")
def create_item(item: WarehouseItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin_or_logistic(current_user)
    
    db_item = WarehouseItem(
        organization_id=current_user.organization_id,
        name=item.name,
        category=item.category,
        unit=item.unit,
        total_quantity=0.0
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"id": db_item.id, "name": db_item.name}

# UPDATE item
@router.put("/warehouse/items/{item_id}")
def update_item(item_id: str, item: WarehouseItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin_or_logistic(current_user)
    
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_user.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
        
    if item.name is not None:
        db_item.name = item.name
    if item.category is not None:
        db_item.category = item.category
    if item.unit is not None:
        db_item.unit = item.unit
        
    db.commit()
    return {"success": True}

# DELETE item
@router.delete("/warehouse/items/{item_id}")
def delete_item(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin_or_logistic(current_user)
    
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id, WarehouseItem.organization_id == current_user.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
        
    db.delete(db_item)
    db.commit()
    return {"success": True}

# GET transactions for item
@router.get("/warehouse/items/{item_id}/transactions")
def get_item_transactions(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin_or_logistic(current_user)
    
    transactions = db.query(WarehouseTransaction).filter(WarehouseTransaction.item_id == item_id).order_by(desc(WarehouseTransaction.created_at)).all()
    
    result = []
    for t in transactions:
        assigned_user = t.assigned_to_user.full_name if t.assigned_to_user else None
        assigned_vehicle = t.assigned_to_vehicle.name if t.assigned_to_vehicle else None
        operator = t.operated_by.full_name if t.operated_by else None
        
        result.append({
            "id": t.id,
            "transaction_type": t.transaction_type,
            "quantity": t.quantity,
            "date": t.date,
            "assigned_user": assigned_user,
            "assigned_vehicle": assigned_vehicle,
            "operator": operator,
            "notes": t.notes,
            "created_at": t.created_at
        })
    return result

# ADD transaction
@router.post("/warehouse/transactions")
def add_transaction(tx: WarehouseTransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin_or_logistic(current_user)
    
    db_item = db.query(WarehouseItem).filter(WarehouseItem.id == tx.item_id, WarehouseItem.organization_id == current_user.organization_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articolul nu a fost găsit")
        
    if tx.transaction_type not in ["IN", "OUT"]:
        raise HTTPException(status_code=400, detail="Tip tranzacție invalid")
        
    if tx.transaction_type == "OUT" and db_item.total_quantity < tx.quantity:
        raise HTTPException(status_code=400, detail="Stoc insuficient")
        
    db_tx = WarehouseTransaction(
        item_id=tx.item_id,
        transaction_type=tx.transaction_type,
        quantity=tx.quantity,
        date=tx.date,
        operated_by_id=current_user.id,
        assigned_to_user_id=tx.assigned_to_user_id,
        assigned_to_vehicle_id=tx.assigned_to_vehicle_id,
        notes=tx.notes
    )
    db.add(db_tx)
    
    if tx.transaction_type == "IN":
        db_item.total_quantity += tx.quantity
    else:
        db_item.total_quantity -= tx.quantity
        
    db.commit()
    return {"success": True, "new_total": db_item.total_quantity}

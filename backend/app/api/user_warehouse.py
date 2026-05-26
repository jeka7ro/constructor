from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List

from app.database import get_db
from app.models import WarehouseItem, WarehouseTransaction, User, Site
from app.api.auth import get_current_user
from app.api.user_material_requests import get_user_active_site_id
from pydantic import BaseModel
from datetime import datetime
from fastapi import HTTPException

class ConsumeRequest(BaseModel):
    item_id: str
    quantity: float
    notes: Optional[str] = None

router = APIRouter(prefix="/user/warehouse", tags=["User - Magazie"])

@router.get("/inventory")
def get_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns warehouse inventory available to the user,
    plus quantities already assigned to their active site.
    """
    site_id = get_user_active_site_id(db, current_user.id)
    
    query = db.query(WarehouseItem).filter(
        WarehouseItem.organization_id == current_user.organization_id
    )
    items = query.order_by(WarehouseItem.name).all()
    
    item_ids = [i.id for i in items]
    
    site_stock_map = {}
    
    if item_ids and site_id:
        stats = db.query(
            WarehouseTransaction.item_id,
            WarehouseTransaction.transaction_type,
            func.sum(WarehouseTransaction.quantity).label('total')
        ).filter(
            WarehouseTransaction.item_id.in_(item_ids),
            WarehouseTransaction.site_id == site_id
        ).group_by(
            WarehouseTransaction.item_id, 
            WarehouseTransaction.transaction_type
        ).all()
        
        for i_id, tx_type, total in stats:
            if i_id not in site_stock_map:
                site_stock_map[i_id] = 0
                
            if tx_type == "OUT": # OUT from warehouse TO site
                site_stock_map[i_id] += total
            elif tx_type == "IN" or tx_type == "CONSUME": # IN to warehouse FROM site, or CONSUME by worker
                site_stock_map[i_id] -= total

    results = []
    for i in items:
        # Determine quantity at the user's active site
        site_qty = 0
        if site_id:
            if i.inventory_code:
                # Unique tools
                if i.current_site_id == site_id:
                    site_qty = 1
            else:
                # Bulk materials
                site_qty = site_stock_map.get(i.id, 0)
                
        # Central warehouse quantity is stored in total_quantity 
        # (updated upon IN/OUT transactions by admin)
        central_qty = i.total_quantity
        
        # Only send items that either have central stock > 0, 
        # OR are currently at the user's site.
        if central_qty > 0 or site_qty > 0:
            results.append({
                "id": i.id,
                "name": i.name,
                "category": i.category,
                "unit": i.unit,
                "model": i.model,
                "inventory_code": i.inventory_code,
                "central_stock": central_qty,
                "site_stock": site_qty
            })
            
    return results


@router.get("/my-inventory")
def get_my_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns items assigned to the current user."""
    # 1. Unique Tools
    unique_tools = db.query(WarehouseItem).filter(
        WarehouseItem.organization_id == current_user.organization_id,
        WarehouseItem.current_holder_id == current_user.id
    ).all()
    
    # 2. Bulk Materials/Consumables assigned to user
    bulk_stats = db.query(
        WarehouseTransaction.item_id,
        WarehouseTransaction.transaction_type,
        func.sum(WarehouseTransaction.quantity).label('total')
    ).join(WarehouseItem, WarehouseItem.id == WarehouseTransaction.item_id)\
     .filter(
         WarehouseItem.organization_id == current_user.organization_id,
         WarehouseItem.inventory_code == None,
         WarehouseTransaction.assigned_to_user_id == current_user.id
     ).group_by(
         WarehouseTransaction.item_id,
         WarehouseTransaction.transaction_type
     ).all()
     
    user_stock_map = {}
    for i_id, tx_type, total in bulk_stats:
        if i_id not in user_stock_map:
            user_stock_map[i_id] = 0
        if tx_type == "OUT": # Out of warehouse -> into user hands
            user_stock_map[i_id] += total
        elif tx_type == "IN" or tx_type == "CONSUME": # Back to warehouse or consumed
            user_stock_map[i_id] -= total
            
    bulk_item_ids = [k for k, v in user_stock_map.items() if v > 0]
    bulk_items = []
    if bulk_item_ids:
        bulk_items = db.query(WarehouseItem).filter(WarehouseItem.id.in_(bulk_item_ids)).all()

    results = []
    for t in unique_tools:
        results.append({
            "id": t.id,
            "name": t.name,
            "category": t.category,
            "unit": t.unit,
            "inventory_code": t.inventory_code,
            "quantity": 1
        })
        
    for b in bulk_items:
        results.append({
            "id": b.id,
            "name": b.name,
            "category": b.category,
            "unit": b.unit,
            "inventory_code": None,
            "quantity": user_stock_map[b.id]
        })
        
    return results

@router.post("/consume")
def consume_item(
    body: ConsumeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    site_id = get_user_active_site_id(db, current_user.id)
    
    db_item = db.query(WarehouseItem).filter(
        WarehouseItem.id == body.item_id,
        WarehouseItem.organization_id == current_user.organization_id
    ).first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Articol negasit")
        
    db_tx = WarehouseTransaction(
        item_id=body.item_id,
        transaction_type="CONSUME",
        quantity=body.quantity,
        date=datetime.utcnow().date(),
        operated_by_id=current_user.id, 
        assigned_to_user_id=current_user.id,
        site_id=site_id,
        notes=body.notes or "Consumat pe santier"
    )
    
    db.add(db_tx)
    db.commit()
    return {"success": True}

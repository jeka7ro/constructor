from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List

from app.database import get_db
from app.models import WarehouseItem, WarehouseTransaction, User, Site
from app.api.auth import get_current_user
from app.api.user_material_requests import get_user_active_site_id

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
            elif tx_type == "IN": # IN to warehouse FROM site
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

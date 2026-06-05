from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import date, datetime

from app.database import get_db
from app.models import WarehouseItem, WarehouseTransaction, Admin, Vehicle, User, Site
from app.api.admin_auth import get_current_admin

def get_items_logic(category: Optional[str] = None, site_id: Optional[str] = None, assigned_to_user_id: Optional[str] = None, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    query = db.query(WarehouseItem, Site.name.label("site_name"), User.full_name.label("holder_name"))\
              .outerjoin(Site, WarehouseItem.current_site_id == Site.id)\
              .outerjoin(User, WarehouseItem.current_holder_id == User.id)\
              .filter(WarehouseItem.organization_id == current_admin.organization_id)
              
    if category:
        query = query.filter(WarehouseItem.category == category)
    if assigned_to_user_id:
        query = query.filter(WarehouseItem.current_holder_id == assigned_to_user_id)
        
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
            else:
                out_map[i_id] = out_map.get(i_id, 0) + total
                
            if tx_site_id:
                if i_id not in site_stock_map:
                    site_stock_map[i_id] = {}
                if tx_site_id not in site_stock_map[i_id]:
                    site_stock_map[i_id][tx_site_id] = 0
                
                if tx_type == "OUT": 
                    site_stock_map[i_id][tx_site_id] += total
                elif tx_type == "IN":
                    site_stock_map[i_id][tx_site_id] += total

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
            "reserved_quantity": getattr(i, 'reserved_quantity', 0.0),
            "available_quantity": max(0, effective_qty - getattr(i, 'reserved_quantity', 0.0)),
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

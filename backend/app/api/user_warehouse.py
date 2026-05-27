from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List

from app.database import get_db
from app.models import WarehouseItem, WarehouseTransaction, User, Site, MaterialRequest
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
    """Returns items assigned to the current user — via current_holder_id OR completed material requests."""
    import json
    results = []
    seen_ids = set()

    # 1. Unique Tools — current_holder_id set
    unique_tools = db.query(WarehouseItem).filter(
        WarehouseItem.organization_id == current_user.organization_id,
        WarehouseItem.current_holder_id == current_user.id
    ).all()
    for t in unique_tools:
        seen_ids.add(t.id)
        results.append({
            "id": t.id,
            "name": t.name,
            "category": t.category,
            "unit": t.unit,
            "inventory_code": t.inventory_code,
            "model": t.model,
            "is_defective": t.is_defective,
            "pending_return": bool(t.pending_return),
            "quantity": 1,
            "source": "assigned"
        })

    # 2. Items (tools + consumables) — from completed material requests
    completed_requests = db.query(MaterialRequest).filter(
        MaterialRequest.organization_id == current_user.organization_id,
        MaterialRequest.user_id == current_user.id,
        MaterialRequest.status == "completed"
    ).order_by(MaterialRequest.updated_at.desc()).all()

    for req in completed_requests:
        matched_items = []

        # Strategy A: structured items_json
        if req.items_json:
            try:
                items_list = json.loads(req.items_json)
                for it in items_list:
                    item_id = it.get("id")
                    if item_id and item_id not in seen_ids:
                        db_item = db.query(WarehouseItem).filter(
                            WarehouseItem.id == item_id,
                            WarehouseItem.organization_id == current_user.organization_id
                        ).first()
                        if db_item:
                            matched_items.append(db_item)
            except Exception:
                pass

        # Strategy B: text-only — match all org items by name
        if not matched_items and req.items_text:
            text_lower = req.items_text.lower()
            all_items = db.query(WarehouseItem).filter(
                WarehouseItem.organization_id == current_user.organization_id
            ).all()
            for t in all_items:
                if t.id not in seen_ids and t.name.lower() in text_lower:
                    matched_items.append(t)

        for db_item in matched_items:
            if db_item.id in seen_ids:
                continue

            if db_item.inventory_code:
                # SCULĂ UNICĂ
                if db_item.current_holder_id and db_item.current_holder_id != current_user.id:
                    continue  # la altcineva
                if not db_item.current_site_id and not db_item.current_holder_id:
                    if db_item.total_quantity and db_item.total_quantity >= 1:
                        continue  # înapoi în magazie
                seen_ids.add(db_item.id)
                results.append({
                    "id": db_item.id,
                    "name": db_item.name,
                    "category": db_item.category,
                    "unit": db_item.unit,
                    "inventory_code": db_item.inventory_code,
                    "model": db_item.model,
                    "is_defective": db_item.is_defective,
                    "quantity": 1,
                    "source": "material_request",
                    "request_id": req.id
                })
            else:
                # CONSUMABIL — calculez cantitatea rămasă la site-ul cererii
                site_id_req = req.site_id
                if not site_id_req:
                    continue

                # Toate tranzacțiile pentru acest item la acest site (OUT - IN - CONSUME)
                tx_stats = db.query(
                    WarehouseTransaction.transaction_type,
                    func.sum(WarehouseTransaction.quantity).label('total')
                ).filter(
                    WarehouseTransaction.item_id == db_item.id,
                    WarehouseTransaction.site_id == site_id_req
                ).group_by(WarehouseTransaction.transaction_type).all()

                qty = 0
                for tx_type, total in tx_stats:
                    if tx_type == "OUT":
                        qty += total
                    elif tx_type in ("IN", "CONSUME"):
                        qty -= total

                if qty > 0:
                    seen_ids.add(db_item.id)
                    results.append({
                        "id": db_item.id,
                        "name": db_item.name,
                        "category": db_item.category,
                        "unit": db_item.unit,
                        "inventory_code": None,
                        "model": None,
                        "is_defective": False,
                        "quantity": round(qty, 3),
                        "source": "consumable_request",
                        "request_id": req.id
                    })

    # 3. Consumabile atribuite direct userului via tranzacții (fără cerere)
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
        if tx_type == "OUT":
            user_stock_map[i_id] += total
        elif tx_type in ("IN", "CONSUME"):
            user_stock_map[i_id] -= total

    bulk_item_ids = [k for k, v in user_stock_map.items() if v > 0 and k not in seen_ids]
    if bulk_item_ids:
        bulk_items = db.query(WarehouseItem).filter(WarehouseItem.id.in_(bulk_item_ids)).all()
        for b in bulk_items:
            seen_ids.add(b.id)
            results.append({
                "id": b.id,
                "name": b.name,
                "category": b.category,
                "unit": b.unit,
                "inventory_code": None,
                "model": None,
                "is_defective": False,
                "quantity": user_stock_map[b.id],
                "source": "consumable"
            })

    return results



class ReturnToolRequest(BaseModel):
    item_id: str
    notes: Optional[str] = None
    quantity: Optional[float] = None  # pentru consumabile, None = total (1 buc pentru scule)

class ReportDefectiveRequest(BaseModel):
    item_id: str
    notes: Optional[str] = None

@router.post("/return-tool")
def return_tool(
    body: ReturnToolRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Worker requests to return a tool — sets pending_return=True.
    Admin must confirm via /admin/warehouse/confirm-return before item is actually returned."""
    db_item = db.query(WarehouseItem).filter(
        WarehouseItem.id == body.item_id,
        WarehouseItem.organization_id == current_user.organization_id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articol negasit")

    if db_item.inventory_code:
        # SCULĂ UNICĂ — marcare ca predare în așteptare (admin trebuie să confirme)
        db_item.pending_return = True
        db_item.pending_return_at = datetime.utcnow()
        db_item.pending_return_by_id = current_user.id
        db.commit()
        return {"success": True, "pending": True, "message": "Predare trimisă spre confirmare admin"}
    else:
        # CONSUMABIL — returnare directă (fără confirmare admin)
        qty = body.quantity or 1.0
        returned_from_site = db_item.current_site_id
        tx = WarehouseTransaction(
            item_id=body.item_id,
            transaction_type="IN",
            quantity=qty,
            date=datetime.utcnow().date(),
            operated_by_id=current_user.id,
            assigned_to_user_id=current_user.id,
            site_id=returned_from_site,
            notes=body.notes or f"Returnat de muncitor: {current_user.full_name}"
        )
        db.add(tx)
        db_item.total_quantity = (db_item.total_quantity or 0) + qty
        db.commit()
        return {"success": True, "pending": False}

@router.post("/report-defective")
def report_defective(
    body: ReportDefectiveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Worker reports a tool as defective. Returns it to warehouse marked as defective."""
    db_item = db.query(WarehouseItem).filter(
        WarehouseItem.id == body.item_id,
        WarehouseItem.organization_id == current_user.organization_id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Articol negasit")

    returned_from_site = db_item.current_site_id
    db_item.current_holder_id = None
    db_item.current_site_id = None
    db_item.checked_out_at = None
    db_item.total_quantity = 1.0
    db_item.is_defective = True

    tx = WarehouseTransaction(
        item_id=body.item_id,
        transaction_type="IN",
        quantity=1.0,
        date=datetime.utcnow().date(),
        operated_by_id=current_user.id,
        assigned_to_user_id=current_user.id,
        site_id=returned_from_site,
        notes=body.notes or f"Raportat DEFECT de: {current_user.full_name}"
    )
    db.add(tx)
    db.commit()
    return {"success": True}

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

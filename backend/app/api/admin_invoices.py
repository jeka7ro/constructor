import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import Admin, WarehouseItem, WarehouseTransaction, Organization
from .admin_auth import get_current_admin

router = APIRouter(prefix="/admin/invoices", tags=["Admin Invoices"])

@router.post("/parse")
def parse_invoice(
    payload: dict = Body(...),
    admin: Admin = Depends(get_current_admin)
):
    """
    Parses preExtractedText from the frontend and returns structured invoice data.
    """
    text = payload.get("preExtractedText", "")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Defaults
    supplier = lines[0] if lines else "Unknown Supplier"
    invoice_date = None
    invoice_number = None
    
    # Patterns
    date_match = re.search(r'Date\s*:\s*(\d{2}/\d{2}/\d{4})', text)
    if date_match:
        # Convert DD/MM/YYYY to YYYY-MM-DD for easier frontend handling
        d, m, y = date_match.group(1).split('/')
        invoice_date = f"{y}-{m}-{d}"
        
    facture_match = re.search(r'FACTURE\s+([0-9\./\sV]+)', text)
    if facture_match:
        invoice_number = facture_match.group(1).strip()

    # Parse items
    items = []
    # Match: <QTY> <UNIT> <NAME> <UNIT_PRICE> <NET_PRICE>
    item_pattern = re.compile(r'^([\d\.,]+)\s+([A-Z]+)\s+(.*?)\s+([\d\.,]+)\s+([\d\.,]+)$')
    
    for line in lines:
        m = item_pattern.match(line)
        if m:
            qty_str = m.group(1).replace('.', '').replace(',', '.')
            unit = m.group(2)
            name = m.group(3).strip()
            uprice_str = m.group(4).replace('.', '').replace(',', '.')
            tprice_str = m.group(5).replace('.', '').replace(',', '.')
            
            try:
                qty = float(qty_str)
                unit_price = float(uprice_str)
                total_price = float(tprice_str)
            except ValueError:
                continue
                
            items.append({
                "id": str(uuid.uuid4()),
                "name": name,
                "quantity": qty,
                "unit": unit,
                "unit_price": unit_price,
                "total_price": total_price,
                "mapped_item_id": None, # For frontend to map to existing
                "is_new": True
            })
            
    return {
        "supplier": supplier,
        "date": invoice_date,
        "invoice_number": invoice_number,
        "items": items
    }

@router.post("/import")
def import_invoice(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """
    Imports the confirmed items into the Warehouse.
    """
    supplier = payload.get("supplier", "Unknown")
    invoice_number = payload.get("invoice_number", "Unknown")
    items = payload.get("items", [])
    
    if not items:
        raise HTTPException(status_code=400, detail="No items to import")

    # Group by mapped_item_id or name
    for item in items:
        mapped_id = item.get("mapped_item_id")
        name = item.get("name")
        qty = float(item.get("quantity", 0))
        unit = item.get("unit", "buc")
        
        if mapped_id:
            db_item = db.query(WarehouseItem).filter_by(id=mapped_id, organization_id=admin.organization_id).first()
            if not db_item:
                raise HTTPException(status_code=404, detail=f"Item {mapped_id} not found")
        else:
            # Create new
            db_item = db.query(WarehouseItem).filter_by(name=name, organization_id=admin.organization_id).first()
            if not db_item:
                db_item = WarehouseItem(
                    id=str(uuid.uuid4()),
                    organization_id=admin.organization_id,
                    name=name,
                    category="CONSUMABILE", # Default
                    unit=unit,
                    total_quantity=0,
                    reserved_quantity=0
                )
                db.add(db_item)
                db.commit()
                db.refresh(db_item)
                
        # Add quantity
        db_item.total_quantity += qty
        
        # Log transaction
        tx = WarehouseTransaction(
            id=str(uuid.uuid4()),
            item_id=db_item.id,
            transaction_type="IN",
            quantity=qty,
            user_id=admin.id,
            notes=f"Import Factură {invoice_number} - {supplier}"
        )
        db.add(tx)
        
    db.commit()
    return {"status": "success", "message": "Items imported to warehouse"}

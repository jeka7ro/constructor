import re
import logging
from sqlalchemy.orm import Session
from app.models import WorkOrder

logger = logging.getLogger(__name__)

def get_next_quote_number(db: Session, organization_id: str = None, prefix: str = "DEV") -> str:
    """
    Computes the strictly next sequential quote number by extracting the true
    numerical maximum from all existing quotes (regardless of status, including deleted),
    preventing any duplicates and avoiding SQL alphabetical sorting traps.
    """
    query = db.query(WorkOrder.quote_number).filter(
        WorkOrder.quote_number.like(f"{prefix}%")
    )
    if organization_id:
        query = query.filter(WorkOrder.organization_id == organization_id)
        
    all_quotes = query.all()
    
    max_num = 905  # minimum baseline for Davide Chape quotes
    for (q_num,) in all_quotes:
        if not q_num:
            continue
        clean = q_num.replace(prefix, "").strip()
        digits = re.sub(r'^[^\d]*', '', clean)
        if digits.isdigit():
            val = int(digits)
            if val > max_num:
                max_num = val
                
    next_num = max_num + 1
    generated = f"{prefix}{next_num}"
    logger.info(f"Generated sequential quote number: {generated} (previous max: {max_num})")
    return generated


def get_next_invoice_number(db: Session, organization_id: str = None, prefix: str = "INV") -> str:
    """
    Computes the strictly next sequential invoice number by extracting the true
    numerical maximum from all existing invoices.
    """
    query = db.query(WorkOrder.invoice_number).filter(
        WorkOrder.invoice_number.like(f"{prefix}%")
    )
    if organization_id:
        query = query.filter(WorkOrder.organization_id == organization_id)
        
    all_invs = query.all()
    max_num = 0
    for (inv_num,) in all_invs:
        if not inv_num:
            continue
        clean = inv_num.replace(prefix, "").strip()
        digits = re.sub(r'^[^\d]*', '', clean)
        if digits.isdigit():
            val = int(digits)
            if val > max_num:
                max_num = val
                
    next_num = max_num + 1
    generated = f"{prefix}{str(next_num).zfill(3)}"
    logger.info(f"Generated sequential invoice number: {generated} (previous max: {max_num})")
    return generated

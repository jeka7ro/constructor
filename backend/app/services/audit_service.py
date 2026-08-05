import json
import logging
from sqlalchemy.orm import Session
from app.models import AuditLog

logger = logging.getLogger(__name__)

def log_audit(
    db: Session,
    organization_id: str,
    admin_id: str = None,
    user_id: str = None,
    action: str = "UNKNOWN",
    resource_type: str = None,
    resource_id: str = None,
    details: dict = None,
    ip_address: str = None
):
    """
    Înregistrează o acțiune în tabela de AuditLog.
    """
    try:
        details_str = json.dumps(details) if details else None
        
        audit_entry = AuditLog(
            organization_id=organization_id,
            admin_id=admin_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details_str,
            ip_address=ip_address
        )
        db.add(audit_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Eroare la scrierea in AuditLog: {e}")
        db.rollback()

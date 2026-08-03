from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models import EmailLog, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/emails", tags=["Admin Emails"])

def require_admin(admin: Admin):
    if admin.role not in ["SUPER_ADMIN", "ADMIN", "OFFICE"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

class EmailLogResponse(BaseModel):
    id: str
    client_email: Optional[str]
    client_name: Optional[str]
    subject: Optional[str]
    status: str
    sent_at: datetime
    error_message: Optional[str]
    work_order_id: Optional[str]
    
    class Config:
        from_attributes = True

@router.get("", response_model=dict)
def get_email_logs(
    limit: int = Query(50, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    require_admin(current_admin)
    
    query = db.query(EmailLog).filter(EmailLog.organization_id == current_admin.organization_id)
    
    total = query.count()
    logs = query.order_by(desc(EmailLog.sent_at)).offset(offset).limit(limit).all()
    
    return {
        "items": [
            {
                "id": log.id,
                "client_email": log.client_email,
                "client_name": log.client_name,
                "subject": log.subject,
                "status": log.status,
                "sent_at": log.sent_at,
                "error_message": log.error_message,
                "work_order_id": log.work_order_id
            } for log in logs
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/{log_id}/content")
def get_email_content(
    log_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    require_admin(current_admin)
    
    log = db.query(EmailLog).filter(
        EmailLog.id == log_id,
        EmailLog.organization_id == current_admin.organization_id
    ).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Email log not found")
        
    return {"html_content": log.html_content}

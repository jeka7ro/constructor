import math
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.admin_auth import get_current_admin
from app.models import Admin, AuditLog, User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class AuditLogResponse(BaseModel):
    id: str
    admin_name: Optional[str] = None
    user_name: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

@router.get("/", response_model=dict)
def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    query = db.query(AuditLog).filter(AuditLog.organization_id == current_admin.organization_id)

    if action:
        query = query.filter(AuditLog.action == action)

    if search:
        search_pattern = f"%{search}%"
        # Search in action or details
        query = query.filter(
            (AuditLog.action.ilike(search_pattern)) |
            (AuditLog.details.ilike(search_pattern)) |
            (AuditLog.resource_type.ilike(search_pattern))
        )

    total_records = query.count()
    total_pages = math.ceil(total_records / limit) if total_records > 0 else 1
    offset = (page - 1) * limit
    
    # Sort descending by date
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    # Pre-fetch admins and users to map names easily
    admin_ids = {l.admin_id for l in logs if l.admin_id}
    user_ids = {l.user_id for l in logs if l.user_id}
    
    admin_map = {}
    if admin_ids:
        admins = db.query(Admin).filter(Admin.id.in_(admin_ids)).all()
        admin_map = {a.id: a.full_name or a.email for a in admins}
        
    user_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {u.id: u.full_name for u in users}

    results = []
    for log in logs:
        results.append({
            "id": log.id,
            "admin_name": admin_map.get(log.admin_id) if log.admin_id else None,
            "user_name": user_map.get(log.user_id) if log.user_id else None,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at
        })

    return {
        "data": results,
        "total_records": total_records,
        "total_pages": total_pages,
        "current_page": page,
        "limit": limit
    }

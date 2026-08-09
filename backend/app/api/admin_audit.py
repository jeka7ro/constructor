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
    device_type: Optional[str] = None
    created_at: datetime

@router.get("/filters")
def get_audit_filters(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    # Get unique actions
    actions_rows = db.query(AuditLog.action).filter(AuditLog.organization_id == current_admin.organization_id).distinct().all()
    actions = [a[0] for a in actions_rows if a[0]]
    
    # Get unique users/admins involved
    admin_ids = db.query(AuditLog.admin_id).filter(AuditLog.organization_id == current_admin.organization_id, AuditLog.admin_id != None).distinct().all()
    user_ids = db.query(AuditLog.user_id).filter(AuditLog.organization_id == current_admin.organization_id, AuditLog.user_id != None).distinct().all()
    
    admin_list = []
    if admin_ids:
        ids = [a[0] for a in admin_ids if a[0]]
        admins = db.query(Admin).filter(Admin.id.in_(ids)).all()
        admin_list = [{"id": a.id, "name": a.full_name or a.email} for a in admins]
        
    user_list = []
    if user_ids:
        ids = [u[0] for u in user_ids if u[0]]
        users = db.query(User).filter(User.id.in_(ids)).all()
        user_list = [{"id": u.id, "name": u.full_name} for u in users]
        
    all_users = sorted(admin_list + user_list, key=lambda x: x["name"].lower())
    
    return {
        "actions": sorted(actions),
        "users": all_users
    }

@router.get("/", response_model=dict)
def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    query = db.query(AuditLog).filter(AuditLog.organization_id == current_admin.organization_id)

    if action:
        query = query.filter(AuditLog.action == action)

    if user_id:
        query = query.filter(
            (AuditLog.admin_id == user_id) | (AuditLog.user_id == user_id)
        )
        
    # We only apply strict date filtering if there is NO search query.
    # If there is a search query, we search globally but sort the results
    # so that the ones from the selected period appear first.
    if not search:
        if date_from:
            query = query.filter(AuditLog.created_at >= date_from)
        if date_to:
            query = query.filter(AuditLog.created_at <= date_to)

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
    
    # Custom sorting: if we have a search AND a date range, prioritize the date range
    if search and (date_from or date_to):
        from sqlalchemy import case
        
        conditions = []
        if date_from:
            conditions.append(AuditLog.created_at >= date_from)
        if date_to:
            conditions.append(AuditLog.created_at <= date_to)
            
        from sqlalchemy import and_
        in_range = case(
            (and_(*conditions), 0),
            else_=1
        )
        logs = query.order_by(in_range, AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    else:
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
            "device_type": log.device_type,
            "created_at": log.created_at
        })

    return {
        "data": results,
        "total_records": total_records,
        "total_pages": total_pages,
        "current_page": page,
        "limit": limit
    }

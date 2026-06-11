from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import User, Alert, AlertAcknowledgement, ConstructionSite, Admin
from app.api.auth import get_current_user

# Note: In a real app, Admin auth would be separate, but here we assume Admin calls are secured differently or we use a simple check.
# For simplicity in this demo, we'll allow creating alerts without strict admin token validation (or assume it's handled via a middleware/dependency not fully defined here).

router = APIRouter(prefix="/alerts", tags=["alerts"])

class AlertCreate(BaseModel):
    message: str
    target_type: str # 'ALL', 'SITE', 'TEAM', 'USER'
    target_id: Optional[str] = None
    expires_at: Optional[datetime] = None

class AlertResponse(BaseModel):
    id: str
    message: str
    target_type: str
    target_id: Optional[str]
    created_at: datetime
    author_id: Optional[str]

    class Config:
        from_attributes = True

@router.post("/", response_model=AlertResponse)
def create_alert(
    alert_in: AlertCreate,
    db: Session = Depends(get_db)
    # Ideally: current_admin: Admin = Depends(get_current_admin)
):
    """
    Create a new alert (Admin only)
    """
    # Hardcoded organization ID for this prototype or fetch from admin context
    org_id = db.query(Admin).first().organization_id
    
    new_alert = Alert(
        organization_id=org_id,
        message=alert_in.message,
        target_type=alert_in.target_type,
        target_id=alert_in.target_id,
        expires_at=alert_in.expires_at,
        is_active=True
        # author_id=current_admin.id
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert

@router.get("/all", response_model=List[AlertResponse])
def get_all_alerts(
    db: Session = Depends(get_db)
    # Ideally: current_admin: Admin = Depends(get_current_admin)
):
    """
    Get all alerts for the organization (Admin view).
    """
    # Hardcoded organization ID for this prototype or fetch from admin context
    org_id = db.query(Admin).first().organization_id
    alerts = db.query(Alert).filter(Alert.organization_id == org_id).order_by(Alert.created_at.desc()).all()
    return alerts

@router.get("/active", response_model=List[AlertResponse])
def get_active_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all active alerts for the current employee that they haven't acknowledged yet.
    Filters by ALL, their specific SITE, or their specific USER id.
    """
    now = datetime.utcnow()
    
    # Base query: active alerts for this organization, not expired
    query = db.query(Alert).filter(
        Alert.organization_id == current_user.organization_id,
        Alert.is_active == True,
        (Alert.expires_at == None) | (Alert.expires_at > now)
    )
    
    # Filter by target
    # The user should see:
    # 1. ALL
    # 2. SITE (if target_id == current_user.site_id)
    # 3. USER (if target_id == current_user.id)
    # (Team logic omitted for simplicity unless requested)
    
    conditions = [Alert.target_type == 'ALL']
    if current_user.site_id:
        conditions.append((Alert.target_type == 'SITE') & (Alert.target_id == current_user.site_id))
    conditions.append((Alert.target_type == 'USER') & (Alert.target_id == current_user.id))
    
    from sqlalchemy import or_
    query = query.filter(or_(*conditions))
    
    alerts = query.all()
    
    # Filter out the ones already acknowledged by this user
    ack_alert_ids = [
        ack.alert_id for ack in db.query(AlertAcknowledgement).filter(
            AlertAcknowledgement.user_id == current_user.id
        ).all()
    ]
    
    unseen_alerts = [a for a in alerts if a.id not in ack_alert_ids]
    
    return unseen_alerts

@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Employee acknowledges an alert
    """
    # Check if alert exists
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    # Check if already acknowledged
    existing_ack = db.query(AlertAcknowledgement).filter(
        AlertAcknowledgement.alert_id == alert_id,
        AlertAcknowledgement.user_id == current_user.id
    ).first()
    
    if existing_ack:
        return {"status": "already acknowledged"}
        
    ack = AlertAcknowledgement(
        alert_id=alert_id,
        user_id=current_user.id
    )
    db.add(ack)
    db.commit()
    
    return {"status": "success"}

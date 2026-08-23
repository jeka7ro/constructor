"""
Partner Authentication & Account Management API
Handles login, profile, and CRUD for partner accounts.
Partners are B2B external users (e.g. Isoflex) with restricted access.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional, List

from app.database import get_db
from app.models import Admin, Client, Organization
from app.config import settings
from app.api.admin_auth import (
    hash_password, verify_password, create_access_token,
    SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_admin
)
from app.services.audit_service import log_audit
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer

router = APIRouter()

partner_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/partner/login")


# ── Pydantic Models ──

class PartnerLogin(BaseModel):
    email: EmailStr
    password: str


class PartnerCreateRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    client_id: str  # Must be linked to a client (company)
    preferred_language: str = "fr"
    allowed_team_ids: Optional[List[str]] = []
    color: Optional[str] = None



class PartnerUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    client_id: Optional[str] = None
    preferred_language: Optional[str] = None
    is_active: Optional[bool] = None
    allowed_team_ids: Optional[List[str]] = None
    color: Optional[str] = None



# ── Auth Helpers ──

def get_current_partner(request: Request, token: str = Depends(partner_oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated partner from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id: str = payload.get("sub")
        role: str = payload.get("role")
        if partner_id is None or role != "PARTNER":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    partner = db.query(Admin).filter(
        Admin.id == partner_id,
        Admin.role == "PARTNER"
    ).first()
    
    if partner is None:
        raise credentials_exception
    
    if not partner.is_active:
        raise HTTPException(status_code=400, detail="Inactive partner account")
    
    return partner


# ── Partner Login ──

@router.post("/login")
def partner_login(request: Request, credentials: PartnerLogin, db: Session = Depends(get_db)):
    """Partner login with email and password"""
    from sqlalchemy import func
    email_clean = credentials.email.lower().strip()
    
    partner = db.query(Admin).filter(
        func.lower(Admin.email) == email_clean,
        Admin.role == "PARTNER"
    ).first()
    
    if not partner or not verify_password(credentials.password, partner.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    if not partner.is_active:
        raise HTTPException(status_code=400, detail="Inactive partner account")
    
    if not partner.client_id:
        raise HTTPException(status_code=400, detail="Partner account not linked to a company")
    
    # Get client info
    client = db.query(Client).filter(Client.id == partner.client_id).first()
    client_name = client.name if client else "Unknown"
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": partner.id,
            "email": partner.email,
            "role": "PARTNER",
            "client_id": partner.client_id,
            "client_name": client_name,
            "organization_id": partner.organization_id
        },
        expires_delta=access_token_expires
    )
    
    # Audit log
    if partner.organization_id:
        ip = request.headers.get("cf-connecting-ip") or \
             request.headers.get("x-forwarded-for") or \
             request.headers.get("x-real-ip")
        if not ip and getattr(request, 'client', None):
            ip = request.client.host
        log_audit(
            db=db,
            organization_id=partner.organization_id,
            admin_id=partner.id,
            action="LOGIN_PARTNER",
            details={"message": f"Partner '{partner.full_name}' logged in", "client": client_name},
            ip_address=ip
        )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "partner": {
            "id": partner.id,
            "email": partner.email,
            "full_name": partner.full_name,
            "role": "PARTNER",
            "client_id": partner.client_id,
            "client_name": client_name,
            "preferred_language": partner.preferred_language or "fr",
            "organization_id": partner.organization_id,
            "is_active": partner.is_active,
        }
    }


@router.get("/me")
def get_partner_profile(partner: Admin = Depends(get_current_partner), db: Session = Depends(get_db)):
    """Get current partner profile"""
    client = db.query(Client).filter(Client.id == partner.client_id).first()
    return {
        "id": partner.id,
        "email": partner.email,
        "full_name": partner.full_name,
        "role": "PARTNER",
        "client_id": partner.client_id,
        "client_name": client.name if client else "Unknown",
        "preferred_language": partner.preferred_language or "fr",
        "organization_id": partner.organization_id,
        "is_active": partner.is_active,
    }


# ── Admin: CRUD Partners ──

@router.get("/partners")
def list_partners(db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    """List all partner accounts for this organization"""
    partners = db.query(Admin).filter(
        Admin.organization_id == current_admin.organization_id,
        Admin.role == "PARTNER"
    ).order_by(Admin.created_at.desc()).all()
    
    result = []
    for p in partners:
        client = db.query(Client).filter(Client.id == p.client_id).first() if p.client_id else None
        result.append({
            "id": p.id,
            "email": p.email,
            "full_name": p.full_name,
            "role": "PARTNER",
            "client_id": p.client_id,
            "client_name": client.name if client else None,
            "preferred_language": p.preferred_language or "fr",
            "is_active": p.is_active,
            "allowed_team_ids": p.allowed_team_ids or [],
            "color": p.color,
            "created_at": p.created_at,
        })
    
    return result


@router.post("/partners")
def create_partner(payload: PartnerCreateRequest, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    """Create a new partner account"""
    from sqlalchemy import func
    
    # Validate client exists and belongs to this org
    client = db.query(Client).filter(
        Client.id == payload.client_id,
        Client.organization_id == current_admin.organization_id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check email uniqueness
    existing = db.query(Admin).filter(func.lower(Admin.email) == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
    
    # Validate language
    lang = payload.preferred_language.lower().strip()
    if lang not in ['fr', 'nl', 'en']:
        lang = 'fr'
    
    partner = Admin(
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role="PARTNER",
        organization_id=current_admin.organization_id,
        client_id=payload.client_id,
        preferred_language=lang,
        allowed_team_ids=payload.allowed_team_ids or [],
        color=payload.color or '#3b82f6',
        is_active=True,
        is_super_admin=False,
    )
    db.add(partner)
    db.commit()
    db.refresh(partner)
    
    log_audit(
        db=db,
        organization_id=current_admin.organization_id,
        admin_id=current_admin.id,
        action="CREATE_PARTNER",
        details={"partner_email": partner.email, "client": client.name}
    )
    
    return {
        "id": partner.id,
        "email": partner.email,
        "full_name": partner.full_name,
        "client_id": partner.client_id,
        "client_name": client.name,
        "preferred_language": partner.preferred_language,
        "color": partner.color,
        "is_active": True,
    }


@router.put("/partners/{partner_id}")
def update_partner(partner_id: str, payload: PartnerUpdateRequest, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    """Update a partner account"""
    partner = db.query(Admin).filter(
        Admin.id == partner_id,
        Admin.role == "PARTNER",
        Admin.organization_id == current_admin.organization_id
    ).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    if payload.email is not None:
        from sqlalchemy import func
        existing = db.query(Admin).filter(
            func.lower(Admin.email) == payload.email.lower().strip(),
            Admin.id != partner_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        partner.email = payload.email.lower().strip()
    
    if payload.full_name is not None:
        partner.full_name = payload.full_name
    
    if payload.password is not None:
        partner.password_hash = hash_password(payload.password)
    
    if payload.client_id is not None:
        client = db.query(Client).filter(
            Client.id == payload.client_id,
            Client.organization_id == current_admin.organization_id
        ).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        partner.client_id = payload.client_id
    
    if payload.preferred_language is not None:
        lang = payload.preferred_language.lower().strip()
        if lang in ['fr', 'nl', 'en']:
            partner.preferred_language = lang
    
    if payload.is_active is not None:
        partner.is_active = payload.is_active
        
    if payload.allowed_team_ids is not None:
        partner.allowed_team_ids = payload.allowed_team_ids
        
    if payload.color is not None:
        partner.color = payload.color
    
    db.commit()
    
    return {"message": "Partner updated successfully"}


@router.delete("/partners/{partner_id}")
def delete_partner(partner_id: str, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    """Delete a partner account"""
    partner = db.query(Admin).filter(
        Admin.id == partner_id,
        Admin.role == "PARTNER",
        Admin.organization_id == current_admin.organization_id
    ).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    log_audit(
        db=db,
        organization_id=current_admin.organization_id,
        admin_id=current_admin.id,
        action="DELETE_PARTNER",
        details={"partner_email": partner.email, "partner_name": partner.full_name}
    )
    
    db.delete(partner)
    db.commit()
    
    return {"message": "Partner deleted successfully"}

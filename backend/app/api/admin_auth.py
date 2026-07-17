from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from jose import JWTError, jwt
import hashlib
import os

from app.database import get_db
from app.models import Admin, User
from app.config import settings

router = APIRouter()

# JWT Settings
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")


# Pydantic Models
class AdminLogin(BaseModel):
    email: EmailStr
    password: str
    accepted_terms: bool = False
    accepted_dpa: bool = False


from typing import Optional

class AdminResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    is_super_admin: bool = False
    avatar_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    admin: AdminResponse
    worker_token: Optional[str] = None
    worker_data: Optional[dict] = None


from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash. Supports both bcrypt and legacy SHA256"""
    # Legacy SHA256 hashes are 64 characters long and don't start with $
    if len(hashed_password) == 64 and not hashed_password.startswith("$"):
        return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password
    
    # Otherwise use standard bcrypt verification
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated admin from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id: str = payload.get("sub")
        if admin_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if admin is None:
        raise credentials_exception
    
    if not admin.is_active:
        raise HTTPException(status_code=400, detail="Inactive admin account")
    
    return admin


# Routes
@router.post("/login", response_model=Token)
def admin_login(credentials: AdminLogin, db: Session = Depends(get_db)):
    """Admin login with email and password"""
    admin = db.query(Admin).filter(Admin.email == credentials.email).first()
    
    if not admin or not verify_password(credentials.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not admin.is_active:
        raise HTTPException(status_code=400, detail="Inactive admin account")
    
    # Save terms and DPA acceptance timestamps if not previously saved
    modified = False
    if credentials.accepted_terms and not admin.accepted_terms_at:
        admin.accepted_terms_at = datetime.utcnow()
        modified = True
    if credentials.accepted_dpa and not admin.accepted_dpa_at:
        admin.accepted_dpa_at = datetime.utcnow()
        modified = True
        
    if modified:
        db.commit()
    
    # Create access token with super admin flag
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin.id, "email": admin.email, "role": admin.role, "is_super_admin": bool(admin.is_super_admin)},
        expires_delta=access_token_expires
    )
    
    # Look up matching User record to get avatar_path and potentially issue a worker token
    user_record = db.query(User).filter(User.email == admin.email).first()
    avatar_path = getattr(user_record, 'avatar_path', None) if user_record else None

    worker_token = None
    worker_data = None
    if user_record:
        from app.auth import create_access_token as create_worker_token
        worker_token = create_worker_token(
            data={"sub": user_record.id, "email": user_record.email, "role": "driver"}
        )
        worker_data = {
            "id": user_record.id,
            "email": user_record.email,
            "full_name": user_record.full_name,
            "role": "driver",
            "organization_id": getattr(user_record, 'organization_id', None)
        }

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "full_name": admin.full_name,
            "role": admin.role,
            "is_active": admin.is_active,
            "is_super_admin": bool(admin.is_super_admin),
            "avatar_path": avatar_path,
            "created_at": admin.created_at,
        },
        "worker_token": worker_token,
        "worker_data": worker_data
    }


@router.get("/me", response_model=AdminResponse)
def get_admin_profile(current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Get current admin profile"""
    user_record = db.query(User).filter(User.email == current_admin.email).first()
    avatar_path = getattr(user_record, 'avatar_path', None) if user_record else None
    return {
        "id": current_admin.id,
        "email": current_admin.email,
        "full_name": current_admin.full_name,
        "role": current_admin.role,
        "is_active": current_admin.is_active,
        "is_super_admin": bool(current_admin.is_super_admin),
        "avatar_path": avatar_path,
        "created_at": current_admin.created_at,
    }


@router.post("/refresh", response_model=Token)
def refresh_token(current_admin: Admin = Depends(get_current_admin)):
    """Refresh access token"""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_admin.id, "email": current_admin.email, "role": current_admin.role, "is_super_admin": bool(current_admin.is_super_admin)},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": current_admin
    }

@router.get("/me/calendar-token")
def get_calendar_token(current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Get the organization's calendar token"""
    import uuid
    from app.models import Organization
    org = db.query(Organization).filter(Organization.id == current_admin.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if not org.calendar_token:
        org.calendar_token = str(uuid.uuid4())
        db.commit()
        db.refresh(org)
    
    return {"calendar_token": org.calendar_token, "organization_id": org.id}

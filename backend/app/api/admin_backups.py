from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime
import os
import requests
import json

from app.database import get_db
from sqlalchemy.orm import Session
from app.api.admin_auth import get_current_admin
from app.models import Admin

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
BACKUP_BUCKET = "backups"

def require_admin_role(admin: Admin = Depends(get_current_admin)):
    if admin.role not in ["ADMIN", "SUPER_ADMIN"] and not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Not authorized")
    return admin

@router.get("/backups")
def list_backups(admin: Admin = Depends(require_admin_role)):
    """Return a list of all backup files from Supabase Storage."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured")

    list_url = f"{SUPABASE_URL}/storage/v1/object/list/{BACKUP_BUCKET}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "prefix": "",
        "limit": 100,
        "offset": 0,
        "sortBy": {"column": "name", "order": "desc"}
    }
    
    try:
        r = requests.post(list_url, json=payload, headers=headers, timeout=10)
        if r.status_code == 200:
            files = r.json()
            # Filter out the placeholder/empty file if any
            valid_files = [
                {
                    "name": f.get("name"),
                    "created_at": f.get("created_at"),
                    "size": f.get("metadata", {}).get("size", 0)
                } 
                for f in files if f.get("name") and f.get("name") != ".emptyFolderPlaceholder"
            ]
            
            # Sort manually by created_at desc just in case
            valid_files.sort(key=lambda x: x["created_at"], reverse=True)
            return {"backups": valid_files}
        else:
            raise HTTPException(status_code=500, detail=f"Error listing backups: {r.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/backups/{filename}/download")
def download_backup(filename: str, admin: Admin = Depends(require_admin_role)):
    """Generate a signed URL to download a backup file."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured")
        
    sign_url = f"{SUPABASE_URL}/storage/v1/object/sign/{BACKUP_BUCKET}/{filename}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "expiresIn": 3600  # valid for 1 hour
    }
    
    try:
        r = requests.post(sign_url, json=payload, headers=headers, timeout=10)
        if r.status_code == 200:
            data = r.json()
            signed_url = f"{SUPABASE_URL}{data.get('signedURL')}" if data.get('signedURL') else None
            if not signed_url:
                raise HTTPException(status_code=500, detail="No signed URL returned")
            return {"url": signed_url}
        else:
            raise HTTPException(status_code=500, detail=f"Error signing URL: {r.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

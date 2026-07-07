import uuid
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import PricingSetting, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter()

class SurfaceThreshold(BaseModel):
    id: str
    min_sqm: float
    max_sqm: float
    extra_charge: float

class PricingSettingSchema(BaseModel):
    client_id: Optional[str] = None
    base_price_sqm: float
    extra_thickness_price_per_cm: float
    standard_thickness_cm: float
    plastic_foil_price_sqm: float
    metal_mesh_price_sqm: float
    fiber_price_sqm: float
    fiber_price_sqm_large: float
    fiber_large_threshold_sqm: float
    surface_thresholds: List[SurfaceThreshold]

@router.get("/pricing-settings")
def get_pricing_settings(
    client_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    query = db.query(PricingSetting).filter(
        PricingSetting.organization_id == current_admin.organization_id
    )
    
    if client_id:
        # First try to find client-specific settings
        setting = query.filter(PricingSetting.client_id == client_id).first()
        if setting:
            is_custom = True
        else:
            # Fallback to global
            setting = query.filter(PricingSetting.client_id.is_(None)).first()
            is_custom = False
    else:
        # Get global settings
        setting = query.filter(PricingSetting.client_id.is_(None)).first()
        is_custom = True
    
    if not setting:
        setting = PricingSetting(
            id=str(uuid.uuid4()),
            organization_id=current_admin.organization_id,
            client_id=None,
            surface_thresholds=[]
        )
        if not client_id:
            db.add(setting)
            db.commit()
            db.refresh(setting)
        
    return {
        "is_custom": is_custom,
        "base_price_sqm": setting.base_price_sqm,
        "extra_thickness_price_per_cm": setting.extra_thickness_price_per_cm,
        "standard_thickness_cm": setting.standard_thickness_cm,
        "plastic_foil_price_sqm": setting.plastic_foil_price_sqm,
        "metal_mesh_price_sqm": setting.metal_mesh_price_sqm,
        "fiber_price_sqm": setting.fiber_price_sqm,
        "fiber_price_sqm_large": setting.fiber_price_sqm_large,
        "fiber_large_threshold_sqm": setting.fiber_large_threshold_sqm,
        "surface_thresholds": setting.surface_thresholds or []
    }

@router.put("/pricing-settings")
def update_pricing_settings(
    payload: PricingSettingSchema,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    setting = db.query(PricingSetting).filter(
        PricingSetting.organization_id == current_admin.organization_id,
        PricingSetting.client_id == payload.client_id if payload.client_id else PricingSetting.client_id.is_(None)
    ).first()
    
    if not setting:
        setting = PricingSetting(
            id=str(uuid.uuid4()),
            organization_id=current_admin.organization_id,
            client_id=payload.client_id
        )
        db.add(setting)
        
    setting.base_price_sqm = payload.base_price_sqm
    setting.extra_thickness_price_per_cm = payload.extra_thickness_price_per_cm
    setting.standard_thickness_cm = payload.standard_thickness_cm
    setting.plastic_foil_price_sqm = payload.plastic_foil_price_sqm
    setting.metal_mesh_price_sqm = payload.metal_mesh_price_sqm
    setting.fiber_price_sqm = payload.fiber_price_sqm
    setting.fiber_price_sqm_large = payload.fiber_price_sqm_large
    setting.fiber_large_threshold_sqm = payload.fiber_large_threshold_sqm
    
    thresholds = []
    for t in payload.surface_thresholds:
        thresholds.append({
            "id": t.id,
            "min_sqm": t.min_sqm,
            "max_sqm": t.max_sqm,
            "extra_charge": t.extra_charge
        })
    setting.surface_thresholds = thresholds
    
    db.commit()
    return {"status": "success"}

@router.delete("/pricing-settings")
def reset_client_pricing(
    client_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
        
    db.query(PricingSetting).filter(
        PricingSetting.organization_id == current_admin.organization_id,
        PricingSetting.client_id == client_id
    ).delete()
    
    db.commit()
    return {"status": "success"}

@router.get("/pricing-settings/custom-clients")
def get_custom_clients(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    settings = db.query(PricingSetting.client_id).filter(
        PricingSetting.organization_id == current_admin.organization_id,
        PricingSetting.client_id.isnot(None)
    ).all()
    
    return [s[0] for s in settings]

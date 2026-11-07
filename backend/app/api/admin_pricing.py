import uuid
from typing import Optional, List, Any
from pydantic import BaseModel, model_validator
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import PricingSetting, Admin
from app.api.admin_auth import get_current_admin
from app.services.audit_service import log_audit

router = APIRouter()

def _to_float_or_default(val: Any, default: Optional[float]) -> Optional[float]:
    if val is None or (isinstance(val, str) and val.strip() == ""):
        return default
    if isinstance(val, str):
        val = val.replace(",", ".").strip()
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

class SurfaceThreshold(BaseModel):
    id: str
    min_sqm: float = 0.0
    max_sqm: float = 0.0
    extra_charge: float = 0.0

    @model_validator(mode="before")
    @classmethod
    def sanitize_threshold_numbers(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        out = dict(data)
        out["id"] = str(out.get("id") or uuid.uuid4())
        out["min_sqm"] = _to_float_or_default(out.get("min_sqm"), 0.0)
        out["max_sqm"] = _to_float_or_default(out.get("max_sqm"), 0.0)
        out["extra_charge"] = _to_float_or_default(out.get("extra_charge"), 0.0)
        return out

class PricingSettingSchema(BaseModel):
    client_id: Optional[str] = None
    base_price_sqm: float = 0.0
    base_price_sqm_large: float = 0.0
    base_large_threshold_sqm: float = 250.0
    extra_thickness_price_per_cm: float = 0.0
    extra_thickness_price_per_cm_large: float = 0.0
    extra_thickness_large_threshold_sqm: float = 250.0
    standard_thickness_cm: float = 5.0
    plastic_foil_price_sqm: float = 0.0
    metal_mesh_price_sqm: float = 0.0
    fiber_price_sqm: float = 0.0
    fiber_price_sqm_large: float = 0.0
    fiber_large_threshold_sqm: float = 250.0
    surface_thresholds: List[SurfaceThreshold] = []
    
    # Prețuri minime (Facturare)
    min_invoice_threshold_sqm: Optional[float] = 40.0
    min_invoice_fixed_price_under: Optional[float] = None
    min_invoice_min_price_over: Optional[float] = None
    
    vat_legal_entity: float = 0.0
    vat_physical_new: float = 21.0
    vat_physical_repair: float = 6.0
    truck_base_address: Optional[str] = None
    truck_distance_threshold_km: float = 50.0
    truck_extra_price_flat: float = 0.0
    truck_surface_threshold_free_sqm: float = 500.0
    
    is_foil_mandatory: bool = False
    is_mesh_mandatory: bool = False
    is_fiber_mandatory: bool = False
    is_pur_aspiration_mandatory: bool = False
    is_pur_niveller_mandatory: bool = False
    is_pur_poncage_mandatory: bool = False
    is_pur_protection_mandatory: bool = False
    
    pur_truck_distance_threshold_km: float = 50.0
    pur_truck_extra_price_flat: float = 0.0
    pur_truck_surface_threshold_free_sqm: float = 500.0
    
    eps_truck_distance_threshold_km: float = 50.0
    eps_truck_extra_price_flat: float = 0.0
    eps_truck_volume_threshold_free_m3: float = 40.0
    
    
    # PUR
    pur_base_price_3cm: float = 13.95
    pur_step_price_up_to_10cm: float = 1.65
    pur_extra_price_above_10cm: float = 2.10
    pur_minimum_execution_price: float = 1375.00
    pur_surface_discount_step: float = -0.50
    pur_opt_aspiration: float = 2.00
    pur_opt_niveller: float = 4.25
    pur_opt_poncage: float = 1.50
    pur_opt_protection: float = 1.50
    
    # EPS
    eps_volume_thresholds: list = [
        {"max_m3": 10.0, "price_flat": 1495.0, "price_per_m3": None},
        {"max_m3": 20.0, "price_flat": None, "price_per_m3": 160.0},
        {"max_m3": 40.0, "price_flat": None, "price_per_m3": 155.0},
        {"max_m3": 99999.0, "price_flat": None, "price_per_m3": 150.0}
    ]

    @model_validator(mode="before")
    @classmethod
    def sanitize_numeric_inputs(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        out = dict(data)

        base_price = _to_float_or_default(out.get("base_price_sqm"), 0.0)
        extra_thick_price = _to_float_or_default(out.get("extra_thickness_price_per_cm"), 0.0)
        fiber_price = _to_float_or_default(out.get("fiber_price_sqm"), 0.0)

        out["base_price_sqm"] = base_price
        # If large surface rate is left blank, automatically use the small surface rate
        out["base_price_sqm_large"] = _to_float_or_default(out.get("base_price_sqm_large"), base_price)
        out["base_large_threshold_sqm"] = _to_float_or_default(out.get("base_large_threshold_sqm"), 250.0)

        out["extra_thickness_price_per_cm"] = extra_thick_price
        out["extra_thickness_price_per_cm_large"] = _to_float_or_default(
            out.get("extra_thickness_price_per_cm_large"), extra_thick_price
        )
        out["extra_thickness_large_threshold_sqm"] = _to_float_or_default(
            out.get("extra_thickness_large_threshold_sqm"), 250.0
        )

        out["standard_thickness_cm"] = _to_float_or_default(out.get("standard_thickness_cm"), 5.0)
        out["plastic_foil_price_sqm"] = _to_float_or_default(out.get("plastic_foil_price_sqm"), 0.0)
        out["metal_mesh_price_sqm"] = _to_float_or_default(out.get("metal_mesh_price_sqm"), 0.0)

        out["fiber_price_sqm"] = fiber_price
        out["fiber_price_sqm_large"] = _to_float_or_default(out.get("fiber_price_sqm_large"), fiber_price)
        out["fiber_large_threshold_sqm"] = _to_float_or_default(out.get("fiber_large_threshold_sqm"), 250.0)

        # Nullable minimum invoice fields
        out["min_invoice_threshold_sqm"] = _to_float_or_default(out.get("min_invoice_threshold_sqm"), 40.0)
        out["min_invoice_fixed_price_under"] = _to_float_or_default(out.get("min_invoice_fixed_price_under"), None)
        out["min_invoice_min_price_over"] = _to_float_or_default(out.get("min_invoice_min_price_over"), None)

        # VAT & Logistics
        out["vat_legal_entity"] = _to_float_or_default(out.get("vat_legal_entity"), 0.0)
        out["vat_physical_new"] = _to_float_or_default(out.get("vat_physical_new"), 21.0)
        out["vat_physical_repair"] = _to_float_or_default(out.get("vat_physical_repair"), 6.0)

        out["truck_distance_threshold_km"] = _to_float_or_default(out.get("truck_distance_threshold_km"), 50.0)
        out["truck_extra_price_flat"] = _to_float_or_default(out.get("truck_extra_price_flat"), 0.0)
        out["truck_surface_threshold_free_sqm"] = _to_float_or_default(out.get("truck_surface_threshold_free_sqm"), 500.0)

        out["pur_truck_distance_threshold_km"] = _to_float_or_default(out.get("pur_truck_distance_threshold_km"), 50.0)
        out["pur_truck_extra_price_flat"] = _to_float_or_default(out.get("pur_truck_extra_price_flat"), 0.0)
        out["pur_truck_surface_threshold_free_sqm"] = _to_float_or_default(out.get("pur_truck_surface_threshold_free_sqm"), 500.0)

        out["eps_truck_distance_threshold_km"] = _to_float_or_default(out.get("eps_truck_distance_threshold_km"), 50.0)
        out["eps_truck_extra_price_flat"] = _to_float_or_default(out.get("eps_truck_extra_price_flat"), 0.0)
        out["eps_truck_volume_threshold_free_m3"] = _to_float_or_default(out.get("eps_truck_volume_threshold_free_m3"), 40.0)

        # PUR
        out["pur_base_price_3cm"] = _to_float_or_default(out.get("pur_base_price_3cm"), 13.95)
        out["pur_step_price_up_to_10cm"] = _to_float_or_default(out.get("pur_step_price_up_to_10cm"), 1.65)
        out["pur_extra_price_above_10cm"] = _to_float_or_default(out.get("pur_extra_price_above_10cm"), 2.10)
        out["pur_minimum_execution_price"] = _to_float_or_default(out.get("pur_minimum_execution_price"), 1375.00)
        out["pur_surface_discount_step"] = _to_float_or_default(out.get("pur_surface_discount_step"), -0.50)
        out["pur_opt_aspiration"] = _to_float_or_default(out.get("pur_opt_aspiration"), 2.00)
        out["pur_opt_niveller"] = _to_float_or_default(out.get("pur_opt_niveller"), 4.25)
        out["pur_opt_poncage"] = _to_float_or_default(out.get("pur_opt_poncage"), 1.50)
        out["pur_opt_protection"] = _to_float_or_default(out.get("pur_opt_protection"), 1.50)

        return out

@router.get("/pricing-settings")
def get_pricing_settings(
    client_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    org_id = current_admin.organization_id
    if not org_id and current_admin.is_super_admin:
        from app.models import Organization
        first_org = db.query(Organization).first()
        if first_org:
            org_id = first_org.id

    if not org_id:
        raise HTTPException(status_code=400, detail="No organization assigned to admin")

    query = db.query(PricingSetting).filter(
        PricingSetting.organization_id == org_id
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
            organization_id=org_id,
            client_id=None,
            surface_thresholds=[],
            vat_legal_entity=0.0,
            vat_physical_new=21.0,
            vat_physical_repair=6.0
        )
        if not client_id:
            db.add(setting)
            db.commit()
            db.refresh(setting)
        
    return {
        "is_custom": is_custom,
        "base_price_sqm": setting.base_price_sqm,
        "base_price_sqm_large": setting.base_price_sqm_large if setting.base_price_sqm_large is not None else setting.base_price_sqm,
        "base_large_threshold_sqm": setting.base_large_threshold_sqm if setting.base_large_threshold_sqm is not None else 250.0,
        "extra_thickness_price_per_cm": setting.extra_thickness_price_per_cm,
        "extra_thickness_price_per_cm_large": setting.extra_thickness_price_per_cm_large if setting.extra_thickness_price_per_cm_large is not None else setting.extra_thickness_price_per_cm,
        "extra_thickness_large_threshold_sqm": setting.extra_thickness_large_threshold_sqm if setting.extra_thickness_large_threshold_sqm is not None else 250.0,
        "standard_thickness_cm": setting.standard_thickness_cm,
        "plastic_foil_price_sqm": setting.plastic_foil_price_sqm,
        "metal_mesh_price_sqm": setting.metal_mesh_price_sqm,
        "fiber_price_sqm": setting.fiber_price_sqm,
        "fiber_price_sqm_large": setting.fiber_price_sqm_large if setting.fiber_price_sqm_large is not None else setting.fiber_price_sqm,
        "fiber_large_threshold_sqm": setting.fiber_large_threshold_sqm if setting.fiber_large_threshold_sqm is not None else 250.0,
        "surface_thresholds": setting.surface_thresholds or [],
        
        "min_invoice_threshold_sqm": getattr(setting, "min_invoice_threshold_sqm", 40.0),
        "min_invoice_fixed_price_under": getattr(setting, "min_invoice_fixed_price_under", None),
        "min_invoice_min_price_over": getattr(setting, "min_invoice_min_price_over", None),
        
        "vat_legal_entity": setting.vat_legal_entity,
        "vat_physical_new": setting.vat_physical_new,
        "vat_physical_repair": setting.vat_physical_repair,
        "truck_base_address": setting.truck_base_address,
        "truck_distance_threshold_km": setting.truck_distance_threshold_km if setting.truck_distance_threshold_km is not None else 50.0,
        "truck_extra_price_flat": setting.truck_extra_price_flat if setting.truck_extra_price_flat is not None else 0.0,
        "truck_surface_threshold_free_sqm": setting.truck_surface_threshold_free_sqm if setting.truck_surface_threshold_free_sqm is not None else 500.0,
        
        "is_foil_mandatory": getattr(setting, "is_foil_mandatory", False),
        "is_mesh_mandatory": getattr(setting, "is_mesh_mandatory", False),
        "is_fiber_mandatory": getattr(setting, "is_fiber_mandatory", False),
        "is_pur_aspiration_mandatory": getattr(setting, "is_pur_aspiration_mandatory", False),
        "is_pur_niveller_mandatory": getattr(setting, "is_pur_niveller_mandatory", False),
        "is_pur_poncage_mandatory": getattr(setting, "is_pur_poncage_mandatory", False),
        "is_pur_protection_mandatory": getattr(setting, "is_pur_protection_mandatory", False),
        
        "pur_truck_distance_threshold_km": getattr(setting, "pur_truck_distance_threshold_km", 50.0),
        "pur_truck_extra_price_flat": getattr(setting, "pur_truck_extra_price_flat", 0.0),
        "pur_truck_surface_threshold_free_sqm": getattr(setting, "pur_truck_surface_threshold_free_sqm", 500.0),
        
        "eps_truck_distance_threshold_km": getattr(setting, "eps_truck_distance_threshold_km", 50.0),
        "eps_truck_extra_price_flat": getattr(setting, "eps_truck_extra_price_flat", 0.0),
        "eps_truck_volume_threshold_free_m3": getattr(setting, "eps_truck_volume_threshold_free_m3", 40.0),
        
        # PUR
        "pur_base_price_3cm": getattr(setting, "pur_base_price_3cm", 13.95),
        "pur_step_price_up_to_10cm": getattr(setting, "pur_step_price_up_to_10cm", 1.65),
        "pur_extra_price_above_10cm": getattr(setting, "pur_extra_price_above_10cm", 2.10),
        "pur_minimum_execution_price": getattr(setting, "pur_minimum_execution_price", 1375.00),
        "pur_surface_discount_step": getattr(setting, "pur_surface_discount_step", -0.50),
        "pur_opt_aspiration": getattr(setting, "pur_opt_aspiration", 2.00),
        "pur_opt_niveller": getattr(setting, "pur_opt_niveller", 4.25),
        "pur_opt_poncage": getattr(setting, "pur_opt_poncage", 1.50),
        "pur_opt_protection": getattr(setting, "pur_opt_protection", 1.50),
        
        # EPS
        "eps_volume_thresholds": getattr(setting, "eps_volume_thresholds", [
            {"max_m3": 10.0, "price_flat": 1495.0, "price_per_m3": None},
            {"max_m3": 20.0, "price_flat": None, "price_per_m3": 160.0},
            {"max_m3": 40.0, "price_flat": None, "price_per_m3": 155.0},
            {"max_m3": 99999.0, "price_flat": None, "price_per_m3": 150.0}
        ])
    }

@router.put("/pricing-settings")
def update_pricing_settings(
    payload: PricingSettingSchema,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    org_id = current_admin.organization_id
    if not org_id and current_admin.is_super_admin:
        from app.models import Organization
        first_org = db.query(Organization).first()
        if first_org:
            org_id = first_org.id

    if not org_id:
        raise HTTPException(status_code=400, detail="No organization assigned to admin")

    setting = db.query(PricingSetting).filter(
        PricingSetting.organization_id == org_id,
        PricingSetting.client_id == payload.client_id if payload.client_id else PricingSetting.client_id.is_(None)
    ).first()
    
    if not setting:
        setting = PricingSetting(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            client_id=payload.client_id,
            base_price_sqm=payload.base_price_sqm,
            base_price_sqm_large=payload.base_price_sqm_large,
            base_large_threshold_sqm=payload.base_large_threshold_sqm,
            extra_thickness_price_per_cm=payload.extra_thickness_price_per_cm,
            extra_thickness_price_per_cm_large=payload.extra_thickness_price_per_cm_large,
            extra_thickness_large_threshold_sqm=payload.extra_thickness_large_threshold_sqm,
            truck_base_address=payload.truck_base_address,
            truck_distance_threshold_km=payload.truck_distance_threshold_km,
            truck_extra_price_flat=payload.truck_extra_price_flat,
            truck_surface_threshold_free_sqm=payload.truck_surface_threshold_free_sqm
        )
        db.add(setting)
        
    setting.base_price_sqm = payload.base_price_sqm
    setting.base_price_sqm_large = payload.base_price_sqm_large
    setting.base_large_threshold_sqm = payload.base_large_threshold_sqm
    setting.extra_thickness_price_per_cm = payload.extra_thickness_price_per_cm
    setting.extra_thickness_price_per_cm_large = payload.extra_thickness_price_per_cm_large
    setting.extra_thickness_large_threshold_sqm = payload.extra_thickness_large_threshold_sqm
    setting.standard_thickness_cm = payload.standard_thickness_cm
    setting.plastic_foil_price_sqm = payload.plastic_foil_price_sqm
    setting.metal_mesh_price_sqm = payload.metal_mesh_price_sqm
    setting.fiber_price_sqm = payload.fiber_price_sqm
    setting.fiber_price_sqm_large = payload.fiber_price_sqm_large
    setting.fiber_large_threshold_sqm = payload.fiber_large_threshold_sqm
    
    setting.min_invoice_threshold_sqm = payload.min_invoice_threshold_sqm
    setting.min_invoice_fixed_price_under = payload.min_invoice_fixed_price_under
    setting.min_invoice_min_price_over = payload.min_invoice_min_price_over
    
    setting.vat_legal_entity = payload.vat_legal_entity
    setting.vat_physical_new = payload.vat_physical_new
    setting.vat_physical_repair = payload.vat_physical_repair
    
    setting.truck_base_address = payload.truck_base_address
    setting.truck_distance_threshold_km = payload.truck_distance_threshold_km
    setting.truck_extra_price_flat = payload.truck_extra_price_flat
    setting.truck_surface_threshold_free_sqm = payload.truck_surface_threshold_free_sqm
    
    is_foil_mandatory: bool = False
    is_mesh_mandatory: bool = False
    is_fiber_mandatory: bool = False
    is_pur_aspiration_mandatory: bool = False
    is_pur_niveller_mandatory: bool = False
    is_pur_poncage_mandatory: bool = False
    is_pur_protection_mandatory: bool = False
    
    pur_truck_distance_threshold_km: float = 50.0
    pur_truck_extra_price_flat: float = 0.0
    pur_truck_surface_threshold_free_sqm: float = 500.0
    
    eps_truck_distance_threshold_km: float = 50.0
    eps_truck_extra_price_flat: float = 0.0
    eps_truck_volume_threshold_free_m3: float = 40.0
    
    setting.is_foil_mandatory = payload.is_foil_mandatory
    setting.is_mesh_mandatory = payload.is_mesh_mandatory
    setting.is_fiber_mandatory = payload.is_fiber_mandatory
    setting.is_pur_aspiration_mandatory = payload.is_pur_aspiration_mandatory
    setting.is_pur_niveller_mandatory = payload.is_pur_niveller_mandatory
    setting.is_pur_poncage_mandatory = payload.is_pur_poncage_mandatory
    setting.is_pur_protection_mandatory = payload.is_pur_protection_mandatory
    
    setting.pur_truck_distance_threshold_km = payload.pur_truck_distance_threshold_km
    setting.pur_truck_extra_price_flat = payload.pur_truck_extra_price_flat
    setting.pur_truck_surface_threshold_free_sqm = payload.pur_truck_surface_threshold_free_sqm
    
    setting.eps_truck_distance_threshold_km = payload.eps_truck_distance_threshold_km
    setting.eps_truck_extra_price_flat = payload.eps_truck_extra_price_flat
    setting.eps_truck_volume_threshold_free_m3 = payload.eps_truck_volume_threshold_free_m3
    
    # PUR
    setting.pur_base_price_3cm = payload.pur_base_price_3cm
    setting.pur_step_price_up_to_10cm = payload.pur_step_price_up_to_10cm
    setting.pur_extra_price_above_10cm = payload.pur_extra_price_above_10cm
    setting.pur_minimum_execution_price = payload.pur_minimum_execution_price
    setting.pur_surface_discount_step = payload.pur_surface_discount_step
    setting.pur_opt_aspiration = payload.pur_opt_aspiration
    setting.pur_opt_niveller = payload.pur_opt_niveller
    setting.pur_opt_poncage = payload.pur_opt_poncage
    setting.pur_opt_protection = payload.pur_opt_protection
    
    # EPS
    setting.eps_volume_thresholds = payload.eps_volume_thresholds
    
    # Validate surface thresholds: min < max and no overlap
    if payload.surface_thresholds:
        for t in payload.surface_thresholds:
            min_s = float(t.min_sqm or 0)
            max_s = float(t.max_sqm or 0)
            if min_s < 0 or max_s < 0:
                raise HTTPException(status_code=400, detail="Les surfaces ne peuvent pas être négatives.")
            if min_s >= max_s:
                raise HTTPException(status_code=400, detail=f"Le minimum ({min_s} m²) doit être strictement inférieur au maximum ({max_s} m²).")

        sorted_t = sorted(payload.surface_thresholds, key=lambda x: float(x.min_sqm or 0))
        for i in range(len(sorted_t) - 1):
            curr_max = float(sorted_t[i].max_sqm or 0)
            next_min = float(sorted_t[i+1].min_sqm or 0)
            if next_min <= curr_max:
                raise HTTPException(
                    status_code=400,
                    detail=f"Chevauchement détecté entre [{sorted_t[i].min_sqm} - {curr_max} m²] et [{next_min} - {sorted_t[i+1].max_sqm} m²]. Les intervalles ne doivent pas se chevaucher (ex: 0-40, 41-60)."
                )

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

    log_audit(
        db=db,
        organization_id=org_id,
        admin_id=current_admin.id,
        action="UPDATE_PRICING",
        resource_type="PricingSetting",
        resource_id=setting.id,
        details={"message": f"Updated pricing settings for client {payload.client_id or 'Global'}"}
    )

    return {"status": "success"}

@router.delete("/pricing-settings")
def delete_custom_pricing(
    client_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    org_id = current_admin.organization_id
    if not org_id and current_admin.is_super_admin:
        from app.models import Organization
        first_org = db.query(Organization).first()
        if first_org:
            org_id = first_org.id

    if not org_id:
        raise HTTPException(status_code=400, detail="No organization assigned to admin")

    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
        
    db.query(PricingSetting).filter(
        PricingSetting.organization_id == org_id,
        PricingSetting.client_id == client_id
    ).delete()
    
    db.commit()
    return {"status": "success"}

@router.get("/pricing-settings/custom-clients")
def get_custom_clients(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    org_id = current_admin.organization_id
    if not org_id and current_admin.is_super_admin:
        from app.models import Organization
        first_org = db.query(Organization).first()
        if first_org:
            org_id = first_org.id

    if not org_id:
        raise HTTPException(status_code=400, detail="No organization assigned to admin")

    settings = db.query(PricingSetting.client_id).filter(
        PricingSetting.organization_id == org_id,
        PricingSetting.client_id.isnot(None)
    ).all()
    
    return [s[0] for s in settings]

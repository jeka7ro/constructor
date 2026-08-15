from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
import secrets
import os

from app.database import get_db
from app.models import Organization, Client, WorkOrder, PricingSetting

router = APIRouter(prefix="/api/public/devis_online", tags=["devis_online"])

class SurfaceItem(BaseModel):
    id: Optional[str] = None
    label: Optional[str] = "Chape"
    surface: float
    thickness: float
    has_foil: bool = False
    has_mesh: bool = False
    has_duramint: bool = True

class IsolationItem(BaseModel):
    id: Optional[str] = None
    label: Optional[str] = "Isolation"
    type: str = "pur"
    surface: float
    thickness: float

class CalculatorSubmitRequest(BaseModel):
    domain: Optional[str] = None
    slug: Optional[str] = None
    # Client Info
    client_type: str = "fizica" # "fizica" or "juridica"
    client_first_name: Optional[str] = None
    client_last_name: Optional[str] = None
    client_company_name: Optional[str] = None
    client_company_vat: Optional[str] = None
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_language: str = "fr"
    language: Optional[str] = None
    lang: Optional[str] = None
    # Work Info
    work_type: str = "new" # "new" or "repair"
    site_address: str
    
    # ── Multiple Surfaces ──
    surfaces: List[SurfaceItem] = []
    isolations: List[IsolationItem] = []
    
    # Legacy fields (kept for backward compatibility during transition)
    surface: Optional[float] = 0.0
    thickness: Optional[float] = 0.0
    has_foil: bool = False
    has_mesh: bool = False
    has_duramint: bool = True
    
    # Scheduling
    approximate_date: Optional[str] = None
    # Security
    honeypot: Optional[str] = None
    
    # Iframe tracking
    is_iframe: Optional[bool] = False
    
    # Custom source override (e.g. 'we-r' for Jordi)
    source: Optional[str] = None
    
    # ── Legacy Isolation (PUR / EPS) ──
    needs_isolation: bool = False
    isolation_type: Optional[str] = None  # 'pur' or 'eps'
    isolation_surface: Optional[float] = None
    isolation_thickness: Optional[float] = None
    # PUR options
    isolation_pur_aspiration: bool = False
    isolation_pur_niveller: bool = False
    isolation_pur_poncage: bool = False
    isolation_pur_protection: bool = False

@router.get("/config")
def get_calculator_config(domain: Optional[str] = None, slug: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch public pricing and UI config for the calculator."""
    org = get_org_by_domain_or_slug(domain, slug, db)
    
    pricing = db.query(PricingSetting).filter(PricingSetting.organization_id == org.id, PricingSetting.client_id == None).first()
    
    pricing_data = {}
    if pricing:
        pricing_data = {
            # ── Chape pricing ──
            "base_price_sqm": pricing.base_price_sqm,
            "base_price_sqm_large": pricing.base_price_sqm_large,
            "base_large_threshold_sqm": pricing.base_large_threshold_sqm,
            "extra_thickness_price_per_cm": pricing.extra_thickness_price_per_cm,
            "standard_thickness_cm": pricing.standard_thickness_cm,
            "plastic_foil_price_sqm": pricing.plastic_foil_price_sqm,
            "metal_mesh_price_sqm": pricing.metal_mesh_price_sqm,
            "fiber_price_sqm": pricing.fiber_price_sqm,
            "fiber_price_sqm_large": pricing.fiber_price_sqm_large,
            "fiber_large_threshold_sqm": pricing.fiber_large_threshold_sqm,
            "surface_thresholds": pricing.surface_thresholds or [],
            "vat_legal_entity": pricing.vat_legal_entity,
            "vat_physical_new": pricing.vat_physical_new,
            "vat_physical_repair": pricing.vat_physical_repair,
            # ── PUR pricing ──
            "pur_base_price_3cm": pricing.pur_base_price_3cm,
            "pur_step_price_up_to_10cm": pricing.pur_step_price_up_to_10cm,
            "pur_extra_price_above_10cm": pricing.pur_extra_price_above_10cm,
            "pur_minimum_execution_price": pricing.pur_minimum_execution_price,
            "pur_surface_discount_step": pricing.pur_surface_discount_step,
            "pur_opt_aspiration": pricing.pur_opt_aspiration,
            "pur_opt_niveller": pricing.pur_opt_niveller,
            "pur_opt_poncage": pricing.pur_opt_poncage,
            "pur_opt_protection": pricing.pur_opt_protection,
            "is_pur_aspiration_mandatory": pricing.is_pur_aspiration_mandatory,
            "is_pur_niveller_mandatory": pricing.is_pur_niveller_mandatory,
            "is_pur_poncage_mandatory": pricing.is_pur_poncage_mandatory,
            "is_pur_protection_mandatory": pricing.is_pur_protection_mandatory,
            # ── EPS pricing ──
            "eps_volume_thresholds": pricing.eps_volume_thresholds or [],
        }

    return {
        "tenant": {
            "id": org.id,
            "name": org.name,
            "logo_url": org.logo_url,
            "primary_color": org.primary_color,
            "secondary_color": org.secondary_color,
        },
        "pricing": pricing_data
    }

@router.get("/available-dates")
def get_available_dates(domain: Optional[str] = None, slug: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns dates that have capacity. 
    A simple logic: check active WorkOrders in planning and mark dates with low workload as available.
    """
    org = get_org_by_domain_or_slug(domain, slug, db)
    today = date.today()
    work_orders = db.query(WorkOrder).filter(
        WorkOrder.organization_id == org.id,
        WorkOrder.start_date >= today,
        WorkOrder.status.in_(["planning", "in_progress", "completed"]) # Statuses that take up calendar space
    ).all()
    
    date_counts = {}
    for wo in work_orders:
        if wo.start_date:
            d_str = wo.start_date.isoformat()
            date_counts[d_str] = date_counts.get(d_str, 0) + 1
            
    return {
        "date_counts": date_counts,
        "max_capacity_per_day": 3 
    }

def get_driving_distance_km(origin: str, destination: str) -> float:
    import requests
    import os
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key or not origin or not destination:
        return 0.0
    
    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": origin,
        "destinations": destination,
        "key": api_key,
        "units": "metric"
    }
    try:
        res = requests.get(url, params=params, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data.get("rows") and data["rows"][0].get("elements"):
                element = data["rows"][0]["elements"][0]
                if element.get("status") == "OK":
                    return element["distance"]["value"] / 1000.0
    except Exception as e:
        print(f"Error calculating distance: {e}")
    return 0.0

def _build_volumes(payload: CalculatorSubmitRequest) -> list:
    """Build volumes array: always Chape, optionally + Isolation PUR/EPS."""
    volumes = []
    
    # 1. Use multiple surfaces if provided
    if payload.surfaces and len(payload.surfaces) > 0:
        for surf in payload.surfaces:
            volumes.append({
                "label": surf.label or "Chape",
                "quantity": surf.surface,
                "unit": "m²",
                "thickness": surf.thickness,
                "has_foil": surf.has_foil,
                "has_mesh": surf.has_mesh,
                "has_duramint": surf.has_duramint
            })
    else:
        # Fallback to single surface
        volumes.append({
            "label": "Chape",
            "quantity": payload.surface,
            "unit": "m²",
            "thickness": payload.thickness,
            "has_foil": payload.has_foil,
            "has_mesh": payload.has_mesh,
            "has_duramint": payload.has_duramint
        })
    
    # 2. Use multiple isolations if provided
    if payload.isolations and len(payload.isolations) > 0:
        for iso in payload.isolations:
            iso_vol = {
                "quantity": iso.surface,
                "thickness": iso.thickness or 3,
            }
            if iso.type == "pur":
                iso_vol["label"] = iso.label or "Isolation PUR"
                iso_vol["unit"] = "m²"
                # Keep legacy options per-surface for now if passed, else default
                iso_vol["pur_aspiration"] = payload.isolation_pur_aspiration
                iso_vol["pur_niveller"] = payload.isolation_pur_niveller
                iso_vol["pur_poncage"] = payload.isolation_pur_poncage
                iso_vol["pur_protection"] = payload.isolation_pur_protection
            elif iso.type == "eps":
                iso_vol["label"] = iso.label or "Isolation EPS"
                iso_vol["unit"] = "m³"
                iso_vol["volume_m3"] = round(iso.surface * (iso.thickness or 1) / 100, 2)
            volumes.append(iso_vol)
    elif payload.needs_isolation and payload.isolation_type and payload.isolation_surface:
        # Fallback to single isolation
        iso_vol = {
            "quantity": payload.isolation_surface,
            "thickness": payload.isolation_thickness or 3,
        }
        if payload.isolation_type == "pur":
            iso_vol["label"] = "Isolation PUR"
            iso_vol["unit"] = "m²"
            iso_vol["pur_aspiration"] = payload.isolation_pur_aspiration
            iso_vol["pur_niveller"] = payload.isolation_pur_niveller
            iso_vol["pur_poncage"] = payload.isolation_pur_poncage
            iso_vol["pur_protection"] = payload.isolation_pur_protection
        elif payload.isolation_type == "eps":
            iso_vol["label"] = "Isolation EPS"
            iso_vol["unit"] = "m³"
            # Volume = surface * thickness(cm) / 100
            iso_vol["volume_m3"] = round(payload.isolation_surface * (payload.isolation_thickness or 1) / 100, 2)
        volumes.append(iso_vol)
    
    return volumes

@router.post("/submit")
def submit_calculator(request: Request, payload: CalculatorSubmitRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Handles the public quote submission."""
    # 1. Honeypot check
    if payload.honeypot:
        raise HTTPException(status_code=400, detail="Invalid request")

    org = get_org_by_domain_or_slug(payload.domain, payload.slug, db)
    
    # 1.5 Handle language fallback and normalize
    effective_lang = payload.client_language
    if effective_lang == "fr": # if it's the default, check the aliases
        if getattr(payload, "language", None):
            effective_lang = payload.language
        elif getattr(payload, "lang", None):
            effective_lang = payload.lang
            
    effective_lang = str(effective_lang).lower().split('-')[0].strip()
    if effective_lang in ['eng', 'english', 'en']: effective_lang = 'en'
    elif effective_lang in ['ro', 'romana', 'romanian', 'ro']: effective_lang = 'ro'
    elif effective_lang in ['nl', 'dutch', 'nl']: effective_lang = 'nl'
    else: effective_lang = 'fr'
    payload.client_language = effective_lang
    
    # 2. Find or create Client
    client_name = ""
    if payload.client_type == "juridica" and payload.client_company_name:
        client_name = payload.client_company_name
    else:
        client_name = f"{payload.client_first_name or ''} {payload.client_last_name or ''}".strip()
        
    client = None
    if client_name:
        client = db.query(Client).filter(
            Client.organization_id == org.id,
            Client.name == client_name
        ).first()
        
    if not client:
        client = Client(
            organization_id=org.id,
            name=client_name or "Client Anonim",
            email=payload.client_email,
            phone=payload.client_phone,
            client_type=payload.client_type,
            cui=payload.client_company_vat if payload.client_type == "juridica" else None,
            address=payload.client_address,
            preferred_language=payload.client_language
        )
        db.add(client)
        db.flush()
        
    # 3. Calculate estimated price
    pricing = db.query(PricingSetting).filter(PricingSetting.organization_id == org.id, PricingSetting.client_id == None).first()
    estimated_price = 0
    if pricing and payload.surface > 0:
        # Truck transportation distance cost
        distance_km = 0.0
        
        if payload.site_address:
            from app.models import LogisticBase
            bases = db.query(LogisticBase).filter(LogisticBase.organization_id == org.id).all()
            if bases:
                min_dist = 999999.0
                for base_record in bases:
                    if base_record.address:
                        dist = get_driving_distance_km(base_record.address, payload.site_address)
                        if 0 < dist < min_dist:
                            min_dist = dist
                if min_dist < 999999.0:
                    distance_km = min_dist

        payload_dict = payload.dict()
        payload_dict['distance_km'] = distance_km

        from app.services.pricing_engine import calculate_quote_price
        calc_result = calculate_quote_price(payload_dict, pricing)
        
        base = calc_result["base"]
        extra_cost = calc_result["extra"]
        foil_cost = calc_result["foil"]
        mesh_cost = calc_result["mesh"]
        fiber_cost = calc_result["fiber"]
        hidden_extra = calc_result["threshold"]
        truck_cost = calc_result["truck_cost"]
        isolation_cost = calc_result["isolation_cost"]
        estimated_price = calc_result["total_net"]

    use_vat = True
    vat_rate = 21.0
    if pricing:
        if payload.client_type == "juridica":
            vat_rate = pricing.vat_legal_entity
        else:
            vat_rate = pricing.vat_physical_repair if payload.work_type == "repair" else pricing.vat_physical_new
            
    prices_dict = {
        "base": getattr(pricing, 'base_price_sqm_large', 12.5) if pricing and payload.surface > getattr(pricing, 'base_large_threshold_sqm', 200) else (pricing.base_price_sqm if pricing else 12.5),
        "extra_thickness_price_per_cm": pricing.extra_thickness_price_per_cm if pricing else 1.25,
        "standard_thickness": pricing.standard_thickness_cm if pricing else 5.0,
        "foil": pricing.plastic_foil_price_sqm if pricing else 1.2,
        "mesh": pricing.metal_mesh_price_sqm if pricing else 2.5,
        "fiber": (pricing.fiber_price_sqm if pricing else 2.5) if payload.surface <= (pricing.fiber_large_threshold_sqm if pricing else 200) else (pricing.fiber_price_sqm_large if pricing else 2.0),
        "truck_cost": truck_cost if 'truck_cost' in locals() else 0,
        "distance_km": distance_km if 'distance_km' in locals() else 0,
        "useVat": use_vat,
        "vat_type": vat_rate,
        "vat_legal_entity": pricing.vat_legal_entity if pricing else 0,
        "vat_physical_new": pricing.vat_physical_new if pricing else 21,
        "vat_physical_repair": pricing.vat_physical_repair if pricing else 6,
        "surface_thresholds": pricing.surface_thresholds if pricing else [],
        # PUR prices
        "pur_base_price_3cm": getattr(pricing, 'pur_base_price_3cm', 13.95),
        "pur_step_price_up_to_10cm": getattr(pricing, 'pur_step_price_up_to_10cm', 1.65),
        "pur_extra_price_above_10cm": getattr(pricing, 'pur_extra_price_above_10cm', 2.10),
        "pur_surface_discount_step": getattr(pricing, 'pur_surface_discount_step', -0.50),
        "pur_minimum_execution_price": getattr(pricing, 'pur_minimum_execution_price', 1375.0),
        "pur_opt_aspiration": getattr(pricing, 'pur_opt_aspiration', 2.00),
        "pur_opt_niveller": getattr(pricing, 'pur_opt_niveller', 4.25),
        "pur_opt_poncage": getattr(pricing, 'pur_opt_poncage', 1.50),
        "pur_opt_protection": getattr(pricing, 'pur_opt_protection', 1.50),
        # EPS tiers
        "eps_volume_thresholds": getattr(pricing, 'eps_volume_thresholds', []) if pricing else [],
    }

    # 4. Create WorkOrder
    wo = WorkOrder(
        organization_id=org.id,
        token=secrets.token_urlsafe(32),
        title=f"Demande de devis - {client_name}",
        is_quote=True,
        status="draft",
        work_type=payload.work_type,
        approximate_date=payload.approximate_date,
        site_address=payload.site_address,
        client_id=client.id,
        client_name=client.name,
        client_email=client.email,
        client_phone=client.phone,
        client_language=payload.client_language,
        volumes=_build_volumes(payload),
        estimated_price=str(estimated_price) if estimated_price > 0 else None,
        prices=prices_dict,
        proforma_issued_at=datetime.utcnow(),
    )
    
    if payload.source:
        wo.source_system = payload.source
    elif getattr(payload, 'is_iframe', False):
        wo.source_system = "we-r"
    else:
        wo.source_system = "devis_online"
        
    from sqlalchemy import func
    max_quote = db.query(func.max(WorkOrder.quote_number)).filter(
        WorkOrder.organization_id == wo.organization_id,
        WorkOrder.quote_number.like('DEV%')
    ).scalar()
    
    if max_quote:
        try:
            num_part = max_quote.replace('DEV', '')
            next_num = int(num_part) + 1
        except ValueError:
            next_num = 905
    else:
        next_num = 905
        
    wo.quote_number = f"DEV{next_num}"
    wo.proforma_path = f"/proforma/{wo.id}" # We set the internal path for consistency
    
    db.add(wo)
    db.commit()
    db.refresh(wo)
    
    proforma_url = f"https://davidechape.pontaj.app/confirm/{wo.token}"

    from app.services.email_service import send_quote_email, send_admin_new_quote_alert
    from app.services.whatsapp_service import send_whatsapp_message, send_admin_new_quote_whatsapp
    
    # Trimitem doar e-mailul cu link-ul către proformă, fără niciun PDF atașat
    def send_email_without_pdf():
        send_quote_email(client.email, client.name, wo.client_language, proforma_url, None)

    if client.email:
        background_tasks.add_task(send_email_without_pdf)
    if client.phone:
        background_tasks.add_task(send_whatsapp_message, client.phone, client.name, wo.client_language, proforma_url)

    # Notificari pentru Admin
    def send_alerts_to_admins():
        from app.models import Admin
        admins = db.query(Admin).filter(Admin.organization_id == wo.organization_id, Admin.receive_quote_alerts == True).all()
        
        # Trimite mereu la info@davidechape.be ca email de baza/secundar
        try:
            send_admin_new_quote_alert("info@davidechape.be", client.name, client.phone, proforma_url)
        except Exception as e:
            print(f"Failed to send alert to info@davidechape.be: {e}")

        for admin in admins:
            if admin.email and admin.email != "info@davidechape.be":
                send_admin_new_quote_alert(admin.email, client.name, client.phone, proforma_url)
            if admin.phone:
                send_admin_new_quote_whatsapp(admin.phone, client.name, client.phone, proforma_url)
                
    background_tasks.add_task(send_alerts_to_admins)


    return {
        "message": "Deviz solicitat cu succes",
        "token": wo.token,
        "work_order_id": wo.id,
        "signature_url": proforma_url
    }

@router.get("/vies/{country}/{vat_number}")
def public_vies_lookup(country: str, vat_number: str):
    """Public proxy for VIES lookup to auto-fill company data in calculator"""
    import requests
    try:
        vat_clean = ''.join(filter(str.isalnum, vat_number))
        res = requests.get(f"https://api.vatcomply.com/vat?vat_number={country.upper()}{vat_clean}", timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data.get("valid"):
                return {
                    "valid": True,
                    "name": data.get("name"),
                    "address": data.get("address")
                }
        return {"valid": False}
    except Exception as e:
        print(f"Public VIES error: {e}")
        raise HTTPException(status_code=503, detail="VIES unavailable")

def get_org_by_domain_or_slug(domain: str, slug: str, db: Session) -> Organization:
    if not domain and not slug:
        raise HTTPException(status_code=400, detail="Must provide domain or slug")

    org = None
    if domain:
        org = db.query(Organization).filter(Organization.custom_domain == domain).first()
        if not org and '.' in domain:
            extracted_slug = domain.split('.')[0]
            org = db.query(Organization).filter(Organization.slug == extracted_slug).first()
            
    if not org and slug:
        org = db.query(Organization).filter(Organization.slug == slug).first()

    if not org or not org.is_active:
        raise HTTPException(status_code=404, detail="Tenant not found or inactive")
        
    return org

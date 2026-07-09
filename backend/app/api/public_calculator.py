from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
import secrets

from app.database import get_db
from app.models import Organization, Client, WorkOrder, PricingSetting

router = APIRouter(prefix="/api/public/calculator", tags=["public_calculator"])

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
    # Work Info
    work_type: str = "new" # "new" or "repair"
    site_address: str
    surface: float
    thickness: float
    # Options
    has_foil: bool = False
    has_mesh: bool = False
    has_duramint: bool = True # Always included as requested
    # Scheduling
    approximate_date: Optional[str] = None
    # Security
    honeypot: Optional[str] = None

@router.get("/config")
def get_calculator_config(domain: Optional[str] = None, slug: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch public pricing and UI config for the calculator."""
    org = get_org_by_domain_or_slug(domain, slug, db)
    
    pricing = db.query(PricingSetting).filter(PricingSetting.organization_id == org.id, PricingSetting.client_id == None).first()
    
    pricing_data = {}
    if pricing:
        pricing_data = {
            "base_price_sqm": pricing.base_price_sqm,
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

@router.post("/submit")
def submit_calculator(request: Request, payload: CalculatorSubmitRequest, db: Session = Depends(get_db)):
    """Handles the public quote submission."""
    # 1. Honeypot check
    if payload.honeypot:
        raise HTTPException(status_code=400, detail="Invalid request")

    org = get_org_by_domain_or_slug(payload.domain, payload.slug, db)
    
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
            address=payload.client_address
        )
        db.add(client)
        db.flush()
        
    # 3. Calculate estimated price
    pricing = db.query(PricingSetting).filter(PricingSetting.organization_id == org.id, PricingSetting.client_id == None).first()
    estimated_price = 0
    if pricing and payload.surface > 0:
        base = pricing.base_price_sqm * payload.surface
        extra_thick = max(0, payload.thickness - pricing.standard_thickness_cm)
        extra_cost = extra_thick * pricing.extra_thickness_price_per_cm * payload.surface
        foil_cost = pricing.plastic_foil_price_sqm * payload.surface if payload.has_foil else 0
        mesh_cost = pricing.metal_mesh_price_sqm * payload.surface if payload.has_mesh else 0
        
        # Determine hidden thresholds
        hidden_extra = 0
        if pricing.surface_thresholds:
            for thresh in pricing.surface_thresholds:
                min_s = float(thresh.get("min_sqm") or 0)
                max_s = float(thresh.get("max_sqm") or 999999)
                if min_s <= payload.surface < max_s:
                    hidden_extra += float(thresh.get("extra_charge") or 0)
        
        estimated_price = base + extra_cost + foil_cost + mesh_cost + hidden_extra
        
    use_vat = True
    vat_rate = 21.0
    if pricing:
        if payload.client_type == "juridica":
            vat_rate = pricing.vat_legal_entity
        else:
            vat_rate = pricing.vat_physical_repair if payload.work_type == "repair" else pricing.vat_physical_new
            
    prices_dict = {
        "useVat": use_vat,
        "vat_legal_entity": pricing.vat_legal_entity if pricing else 0,
        "vat_physical_new": pricing.vat_physical_new if pricing else 21,
        "vat_physical_repair": pricing.vat_physical_repair if pricing else 6,
        "surface_thresholds": pricing.surface_thresholds if pricing else []
    }

    # 4. Create WorkOrder
    wo = WorkOrder(
        organization_id=org.id,
        token=secrets.token_urlsafe(32),
        title=f"Cerere Deviz - {client_name}",
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
        volumes=[{
            "label": "Chape",
            "quantity": payload.surface,
            "unit": "m²",
            "thickness": payload.thickness,
            "has_foil": payload.has_foil,
            "has_mesh": payload.has_mesh,
            "has_duramint": payload.has_duramint
        }],
        estimated_price=str(estimated_price) if estimated_price > 0 else None,
        prices=prices_dict,
        proforma_issued_at=datetime.utcnow()
    )
    
    count = db.query(WorkOrder).filter(WorkOrder.organization_id == org.id, WorkOrder.is_quote == True).count()
    wo.quote_number = f"DEV{str(count + 1).zfill(4)}"
    wo.proforma_path = f"/proforma/{wo.id}" # We set the internal path for consistency
    
    db.add(wo)
    db.commit()
    db.refresh(wo)
    
    return {
        "message": "Deviz solicitat cu succes",
        "token": wo.token,
        "work_order_id": wo.id
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

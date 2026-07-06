"""
public_work_orders.py — Endpoint-uri publice (fără autentificare) pentru confirmarea comenzilor de lucru.
Clientul accesează pagina cu tokenul unic, vede detaliile și confirmă.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models import WorkOrder, Organization, User, WorkOrderPhoto, TeamMember, Team
from app.api.auth import get_current_user
import requests as _req

router = APIRouter()

# ──────────────────────────────────────────────────────────────────────────────
# GET /user/work-orders — Comenzi active pentru un șantier (acces angajat)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/user/work-orders")
def get_user_work_orders(
    site_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returnează comenzile de lucru active (toate sau filtrate pe șantier) — acces angajat."""
    q = db.query(WorkOrder).filter(
        WorkOrder.organization_id == current_user.organization_id,
        WorkOrder.status.in_(["confirmed", "in_progress", "sent"])
    )
    if site_id:
        q = q.filter(WorkOrder.site_id == site_id)
        
    wos = q.order_by(WorkOrder.created_at.desc()).all()
    
    res = []
    existing_ext_ids = set()
    for wo in wos:
        site_name = wo.site.name if wo.site else None
        if wo.external_id:
            existing_ext_ids.add(str(wo.external_id))
            
        res.append({
            "id": wo.id,
            "ext_id": wo.external_id,
            "title": wo.title,
            "status": wo.status,
            "site_id": wo.site_id,
            "site_name": site_name,
            "deadline_date": str(wo.deadline_date) if wo.deadline_date else None,
            "requirements": wo.requirements or [],
            "materials": wo.materials or [],
            "materials_consumed": wo.materials_consumed or [],
            "volumes": wo.volumes or [],
            "actual_surface_m2": wo.actual_surface_m2,
            "actual_sand_quantity": wo.actual_sand_quantity,
            "notes": wo.notes,
            "is_robaws": False
        })

    # Fetch from Robaws for the user's team
    try:
        team_member = db.query(TeamMember).filter(
            TeamMember.user_id == current_user.id,
            TeamMember.is_active == True,
            TeamMember.left_date == None
        ).first()

        if team_member:
            team = db.query(Team).filter(Team.id == team_member.team_id).first()
            if team and team.robaws_email and team.robaws_password:
                # Căutăm doar viitoare / recente
                url = "https://app.robaws.com/api/v2/work-orders?limit=40&include=lineItems"
                r = _req.get(url, auth=(team.robaws_email, team.robaws_password), timeout=5)
                if r.status_code == 200:
                    robaws_items = r.json().get("items", [])
                    
                    for item in robaws_items:
                        ext_id = str(item.get("id"))
                        if ext_id in existing_ext_ids:
                            continue
                            
                        # Extrage adresa/site name
                        addr_obj = item.get("address") or {}
                        addr_parts = []
                        if addr_obj.get("postalCode"): addr_parts.append(addr_obj["postalCode"])
                        if addr_obj.get("city"): addr_parts.append(addr_obj["city"])
                        if addr_obj.get("addressLine1"): addr_parts.append(addr_obj["addressLine1"])
                        site_name = " ".join(addr_parts) if addr_parts else "Lucrare Nouă (Robaws)"

                        # Extrage materiale
                        materials = []
                        for li in item.get("lineItems", []):
                            desc = li.get("description") or ""
                            qty = li.get("quantity") or 0
                            unit = li.get("unitType") or ""
                            materials.append({"name": desc, "quantity": qty, "unit": unit})

                        date_str = item.get("date")

                        # Filtrare doar în viitor / azi (opțional, dar păstrăm toate cele de sus din Robaws care s-au întors, 
                        # deoarece by default vin cu status open/planned)
                        # Wappy folosește `sent` pt comenzile neîncepute.
                        res.append({
                            "id": f"robaws_{ext_id}",
                            "ext_id": ext_id,
                            "title": item.get("title") or f"Robaws #{item.get('number', ext_id)}",
                            "status": "sent", 
                            "site_id": None,
                            "site_name": site_name,
                            "deadline_date": date_str,
                            "requirements": [],
                            "materials": materials,
                            "materials_consumed": [],
                            "volumes": [],
                            "actual_surface_m2": 0,
                            "actual_sand_quantity": 0,
                            "notes": item.get("description") or item.get("notes") or "",
                            "is_robaws": True
                        })
    except Exception as e:
        print(f"Eroare fetch Robaws mobil: {e}")

    # Sortăm combinat: data (desc)
    res.sort(key=lambda x: x.get("deadline_date") or "", reverse=True)
    return res



def _public_serialize(wo: WorkOrder, org: Organization) -> dict:
    """Serializează un WorkOrder pentru pagina publică a clientului."""
    site_name = None
    site_address = wo.site_address
    if wo.site:
        site_name = wo.site.name
        site_address = site_address or wo.site.address

    return {
        # Informații despre companie (pentru branding pe pagina publică)
        "org_name": org.name if org else "Smart Timesheet",
        "org_logo": org.logo_url if org else None,
        "org_primary_color": org.primary_color if org else "#3b82f6",
        # Comanda
        "id": wo.id,
        "title": wo.title,
        "notes": wo.notes,
        "start_date": str(wo.start_date) if wo.start_date else None,
        "deadline_date": str(wo.deadline_date) if wo.deadline_date else None,
        "site_name": site_name,
        "site_address": site_address,
        "client_name": wo.client_name,
        "client_email": wo.client_email,
        "client_phone": wo.client_phone,
        "client_cui": wo.client.cui if wo.client else None,
        "client_reg_com": wo.client.reg_com if wo.client else None,
        "client_address": wo.client.address if wo.client else None,
        "requirements": wo.requirements or [],
        # Hide any material or volume containing 'nisip'/'sand'/'zand' for the public client quote
        "materials": [m for m in (wo.materials or []) if not any(x in str(m.get("name", "")).lower() for x in ["nisip", "sand", "zand", "sable"])],
        "volumes": [v for v in (wo.volumes or []) if not any(x in str(v.get("label", "")).lower() for x in ["nisip", "sand", "zand", "sable"])],
        "actual_surface_m2": wo.actual_surface_m2,
        "status": wo.status,
        "confirmed_at": wo.confirmed_at.isoformat() if wo.confirmed_at else None,
        "confirmed_by_name": wo.confirmed_by_name,
        "client_signature": wo.client_signature,
        "estimated_price": wo.estimated_price,
        "final_invoice_path": wo.final_invoice_path,
        "completion_photos": [
            {
                "id": p.id,
                "photo_path": p.photo_path,
                "description": p.description,
                "uploaded_at": p.uploaded_at.isoformat()
            }
            for p in wo.photos if p.photo_type == "completion"
        ] if wo.status == "completed" and getattr(wo, "photos", None) else []
    }


# ──────────────────────────────────────────────────────────────────────────────
# GET — Citire detalii comandă (fără autentificare)
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/public/work-orders/{token}")
def get_public_work_order(token: str, db: Session = Depends(get_db)):
    """
    Returnează datele publice ale comenzii de lucru pe baza tokenului unic.
    Utilizat de pagina de confirmare a clientului.
    """
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită sau link-ul este invalid.")
    if wo.status == "draft":
        raise HTTPException(status_code=403, detail="Această comandă nu a fost încă trimisă.")

    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    return _public_serialize(wo, org)

# ──────────────────────────────────────────────────────────────────────────────
# GET — Vizualizare Proformă (fără autentificare)
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/public/proforma/{token}")
def get_public_proforma(token: str, db: Session = Depends(get_db)):
    """
    Returnează datele necesare pentru previzualizarea proformei pe baza tokenului.
    """
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Proforma nu a fost găsită sau link-ul este invalid.")
    
    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    return {
        "workOrderData": _public_serialize(wo, org),
        "config": wo.proforma_data
    }


# ──────────────────────────────────────────────────────────────────────────────
# POST — Confirmare comandă de către client
# ──────────────────────────────────────────────────────────────────────────────
class ConfirmPayload(BaseModel):
    confirmed_by_name: Optional[str] = None
    client_signature: Optional[str] = None   # Base64 PNG din canvas

@router.post("/public/work-orders/{token}/confirm")
def confirm_work_order(
    token: str,
    payload: ConfirmPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Clientul confirmă comanda de lucru.
    Se setează: confirmed_at, confirmed_by_name, confirmed_ip, status = confirmed.
    """
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
    if wo.status == "draft":
        raise HTTPException(status_code=403, detail="Această comandă nu a fost încă trimisă.")
    if wo.status == "confirmed":
        raise HTTPException(status_code=400, detail="Comanda a fost deja confirmată.")
    if wo.status == "cancelled":
        raise HTTPException(status_code=400, detail="Comanda a fost anulată și nu mai poate fi confirmată.")

    # Obține IP-ul clientului
    client_ip = request.client.host if request.client else None
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    wo.status = "confirmed"
    wo.confirmed_at = datetime.utcnow()
    wo.confirmed_by_name = payload.confirmed_by_name or wo.client_name
    wo.confirmed_ip = client_ip
    if payload.client_signature:
        wo.client_signature = payload.client_signature

    db.commit()
    db.refresh(wo)

    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    return _public_serialize(wo, org)

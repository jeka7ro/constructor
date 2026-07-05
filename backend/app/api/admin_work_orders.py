"""
admin_work_orders.py — API pentru Comenzi de Lucru (Work Orders) B2B
Acces protejat — doar adminii autentificați ai organizației pot opera.
"""

import secrets
import os
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel, model_validator
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import WorkOrder, WorkOrderAcknowledgement, WorkOrderCheckin, WorkOrderPhoto, Organization, ConstructionSite, Client, Admin, TimesheetSegment, Timesheet, User, Team, Vehicle, WarehouseItem, WarehouseTransaction
from app.api.admin_auth import get_current_admin
from datetime import date as date_today_import
from sqlalchemy import func

def sync_work_order_reservations(db: Session, org_id: str, old_materials: list, new_materials: list):
    """Calculeaza diferenta de materiale si ajusteaza reserved_quantity in Magazie."""
    from collections import defaultdict
    deltas = defaultdict(float)
    
    for m in old_materials:
        name = (m.get("name") or "").strip().lower()
        if name:
            try: deltas[name] -= float(m.get("quantity") or 0)
            except: pass
            
    for m in new_materials:
        name = (m.get("name") or "").strip().lower()
        if name:
            try: deltas[name] += float(m.get("quantity") or 0)
            except: pass
            
    for name, delta in deltas.items():
        if delta == 0: continue
        item = db.query(WarehouseItem).filter(WarehouseItem.organization_id == org_id, func.lower(WarehouseItem.name) == name).first()
        if item:
            item.reserved_quantity += delta
            if item.reserved_quantity < 0: item.reserved_quantity = 0.0

def consume_work_order_materials(db: Session, org_id: str, materials: list, wo_title: str, admin_id: str):
    """Scade definitiv materialele din stocul total, elibereaza rezervarea si creeaza tranzactie OUT."""
    for m in materials:
        name = (m.get("name") or "").strip().lower()
        try: qty = float(m.get("quantity") or 0)
        except: qty = 0
        if not name or qty <= 0: continue
            
        item = db.query(WarehouseItem).filter(WarehouseItem.organization_id == org_id, func.lower(WarehouseItem.name) == name).first()
        if item:
            item.total_quantity -= qty
            if item.total_quantity < 0: item.total_quantity = 0.0
            item.reserved_quantity -= qty
            if item.reserved_quantity < 0: item.reserved_quantity = 0.0
                
            tx = WarehouseTransaction(
                item_id=item.id, transaction_type="OUT", quantity=qty,
                date=datetime.utcnow().date(), operated_by_id=str(admin_id),
                notes=f"Consum lucrare finalizată: {wo_title}"
            )
            db.add(tx)

router = APIRouter()

# ──────────────────────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────────────────────

class WorkOrderCreate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    start_date: Optional[str] = None
    start_time: Optional[str] = None
    deadline_date: Optional[str] = None
    # Locație
    site_id: Optional[str] = None
    site_address: Optional[str] = None
    site_latitude: Optional[float] = None
    site_longitude: Optional[float] = None
    # Client
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_language: Optional[str] = "ro"
    client_type: Optional[str] = "fizica"
    client_country: Optional[str] = "RO"
    client_contact_person: Optional[str] = None
    client_address: Optional[str] = None
    client_company_reg_number: Optional[str] = None
    client_company_vat: Optional[str] = None
    client_company_bank: Optional[str] = None
    client_company_iban: Optional[str] = None
    client_company_swift: Optional[str] = None
    # Conținut
    requirements: Optional[list] = []
    materials: Optional[list] = []
    volumes: Optional[list] = []
    # Alocare echipa si vehicul
    assigned_team_id: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None
    min_photos_required: Optional[int] = 2
    # Note acces — cod intrare, etaj, apartament (vizibil echipei, nu clientului)
    access_notes: Optional[str] = None
    # Preț Estimativ
    estimated_price: Optional[str] = None
    is_auto_calculated: Optional[bool] = None
    route_distance_km: Optional[float] = None

    @model_validator(mode='before')
    @classmethod
    def clean_empty_strings(cls, values):
        if isinstance(values, dict):
            for k, v in list(values.items()):
                if isinstance(v, str):
                    stripped = v.strip()
                    if stripped == "":
                        values[k] = None
                    else:
                        values[k] = stripped
        return values

class WorkOrderUpdate(WorkOrderCreate):
    title: Optional[str] = None
    status: Optional[str] = None


def _serialize(wo: WorkOrder) -> dict:
    """Serializează un WorkOrder pentru răspuns JSON."""
    site_name = None
    client_display = wo.client_name
    
    if wo.site:
        site_name = wo.site.name
    if wo.client and not client_display:
        client_display = wo.client.name

    return {
        "id": wo.id,
        "token": wo.token,
        "title": wo.title,
        "notes": wo.notes,
        "start_date": str(wo.start_date) if wo.start_date else None,
        "start_time": wo.start_time,
        "deadline_date": str(wo.deadline_date) if wo.deadline_date else None,
        "site_id": wo.site_id,
        "site_name": site_name,
        "site_address": wo.site_address or (wo.site.address if wo.site else None),
        # GPS coordonate santier
        "site_latitude": float(wo.site.latitude) if wo.site and wo.site.latitude else wo.site_latitude,
        "site_longitude": float(wo.site.longitude) if wo.site and wo.site.longitude else wo.site_longitude,
        "geo_radius": float(wo.site.geo_radius) if wo.site and wo.site.geo_radius else None,
        "client_id": wo.client_id,
        "client_name": client_display,
        "client_email": wo.client_email,
        "client_phone": wo.client_phone,
        "client_type": wo.client.client_type if wo.client else "juridica",
        "client_language": wo.client_language,
        "requirements": wo.requirements or [],
        "materials": wo.materials or [],
        "materials_consumed": wo.materials_consumed or [],
        "volumes": wo.volumes or [],
        "actual_surface_m2": wo.actual_surface_m2,
        "actual_sand_quantity": wo.actual_sand_quantity,
        "status": wo.status,
        "confirmed_at": wo.confirmed_at.isoformat() if wo.confirmed_at else None,
        "confirmed_by_name": wo.confirmed_by_name,
        "client_signature": wo.client_signature,
        "pdf_path": wo.pdf_path,
        "final_invoice_path": wo.final_invoice_path,
        "estimated_price": wo.estimated_price,
        # Facturare
        "is_invoiced": bool(wo.is_invoiced),
        "invoiced_at": wo.invoiced_at.isoformat() if wo.invoiced_at else None,
        "invoice_number": wo.invoice_number,
        "invoice_notes": wo.invoice_notes,
        "created_at": wo.created_at.isoformat() if wo.created_at else None,
        "updated_at": wo.updated_at.isoformat() if wo.updated_at else None,
        # Echipa si vehicul
        "assigned_team_id": wo.assigned_team_id,
        "assigned_team_name": wo.assigned_team.name if wo.assigned_team else None,
        "assigned_team_color": wo.assigned_team.color if wo.assigned_team else None,
        "assigned_vehicle_id": wo.assigned_vehicle_id,
        "assigned_vehicle_name": wo.assigned_vehicle.name if wo.assigned_vehicle else None,
        "assigned_vehicle_plate": wo.assigned_vehicle.plate_number if wo.assigned_vehicle else None,
        # Logistica si rutare
        "route_distance_km": wo.route_distance_km,
        "route_sand_kg": wo.route_sand_kg,
        "route_segments": wo.route_segments,
        # Workflow acceptare
        "team_leader_accepted_at": wo.team_leader_accepted_at.isoformat() if wo.team_leader_accepted_at else None,
        "team_leader_confirmed_at": wo.team_leader_confirmed_at.isoformat() if wo.team_leader_confirmed_at else None,
        "team_leader_confirmation_note": wo.team_leader_confirmation_note,
        # Poze obligatorii
        "min_photos_required": wo.min_photos_required,
        # GPS sosire/plecare
        "checkin_at": wo.checkin_at.isoformat() if wo.checkin_at else None,
        "checkout_at": wo.checkout_at.isoformat() if wo.checkout_at else None,
        # Note acces
        "access_notes": wo.access_notes,
        "documents": [
            {
                "id": str(d.id),
                "filename": d.filename,
                "file_path": d.file_path,
                "content_type": d.content_type,
                "file_size": d.file_size
            } for d in wo.documents
        ] if getattr(wo, "documents", None) else []
    }


# ──────────────────────────────────────────────────────────────────────────────
# LIST
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/work-orders")
def list_work_orders(
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Lista tuturor comenzilor de lucru ale organizației."""
    
    # --- AUTO-ARCHIVE LOGISTICS (Smart/Lazy Mode) ---
    if start_date and end_date:
        try:
            from app.api.admin_logistics import _calculate_daily_routes
            from app.models import LogisticsDailyPlan
            from datetime import timedelta, datetime
            
            start_d = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_d = datetime.strptime(end_date, "%Y-%m-%d").date()
            today = date_today_import.today()
            
            # Prevent abuse, max 31 days check
            if (end_d - start_d).days <= 31:
                curr = start_d
                while curr <= end_d and curr < today:
                    existing = db.query(LogisticsDailyPlan).filter(
                        LogisticsDailyPlan.organization_id == current_admin.organization_id,
                        LogisticsDailyPlan.date == curr
                    ).first()
                    if not existing:
                        data = _calculate_daily_routes(curr, db, current_admin)
                        plan = LogisticsDailyPlan(
                            organization_id=current_admin.organization_id,
                            date=curr,
                            snapshot_data=data,
                            saved_by_id=current_admin.id
                        )
                        db.add(plan)
                        db.commit()
                    curr += timedelta(days=1)
        except Exception as e:
            db.rollback()
            print(f"Error auto-archiving logistics in list_work_orders: {e}")
    # ------------------------------------------------
    
    q = db.query(WorkOrder).filter(WorkOrder.organization_id == current_admin.organization_id)
    q = q.options(
        joinedload(WorkOrder.site),
        joinedload(WorkOrder.client),
        joinedload(WorkOrder.assigned_team),
        joinedload(WorkOrder.assigned_vehicle)
    )
    if status:
        q = q.filter(WorkOrder.status == status)
    from sqlalchemy import or_
    from datetime import datetime
    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d").date()
            q = q.filter(or_(WorkOrder.start_date >= sd, WorkOrder.deadline_date >= sd))
        except ValueError:
            q = q.filter(or_(WorkOrder.start_date >= start_date, WorkOrder.deadline_date >= start_date))
    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d").date()
            q = q.filter(or_(WorkOrder.start_date <= ed, WorkOrder.deadline_date <= ed))
        except ValueError:
            q = q.filter(or_(WorkOrder.start_date <= end_date, WorkOrder.deadline_date <= end_date))

    q = q.order_by(WorkOrder.start_date.desc().nulls_last(), WorkOrder.created_at.desc())
    if limit:
        q = q.limit(limit)
    wos = q.all()
    return [_serialize(wo) for wo in wos]


# ──────────────────────────────────────────────────────────────────────────────
# CREATE
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/work-orders/sync-robaws")
def sync_work_orders_robaws(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Sincronizează manual comenzile din API-ul Robaws."""
    from app.services.robaws_scraper import run_all_scrapers
    try:
        run_all_scrapers()
        return {"ok": True, "message": "Sincronizarea cu Robaws s-a finalizat cu succes!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare sincronizare: {str(e)}")

@router.post("/work-orders")
def create_work_order(
    payload: WorkOrderCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Creează o comandă de lucru nouă în status draft."""
    # Dacă s-a selectat un client existent, preia datele lui
    client_name = payload.client_name
    client_email = payload.client_email
    client_phone = payload.client_phone

    client_id = payload.client_id
    cl = None
    if client_id:
        cl = db.query(Client).filter(
            Client.id == client_id,
            Client.organization_id == current_admin.organization_id
        ).first()
        if cl:
            client_name = client_name or cl.name
            client_email = client_email or cl.email
            client_phone = client_phone or cl.phone
    elif client_name:
        # Create client automatically
        cl = db.query(Client).filter(
            Client.name == client_name,
            Client.organization_id == current_admin.organization_id
        ).first()
        if not cl:
            cl = Client(
                organization_id=current_admin.organization_id,
                name=client_name,
                email=client_email,
                phone=client_phone,
                client_type=getattr(payload, 'client_type', 'fizica'),
                country=getattr(payload, 'client_country', 'RO'),
                contact_person=getattr(payload, 'client_contact_person', None),
                address=getattr(payload, 'client_address', None),
                preferred_language=getattr(payload, 'client_language', 'ro'),
                reg_com=getattr(payload, 'client_company_reg_number', None),
                cui=getattr(payload, 'client_company_vat', None),
                bank_name=getattr(payload, 'client_company_bank', None),
                iban=getattr(payload, 'client_company_iban', None),
                swift=getattr(payload, 'client_company_swift', None),
            )
            db.add(cl)
            db.commit()
            db.refresh(cl)
        client_id = cl.id

    site_address = payload.site_address
    site_latitude = getattr(payload, 'site_latitude', None)
    site_longitude = getattr(payload, 'site_longitude', None)
    
    if cl and not site_address:
        site_address = cl.address
        site_latitude = cl.latitude
        site_longitude = cl.longitude

    order_title = payload.title
    if not order_title:
        count = db.query(WorkOrder).filter(WorkOrder.organization_id == current_admin.organization_id).count()
        date_str = payload.start_date or datetime.now().strftime("%Y-%m-%d")
        try:
            from datetime import datetime
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            date_display = date_obj.strftime("%d.%m.%Y")
        except:
            date_display = date_str
        order_title = f"{count + 1} / {date_display}"

    wo = WorkOrder(
        organization_id=current_admin.organization_id,
        token=secrets.token_urlsafe(32),
        title=order_title,
        notes=payload.notes,
        start_date=payload.start_date,
        start_time=payload.start_time,
        deadline_date=payload.deadline_date,
        site_id=payload.site_id,
        site_address=site_address,
        site_latitude=site_latitude,
        site_longitude=site_longitude,
        client_id=client_id,
        client_name=client_name,
        client_email=client_email,
        client_phone=client_phone,
        client_language=getattr(payload, 'client_language', 'ro'),
        requirements=payload.requirements or [],
        materials=payload.materials or [],
        volumes=payload.volumes or [],
        assigned_team_id=payload.assigned_team_id,
        assigned_vehicle_id=payload.assigned_vehicle_id,
        min_photos_required=payload.min_photos_required or 2,
        access_notes=payload.access_notes,
        estimated_price=getattr(payload, 'estimated_price', None),
        status="draft",
        created_by=current_admin.id,
    )
    db.add(wo)
    
    if payload.materials:
        sync_work_order_reservations(db, current_admin.organization_id, [], payload.materials)
        
    # Recalculate Round Trip Route — wrapped in try/except so a geocode failure never blocks save
    try:
     if True:
        import math
        import requests
        from app.models import LogisticBase
        
        team = None
        if wo.assigned_team_id:
            team = db.query(Team).filter(Team.id == wo.assigned_team_id).first()
        base = None
        if team and team.base_id:
            base = db.query(LogisticBase).filter(LogisticBase.id == team.base_id).first()
        if not base:
            base = db.query(LogisticBase).filter(LogisticBase.organization_id == current_admin.organization_id).first()

        base_lat = 50.88243
        base_lng = 4.39343
        base_name = "H&H Resources Brussels"

        if base and base.latitude and base.longitude:
            base_name = base.name
            base_lat = base.latitude
            base_lng = base.longitude

        # Geocode if coordinates are missing but we have an address
        if (not wo.site_latitude or not wo.site_longitude) and wo.site_address:
            try:
                import requests
                import os
                api_key = os.getenv("GOOGLE_MAPS_API_KEY")
                if api_key:
                    res = requests.get(
                        "https://maps.googleapis.com/maps/api/geocode/json",
                        params={"address": wo.site_address, "key": api_key, "region": "ro"},
                        timeout=3
                    )
                    data = res.json()
                    if data.get("status") == "OK" and data.get("results"):
                        loc = data["results"][0]["geometry"]["location"]
                        wo.site_latitude = float(loc['lat'])
                        wo.site_longitude = float(loc['lng'])
            except Exception:
                pass

        if wo.site_latitude and wo.site_longitude and base_lat and base_lng:
            if getattr(payload, 'route_distance_km', None) is not None:
                dist_one_way = payload.route_distance_km / 2.0
                wo.route_distance_km = round(payload.route_distance_km, 2)
            else:
                def haversine(lat1, lon1, lat2, lon2):
                    R = 6371.0
                    phi1, phi2 = math.radians(lat1), math.radians(lat2)
                    dphi = math.radians(lat2 - lat1)
                    dlambda = math.radians(lon2 - lon1)
                    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
                    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                
                dist_one_way = haversine(base_lat, base_lng, wo.site_latitude, wo.site_longitude)
                wo.route_distance_km = round(dist_one_way * 2, 2)
            
            wo.route_segments = [
                {
                    "from": base_name,
                    "to": wo.site_address or wo.title,
                    "km": round(dist_one_way, 2),
                    "from_lat": base_lat,
                    "from_lng": base_lng
                },
                {
                    "from": wo.site_address or wo.title,
                    "to": base_name,
                    "km": round(dist_one_way, 2),
                    "from_lat": wo.site_latitude,
                    "from_lng": wo.site_longitude
                }
            ]
        elif base_lat and base_lng:
            # Fallback so frontend MapView knows where the base is and can draw the route
            wo.route_segments = [
                {
                    "from": base_name,
                    "to": wo.site_address or wo.title,
                    "km": 0,
                    "from_lat": base_lat,
                    "from_lng": base_lng
                }
            ]

    except Exception as _route_err:
        print(f"Route calc warning (non-fatal): {_route_err}")

    db.commit()
    db.refresh(wo)
    return _serialize(wo)


# ──────────────────────────────────────────────────────────────────────────────
# GET ONE
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/work-orders/{wo_id}")
def get_work_order(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
    return _serialize(wo)


# ──────────────────────────────────────────────────────────────────────────────
# UPDATE
# ──────────────────────────────────────────────────────────────────────────────
@router.put("/work-orders/{wo_id}")
def update_work_order(
    wo_id: str,
    payload: WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
    # Admins can edit orders regardless of status
    old_materials = list(wo.materials) if wo.materials else []

    fields = [
        "title", "notes", "start_date", "start_time", "deadline_date",
        "site_id", "site_address", "site_latitude", "site_longitude", "client_id", "client_name",
        "client_email", "client_phone", "client_language", "requirements", "materials", "volumes",
        "assigned_team_id", "assigned_vehicle_id", "min_photos_required", "access_notes",
        "estimated_price", "status"
    ]
    
    update_data = payload.dict(exclude_unset=True)
    for f in fields:
        if f in update_data:
            setattr(wo, f, update_data[f])

    new_materials = wo.materials or []
    if wo.status not in ("completed", "cancelled") and old_materials != new_materials:
        sync_work_order_reservations(db, current_admin.organization_id, old_materials, new_materials)

    # Dacă s-a schimbat client_id, actualizează datele
    if wo.client_id:
        cl = db.query(Client).filter(
            Client.id == wo.client_id,
            Client.organization_id == current_admin.organization_id
        ).first()
        if cl:
            wo.client_name = wo.client_name or cl.name
            wo.client_email = wo.client_email or cl.email
            wo.client_phone = wo.client_phone or cl.phone
    elif wo.client_name:
        # Create client automatically if missing
        cl = db.query(Client).filter(
            Client.name == wo.client_name,
            Client.organization_id == current_admin.organization_id
        ).first()
        if not cl:
            cl = Client(
                organization_id=current_admin.organization_id,
                name=wo.client_name,
                email=wo.client_email,
                phone=wo.client_phone,
                client_type=getattr(payload, 'client_type', 'fizica'),
                country=getattr(payload, 'client_country', 'RO'),
                contact_person=getattr(payload, 'client_contact_person', None),
                address=getattr(payload, 'client_address', None),
                preferred_language=getattr(payload, 'client_language', 'ro'),
                reg_com=getattr(payload, 'client_company_reg_number', None),
                cui=getattr(payload, 'client_company_vat', None),
                bank_name=getattr(payload, 'client_company_bank', None),
                iban=getattr(payload, 'client_company_iban', None),
                swift=getattr(payload, 'client_company_swift', None),
            )
            db.add(cl)
            db.commit()
            db.refresh(cl)
        wo.client_id = cl.id

    # Recalculate Round Trip Route — wrapped so geocode failure never blocks save
    try:
     if True:
        import math
        import requests
        from app.models import LogisticBase
        
        team = None
        if wo.assigned_team_id:
            team = db.query(Team).filter(Team.id == wo.assigned_team_id).first()
            
        base = None
        if team and team.base_id:
            base = db.query(LogisticBase).filter(LogisticBase.id == team.base_id).first()
        if not base:
            base = db.query(LogisticBase).filter(LogisticBase.organization_id == current_admin.organization_id).first()

        base_lat = None
        base_lng = None
        base_name = "Baza Principala"

        if base and base.latitude and base.longitude:
            base_name = base.name
            base_lat = base.latitude
            base_lng = base.longitude

        # Geocode if coordinates are missing but we have an address
        if (not wo.site_latitude or not wo.site_longitude) and wo.site_address:
            try:
                import requests
                import os
                api_key = os.getenv("GOOGLE_MAPS_API_KEY")
                if api_key:
                    res = requests.get(
                        "https://maps.googleapis.com/maps/api/geocode/json",
                        params={"address": wo.site_address, "key": api_key, "region": "ro"},
                        timeout=3
                    )
                    data = res.json()
                    if data.get("status") == "OK" and data.get("results"):
                        loc = data["results"][0]["geometry"]["location"]
                        wo.site_latitude = float(loc['lat'])
                        wo.site_longitude = float(loc['lng'])
            except Exception:
                pass

        if wo.site_latitude and wo.site_longitude and base_lat and base_lng:
            if getattr(payload, 'route_distance_km', None) is not None:
                dist_one_way = payload.route_distance_km / 2.0
                wo.route_distance_km = round(payload.route_distance_km, 2)
            else:
                def haversine(lat1, lon1, lat2, lon2):
                    R = 6371.0
                    phi1, phi2 = math.radians(lat1), math.radians(lat2)
                    dphi = math.radians(lat2 - lat1)
                    dlambda = math.radians(lon2 - lon1)
                    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
                    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                
                dist_one_way = haversine(base_lat, base_lng, wo.site_latitude, wo.site_longitude)
                wo.route_distance_km = round(dist_one_way * 2, 2)
            
            wo.route_segments = [
                {
                    "from": base_name,
                    "to": wo.site_address or wo.title,
                    "km": round(dist_one_way, 2),
                    "from_lat": base_lat,
                    "from_lng": base_lng
                },
                {
                    "from": wo.site_address or wo.title,
                    "to": base_name,
                    "km": round(dist_one_way, 2),
                    "from_lat": wo.site_latitude,
                    "from_lng": wo.site_longitude
                }
            ]

    except Exception as _route_err:
        print(f"Route calc warning (non-fatal): {_route_err}")

    db.commit()
    db.refresh(wo)
    return _serialize(wo)


# ──────────────────────────────────────────────────────────────────────────────
# DELETE
# ──────────────────────────────────────────────────────────────────────────────
@router.delete("/work-orders/{wo_id}")
def delete_work_order(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
        
    if wo.status == "draft":
        sync_work_order_reservations(db, current_admin.organization_id, wo.materials or [], [])
        
    db.delete(wo)
    db.commit()
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# PHOTOS — Upload poze instructiuni (admin) si vizualizare
# ──────────────────────────────────────────────────────────────────────────────

PHOTO_UPLOAD_DIR = "uploads/work_order_photos"
os.makedirs(PHOTO_UPLOAD_DIR, exist_ok=True)


@router.post("/work-orders/{wo_id}/photos")
async def upload_instruction_photo(
    wo_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Adminul uploadaza poze cu instructiuni la comanda (cod intrare, detalii acces).
    Aceste poze sunt INTERNE — vazute de echipa, NU merg la clientul final.
    """
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Doar imagini JPG, PNG sau WebP.")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fisier prea mare. Maxim 20MB.")

    ext = os.path.splitext(file.filename or "photo.jpg")[1].lower() or ".jpg"
    safe_filename = f"{uuid.uuid4().hex[:8]}{ext}"
    storage_path = f"work_orders/{wo_id}/{safe_filename}"

    try:
        from app.storage import upload_file, get_content_type
        file_url = upload_file(content, storage_path, get_content_type(safe_filename))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare upload: {str(e)}")

    photo = WorkOrderPhoto(
        id=str(uuid.uuid4()),
        work_order_id=wo_id,
        uploaded_by_id=None,  # admin (nu user)
        photo_path=storage_path,
        description=description,
        file_size=len(content),
        photo_type="instruction"
    )
    db.add(photo)
    db.commit()

    return {
        "photo_id": photo.id,
        "photo_url": file_url,
        "photo_type": "instruction",
        "message": "Poza de instructiuni adaugata cu succes."
    }


@router.get("/work-orders/{wo_id}/photos")
def list_work_order_photos(
    wo_id: str,
    photo_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Lista pozelor unei comenzi. Adminul vede toate tipurile."""
    from app.storage import get_file_url
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    q = db.query(WorkOrderPhoto).filter(WorkOrderPhoto.work_order_id == wo_id)
    if photo_type:
        q = q.filter(WorkOrderPhoto.photo_type == photo_type)
    photos = q.order_by(WorkOrderPhoto.uploaded_at.asc()).all()

    return [{
        "id": p.id,
        "url": get_file_url(p.photo_path),
        "description": p.description,
        "photo_type": p.photo_type,
        "uploaded_at": p.uploaded_at.isoformat(),
        "uploaded_by_id": p.uploaded_by_id
    } for p in photos]


@router.delete("/work-orders/{wo_id}/photos/{photo_id}")
def delete_instruction_photo(
    wo_id: str,
    photo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Sterge o poza de instructiuni (admin poate sterge orice tip)."""
    from app.storage import delete_file
    photo = db.query(WorkOrderPhoto).filter(
        WorkOrderPhoto.id == photo_id,
        WorkOrderPhoto.work_order_id == wo_id
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Poza nu a fost gasita.")
    # Sterge fisierul
    try:
        delete_file(photo.photo_path)
    except Exception:
        pass
    db.delete(photo)
    db.commit()
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# SEND — schimbă status în "sent"
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/work-orders/{wo_id}/send")
def send_work_order(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Marchează comanda ca trimisă. Returneaza link-ul public."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
    if wo.status not in ["draft", "sent", "completed"]:
        raise HTTPException(status_code=400, detail="Doar comenzile noi sau finalizate pot fi trimise la client.")
    
    if wo.status == "draft":
        wo.status = "sent"
        db.commit()
        db.refresh(wo)

    # Construiește link-ul public
    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    if org and org.slug:
        base_url = f"https://{org.slug}.pontaj.app"
    else:
        base_url = "http://localhost:5678"
    
    confirm_url = f"{base_url}/confirm/{wo.token}"
    
    return {**_serialize(wo), "confirm_url": confirm_url}


# ──────────────────────────────────────────────────────────────────────────────
# FINAL INVOICE UPLOAD
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/work-orders/{wo_id}/final-invoice")
async def upload_final_invoice(
    wo_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Upload factura finala pentru comanda."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    if file.content_type not in ["application/pdf", "image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Doar PDF, JPG sau PNG sunt permise.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fisierul este prea mare. Maxim 10MB.")

    ext = os.path.splitext(file.filename or "invoice.pdf")[1].lower() or ".pdf"
    safe_filename = f"final_invoice_{uuid.uuid4().hex[:8]}{ext}"
    storage_path = f"work_orders/{wo_id}/{safe_filename}"

    try:
        from app.storage import upload_file, get_content_type
        file_url = upload_file(content, storage_path, get_content_type(safe_filename))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare upload: {str(e)}")

    # Update WorkOrder — auto-mark as invoiced on PDF upload
    wo.final_invoice_path = storage_path
    if not wo.is_invoiced:
        wo.is_invoiced = True
        wo.invoiced_at = datetime.utcnow()
    db.commit()
    db.refresh(wo)

    return _serialize(wo)


# ──────────────────────────────────────────────────────────────────────────────
# INVOICE STATUS — marcare manuală facturat/nefacturat
# ──────────────────────────────────────────────────────────────────────────────
class InvoiceStatusUpdate(BaseModel):
    is_invoiced: bool
    invoice_number: Optional[str] = None
    invoice_notes: Optional[str] = None

@router.patch("/work-orders/{wo_id}/invoice-status")
def update_invoice_status(
    wo_id: str,
    payload: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Marchează manual o comandă ca facturată sau nefacturată."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")

    wo.is_invoiced = payload.is_invoiced
    wo.invoiced_at = datetime.utcnow() if payload.is_invoiced and not wo.invoiced_at else (None if not payload.is_invoiced else wo.invoiced_at)
    if payload.invoice_number is not None:
        wo.invoice_number = payload.invoice_number or None
    if payload.invoice_notes is not None:
        wo.invoice_notes = payload.invoice_notes or None

    db.commit()
    db.refresh(wo)
    return _serialize(wo)


@router.post("/work-orders/{wo_id}/status")
def change_status(
    wo_id: str,
    request: dict,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Schimbă manual statusul comenzii (in_progress, completed, cancelled)."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
    
    allowed = ["draft", "sent", "in_progress", "completed", "cancelled"]
    new_status = request.get("status")
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status invalid. Permise: {allowed}")
    
    old_status = wo.status
    wo.status = new_status
    
    if old_status not in ("completed", "cancelled") and new_status == "completed":
        consume_work_order_materials(db, current_admin.organization_id, wo.materials or [], wo.title, current_admin.id)
    elif old_status not in ("completed", "cancelled") and new_status == "cancelled":
        sync_work_order_reservations(db, current_admin.organization_id, wo.materials or [], [])
    elif old_status == "cancelled" and new_status not in ("completed", "cancelled"):
        sync_work_order_reservations(db, current_admin.organization_id, [], wo.materials or [])
        
    db.commit()
    db.refresh(wo)
    return _serialize(wo)


# ──────────────────────────────────────────────────────────────────────────────
# GET PUBLIC LINK
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/work-orders/{wo_id}/link")
def get_public_link(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Returnează link-ul public al comenzii."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")

    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    if org and org.slug:
        base_url = f"https://{org.slug}.pontaj.app"
    else:
        base_url = "http://localhost:5678"

    return {"confirm_url": f"{base_url}/confirm/{wo.token}", "token": wo.token}


# ──────────────────────────────────────────────────────────────────────────────
# GET SESSIONS (Pontaj) — ore lucrate pe această comandă
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/work-orders/{wo_id}/sessions")
def get_work_order_sessions(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Returnează sesiunile de pontaj legate de o comandă de lucru, cu totalul de ore."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")

    segments = db.query(TimesheetSegment).filter(
        TimesheetSegment.work_order_id == wo_id
    ).order_by(TimesheetSegment.check_in_time.desc()).all()

    total_hours = 0.0
    result = []
    for seg in segments:
        if seg.check_out_time:
            h = (seg.check_out_time - seg.check_in_time).total_seconds() / 3600
            # scade pauzele
            if seg.break_start_time and seg.break_end_time:
                h -= (seg.break_end_time - seg.break_start_time).total_seconds() / 3600
            h = max(0.0, h)
        else:
            h = 0.0  # sesiune activă, fără checkout

        ts = db.query(Timesheet).filter(Timesheet.id == seg.timesheet_id).first()
        user = db.query(User).filter(User.id == ts.owner_user_id).first() if ts else None

        total_hours += h
        result.append({
            "segment_id": seg.id,
            "user_name": user.full_name if user else "Necunoscut",
            "date": str(ts.date) if ts else None,
            "check_in": seg.check_in_time.isoformat() if seg.check_in_time else None,
            "check_out": seg.check_out_time.isoformat() if seg.check_out_time else None,
            "hours": round(h, 2),
            "active": seg.check_out_time is None,
        })

    return {
        "work_order_id": wo_id,
        "total_hours": round(total_hours, 2),
        "sessions_count": len(result),
        "sessions": result,
    }


# ──────────────────────────────────────────────────────────────────────────────
# PATCH MATERIALS CONSUMED
# ──────────────────────────────────────────────────────────────────────────────
class MaterialsConsumedPayload(BaseModel):
    materials_consumed: list  # [{name, quantity, unit, note}]

@router.patch("/work-orders/{wo_id}/materials-consumed")
def update_materials_consumed(
    wo_id: str,
    payload: MaterialsConsumedPayload,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Salvează lista de materiale consumate pe o comandă de lucru.
    Scade automat cantitățile din magazie și creează tranzacții OUT."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")

    # Curăță și validează intrările
    cleaned = [
        {
            "name": str(m.get("name", "")).strip(),
            "quantity": str(m.get("quantity", "")).strip(),
            "unit": str(m.get("unit", "")).strip(),
            "note": str(m.get("note", "")).strip(),
        }
        for m in payload.materials_consumed
        if str(m.get("name", "")).strip()
    ]

    # ── Scade din magazie + creează tranzacții OUT ──────────────────────────
    deducted_items = []
    for mat in cleaned:
        name = mat["name"]
        try:
            qty = float(mat["quantity"]) if mat["quantity"] else 0.0
        except (ValueError, TypeError):
            qty = 0.0
        
        if qty <= 0:
            continue

        # Cauta articolul in magazie dupa nume (case-insensitive)
        item = db.query(WarehouseItem).filter(
            WarehouseItem.organization_id == current_admin.organization_id,
            WarehouseItem.name.ilike(name)
        ).first()

        if item:
            # Scade stocul (nu sub 0)
            item.total_quantity = max(0.0, (item.total_quantity or 0.0) - qty)
            item.updated_at = datetime.utcnow()

            # Creează tranzacție OUT
            tx = WarehouseTransaction(
                id=str(uuid.uuid4()),
                item_id=item.id,
                transaction_type="OUT",
                quantity=qty,
                date=date_today_import.today(),
                operated_by_id=current_admin.id,
                site_id=wo.site_id if wo.site_id else None,
                notes=f"Consumat pe comanda: {wo.title} (#{wo_id[:8]})",
            )
            db.add(tx)
            deducted_items.append({"name": name, "qty": qty, "item_id": item.id})

    wo.materials_consumed = cleaned
    wo.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(wo)
    return {
        "materials_consumed": wo.materials_consumed or [],
        "deducted_from_stock": deducted_items
    }


# ─── ISTORIC ISOFLEX — fetch direct din Robaws API, fără import în DB ──────────

@router.get("/work-orders/robaws-history")
def get_robaws_history(
    team_id: Optional[str] = None,
    page: int = 0,
    limit: int = 50,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Returnează lucrările direct din API-ul Robaws pentru echipele organizației.
    Nu salvează nimic în baza de date locală.
    """
    import requests as _req

    org_id = current_admin.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    # Preluăm echipele cu chei Robaws
    teams_query = db.query(Team).filter(
        Team.organization_id == org_id,
        Team.is_active == True,
        Team.robaws_email != None,
        Team.robaws_email != ""
    )
    if team_id:
        teams_query = teams_query.filter(Team.id == team_id)

    teams_list = teams_query.all()

    all_items = []
    teams_meta = []

    for team in teams_list:
        api_key = team.robaws_email
        api_secret = team.robaws_password
        if not api_key or not api_secret:
            continue

        try:
            offset = page * limit
            url = f"https://app.robaws.com/api/v2/work-orders?limit={limit}&offset={offset}&include=lineItems"
            r = _req.get(
                url,
                auth=(api_key, api_secret),
                headers={"Accept": "application/json"},
                timeout=15
            )
            if r.status_code != 200:
                teams_meta.append({
                    "team_id": str(team.id),
                    "team_name": team.name,
                    "error": f"HTTP {r.status_code}",
                    "total": 0
                })
                continue

            data = r.json()
            total_items = data.get("totalItems", 0)
            total_pages = data.get("totalPages", 1)
            items = data.get("items", [])

            for item in items:
                # Extrage adresa
                addr_obj = item.get("address") or {}
                addr_parts = []
                if addr_obj.get("addressLine1"): addr_parts.append(addr_obj["addressLine1"])
                if addr_obj.get("postalCode"):   addr_parts.append(addr_obj["postalCode"])
                if addr_obj.get("city"):         addr_parts.append(addr_obj["city"])
                address = ", ".join(addr_parts)

                # Extrage client
                client_obj = item.get("client") or {}
                client_name = client_obj.get("name", "") if isinstance(client_obj, dict) else ""

                # Extrage line items
                line_items = item.get("lineItems", [])
                total_volume = 0.0
                materials_found = []
                for li in line_items:
                    qty = float(li.get("quantity") or 0)
                    unit = (li.get("unitType") or "").lower()
                    desc = (li.get("description") or "")
                    if unit in ["m2", "m²", "m3", "m³"]:
                        total_volume += qty
                    if desc:
                        materials_found.append(f"{desc} ({qty} {unit})" if qty else desc)

                # Verifică dacă există deja în DB
                ext_id = str(item.get("id", ""))
                in_db = db.query(WorkOrder.id).filter(
                    WorkOrder.external_id == ext_id,
                    WorkOrder.organization_id == org_id
                ).first() is not None

                all_items.append({
                    "ext_id": ext_id,
                    "robaws_nr": item.get("number") or item.get("id"),
                    "title": item.get("title", ""),
                    "date": item.get("date"),
                    "client_name": client_name,
                    "address": address,
                    "status": item.get("status", ""),
                    "total_volume": round(total_volume, 2),
                    "materials_summary": "; ".join(materials_found[:3]),
                    "assignee": item.get("assignee", {}).get("name", "") if isinstance(item.get("assignee"), dict) else "",
                    "team_id": str(team.id),
                    "team_name": team.name,
                    "in_db": in_db,
                    "raw": {
                        "latitude": addr_obj.get("latitude"),
                        "longitude": addr_obj.get("longitude"),
                        "notes": item.get("description") or item.get("notes") or "",
                    }
                })

            teams_meta.append({
                "team_id": str(team.id),
                "team_name": team.name,
                "total": total_items,
                "total_pages": total_pages,
                "fetched": len(items)
            })

        except Exception as e:
            teams_meta.append({
                "team_id": str(team.id),
                "team_name": team.name,
                "error": str(e),
                "total": 0
            })

    # Sortare după dată descrescător
    all_items.sort(key=lambda x: x.get("date") or "", reverse=True)

    return {
        "items": all_items,
        "teams": teams_meta,
        "page": page,
        "limit": limit,
    }

"""
admin_work_orders.py — API pentru Comenzi de Lucru (Work Orders) B2B
Acces protejat — doar adminii autentificați ai organizației pot opera.
"""

import secrets
import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, Body, Query, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel, model_validator
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, desc, func
import re

from app.database import get_db
from app.models import WorkOrder, WorkOrderAcknowledgement, WorkOrderCheckin, WorkOrderPhoto, WorkOrderMessage, Organization, ConstructionSite, Client, Admin, TimesheetSegment, Timesheet, User, Team, Vehicle, WarehouseItem, WarehouseTransaction, PricingSetting
from app.api.admin_auth import get_current_admin
from app.services.billtobox import send_invoice_to_billtobox
from app.services.pdf_generator import generate_invoice_pdf
from app.storage import get_file_url
from datetime import date as date_today_import
from sqlalchemy import func
from app.services.audit_service import log_audit

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
    is_quote: Optional[bool] = False
    work_type: Optional[str] = "new"
    use_vat: Optional[bool] = True
    
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
    route_segments: Optional[list] = None
    # Devis / Quote
    is_quote: Optional[bool] = False
    approximate_date: Optional[str] = None
    prices: Optional[dict] = {}

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
    proforma_data: Optional[dict] = None
    send_notification: bool = False


def _serialize_slim(wo: WorkOrder) -> dict:
    """Versiune ultra-rapidă pentru planning — fără calcul preț, documente sau poze."""
    site_name = wo.site.name if wo.site else None
    client_display = wo.client_name or (wo.client.name if wo.client else None)
    return {
        "id": wo.id,
        "token": wo.token,
        "title": wo.title,
        "start_date": str(wo.start_date) if wo.start_date else None,
        "start_time": wo.start_time,
        "deadline_date": str(wo.deadline_date) if wo.deadline_date else None,
        "is_quote": bool(wo.is_quote),
        "approximate_date": wo.approximate_date,
        "status": wo.status,
        "source_system": wo.source_system,
        "site_id": wo.site_id,
        "site_name": site_name,
        "site_address": wo.site_address or (wo.site.address if wo.site else None),
        "site_latitude": float(wo.site.latitude) if wo.site and wo.site.latitude else wo.site_latitude,
        "site_longitude": float(wo.site.longitude) if wo.site and wo.site.longitude else wo.site_longitude,
        "client_id": wo.client_id,
        "client_name": client_display,
        "client_email": wo.client_email,
        "client_phone": wo.client_phone,
        "client_type": wo.client.client_type if wo.client else "juridica",
        "volumes": wo.volumes or [],
        "assigned_team_id": wo.assigned_team_id,
        "assigned_team_name": wo.assigned_team.name if wo.assigned_team else None,
        "assigned_team_color": wo.assigned_team.color if wo.assigned_team else None,
        "assigned_vehicle_id": wo.assigned_vehicle_id,
        "assigned_vehicle_name": wo.assigned_vehicle.name if wo.assigned_vehicle else None,
        "surface_area": getattr(wo, "surface_area", 0),
        "surface_m2": getattr(wo, "surface_m2", 0),
        "thickness": getattr(wo, "thickness", 0),
        "thickness_cm": getattr(wo, "thickness_cm", 0),
        "is_invoiced": bool(wo.is_invoiced),
        "quote_number": wo.quote_number,
        "invoice_number": wo.invoice_number,
        "estimated_price": wo.estimated_price,
        "computed_total": None,  # nu se calculeaza in slim mode
        "documents": [],
        "photos": [],
        "proforma_data": wo.proforma_data,
        "prices": wo.prices or {},
        "distance_km": (wo.prices or {}).get("distance_km") if isinstance(wo.prices, dict) else None,
        "route_distance_km": wo.route_distance_km,
        "created_at": str(wo.created_at) if wo.created_at else None,
        "route_segments": wo.route_segments,
        "route_sand_kg": wo.route_sand_kg,
        "access_notes": wo.access_notes,
        "min_photos_required": wo.min_photos_required,
        "checkin_at": wo.checkin_at.isoformat() if wo.checkin_at else None,
        "checkout_at": wo.checkout_at.isoformat() if wo.checkout_at else None,
        "created_at": wo.created_at.isoformat() if wo.created_at else None,
        "updated_at": wo.updated_at.isoformat() if wo.updated_at else None,
        "read_by_admins": wo.read_by_admins or [],
    }


def _serialize_invoice_mode(wo: WorkOrder) -> dict:
    """Versiune optimizată pentru pagina de facturare — include proforma_data și date client, exclude poze, documente, etc."""
    site_name = wo.site.name if wo.site else None
    client_display = wo.client_name or (wo.client.name if wo.client else None)
    return {
        "id": wo.id,
        "token": wo.token,
        "title": wo.title,
        "work_type": wo.work_type,
        "start_date": str(wo.start_date) if wo.start_date else None,
        "start_time": wo.start_time,
        "is_quote": bool(wo.is_quote),
        "status": wo.status,
        "source_system": wo.source_system,
        "site_address": wo.site_address or (wo.site.address if wo.site else None),
        "client_id": wo.client_id,
        "client_name": client_display,
        "client_email": wo.client_email or (wo.client.email if wo.client else None),
        "client_phone": wo.client_phone or (wo.client.phone if wo.client else None),
        "client_type": wo.client.client_type if wo.client else "juridica",
        "client_company_reg_number": wo.client.company_reg_number if wo.client else None,
        "client_company_vat": wo.client.company_vat if wo.client else None,
        "client_address": wo.client.address if wo.client else wo.client_address,
        "volumes": wo.volumes or [],
        "has_foil": wo.has_foil,
        "actual_has_foil": wo.actual_has_foil,
        "has_mesh": wo.has_mesh,
        "actual_has_mesh": wo.actual_has_mesh,
        "has_fiber": wo.has_fiber,
        "actual_has_fiber": wo.actual_has_fiber,
        "surface_m2": wo.surface_m2,
        "actual_surface_m2": wo.actual_surface_m2,
        "thickness_cm": wo.thickness_cm,
        "actual_thickness_cm": wo.actual_thickness_cm,
        "is_invoiced": bool(wo.is_invoiced),
        "quote_number": wo.quote_number,
        "invoice_number": wo.invoice_number,
        "estimated_price": wo.estimated_price,
        "computed_total": None,
        "documents": [],
        "photos": [],
        "proforma_data": wo.proforma_data,
        "prices": wo.prices or {},
        "created_at": wo.created_at.isoformat() if wo.created_at else None,
        "updated_at": wo.updated_at.isoformat() if wo.updated_at else None,
        "read_by_admins": wo.read_by_admins or [],
    }


def _serialize(wo: WorkOrder, db: Session = None, force_recalc: bool = False) -> dict:
    """Serializează un WorkOrder pentru răspuns JSON."""
    # ── CACHE FAST-PATH: lucrările mai vechi decât azi se servesc din snapshot ──
    from datetime import date as _date
    _today = _date.today()
    _is_past = wo.start_date is not None and wo.start_date < _today
    if not force_recalc and _is_past and getattr(wo, 'cached_snapshot', None):
        return wo.cached_snapshot
    # ─────────────────────────────────────────────────────────────────────────────

    # Incarca pricing live din setari
    wo_prices = dict(wo.prices or {})
    if db is not None:
        pricing = db.query(PricingSetting).filter(
            PricingSetting.organization_id == wo.organization_id,
            PricingSetting.client_id == (wo.client_id if wo.client else None)
        ).first()
        if not pricing:
            pricing = db.query(PricingSetting).filter(
                PricingSetting.organization_id == wo.organization_id,
                PricingSetting.client_id == None
            ).first()
            
        if pricing:
            # Daca comanda NU este facturata si nu are pret fix (e adaugata manual, nu online)
            # folosim tarifele 'live' curente. (Comenzile online au deja 'base' salvat la creare).
            if not wo.is_invoiced:
                if 'base' not in wo_prices and pricing.base_price_sqm is not None: wo_prices['base'] = float(pricing.base_price_sqm)
                if 'extra' not in wo_prices and pricing.extra_thickness_price_per_cm is not None: wo_prices['extra'] = float(pricing.extra_thickness_price_per_cm)
                if 'extra_large' not in wo_prices and getattr(pricing, 'extra_thickness_price_per_cm_large', None) is not None: 
                    wo_prices['extra_large'] = float(pricing.extra_thickness_price_per_cm_large)
                if 'extra_threshold' not in wo_prices and getattr(pricing, 'extra_thickness_large_threshold_sqm', None) is not None: 
                    wo_prices['extra_threshold'] = float(pricing.extra_thickness_large_threshold_sqm)
                if 'standard_thickness' not in wo_prices and pricing.standard_thickness_cm is not None: wo_prices['standard_thickness'] = float(pricing.standard_thickness_cm)
                if 'foil' not in wo_prices and pricing.plastic_foil_price_sqm is not None: wo_prices['foil'] = float(pricing.plastic_foil_price_sqm)
                if 'mesh' not in wo_prices and pricing.metal_mesh_price_sqm is not None: wo_prices['mesh'] = float(pricing.metal_mesh_price_sqm)
                if 'fiber' not in wo_prices and pricing.fiber_price_sqm is not None: wo_prices['fiber'] = float(pricing.fiber_price_sqm)
            
            # Adaugam restul setarilor (TVA, praguri) daca lipsesc
            if 'surface_thresholds' not in wo_prices and pricing.surface_thresholds:
                wo_prices['surface_thresholds'] = pricing.surface_thresholds
            if 'vat_legal_entity' not in wo_prices:
                wo_prices['vat_legal_entity'] = pricing.vat_legal_entity
            if 'vat_physical_new' not in wo_prices:
                wo_prices['vat_physical_new'] = pricing.vat_physical_new
            if 'vat_physical_repair' not in wo_prices:
                wo_prices['vat_physical_repair'] = pricing.vat_physical_repair
    site_name = None
    client_display = wo.client_name
    
    if wo.site:
        site_name = wo.site.name
    if wo.client and not client_display:
        client_display = wo.client.name

    # ── Calculul prețului afișat în tabel ── identic cu DevisView.buildItems() ──
    # Prioritate: proforma_data.items → volumes → estimated_price
    computed_total = None
    try:
        p = wo_prices  # conține prețurile + surface_thresholds
        items_calc = []

        # 1) proforma_data.items (prexuri custom din pagina de tarife)
        pdata = wo.proforma_data or {}
        p_items = pdata.get('items', []) if isinstance(pdata, dict) else []
        if p_items:
            d0 = str(p_items[0].get('desc', '')).lower()
            import unicodedata, re as _re
            d0n = _re.sub(r'[\u0300-\u036f]', '', unicodedata.normalize('NFD', d0)).strip()
            is_placeholder = (
                len(p_items) == 1 and (
                    p_items[0].get('id') == 'default' or
                    'conform deviz' in d0n or
                    'manoper' in d0n or
                    d0n in ('chape', 'sapa') or
                    bool(_re.search(r'sapa|chape', d0n))
                )
            )
            if not is_placeholder:
                items_calc = [
                    {'qty': float(i.get('qty', 1)), 'price': float(i.get('price', 0))}
                    for i in p_items
                ]

        # 2) Fallback: calcul din volumes
        if not items_calc:
            import re as _re2
            import unicodedata as _ud2
            volumes = wo.volumes or []
            for vol in volumes:
                lbl = vol.get('label', '') or ''
                lbl_n = _re2.sub(r'[\u0300-\u036f]', '', _ud2.normalize('NFD', lbl)).lower()
                is_chape = (
                    bool(_re2.search(r'[sșş]ap[aăâ]', lbl, _re2.IGNORECASE)) or
                    bool(_re2.search(r'chape', lbl, _re2.IGNORECASE)) or
                    'sapa' in lbl_n
                )
                surface = float(vol.get('quantity') or 0)
                thick   = float(vol.get('thickness') or 0)
                if surface <= 0:
                    continue
                if is_chape:
                    std_thick  = float(p.get('standard_thickness') or 5)
                    extra_thick = max(0.0, thick - std_thick)
                    items_calc.append({'qty': surface, 'price': float(p.get('base') or 12.5)})
                    if extra_thick > 0:
                        extra_thresh = float(p.get('extra_threshold') or 200)
                        extra_price = float(p.get('extra_large') or p.get('extra') or 1.25) if surface > extra_thresh else float(p.get('extra') or 1.25)
                        items_calc.append({'qty': surface, 'price': extra_thick * extra_price})
                    if vol.get('has_foil'):
                        items_calc.append({'qty': surface, 'price': float(p.get('foil') or 1.2)})
                    if vol.get('has_mesh'):
                        items_calc.append({'qty': surface, 'price': float(p.get('mesh') or 2.5)})
                    if vol.get('has_fiber') or vol.get('has_duramint'):
                        items_calc.append({'qty': surface, 'price': float(p.get('fiber') or (2.5 if surface <= 200 else 2.0))})
                else:
                    unit_price = float(vol.get('price') or 0)
                    if unit_price > 0:
                        items_calc.append({'qty': surface, 'price': unit_price})

        # Surface thresholds
        if items_calc and p.get('surface_thresholds'):
            surf_check = float((wo.volumes or [{}])[0].get('quantity') or getattr(wo, 'surface_m2', 0) or 0)
            for thresh in (p.get('surface_thresholds') or []):
                min_s = float(thresh.get('min_sqm') or 0)
                max_s = float(thresh.get('max_sqm') or 999999)
                if min_s <= surf_check <= max_s:
                    charge = float(thresh.get('extra_charge') or 0)
                    if charge > 0:
                        items_calc.append({'qty': 1, 'price': charge})


        if items_calc:
            net_total = sum(i['qty'] * i['price'] for i in items_calc)
            net_after_discount = net_total - float(p.get('discount') or 0)

            # TVA — prioritate identică cu ProformaView.jsx:
            # 1. proforma_data.vatRate  (cel mai specific — setat pe deviz)
            # 2. wo.prices.vat_type     (override per deviz)
            # 3. tarife: vat_legal_entity / vat_physical_repair / vat_physical_new (pagina tarife)
            vat_rate = 0.0
            use_vat = (pdata.get('useVat', True) if isinstance(pdata, dict) else True)
            if use_vat is not False:
                if isinstance(pdata, dict) and pdata.get('vatRate') is not None:
                    vat_rate = float(pdata['vatRate'])
                elif p.get('vat_type') is not None:
                    vat_rate = float(p['vat_type'])
                else:
                    _client_type = (
                        (wo.client.client_type if wo.client else None) or
                        getattr(wo, 'client_type', None) or 'fizica'
                    )
                    _work_type = getattr(wo, 'work_type', None) or 'new'
                    if _client_type in ('pj', 'juridica'):
                        vat_rate = float(p.get('vat_legal_entity') or 0)
                    elif _work_type == 'repair':
                        vat_rate = float(p.get('vat_physical_repair') or 6)
                    else:
                        vat_rate = float(p.get('vat_physical_new') or 21)

            computed_total = round(net_after_discount * (1 + vat_rate / 100), 2)

    except Exception as _e:
        computed_total = None  # silently fallback — nu oprim aplicatia

    result = {
        "id": wo.id,
        "token": wo.token,
        "title": wo.title,
        "notes": wo.notes,
        "start_date": str(wo.start_date) if wo.start_date else None,
        "start_time": wo.start_time,
        "deadline_date": str(wo.deadline_date) if wo.deadline_date else None,
        "is_quote": bool(wo.is_quote),
        "approximate_date": wo.approximate_date,
        "work_type": wo.work_type,
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
        "client_cui": wo.client.cui if wo.client else None,
        "client_reg_com": wo.client.reg_com if wo.client else None,
        "client_address": wo.client.address if wo.client else None,
        "requirements": wo.requirements or [],
        "materials": wo.materials or [],
        "materials_consumed": wo.materials_consumed or [],
        "volumes": wo.volumes or [],
        "actual_surface_m2": wo.actual_surface_m2,
        "actual_thickness_cm": wo.actual_thickness_cm,
        "actual_sand_quantity": wo.actual_sand_quantity,
        "status": wo.status,
        "prices": wo_prices,
        "confirmed_at": wo.confirmed_at.isoformat() if wo.confirmed_at else None,
        "confirmed_by_name": wo.confirmed_by_name,
        "date_confirmed_at": wo.date_confirmed_at.isoformat() if getattr(wo, 'date_confirmed_at', None) else None,
        "date_confirmed_ip": getattr(wo, 'date_confirmed_ip', None),
        "reschedule_requested": getattr(wo, 'reschedule_requested', False),
        "reschedule_requested_date": str(wo.reschedule_requested_date) if getattr(wo, 'reschedule_requested_date', None) else None,
        "reschedule_reason": getattr(wo, 'reschedule_reason', None),
        "date_history": wo.date_history,
        "client_signature": wo.client_signature,
        "pdf_path": wo.pdf_path,
        "final_invoice_path": wo.final_invoice_path,
        "estimated_price": wo.estimated_price,
        # Facturare
        "is_invoiced": bool(wo.is_invoiced),
        "invoiced_at": wo.invoiced_at.isoformat() if wo.invoiced_at else None,
        "invoice_number": wo.invoice_number,
        "quote_number": wo.quote_number,
        "invoice_notes": wo.invoice_notes,
        "proforma_path": wo.proforma_path,
        "proforma_issued_at": wo.proforma_issued_at.isoformat() if wo.proforma_issued_at else None,
        "external_id": wo.external_id,
        "source_system": wo.source_system or "manual",
        "created_at": wo.created_at.isoformat() if wo.created_at else None,
        "updated_at": wo.updated_at.isoformat() if wo.updated_at else None,
        "read_by_admins": wo.read_by_admins or [],
        # Billtobox
        "billtobox_status": wo.billtobox_status,
        "billtobox_error": wo.billtobox_error,
        "billtobox_sent_at": wo.billtobox_sent_at.isoformat() if wo.billtobox_sent_at else None,
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
                "file_url": get_file_url(d.file_path),
                "content_type": d.content_type,
                "file_size": d.file_size
            } for d in wo.documents
        ] if getattr(wo, "documents", None) else [],
        "photos": [
            {
                "id": str(p.id),
                "photo_path": p.photo_path,
                "url": get_file_url(p.photo_path),
                "description": p.description,
                "photo_type": p.photo_type
            } for p in wo.photos
        ] if getattr(wo, "photos", None) else [],
        # Proforma items — utilizate pt. calculul prețului în tabel (identic cu DevisView)
        "proforma_data": wo.proforma_data,
        # Vat fields needed for frontend calculation
        "vat_enabled": getattr(wo, 'vat_enabled', None),
        "vat_type": getattr(wo, 'vat_type', None),
        # Prețul calculat pe backend — identic cu PDF-ul (sursa unică de adevăr)
        "computed_total": computed_total,
    }

    # ── CACHE SAVE: dacă lucrarea e din trecut și nu are snapshot, îl salvăm acum ──
    if _is_past and db is not None and not getattr(wo, 'cached_snapshot', None):
        try:
            wo.cached_snapshot = result
            db.add(wo)
            db.commit()
        except Exception:
            db.rollback()  # silently ignore — nu oprim aplicația
    # ─────────────────────────────────────────────────────────────────────────────

    return result


# ──────────────────────────────────────────────────────────────────────────────
# LIST
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/work-orders")
def list_work_orders(
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    is_quote: Optional[bool] = Query(None),
    ignore_quote_filter: bool = Query(False),
    limit: Optional[int] = None,
    slim: bool = Query(False),  # Mod rapid pentru planning — fără calcul preț
    invoice_mode: bool = Query(False), # Mod rapid pentru facturare — exclude poze/doc, păstrează proforma
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Lista tuturor comenzilor de lucru ale organizației."""
    
    # --- AUTO-ARCHIVE LOGISTICS (Smart/Lazy Mode) ---
    # Temporarily disabled to prevent performance issues / timeouts
    # if start_date and end_date:
    #     try:
    #         from app.api.admin_logistics import _calculate_daily_routes
    #         from app.models import LogisticsDailyPlan
    #         from datetime import timedelta, datetime
    #         
    #         start_d = datetime.strptime(start_date, "%Y-%m-%d").date()
    #         end_d = datetime.strptime(end_date, "%Y-%m-%d").date()
    #         today = date_today_import.today()
    #         
    #         # Prevent abuse, max 31 days check
    #         if (end_d - start_d).days <= 31:
    #             curr = start_d
    #             while curr <= end_d and curr < today:
    #                 existing = db.query(LogisticsDailyPlan).filter(
    #                     LogisticsDailyPlan.organization_id == current_admin.organization_id,
    #                     LogisticsDailyPlan.date == curr
    #                 ).first()
    #                 if not existing:
    #                     data = _calculate_daily_routes(curr, db, current_admin) # TODO
    #                     plan = LogisticsDailyPlan(
    #                         organization_id=current_admin.organization_id,
    #                         date=curr,
    #                         snapshot_data=data,
    #                         saved_by_id=current_admin.id
    #                     )
    #                     db.add(plan)
    #                     db.commit()
    #                 curr += timedelta(days=1)
    #     except Exception as e:
    #         db.rollback()
    #         print(f"Error auto-archiving logistics in list_work_orders: {e}")
    # ------------------------------------------------
    
    from sqlalchemy.orm import selectinload

    q = db.query(WorkOrder).filter(WorkOrder.organization_id == current_admin.organization_id)
    
    if ignore_quote_filter:
        pass # Fetch everything without filtering on is_quote
    elif is_quote is not None:
        q = q.filter(WorkOrder.is_quote == is_quote)
    else:
        # Default: comenzile normale (is_quote=False) + devisele trimise in planning (is_quote=True + status != draft)
        from sqlalchemy import or_
        if status == 'deleted':
            q = q.filter(or_(
                WorkOrder.is_quote == False,
                WorkOrder.is_quote == True  # Allow all deleted items in the WorkOrders archive if status='deleted'
            ))
        else:
            q = q.filter(or_(
                WorkOrder.is_quote == False,
                (WorkOrder.is_quote == True) & (WorkOrder.status.in_(['planning', 'confirmed', 'in_progress', 'completed']))
            ))

    if slim or invoice_mode:
        # Mod rapid: nu incarca documente/poze (expensive selectinload)
        q = q.options(
            joinedload(WorkOrder.site),
            joinedload(WorkOrder.client),
            joinedload(WorkOrder.assigned_team),
            joinedload(WorkOrder.assigned_vehicle),
        )
    else:
        q = q.options(
            joinedload(WorkOrder.site),
            joinedload(WorkOrder.client),
            joinedload(WorkOrder.assigned_team),
            joinedload(WorkOrder.assigned_vehicle),
            selectinload(WorkOrder.documents),
            selectinload(WorkOrder.photos)
        )
    if status:
        if "," in status:
            statuses = [s.strip() for s in status.split(",")]
            q = q.filter(WorkOrder.status.in_(statuses))
        else:
            q = q.filter(WorkOrder.status == status)
    else:
        q = q.filter(WorkOrder.status != 'isoflex')
        q = q.filter(WorkOrder.status != 'deleted')
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
    if slim:
        return [_serialize_slim(wo) for wo in wos]
    if invoice_mode:
        return [_serialize_invoice_mode(wo) for wo in wos]
    return [_serialize(wo, db) for wo in wos]


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

def _calculate_sand_kg_from_volumes(volumes: list) -> float:
    sand_kg = 0.0
    if isinstance(volumes, list):
        for v in volumes:
            if isinstance(v, dict):
                try:
                    surf = float(v.get("quantity") or 0)
                    thick = float(v.get("thickness") or 0)
                    sand_kg += (surf * thick * 16)
                except (ValueError, TypeError):
                    pass
    return sand_kg

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
        prices=getattr(payload, 'prices', {}),
        assigned_team_id=payload.assigned_team_id,
        assigned_vehicle_id=payload.assigned_vehicle_id,
        min_photos_required=payload.min_photos_required or 2,
        access_notes=payload.access_notes,
        estimated_price=getattr(payload, 'estimated_price', None),
        status="draft",
        is_quote=getattr(payload, 'is_quote', False),
        approximate_date=getattr(payload, 'approximate_date', None),
        work_type=getattr(payload, 'work_type', 'new'),
        created_by=current_admin.id,
    )
    
    # Store use_vat inside prices JSON
    prices_dict = getattr(payload, 'prices', {}) or {}
    prices_dict["useVat"] = getattr(payload, 'use_vat', True)
    wo.prices = prices_dict
    
    # Calculeaza nisipul in caz ca avem volume la creare
    wo.route_sand_kg = _calculate_sand_kg_from_volumes(wo.volumes)
    
    db.add(wo)
    db.flush()  # obtine ID-ul

    # Auto-generate quote_number (IST0001, IST0002...) sau invoice_number (INV001...)
    from sqlalchemy import func
    if wo.is_quote:
        max_quote = db.query(func.max(WorkOrder.quote_number)).filter(
            WorkOrder.organization_id == current_admin.organization_id,
            WorkOrder.quote_number.like('DEV%')
        ).scalar()
        if max_quote:
            try:
                next_num = int(max_quote.replace('DEV', '')) + 1
            except ValueError:
                next_num = 905
        else:
            next_num = 905
        wo.quote_number = f"DEV{next_num}"
    else:
        max_inv = db.query(func.max(WorkOrder.invoice_number)).filter(
            WorkOrder.organization_id == current_admin.organization_id,
            WorkOrder.invoice_number.like('INV%')
        ).scalar()
        if max_inv:
            try:
                next_num = int(max_inv.replace('INV', '')) + 1
            except ValueError:
                next_num = 1
        else:
            next_num = 1
        wo.invoice_number = f"INV{str(next_num).zfill(3)}"

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

        if base_lat and base_lng and not wo.route_segments:
            import math
            def _local_haversine(lat1, lon1, lat2, lon2):
                R = 6371
                dLat = math.radians(lat2 - lat1)
                dLon = math.radians(lon2 - lon1)
                a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
                return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            
            site_lat = wo.site_latitude
            site_lng = wo.site_longitude
            one_way_km = 0.0
            
            if site_lat and site_lng:
                straight_km = _local_haversine(base_lat, base_lng, site_lat, site_lng)
                one_way_km = round(straight_km * 1.3, 2)
                wo.route_distance_km = round(one_way_km * 2, 2)

            # Fallback so frontend MapView knows where the base is and can draw the route
            wo.route_segments = [
                {
                    "from": base_name,
                    "to": wo.site_address or wo.title,
                    "km": one_way_km,
                    "from_lat": base_lat,
                    "from_lng": base_lng
                }
            ]

    except Exception as _route_err:
        print(f"Route calc warning (non-fatal): {_route_err}")

    db.commit()
    db.refresh(wo)
    
    try:
        if wo.start_date and getattr(wo, 'assigned_team_id', None):
            from app.api.admin_logistics import _calculate_daily_routes
            _calculate_daily_routes(wo.start_date, db, current_admin)
            db.refresh(wo)
    except Exception as e:
        print(f"Logistics recalculation warning: {e}")

    log_audit(
        db=db,
        organization_id=current_admin.organization_id,
        admin_id=current_admin.id,
        action="CREATE_WORK_ORDER",
        resource_type="WorkOrder",
        resource_id=wo.id,
        details={"message": f"Created work order/quote {wo.quote_number or wo.invoice_number}", "is_quote": wo.is_quote}
    )

    return _serialize(wo, db)


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
    return _serialize(wo, db)


# ──────────────────────────────────────────────────────────────────────────────
# BATCH RECALCULATE ROUTES
# ──────────────────────────────────────────────────────────────────────────────
class BatchRecalculateRequest(BaseModel):
    ids: List[str]

@router.post("/work-orders/batch-recalculate-routes")
def batch_recalculate_routes(
    payload: BatchRecalculateRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Recalculate route distances for multiple work orders using haversine (free, no Directions API cost)."""
    import math, os, requests
    from app.models import LogisticBase
    from sqlalchemy.orm.attributes import flag_modified

    def _haversine(lat1, lon1, lat2, lon2):
        R = 6371
        dLat = math.radians(lat2 - lat1)
        dLon = math.radians(lon2 - lon1)
        a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    # Cache geocoding per batch
    geo_cache = {}
    def _geocode(address):
        if not address or len(address.strip()) < 5:
            return None
        key = address.strip().lower()
        if key in geo_cache:
            return geo_cache[key]
        api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        if not api_key:
            return None
        try:
            res = requests.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": address, "key": api_key},
                timeout=5
            )
            data = res.json()
            if data.get("status") == "OK" and data.get("results"):
                loc = data["results"][0]["geometry"]["location"]
                result = (float(loc["lat"]), float(loc["lng"]))
                geo_cache[key] = result
                return result
        except Exception:
            pass
        return None

    # Find the organization's base
    base = db.query(LogisticBase).filter(
        LogisticBase.organization_id == current_admin.organization_id
    ).first()
    base_lat = base.latitude if base else 50.88243
    base_lng = base.longitude if base else 4.39343
    base_name = base.name if base else "H&H Resources Brussels"

    success_count = 0
    failed_count = 0
    ROAD_FACTOR = 1.3  # haversine → real road distance approximation

    for wo_id in payload.ids:
        wo = db.query(WorkOrder).filter(
            WorkOrder.id == wo_id,
            WorkOrder.organization_id == current_admin.organization_id
        ).first()
        if not wo:
            failed_count += 1
            continue

        try:
            site_lat = wo.site_latitude
            site_lng = wo.site_longitude

            # Geocode if missing
            if not site_lat or not site_lng:
                if wo.site_address:
                    coords = _geocode(wo.site_address)
                    if coords:
                        site_lat, site_lng = coords
                        wo.site_latitude = site_lat
                        wo.site_longitude = site_lng
                    else:
                        failed_count += 1
                        continue
                else:
                    failed_count += 1
                    continue

            # Calculate haversine distance × road factor × 2 (round trip)
            straight_km = _haversine(base_lat, base_lng, site_lat, site_lng)
            one_way_km = round(straight_km * ROAD_FACTOR, 2)
            round_trip_km = round(one_way_km * 2, 2)

            wo.route_distance_km = round_trip_km
            wo.route_segments = [
                {
                    "from": base_name,
                    "to": wo.site_address or wo.title,
                    "km": one_way_km,
                    "from_lat": base_lat,
                    "from_lng": base_lng
                },
                {
                    "from": wo.site_address or wo.title,
                    "to": "Baza",
                    "km": one_way_km,
                    "from_lat": site_lat,
                    "from_lng": site_lng
                }
            ]
            flag_modified(wo, "route_segments")
            wo.updated_at = datetime.utcnow()
            success_count += 1
        except Exception as e:
            print(f"Batch recalc error for {wo_id}: {e}")
            failed_count += 1

    db.commit()
    return {"success": success_count, "failed": failed_count}


# ──────────────────────────────────────────────────────────────────────────────
# UPDATE
# ──────────────────────────────────────────────────────────────────────────────
@router.put("/work-orders/{wo_id}")
def update_work_order(
    wo_id: str,
    payload: WorkOrderUpdate,
    background_tasks: BackgroundTasks,
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
        "title", "notes", "start_date", "start_time", "deadline_date", "approximate_date",
        "site_id", "site_address", "site_latitude", "site_longitude", "client_id", "client_name",
        "client_email", "client_phone", "client_language", "requirements", "materials", "volumes", "prices",
        "assigned_team_id", "assigned_vehicle_id", "min_photos_required", "access_notes",
        "estimated_price", "status", "is_quote", "work_type", "proforma_data",
        "route_distance_km", "route_segments"
    ]
    
    update_data = payload.dict(exclude_unset=True)
    print("DEBUG update_data:", update_data)
    old_start_date = wo.start_date
    old_prices = wo.prices or {}
    old_discount = float(old_prices.get("discount_pct", 0))

    for f in fields:
        if f in update_data:
            setattr(wo, f, update_data[f])
            
    if "client_type" in update_data and wo.client:
        wo.client.client_type = update_data["client_type"]
    
    # flag_modified pe coloanele JSON — fără asta SQLAlchemy NU detectează schimbarea și NU o salvează!
    from sqlalchemy.orm.attributes import flag_modified
    json_fields = ["route_segments", "prices", "materials", "volumes", "requirements", "proforma_data"]
    for jf in json_fields:
        if jf in update_data:
            flag_modified(wo, jf)
            
    # Daca se modifica volumele, recalculam necesarul de nisip pe backend o singura data
    if "volumes" in update_data:
        wo.route_sand_kg = _calculate_sand_kg_from_volumes(update_data["volumes"])
            
    if "start_date" in update_data and str(update_data["start_date"]) != str(old_start_date):
        wo.reschedule_requested = False
        wo.reschedule_requested_date = None
        wo.date_confirmed_at = None
        
        hist = list(wo.date_history) if wo.date_history else []
        hist.append({
            "action": "changed_by_admin",
            "old_date": str(old_start_date) if old_start_date else None,
            "new_date": str(update_data["start_date"]),
            "timestamp": datetime.utcnow().isoformat(),
            "admin_name": current_admin.full_name
        })
        wo.date_history = hist
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(wo, "date_history")
        
    new_prices = wo.prices or {}
    new_discount = float(new_prices.get("discount_pct", 0))
    discount_changed = new_discount != old_discount
            

    if "use_vat" in update_data:
        pd = dict(wo.prices or {})
        pd["useVat"] = update_data["use_vat"]
        wo.prices = pd

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
            if "client_name" not in update_data:
                wo.client_name = cl.name
            if "client_email" not in update_data:
                wo.client_email = cl.email
            if "client_phone" not in update_data:
                wo.client_phone = cl.phone
            if "client_language" not in update_data:
                wo.client_language = cl.preferred_language or 'ro'
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

        if base_lat and base_lng and not wo.route_segments:
            import math
            def _local_haversine(lat1, lon1, lat2, lon2):
                R = 6371
                dLat = math.radians(lat2 - lat1)
                dLon = math.radians(lon2 - lon1)
                a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
                return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            
            site_lat = wo.site_latitude
            site_lng = wo.site_longitude
            one_way_km = 0.0
            
            if site_lat and site_lng:
                straight_km = _local_haversine(base_lat, base_lng, site_lat, site_lng)
                one_way_km = round(straight_km * 1.3, 2)
                wo.route_distance_km = round(one_way_km * 2, 2)

            # Fallback so frontend MapView knows where the base is and can draw the route
            wo.route_segments = [
                {
                    "from": base_name,
                    "to": wo.site_address or wo.title,
                    "km": one_way_km,
                    "from_lat": base_lat,
                    "from_lng": base_lng
                }
            ]

    except Exception as _route_err:
        print(f"Route calc warning (non-fatal): {_route_err}")

    wo.updated_at = datetime.utcnow()
    
    if str(old_start_date) != str(wo.start_date):
        wo.date_confirmed_at = None
        
    db.commit()
    db.refresh(wo)

    # Handle manual explicit notifications from frontend modal
    if getattr(payload, 'send_notification', False):
        if getattr(wo, 'token', None):
            wo.client_notified = True
            db.commit()
            from app.services.email_service import send_planning_update_email
            from app.services.whatsapp_service import send_planning_update_whatsapp
            
            proforma_url = f"https://davidechape.pontaj.app/public/proforma/{wo.token}"
            formatted_date = wo.start_date.strftime("%d/%m/%Y") if wo.start_date else "À déterminer"
            if wo.start_time:
                formatted_date += f" ({wo.start_time})"

            if wo.client_email:
                try:
                    send_planning_update_email(wo.client_email, wo.client_name, getattr(wo, 'client_language', 'fr'), proforma_url, formatted_date)
                except Exception as e:
                    print(f"Failed to send planning update email: {e}")
            if wo.client_phone:
                try:
                    send_planning_update_whatsapp(wo.client_phone, wo.client_name, getattr(wo, 'client_language', 'fr'), proforma_url, formatted_date)
                except Exception as e:
                    print(f"Failed to send planning update whatsapp: {e}")
        else:
            print(f"Skipped planning notification for WO {wo.id} because it lacks a token")
    else:
        # Check if discount was modified from admin modal
        if discount_changed and wo.client_email:
            if getattr(wo, 'token', None):
                from app.services.email_service import send_quote_update_email
                proforma_url = f"https://davidechape.pontaj.app/public/proforma/{wo.token}"
                try:
                    send_quote_update_email(wo.client_email, wo.client_name, getattr(wo, 'client_language', 'fr'), proforma_url, discount_pct=new_discount)
                    
                    # Salvare mesaj automat în Chat (cu traduceri pentru frontend)
                    chat_fr = f"Bonjour, l'équipe Davide Chape vous a accordé une remise supplémentaire de {new_discount}% sur votre devis. Veuillez vérifier l'offre actualisée."
                    chat_nl = f"Hallo, het Davide Chape team heeft u een extra korting van {new_discount}% toegekend op uw offerte. Controleer de bijgewerkte offerte."
                    chat_en = f"Hello, the Davide Chape team has granted you an additional discount of {new_discount}% on your quote. Please check the updated offer."
                    
                    auto_msg = WorkOrderMessage(
                        work_order_id=wo.id,
                        sender="admin",
                        message=chat_fr,
                        translations={
                            "fr": chat_fr,
                            "nl": chat_nl,
                            "en": chat_en
                        },
                        is_read_by_admin=True
                    )
                    db.add(auto_msg)
                    db.flush()
                except Exception as e:
                    print(f"Failed to send quote update email or chat: {e}")
            else:
                print(f"Skipped discount notification for WO {wo.id} because it lacks a token")

        # Removed backward compatibility for old automatic emails
        # to ensure the admin has full control via the frontend explicit `send_notification` payload flag.
    
    # ── Invalidare cache logistic — NUMAI dacă s-a schimbat echipa sau adresa ──
    # Nu recalculăm la fiecare update (costuri API Google!)
    # Ștergem cache-ul → se va recalcula lazy la primul acces la pagina Logistică
    logistics_invalidating_fields = {"assigned_team_id", "site_address", "site_latitude", "site_longitude", "start_date"}
    if logistics_invalidating_fields.intersection(set(update_data.keys())):
        try:
            from app.models import LogisticsDailyPlan
            if wo.start_date:
                existing_plan = db.query(LogisticsDailyPlan).filter(
                    LogisticsDailyPlan.organization_id == current_admin.organization_id,
                    LogisticsDailyPlan.date == wo.start_date
                ).first()
                if existing_plan:
                    db.delete(existing_plan)
                    db.commit()
                    print(f"Cache logistic invalidat pentru {wo.start_date} (echipă/adresă schimbată pe WO {wo_id})")
        except Exception as e:
            print(f"Logistics cache invalidation warning: {e}")

    # Commit any remaining changes (e.g., auto_msg from discount update)
    db.commit()

    # Dacă au apărut modificări la prețuri, volume sau date financiare, regenerăm PDF-ul automat
    needs_pdf = any(k in update_data for k in ["volumes", "prices", "proforma_data", "estimated_price"])
    if needs_pdf and (wo.is_quote or wo.is_invoiced or getattr(wo, 'pdf_path', None)):
        background_tasks.add_task(regenerate_pdf_task, wo.id)

    return _serialize(wo, db)

async def regenerate_pdf_task(wo_id: str):
    from app.database import SessionLocal
    from app.models import WorkOrder
    from app.services.pdf_generator import generate_quote_pdf, generate_invoice_pdf
    
    db = SessionLocal()
    try:
        wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
        if not wo:
            return
            
        client = wo.client
        if getattr(wo, 'is_invoiced', False):
            new_pdf = await generate_invoice_pdf(wo, client)
        else:
            new_pdf = await generate_quote_pdf(wo, client)
            
        if new_pdf:
            wo.pdf_path = new_pdf
            db.commit()
    except Exception as e:
        print(f"Eroare generare PDF auto-update: {e}")
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────────────────────
# SYNC PRICES
# ──────────────────────────────────────────────────────────────────────────────
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

@router.post("/work-orders/{wo_id}/sync-prices")
def sync_work_order_prices(
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
        
    pricing = db.query(PricingSetting).filter(
        PricingSetting.organization_id == current_admin.organization_id,
        PricingSetting.client_id == (wo.client_id if wo.client_id else None)
    ).first()
    
    if not pricing and wo.client_id:
        pricing = db.query(PricingSetting).filter(
            PricingSetting.organization_id == current_admin.organization_id,
            PricingSetting.client_id == None
        ).first()
        
    if not pricing:
        raise HTTPException(status_code=404, detail="Setările de preț globale nu au fost găsite.")
        
    try:
        auto_net = 0
        total_truck = 0
        total_surface = sum(float(v.get('quantity') or 0) for v in (wo.volumes or []) if 'chape' in str(v.get('label') or '').lower() or 'sapa' in str(v.get('label') or '').lower() or 'şapă' in str(v.get('label') or '').lower() or 'șapă' in str(v.get('label') or '').lower())
        
        # Calculate truck cost based on total surface of chape
        distance_km = 0
        truck_cost = 0
        if wo.site_address:
            if total_surface <= getattr(pricing, 'truck_surface_threshold_free_sqm', 500.0):
                # Import the LogisticBase model
                from app.models import LogisticBase
                bases = db.query(LogisticBase).filter(LogisticBase.organization_id == current_admin.organization_id).all()
                if bases:
                    # Calculate distance for all bases and take the minimum
                    min_dist = 999999.0
                    for base_record in bases:
                        if base_record.address:
                            dist = get_driving_distance_km(base_record.address, wo.site_address)
                            if 0 < dist < min_dist:
                                min_dist = dist
                    
                    if min_dist < 999999.0:
                        distance_km = min_dist
                        if distance_km > getattr(pricing, 'truck_distance_threshold_km', 50.0):
                            truck_cost = getattr(pricing, 'truck_extra_price_flat', 0.0)
                    
        wo.prices = {
            "base": pricing.base_price_sqm,
            "base_large": pricing.base_price_sqm_large,
            "base_threshold": pricing.base_large_threshold_sqm,
            "extra": pricing.extra_thickness_price_per_cm,
            "extra_large": getattr(pricing, 'extra_thickness_price_per_cm_large', pricing.extra_thickness_price_per_cm),
            "extra_threshold": getattr(pricing, 'extra_thickness_large_threshold_sqm', 200.0),
            "standard_thickness": pricing.standard_thickness_cm,
            "foil": pricing.plastic_foil_price_sqm,
            "mesh": pricing.metal_mesh_price_sqm,
            "fiber": pricing.fiber_price_sqm if total_surface <= pricing.fiber_large_threshold_sqm else pricing.fiber_price_sqm_large,
            "truck_cost": truck_cost,
            "distance_km": distance_km
        }
        
        for vol in (wo.volumes or []):
            quantity = float(vol.get('quantity') or 0)
            thickness = float(vol.get('thickness') or 0)
            label = str(vol.get('label') or '').lower()
            if 'chape' in label or 'sapa' in label or 'şapă' in label or 'șapă' in label:
                if quantity > 0:
                    base_rate = pricing.base_price_sqm if quantity <= pricing.base_large_threshold_sqm else pricing.base_price_sqm_large
                    base = quantity * base_rate
                    
                    extra_cm = max(0, thickness - pricing.standard_thickness_cm)
                    extra_thresh = getattr(pricing, 'extra_thickness_large_threshold_sqm', 200.0)
                    extra_price = getattr(pricing, 'extra_thickness_price_per_cm_large', pricing.extra_thickness_price_per_cm) if quantity > extra_thresh else pricing.extra_thickness_price_per_cm
                    extra_cost = quantity * extra_cm * extra_price
                    
                    foil_cost = quantity * pricing.plastic_foil_price_sqm if vol.get('has_foil') else 0
                    mesh_cost = quantity * pricing.metal_mesh_price_sqm if vol.get('has_mesh') else 0
                    
                    fiber_rate = pricing.fiber_price_sqm if quantity <= pricing.fiber_large_threshold_sqm else pricing.fiber_price_sqm_large
                    fiber_cost = quantity * fiber_rate if (vol.get('has_fiber') or vol.get('has_duramint')) else 0
                    
                    hidden_extra = 0
                    if pricing.surface_thresholds:
                        for thresh in pricing.surface_thresholds:
                            min_s = float(thresh.get("min_sqm") or 0)
                            max_s = float(thresh.get("max_sqm") or 999999)
                            if min_s <= quantity < max_s:
                                hidden_extra += float(thresh.get("extra_charge") or 0)
                                
                    auto_net += (base + extra_cost + foil_cost + mesh_cost + fiber_cost + hidden_extra)
                    
        if auto_net > 0 or truck_cost > 0:
            wo.estimated_price = auto_net + truck_cost
        
        from datetime import datetime
        wo.updated_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        print("Failed to auto-recalculate estimated price after sync:", str(e))
        pass

    return {"message": "Prices synchronized successfully", "prices": wo.prices, "estimated_price": wo.estimated_price}


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
        
    wo.status = "deleted"
    db.commit()

    log_audit(
        db=db,
        organization_id=current_admin.organization_id,
        admin_id=current_admin.id,
        action="DELETE_WORK_ORDER",
        resource_type="WorkOrder",
        resource_id=wo.id,
        details={"message": f"Deleted work order/quote {wo.quote_number or wo.invoice_number}"}
    )

    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# RESTORE (Arhiva)
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/work-orders/{wo_id}/restore")
def restore_work_order(
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
        
    if wo.status != "deleted":
        raise HTTPException(status_code=400, detail="Comanda nu este în arhivă.")
        
    wo.status = "draft"
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
    photo_type: str = Form("instruction"),
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
        photo_type=photo_type
    )
    db.add(photo)
    db.commit()

    return {
        "photo_id": photo.id,
        "photo_url": file_url,
        "photo_type": photo_type,
        "message": "Poza a fost adaugata cu succes."
    }


@router.get("/work-orders/{wo_id}/photos")
def list_work_order_photos(
    wo_id: str,
    photo_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Lista pozelor unei comenzi. Adminul vede toate tipurile."""
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
# READ/UNREAD
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/work-orders/{wo_id}/mark-read")
def mark_work_order_read(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Not found")
    
    reads = list(wo.read_by_admins) if wo.read_by_admins else []
    if current_admin.id not in reads:
        reads.append(current_admin.id)
        wo.read_by_admins = reads
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(wo, "read_by_admins")
        db.commit()
    return {"ok": True}

@router.post("/work-orders/{wo_id}/mark-unread")
def mark_work_order_unread(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Not found")
    
    reads = list(wo.read_by_admins) if wo.read_by_admins else []
    if current_admin.id in reads:
        reads.remove(current_admin.id)
        wo.read_by_admins = reads
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(wo, "read_by_admins")
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
            
    return {**_serialize(wo, db), "confirm_url": confirm_url}


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

    return _serialize(wo, db)


# ──────────────────────────────────────────────────────────────────────────────
# INVOICE STATUS — marcare manuală facturat/nefacturat
# ──────────────────────────────────────────────────────────────────────────────
class InvoiceStatusUpdate(BaseModel):
    is_invoiced: bool
    invoice_number: Optional[str] = None
    invoice_notes: Optional[str] = None

@router.patch("/work-orders/{wo_id}/invoice-status")
async def update_invoice_status(
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

    # Generate PDF automatically if invoiced
    if wo.is_invoiced and not wo.pdf_path:
        from app.models import Client
        client = None
        if wo.client_id:
            client = db.query(Client).filter(Client.id == wo.client_id).first()
        try:
            new_pdf_path = await generate_invoice_pdf(wo, client)
            if new_pdf_path:
                wo.pdf_path = new_pdf_path
        except Exception as e:
            print(f"Eroare generare PDF auto: {e}")

    db.commit()
    db.refresh(wo)
    return _serialize(wo, db)


class ApproveQuoteRequest(BaseModel):
    start_date: Optional[str] = None
    start_time: Optional[str] = None
    discount: Optional[float] = None

@router.post("/work-orders/{wo_id}/approve")
async def approve_quote(
    wo_id: str,
    payload: ApproveQuoteRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Aprobă un deviz venit din online, opțional îi setează data/ora și discount-ul, generează PDF și trimite email/whatsapp."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")

    if not wo.is_quote:
        raise HTTPException(status_code=400, detail="Doar devizele (is_quote=True) pot fi aprobate astfel.")

    # Update info
    if payload.start_date:
        wo.start_date = payload.start_date
    if payload.start_time:
        wo.start_time = payload.start_time
    
    if payload.discount is not None:
        prices = wo.prices or {}
        prices["discount"] = payload.discount
        wo.prices = prices

    # Change status based on presence of date
    if payload.start_date:
        wo.status = "planning"
    else:
        wo.status = "pending"

    # Generate Quote PDF (Devis)
    from app.services.pdf_generator import generate_quote_pdf
    from app.models import Client
    client = db.query(Client).filter(Client.id == wo.client_id).first() if wo.client_id else None
    
    try:
        pdf_path = await generate_quote_pdf(wo, client)
        if pdf_path:
            wo.pdf_path = pdf_path
    except Exception as e:
        print(f"Eroare generare PDF deviz: {e}")
        pdf_path = None

    db.commit()
    db.refresh(wo)

    # Trigger Email & WhatsApp notifications
    lang = (wo.client_language or "fr").lower()
    client_name = wo.client_name or "Client"
    client_phone = getattr(wo, "client_phone", "") or ""
    client_email = getattr(wo, "client_email", "") or ""
    
    frontend_url = os.getenv("FRONTEND_URL", "https://davidechape.pontaj.app")
    signing_url = f"{frontend_url}/quote/{wo.token}"
    
    date_str = wo.start_date or "À déterminer"
    if wo.start_time:
        date_str += f" ({wo.start_time})"

    from app.services.email_service import send_planning_update_email
    from app.services.whatsapp_service import send_planning_update_whatsapp

    # Send notifications in background
    from fastapi import BackgroundTasks
    bg_tasks = BackgroundTasks()

    if wo.source_system == "devis_online":
        if client_email:
            bg_tasks.add_task(send_planning_update_email, client_email, client_name, lang, signing_url, date_str)
        
        if client_phone:
            bg_tasks.add_task(send_planning_update_whatsapp, client_phone, client_name, lang, signing_url, date_str)

    # We must run background tasks explicitly since we created our own instance here,
    # or better, accept BackgroundTasks as a dependency. Wait, I'll just call them sync for now if I can't use BackgroundTasks properly.
    # Actually, I can just use FastAPI's BackgroundTasks dependency!
    # Let me refactor to accept it.
    
    # Send directly if BackgroundTasks not injected
    try:
        if wo.source_system == "devis_online":
            if client_email:
                send_planning_update_email(client_email, client_name, lang, signing_url, date_str)
            if client_phone:
                send_planning_update_whatsapp(client_phone, client_name, lang, signing_url, date_str)
        else:
            print(f"Skipped approval notification for WO {wo.id} because source is {wo.source_system}")
    except Exception as e:
        print(f"Eroare trimitere notificari aprobare: {e}")

    return _serialize(wo, db)

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
    return _serialize(wo, db)


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

@router.get("/robaws-history")
def get_robaws_history(
    team_id: Optional[str] = None,
    page: int = 0,
    limit: int = 200,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Returnează lucrările din cache-ul local (rapid!).
    Nu face sync automat — sync-ul e manual via POST /sync-robaws.
    """
    from app.models import RobawsWorkOrderCache

    org_id = current_admin.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    # Citește din cache
    q = db.query(RobawsWorkOrderCache).filter(
        RobawsWorkOrderCache.organization_id == org_id
    )
    if team_id:
        q = q.filter(RobawsWorkOrderCache.team_id == team_id)

    q = q.order_by(RobawsWorkOrderCache.date.desc())
    total = q.count()
    items = q.offset(page * limit).limit(limit).all()

    # Teams meta din cache
    teams_raw = db.query(
        RobawsWorkOrderCache.team_id,
        RobawsWorkOrderCache.team_name,
        func.count(RobawsWorkOrderCache.id)
    ).filter(
        RobawsWorkOrderCache.organization_id == org_id
    ).group_by(
        RobawsWorkOrderCache.team_id,
        RobawsWorkOrderCache.team_name
    ).all()

    teams_meta = [
        {"team_id": str(t[0]) if t[0] else "unknown", "team_name": t[1] or "—", "total": t[2]}
        for t in teams_raw
    ]

    # Check in_db status + get local IDs
    ext_ids = [i.ext_id for i in items]
    ext_id_to_local = {}
    if ext_ids:
        existing = db.query(WorkOrder.external_id, WorkOrder.id).filter(
            WorkOrder.external_id.in_(ext_ids),
            WorkOrder.organization_id == org_id
        ).all()
        ext_id_to_local = {e[0]: e[1] for e in existing}

    result_items = []
    for item in items:
        local_id = ext_id_to_local.get(item.ext_id)
        result_items.append({
            "ext_id": item.ext_id,
            "robaws_nr": item.robaws_nr,
            "title": item.title,
            "date": item.date,
            "client_name": item.client_name,
            "address": item.address,
            "status": item.status,
            "total_volume": item.total_volume or 0,
            "materials_summary": item.materials_summary,
            "team_id": str(item.team_id) if item.team_id else None,
            "team_name": item.team_name,
            "in_db": local_id is not None,
            "local_id": local_id,
            "raw": {
                "latitude": item.latitude,
                "longitude": item.longitude,
                "notes": item.notes,
            }
        })

    return {
        "items": result_items,
        "teams": teams_meta,
        "total": total,
        "page": page,
        "limit": limit,
    }


def _sync_robaws_cache(org_id: str, db: Session):
    """Sincronizează lucrările din Robaws în cache-ul local."""
    import requests as _req
    import re
    from app.models import RobawsWorkOrderCache
    from datetime import datetime

    # Șterge cache-ul vechi
    db.query(RobawsWorkOrderCache).filter(
        RobawsWorkOrderCache.organization_id == org_id
    ).delete()
    db.commit()

    teams_list = db.query(Team).filter(
        Team.organization_id == org_id,
        Team.is_active == True,
        Team.robaws_email != None,
        Team.robaws_email != ""
    ).all()

    if not teams_list:
        return

    # Collect TOATE lucrările din TOATE echipele, dedup by ext_id
    unique_items = {}  # ext_id -> {data + team info}

    for team in teams_list:
        api_key = team.robaws_email
        api_secret = team.robaws_password
        if not api_key or not api_secret:
            continue

        try:
            all_items = []
            offset = 0
            batch_size = 100
            total_api = None
            while True:
                url = f"https://app.robaws.com/api/v2/work-orders?limit={batch_size}&offset={offset}&include=lineItems"
                r = _req.get(url, auth=(api_key, api_secret),
                            headers={"Accept": "application/json"}, timeout=15)
                if r.status_code != 200:
                    break
                data = r.json()
                items = data.get("items", [])
                if total_api is None:
                    total_api = data.get("totalItems", 0)
                all_items.extend(items)
                if not items or len(all_items) >= total_api:
                    break
                offset += len(items)

            for item in all_items:
                ext_id = str(item.get("id", ""))
                if not ext_id or ext_id in unique_items:
                    continue  # Skip dacă deja procesat

                addr_obj = item.get("address") or {}
                addr_parts = []
                if addr_obj.get("addressLine1"): addr_parts.append(addr_obj["addressLine1"])
                if addr_obj.get("postalCode"):   addr_parts.append(addr_obj["postalCode"])
                if addr_obj.get("city"):         addr_parts.append(addr_obj["city"])

                client_obj = item.get("client") or {}
                client_name = client_obj.get("name", "") if isinstance(client_obj, dict) else ""

                line_items = item.get("lineItems", [])
                volumes_found = []
                materials_found = []
                for li in line_items:
                    qty = float(li.get("quantity") or 0)
                    unit = (li.get("unitType") or "").lower()
                    desc = (li.get("description") or "")
                    if unit in ["m2", "m²", "m3", "m³"] and qty > 0:
                        volumes_found.append(qty)
                    if desc:
                        materials_found.append(f"{desc} ({qty} {unit})" if qty else desc)

                total_volume = max(volumes_found) if volumes_found else 0.0
                if total_volume == 0.0:
                    title_str = item.get("title") or ""
                    vol_match = re.search(r'([\d.,]+)\s*m[²³2]', title_str)
                    if vol_match:
                        try:
                            total_volume = float(vol_match.group(1).replace(',', '.'))
                        except:
                            pass

                unique_items[ext_id] = {
                    "team_id": str(team.id),
                    "team_name": team.name,
                    "ext_id": ext_id,
                    "robaws_nr": str(item.get("number") or item.get("id")),
                    "title": item.get("title", ""),
                    "date": datetime.fromisoformat(item.get("date")) if item.get("date") else None,
                    "client_name": client_name,
                    "address": ", ".join(addr_parts),
                    "status": item.get("status", ""),
                    "total_volume": round(total_volume, 2),
                    "materials_summary": "; ".join(materials_found[:5]),
                    "latitude": addr_obj.get("latitude"),
                    "longitude": addr_obj.get("longitude"),
                    "notes": item.get("description") or item.get("notes") or "",
                }

        except Exception as e:
            print(f"Sync error for team {team.name}: {e}")

    # Bulk insert toate lucrările unice
    for data in unique_items.values():
        db.add(RobawsWorkOrderCache(
            organization_id=org_id,
            **data
        ))
    db.commit()
    print(f"Synced {len(unique_items)} unique work orders from Robaws")


@router.post("/sync-robaws")
def sync_robaws(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Sincronizează lucrările din Robaws API în cache-ul local."""
    org_id = current_admin.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    _sync_robaws_cache(org_id, db)

    from app.models import RobawsWorkOrderCache
    total = db.query(RobawsWorkOrderCache).filter(
        RobawsWorkOrderCache.organization_id == org_id
    ).count()

    return {"message": "Sincronizare completă", "total_cached": total}

@router.post("/work-orders/{wo_id}/generate-proforma")
def generate_proforma(
    wo_id: str,
    payload: dict = Body(default=None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    from datetime import datetime
    from app.models import Client
    
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.organization_id == current_admin.organization_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
    
    proforma_route = f"/proforma/{wo.id}"
    
    wo.proforma_path = proforma_route
    wo.proforma_issued_at = datetime.utcnow()
    
    # Genereaza numar secvential DEV daca nu exista
    if not wo.quote_number:
        from sqlalchemy import func
        max_quote = db.query(func.max(WorkOrder.quote_number)).filter(
            WorkOrder.organization_id == current_admin.organization_id,
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
    
    if payload:
        # Extrage si salveaza clientul
        client_mode = payload.get("client_mode")
        if client_mode == "new" and payload.get("clientName"):
            existing_client = db.query(Client).filter(
                Client.organization_id == current_admin.organization_id,
                Client.name == payload.get("clientName")
            ).first()
            if not existing_client:
                new_cl = Client(
                    organization_id=current_admin.organization_id,
                    name=payload.get("clientName"),
                    email=payload.get("client_email"),
                    phone=payload.get("client_phone"),
                    client_type=payload.get("client_type", "fizica"),
                    country=payload.get("client_country", "RO"),
                    cui=payload.get("client_company_vat"),
                    address=payload.get("client_address")
                )
                db.add(new_cl)
                db.flush()
                wo.client_id = new_cl.id
                wo.client_name = new_cl.name
        elif client_mode == "existing" and payload.get("client_id"):
            wo.client_id = payload.get("client_id")
            if payload.get("clientName"):
                wo.client_name = payload.get("clientName")
    db.commit()
    
    return {
        "message": "Proformă generată cu succes",
        "proforma_path": wo.proforma_path,
        "proforma_issued_at": wo.proforma_issued_at.isoformat()
    }

@router.post("/work-orders/{wo_id}/convert-to-order")
def convert_quote_to_order(
    wo_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.organization_id == current_admin.organization_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    start_date_str = payload.get("start_date")
    if not start_date_str:
        raise HTTPException(status_code=400, detail="start_date is required")
        
    from datetime import datetime
    try:
        wo.start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    wo.is_quote = False
    wo.status = "draft"
    db.commit()
    
    return {"message": "Quote converted to Work Order", "work_order": _serialize(wo, db)}

@router.post("/work-orders/{wo_id}/billtobox")
def send_to_billtobox_endpoint(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Trimite o factură finalizată către Billtobox via e-FFF XML format.
    """
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.organization_id == current_admin.organization_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    if not wo.is_invoiced:
        raise HTTPException(status_code=400, detail="Doar facturile finale pot fi trimise către Billtobox.")
        
    client = None
    if wo.client_id:
        client = db.query(Client).filter(Client.id == wo.client_id).first()
        
    success, message = send_invoice_to_billtobox(wo, client)
    
    if success:
        wo.billtobox_status = "sent"
        wo.billtobox_sent_at = datetime.utcnow()
        wo.billtobox_error = None
        db.commit()
        return {"message": "Factura a fost trimisă cu succes către Billtobox.", "status": "sent"}
    else:
        wo.billtobox_status = "error"
        wo.billtobox_error = message
        db.commit()
        raise HTTPException(status_code=500, detail=f"Eroare la trimiterea către Billtobox: {message}")

# ──────────────────────────────────────────────────────────────────────────────
# Chat Messages (Admin ↔ Client)
# ──────────────────────────────────────────────────────────────────────────────

from app.models import WorkOrderMessage

@router.get("/work-orders/{wo_id}/messages")
def get_work_order_messages(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.organization_id == current_admin.organization_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    messages = db.query(WorkOrderMessage).filter(WorkOrderMessage.work_order_id == wo_id).order_by(WorkOrderMessage.created_at.asc()).all()
    
    # Mark client messages as read
    unread_client_msgs = [m for m in messages if m.sender == 'client' and not m.is_read_by_admin]
    if unread_client_msgs:
        for m in unread_client_msgs:
            m.is_read_by_admin = True
        db.commit()
        
    # Build initial context messages
    initial_messages = []
    
    req_text = ""
    if wo.requirements:
        reqs = [r.get('description', '') for r in wo.requirements if isinstance(r, dict) and r.get('description')]
        req_text = "\n".join(reqs)
        
    if req_text:
        initial_messages.append({
            "id": "initial-req",
            "sender": "client",
            "message": f"Detalii lucrare:\n{req_text}",
            "created_at": wo.created_at.isoformat()
        })
    elif wo.notes:
        initial_messages.append({
            "id": "initial-req",
            "sender": "client",
            "message": f"Note inițiale:\n{wo.notes}",
            "created_at": wo.created_at.isoformat()
        })
        
    if wo.reschedule_requested and wo.reschedule_reason:
        initial_messages.append({
            "id": "reschedule-req",
            "sender": "client",
            "message": f"Cerere de reprogramare:\n{wo.reschedule_reason}",
            "created_at": wo.updated_at.isoformat()
        })
    
    db_messages = [
        {
            "id": m.id,
            "sender": m.sender,
            "message": m.message,
            "created_at": m.created_at.isoformat() + "Z",
            "translations": m.translations,
            "reactions": m.reactions,
            "is_hidden": m.is_hidden,
            "is_read_by_admin": m.is_read_by_admin
        } for m in messages
    ]
    
    return initial_messages + db_messages

class MessageCreate(BaseModel):
    message: str
    target_lang: Optional[str] = None
    translations: Optional[dict] = None

class TranslateRequest(BaseModel):
    text: str
    target_lang: str

@router.post("/translate")
def translate_text(
    payload: TranslateRequest,
    current_admin: Admin = Depends(get_current_admin)
):
    try:
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source='auto', target=payload.target_lang).translate(payload.text)
        return {"translatedText": translated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/work-orders/{wo_id}/messages")
def post_work_order_message(
    wo_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.organization_id == current_admin.organization_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    if getattr(wo, 'is_chat_closed', False):
        raise HTTPException(status_code=403, detail="Chat is closed")
        
    translations = payload.translations or {}
    
    # Auto-translate to the 3 public languages if deep_translator is available
    try:
        from deep_translator import GoogleTranslator
        for target_lang in ['fr', 'nl', 'en']:
            if target_lang not in translations:
                translated = GoogleTranslator(source='auto', target=target_lang).translate(payload.message)
                translations[target_lang] = translated
    except Exception as e:
        print(f"Auto-translation failed: {e}")
            
    msg = WorkOrderMessage(
        work_order_id=wo.id,
        sender="admin",
        message=payload.message,
        is_read_by_admin=True,
        translations=translations
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    return {
        "id": msg.id,
        "sender": msg.sender,
        "message": msg.message,
        "created_at": msg.created_at.isoformat() + "Z",
        "translations": msg.translations,
        "reactions": msg.reactions
    }

class ReactionToggle(BaseModel):
    emoji: str

@router.post("/work-orders/{wo_id}/messages/{msg_id}/react")
def toggle_work_order_message_reaction(
    wo_id: str,
    msg_id: str,
    payload: ReactionToggle,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    msg = db.query(WorkOrderMessage).filter(WorkOrderMessage.id == msg_id, WorkOrderMessage.work_order_id == wo_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    reactions = msg.reactions or {}
    emoji = payload.emoji
    
    # Check if they are toggling off their current reaction
    was_toggling_off = False
    if emoji in reactions and "admin" in reactions[emoji]:
        was_toggling_off = True
        
    # Remove 'admin' from ALL emojis (max 1 reaction per user)
    for e in list(reactions.keys()):
        if "admin" in reactions[e]:
            reactions[e].remove("admin")
            if not reactions[e]:
                del reactions[e]
                
    # If they weren't toggling off, add the new reaction
    if not was_toggling_off:
        if emoji not in reactions:
            reactions[emoji] = []
        reactions[emoji].append("admin")
    msg.reactions = reactions
    # Tell SQLAlchemy the JSON column changed
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(msg, "reactions")
    
    db.commit()
    db.refresh(msg)
    
    return {
        "id": msg.id,
        "reactions": msg.reactions
    }

@router.put("/work-orders/{wo_id}/messages/{msg_id}")
def put_work_order_message(
    wo_id: str,
    msg_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.organization_id == current_admin.organization_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    msg = db.query(WorkOrderMessage).filter(WorkOrderMessage.id == msg_id, WorkOrderMessage.work_order_id == wo_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    # Only allow editing admin messages (or any message depending on requirement, but usually admin)
    if msg.sender != "admin":
        raise HTTPException(status_code=403, detail="Cannot edit client messages")

    msg.message = payload.message
    db.commit()
    db.refresh(msg)
    
    return {
        "id": msg.id,
        "sender": msg.sender,
        "message": msg.message,
        "created_at": msg.created_at.isoformat() + "Z"
    }

@router.put("/work-orders/{wo_id}/messages/{msg_id}/toggle-visibility")
def toggle_work_order_message_visibility(
    wo_id: str,
    msg_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.organization_id == current_admin.organization_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    msg = db.query(WorkOrderMessage).filter(WorkOrderMessage.id == msg_id, WorkOrderMessage.work_order_id == wo_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    msg.is_hidden = not getattr(msg, 'is_hidden', False)
    db.commit()
    db.refresh(msg)
    
    return {
        "id": msg.id,
        "sender": msg.sender,
        "message": msg.message,
        "created_at": msg.created_at.isoformat() + "Z",
        "is_hidden": msg.is_hidden
    }

@router.delete("/work-orders/{wo_id}/messages/{msg_id}")
def delete_work_order_message(
    wo_id: str,
    msg_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.organization_id == current_admin.organization_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    msg = db.query(WorkOrderMessage).filter(WorkOrderMessage.id == msg_id, WorkOrderMessage.work_order_id == wo_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    db.delete(msg)
    db.commit()
    return {"message": "Mesajul a fost șters cu succes."}

@router.post("/work-orders/{wo_id}/messages/{msg_id}/unread")
def mark_message_unread(
    wo_id: str,
    msg_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.organization_id == current_admin.organization_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    msg = db.query(WorkOrderMessage).filter(WorkOrderMessage.id == msg_id, WorkOrderMessage.work_order_id == wo_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    msg.is_read_by_admin = False
    db.commit()
    return {"status": "ok"}


@router.get("/chat-notifications/unread")
def get_unread_chat_notifications(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Returns unread client messages for the global header notification bell."""
    # We need to join with WorkOrder to ensure they belong to the admin's organization
    unread_messages = (
        db.query(WorkOrderMessage, WorkOrder)
        .join(WorkOrder, WorkOrderMessage.work_order_id == WorkOrder.id)
        .filter(WorkOrder.organization_id == current_admin.organization_id)
        .filter(WorkOrderMessage.sender == 'client')
        .filter(WorkOrderMessage.is_read_by_admin == False)
        .order_by(WorkOrderMessage.created_at.desc())
        .limit(20)
        .all()
    )
    
    count = db.query(WorkOrderMessage).join(WorkOrder).filter(
        WorkOrder.organization_id == current_admin.organization_id,
        WorkOrderMessage.sender == 'client',
        WorkOrderMessage.is_read_by_admin == False
    ).count()

    results = []
    for msg, wo in unread_messages:
        results.append({
            "id": msg.id,
            "work_order_id": msg.work_order_id,
            "work_order_title": wo.title or f"CMD-{wo.id[:4]}",
            "client_name": wo.client_name,
            "message": msg.message,
            "created_at": msg.created_at.isoformat() + "Z"
        })
        
    return {"unread_count": count, "messages": results}

@router.post("/chat-notifications/mark-read")
def mark_all_chat_notifications_read(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    # Update all unread messages for this admin's organization
    unread_msgs = (
        db.query(WorkOrderMessage)
        .join(WorkOrder, WorkOrderMessage.work_order_id == WorkOrder.id)
        .filter(WorkOrder.organization_id == current_admin.organization_id)
        .filter(WorkOrderMessage.sender == 'client')
        .filter(WorkOrderMessage.is_read_by_admin == False)
        .all()
    )
    
    for m in unread_msgs:
        m.is_read_by_admin = True
        
    db.commit()
    return {"ok": True}

from sqlalchemy import func

@router.get("/quotes/unread-count")
def get_unread_quotes_count(
    since: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    query = db.query(WorkOrder).filter(
        WorkOrder.organization_id == current_admin.organization_id,
        WorkOrder.is_quote == True,
        WorkOrder.status == "draft"
    )
    if since:
        try:
            from datetime import datetime
            since_str = since.replace('Z', '+00:00')
            since_dt = datetime.fromisoformat(since_str)
            since_dt = since_dt.replace(tzinfo=None)
            query = query.filter(WorkOrder.created_at > since_dt)
        except Exception as e:
            print(f"Error parsing since: {e}")
            
    count = query.count()
    from datetime import datetime
    return {
        "unread_count": count,
        "server_time": datetime.utcnow().isoformat() + "Z"
    }

@router.get("/chats")
def get_all_chats(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Returns a list of all work orders that have at least one message, grouped for the chat page."""
    # Find all work orders with messages
    subquery = db.query(WorkOrderMessage.work_order_id, func.max(WorkOrderMessage.created_at).label("last_msg_time")).group_by(WorkOrderMessage.work_order_id).subquery()
    
    chats = (
        db.query(WorkOrder, subquery.c.last_msg_time)
        .join(subquery, WorkOrder.id == subquery.c.work_order_id)
        .filter(WorkOrder.organization_id == current_admin.organization_id)
        .order_by(subquery.c.last_msg_time.desc())
        .all()
    )
    
    results = []
    for wo, last_msg_time in chats:
        # get unread count
        unread = db.query(WorkOrderMessage).filter(
            WorkOrderMessage.work_order_id == wo.id,
            WorkOrderMessage.sender == 'client',
            WorkOrderMessage.is_read_by_admin == False
        ).count()
        
        # get last message text
        last_msg = db.query(WorkOrderMessage).filter(WorkOrderMessage.work_order_id == wo.id).order_by(WorkOrderMessage.created_at.desc()).first()
        
        results.append({
            "work_order_id": wo.id,
            "title": wo.title or f"CMD-{wo.id[:4]}",
            "client_name": wo.client_name,
            "status": wo.status,
            "is_quote": wo.is_quote,
            "quote_number": getattr(wo, 'quote_number', None),
            "invoice_number": getattr(wo, 'invoice_number', None),
            "is_chat_closed": getattr(wo, 'is_chat_closed', False),
            "source_system": getattr(wo, 'source_system', 'manual'),
            "unread_count": unread,
            "last_message": last_msg.message if last_msg else "",
            "last_message_time": last_msg_time.isoformat() + "Z" if last_msg_time else wo.created_at.isoformat() + "Z"
        })
        
    return results

@router.post("/work-orders/{wo_id}/chat/close")
def close_work_order_chat(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.organization_id == current_admin.organization_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    wo.is_chat_closed = True
    db.commit()
    return {"message": "Chat closed successfully"}

@router.post("/work-orders/{wo_id}/chat/open")
def open_work_order_chat(
    wo_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.organization_id == current_admin.organization_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    wo.is_chat_closed = False
    db.commit()
    return {"message": "Chat opened successfully"}

class TranslateRequest(BaseModel):
    text: str
    target_lang: str

@router.post("/translate")
def translate_text(
    payload: TranslateRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    try:
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source='auto', target=payload.target_lang).translate(payload.text)
        return {"translatedText": translated}
    except ImportError:
        return {"translatedText": "[Eroare: modulul deep_translator nu este instalat pe server]"}
    except Exception as e:
        return {"translatedText": f"[Eroare la traducere: {str(e)}]"}

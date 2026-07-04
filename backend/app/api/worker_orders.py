"""
worker_orders.py — API pentru Comenzi de Lucru accesibil muncitorului si sefului de echipa.
Autentificare: token JWT de angajat (acelasi ca la clockin/pontaj).
"""

import os
import uuid
import math
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    WorkOrder, WorkOrderAcknowledgement, WorkOrderCheckin, WorkOrderPhoto,
    WorkOrderDocument, User, Team, TeamMember, Role
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/worker/orders", tags=["worker-orders"])

UPLOAD_DIR = "uploads/work_order_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _haversine_distance(lat1, lon1, lat2, lon2) -> float:
    """Distance in meters between two GPS coordinates."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _get_user_team_ids(db: Session, user_id: str, org_id: str) -> List[str]:
    """Return list of team IDs the user belongs to (active memberships) or leads."""
    memberships = db.query(TeamMember).filter(
        TeamMember.user_id == user_id,
        TeamMember.is_active == True
    ).all()
    team_ids = [m.team_id for m in memberships]

    led_teams = db.query(Team).filter(
        Team.team_leader_id == user_id,
        Team.organization_id == org_id
    ).all()
    led_team_ids = [t.id for t in led_teams]

    return list(set(team_ids + led_team_ids))


def _is_team_leader(user: User, db: Session) -> bool:
    """Check if user has TEAM_LEADER role code."""
    role = db.query(Role).filter(Role.id == user.role_id).first()
    return role and role.code in ("TEAM_LEADER", "SEF_ECHIPA")


def _serialize_order(wo: WorkOrder, user_id: str, db: Session) -> dict:
    """Serialize a WorkOrder for the worker/leader view."""
    # Count photos
    photo_count = db.query(WorkOrderPhoto).filter(WorkOrderPhoto.work_order_id == wo.id).count()
    # My acknowledgement
    my_ack = db.query(WorkOrderAcknowledgement).filter(
        WorkOrderAcknowledgement.work_order_id == wo.id,
        WorkOrderAcknowledgement.user_id == user_id
    ).first()
    # My checkin
    my_checkin = db.query(WorkOrderCheckin).filter(
        WorkOrderCheckin.work_order_id == wo.id,
        WorkOrderCheckin.user_id == user_id,
        WorkOrderCheckin.checkout_at == None
    ).first()

    return {
        "id": wo.id,
        "token": wo.token,
        "title": wo.title,
        "notes": wo.notes,
        "start_date": str(wo.start_date) if wo.start_date else None,
        "deadline_date": str(wo.deadline_date) if wo.deadline_date else None,
        "site_address": wo.site_address or (wo.site.address if wo.site else None),
        "site_lat": (wo.site.latitude if wo.site else None) or wo.site_latitude,
        "site_lng": (wo.site.longitude if wo.site else None) or wo.site_longitude,
        "client_name": wo.client_name,
        "client_phone": wo.client_phone,
        "client_language": wo.client_language,
        "requirements": wo.requirements or [],
        "materials": wo.materials or [],
        "materials_consumed": wo.materials_consumed or [],
        "volumes": wo.volumes or [],
        "actual_surface_m2": wo.actual_surface_m2,
        "actual_sand_quantity": wo.actual_sand_quantity,
        "status": wo.status,
        "assigned_team_id": wo.assigned_team_id,
        "assigned_team_name": wo.assigned_team.name if wo.assigned_team else None,
        "assigned_vehicle_name": wo.assigned_vehicle.name if wo.assigned_vehicle else None,
        "assigned_vehicle_plate": wo.assigned_vehicle.plate_number if wo.assigned_vehicle else None,
        "min_photos_required": wo.min_photos_required,
        "photo_count": photo_count,
        "team_leader_accepted_at": wo.team_leader_accepted_at.isoformat() if wo.team_leader_accepted_at else None,
        "team_leader_confirmed_at": wo.team_leader_confirmed_at.isoformat() if wo.team_leader_confirmed_at else None,
        "team_leader_confirmation_note": wo.team_leader_confirmation_note,
        "checkin_at": wo.checkin_at.isoformat() if wo.checkin_at else None,
        "checkout_at": wo.checkout_at.isoformat() if wo.checkout_at else None,
        # Current user state
        "my_acknowledged": my_ack is not None,
        "my_acknowledged_at": my_ack.acknowledged_at.isoformat() if my_ack else None,
        "my_checkin_id": my_checkin.id if my_checkin else None,
        "my_checkin_at": my_checkin.checkin_at.isoformat() if my_checkin else None,
        "confirmed_at": wo.confirmed_at.isoformat() if wo.confirmed_at else None,
        "route_segments": wo.route_segments or [],
    }


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
def get_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returneaza comenzile alocate echipei mele (ca membru sau lider de echipa).
    """
    team_ids = _get_user_team_ids(db, current_user.id, current_user.organization_id)
    if not team_ids:
        return []

    orders = db.query(WorkOrder).filter(
        WorkOrder.organization_id == current_user.organization_id,
        WorkOrder.assigned_team_id.in_(team_ids),
        WorkOrder.status.notin_(["cancelled"])
    ).order_by(WorkOrder.start_date.asc()).all()

    return [_serialize_order(wo, current_user.id, db) for wo in orders]

@router.get("/sand-stations")
def get_worker_sand_stations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returnează stațiile de nisip active pentru a putea fi sugerate pe ruta șoferului/muncitorului."""
    from app.models import LogisticSandStation
    stations = db.query(LogisticSandStation).filter(
        LogisticSandStation.organization_id == current_user.organization_id
    ).all()
    return [
        {"id": s.id, "name": s.name, "latitude": s.latitude, "longitude": s.longitude, "address": s.address} 
        for s in stations
    ]


@router.get("/{order_id}")
def get_order_detail(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detaliul unei comenzi."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")
    return _serialize_order(wo, current_user.id, db)


@router.post("/{order_id}/acknowledge")
def acknowledge_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Muncitorul / Seful de echipa confirma ca a luat la cunostinta comanda.
    Seful de echipa marcheaza si acceptarea oficiala a comenzii.
    """
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    # Check duplicate
    existing = db.query(WorkOrderAcknowledgement).filter(
        WorkOrderAcknowledgement.work_order_id == order_id,
        WorkOrderAcknowledgement.user_id == current_user.id
    ).first()
    if existing:
        return {"message": "Deja confirmat.", "acknowledged_at": existing.acknowledged_at.isoformat()}

    is_leader = _is_team_leader(current_user, db)
    role_label = "team_leader" if is_leader else "worker"

    ack = WorkOrderAcknowledgement(
        id=str(uuid.uuid4()),
        work_order_id=order_id,
        user_id=current_user.id,
        role=role_label,
        acknowledged_at=datetime.utcnow()
    )
    db.add(ack)

    # Daca e seful de echipa, marcheaza acceptarea oficiala pe comanda
    if is_leader and not wo.team_leader_accepted_at:
        wo.team_leader_accepted_at = datetime.utcnow()
        wo.team_leader_accepted_by_id = current_user.id
        if wo.status == "draft":
            wo.status = "sent"

    db.commit()

    # Notificare Telegram (async, non-blocking)
    try:
        from app.services.telegram_notifier import notify_order_acknowledged
        notify_order_acknowledged(wo, current_user, role_label)
    except Exception:
        pass

    return {"message": "Confirmat cu succes.", "role": role_label}


class CheckinPayload(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None


@router.post("/{order_id}/checkin")
def checkin_order(
    order_id: str,
    payload: CheckinPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check-in GPS la locatia comenzii. Verifica distanta fata de adresa comenzii."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    # Check if already checked in (open checkin)
    open_checkin = db.query(WorkOrderCheckin).filter(
        WorkOrderCheckin.work_order_id == order_id,
        WorkOrderCheckin.user_id == current_user.id,
        WorkOrderCheckin.checkout_at == None
    ).first()
    if open_checkin:
        raise HTTPException(status_code=400, detail="Esti deja facut check-in la aceasta comanda.")

    # Verifica GPS match daca comanda are coordonate
    gps_match = None
    site_lat = (wo.site.latitude if wo.site else None) or wo.site_latitude
    site_lng = (wo.site.longitude if wo.site else None) or wo.site_longitude
    if site_lat and site_lng:
        distance = _haversine_distance(payload.latitude, payload.longitude, site_lat, site_lng)
        gps_match = distance <= 500  # 500m tolerance

    now = datetime.utcnow()
    checkin = WorkOrderCheckin(
        id=str(uuid.uuid4()),
        work_order_id=order_id,
        user_id=current_user.id,
        checkin_at=now,
        checkin_lat=payload.latitude,
        checkin_lng=payload.longitude,
        checkin_address=payload.address,
        gps_match=gps_match
    )
    db.add(checkin)

    # Prima sosire — actualizeaza snapshot-ul pe comanda
    if not wo.checkin_at:
        wo.checkin_at = now
        wo.checkin_lat = payload.latitude
        wo.checkin_lng = payload.longitude
        if wo.status in ("draft", "sent", "confirmed"):
            wo.status = "in_progress"

    db.commit()
    db.refresh(checkin)

    # Notificare Telegram
    try:
        from app.services.telegram_notifier import notify_checkin
        notify_checkin(wo, current_user, payload.latitude, payload.longitude, gps_match)
    except Exception:
        pass

    return {
        "checkin_id": checkin.id,
        "checkin_at": checkin.checkin_at.isoformat(),
        "gps_match": gps_match,
        "message": "Check-in inregistrat cu succes."
    }


@router.post("/{order_id}/checkout")
def checkout_order(
    order_id: str,
    payload: CheckinPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check-out GPS. Calculeaza minutele lucrate."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    open_checkin = db.query(WorkOrderCheckin).filter(
        WorkOrderCheckin.work_order_id == order_id,
        WorkOrderCheckin.user_id == current_user.id,
        WorkOrderCheckin.checkout_at == None
    ).first()
    if not open_checkin:
        raise HTTPException(status_code=400, detail="Nu esti facut check-in la aceasta comanda.")

    now = datetime.utcnow()
    delta = now - open_checkin.checkin_at
    worked_minutes = int(delta.total_seconds() / 60)

    open_checkin.checkout_at = now
    open_checkin.checkout_lat = payload.latitude
    open_checkin.checkout_lng = payload.longitude
    open_checkin.worked_minutes = worked_minutes

    # Actualizeaza snapshot-ul pe comanda
    wo.checkout_at = now
    wo.checkout_lat = payload.latitude
    wo.checkout_lng = payload.longitude

    db.commit()

    # Notificare Telegram
    try:
        from app.services.telegram_notifier import notify_checkout
        notify_checkout(wo, current_user, worked_minutes)
    except Exception:
        pass

    return {
        "checkout_at": now.isoformat(),
        "worked_minutes": worked_minutes,
        "message": "Check-out inregistrat. Ai lucrat {} ore {} minute.".format(
            worked_minutes // 60, worked_minutes % 60
        )
    }


@router.post("/{order_id}/photos")
async def upload_photo(
    order_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    photo_type: Optional[str] = Form("completion"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload foto la comanda.
    - Muncitor: photo_type='completion' (obligatorii, merg la client)
    - Sef echipa: photo_type='internal' (consum materiale, nu merg la client)
    """
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    if wo.status == "completed":
        raise HTTPException(status_code=400, detail="Comanda este deja finalizata.")

    # Seful de echipa poate adauga doar poze 'internal', 'machine_computer' sau 'completion'
    is_leader = _is_team_leader(current_user, db)
    if is_leader and photo_type not in ("internal", "completion", "machine_computer"):
        photo_type = "internal"
    if not is_leader and photo_type != "machine_computer":
        photo_type = "completion"

    # Valideaza tipul fisierului
    allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Doar imagini JPG, PNG sau WebP.")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Poza prea mare. Maxim 20MB.")

    ext = os.path.splitext(file.filename or "photo.jpg")[1].lower() or ".jpg"
    safe_filename = f"{uuid.uuid4().hex[:8]}{ext}"
    storage_path = f"work_orders/{order_id}/{safe_filename}"

    try:
        from app.storage import upload_file, get_content_type
        file_url = upload_file(content, storage_path, get_content_type(safe_filename))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare upload: {str(e)}")

    photo = WorkOrderPhoto(
        id=str(uuid.uuid4()),
        work_order_id=order_id,
        uploaded_by_id=current_user.id,
        photo_path=storage_path,
        description=description,
        file_size=len(content),
        photo_type=photo_type
    )
    db.add(photo)
    db.commit()

    # Count only completion photos for min_required check
    completion_count = db.query(WorkOrderPhoto).filter(
        WorkOrderPhoto.work_order_id == order_id,
        WorkOrderPhoto.photo_type == "completion"
    ).count()

    # OCR processing if machine_computer
    ocr_data = None
    if photo_type == "machine_computer":
        from app.services.vision_ocr import extract_machine_screen_data
        ocr_data = extract_machine_screen_data(image_bytes=content)
        if ocr_data and ocr_data.get('status') == 'success' or ocr_data.get('status') == 'mock':
            if ocr_data.get('sand_kg') is not None:
                wo.ai_sand_kg = ocr_data['sand_kg']
            if ocr_data.get('cement_kg') is not None:
                wo.ai_cement_kg = ocr_data['cement_kg']
            db.commit()

    return {
        "photo_id": photo.id,
        "photo_url": file_url,
        "photo_type": photo_type,
        "completion_count": completion_count,
        "min_required": wo.min_photos_required,
        "can_close": completion_count >= wo.min_photos_required,
        "ocr_data": ocr_data
    }


@router.post("/{order_id}/photos/{photo_id}/re-ocr")
def re_ocr_photo(
    order_id: str,
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reface analiza OCR pentru o poza existenta (calculator masina)."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    photo = db.query(WorkOrderPhoto).filter(
        WorkOrderPhoto.id == photo_id,
        WorkOrderPhoto.work_order_id == order_id
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Poza nu a fost gasita.")

    from app.storage import get_file_url
    import requests
    
    url = get_file_url(photo.photo_path)
    try:
        res = requests.get(url)
        res.raise_for_status()
        content = res.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare la descarcarea pozei: {str(e)}")

    from app.services.vision_ocr import extract_machine_screen_data
    ocr_data = extract_machine_screen_data(image_bytes=content)
    
    if ocr_data and (ocr_data.get('status') == 'success' or ocr_data.get('status') == 'mock'):
        if ocr_data.get('sand_kg') is not None:
            wo.ai_sand_kg = ocr_data['sand_kg']
        if ocr_data.get('cement_kg') is not None:
            wo.ai_cement_kg = ocr_data['cement_kg']
        db.commit()

    return {"ocr_data": ocr_data, "message": "Analiza AI completată."}

@router.get("/{order_id}/photos")
def get_photos(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista pozelor uploadate la o comanda."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    from app.storage import get_file_url
    photos = db.query(WorkOrderPhoto).filter(WorkOrderPhoto.work_order_id == order_id).all()
    return [{
        "id": p.id,
        "url": get_file_url(p.photo_path),
        "description": p.description,
        "photo_type": p.photo_type or "completion",
        "uploaded_at": p.uploaded_at.isoformat(),
        "uploaded_by_id": p.uploaded_by_id
    } for p in photos]

@router.get("/{order_id}/documents")
def get_documents(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista documentelor/planurilor descarcate din Robaws sau incarcate manual."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    from app.storage import get_file_url
    docs = db.query(WorkOrderDocument).filter(WorkOrderDocument.work_order_id == order_id).all()
    return [{
        "id": d.id,
        "url": get_file_url(d.file_path),
        "filename": d.filename,
        "file_size": d.file_size,
        "content_type": d.content_type,
        "uploaded_at": d.uploaded_at.isoformat()
    } for d in docs]

@router.post("/{order_id}/reopen")
def reopen_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Muncitorul anuleaza finalizarea comenzii."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    if wo.status != "completed":
        raise HTTPException(status_code=400, detail="Doar comenzile finalizate dar inca netrimise pot fi redeschise.")

    wo.status = "in_progress"
    db.commit()
    return {"message": "Comanda a fost redeschisa cu succes."}


class CloseOrderPayload(BaseModel):
    materials_consumed: Optional[list] = []
    volumes: Optional[list] = []
    notes: Optional[str] = None
    actual_surface_m2: Optional[float] = None
    actual_sand_quantity: Optional[float] = None


@router.post("/{order_id}/close")
def close_order(
    order_id: str,
    payload: CloseOrderPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Muncitorul inchide comanda cu cantitatile reale.
    Necesita minim min_photos_required poze uploadate.
    """
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    if wo.status == "completed":
        raise HTTPException(status_code=400, detail="Comanda este deja finalizata.")

    # Verifica numarul minim de poze de tip 'completion' (nu cele interne)
    completion_count = db.query(WorkOrderPhoto).filter(
        WorkOrderPhoto.work_order_id == order_id,
        WorkOrderPhoto.photo_type == "completion"
    ).count()
    if completion_count < wo.min_photos_required:
        raise HTTPException(
            status_code=400,
            detail=f"Trebuie sa uploadezi minim {wo.min_photos_required} poze de finalizare inainte de inchidere. Ai {completion_count}."
        )

    wo.materials_consumed = payload.materials_consumed or wo.materials_consumed
    if payload.volumes:
        wo.volumes = payload.volumes
    if payload.notes:
        wo.notes = (wo.notes or "") + f"\n[Muncitor la finalizare]: {payload.notes}"
    if payload.actual_surface_m2 is not None:
        wo.actual_surface_m2 = payload.actual_surface_m2
    if payload.actual_sand_quantity is not None:
        wo.actual_sand_quantity = payload.actual_sand_quantity
    wo.status = "completed"
    wo.updated_at = datetime.utcnow()

    db.commit()

    # Notificare Telegram
    try:
        from app.services.telegram_notifier import notify_order_closed
        notify_order_closed(wo, current_user)
    except Exception:
        pass

    return {"message": "Comanda finalizata cu succes. Adminul va trimite link-ul clientului pentru semnatura."}


class LeaderConfirmPayload(BaseModel):
    note: Optional[str] = None


@router.post("/{order_id}/leader-confirm")
def leader_confirm(
    order_id: str,
    payload: LeaderConfirmPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Seful de echipa confirma (optional) ca datele muncitorului sunt corecte."""
    if not _is_team_leader(current_user, db):
        raise HTTPException(status_code=403, detail="Doar seful de echipa poate confirma.")

    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    wo.team_leader_confirmed_at = datetime.utcnow()
    wo.team_leader_confirmed_by_id = current_user.id
    wo.team_leader_confirmation_note = payload.note
    db.commit()

    return {"message": "Confirmare inregistrata.", "confirmed_at": wo.team_leader_confirmed_at.isoformat()}


@router.get("/{order_id}/checkins")
def get_checkins(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Istoricul check-in/out pentru o comanda (vizibil sefului de echipa si adminului)."""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == order_id,
        WorkOrder.organization_id == current_user.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita.")

    checkins = db.query(WorkOrderCheckin).filter(WorkOrderCheckin.work_order_id == order_id).all()
    result = []
    for c in checkins:
        user = db.query(User).filter(User.id == c.user_id).first()
        result.append({
            "id": c.id,
            "user_id": c.user_id,
            "user_name": user.full_name if user else "Necunoscut",
            "checkin_at": c.checkin_at.isoformat(),
            "checkin_lat": c.checkin_lat,
            "checkin_lng": c.checkin_lng,
            "checkin_address": c.checkin_address,
            "gps_match": c.gps_match,
            "checkout_at": c.checkout_at.isoformat() if c.checkout_at else None,
            "worked_minutes": c.worked_minutes,
        })
    return result

@router.delete("/{order_id}/photos/{photo_id}")
def delete_worker_photo(
    order_id: str,
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Muncitorul sterge o poza incarcata de el din comanda."""
    from app.storage import delete_file
    photo = db.query(WorkOrderPhoto).filter(
        WorkOrderPhoto.id == photo_id,
        WorkOrderPhoto.work_order_id == order_id
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Poza nu a fost gasita.")
    
    try:
        delete_file(photo.photo_path)
    except Exception:
        pass
    
    db.delete(photo)
    db.commit()
    return {"message": "Poza a fost stearsa."}

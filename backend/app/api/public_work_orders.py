"""
public_work_orders.py — Endpoint-uri publice (fără autentificare) pentru confirmarea comenzilor de lucru.
Clientul accesează pagina cu tokenul unic, vede detaliile și confirmă.
"""

import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from deep_translator import GoogleTranslator

from app.database import get_db
from app.models import WorkOrder, Organization, User, WorkOrderPhoto, TeamMember, Team, WorkOrderDocument, WorkOrderMessage
from app.storage import get_file_url, upload_file, get_content_type
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
        "org_timezone": org.timezone if org and org.timezone and org.timezone != "auto" else "Europe/Brussels",
        # Comanda
        "id": wo.id,
        "title": wo.title,
        "created_at": wo.created_at.isoformat() if wo.created_at else None,
        "updated_at": wo.updated_at.isoformat() if wo.updated_at else None,
        "notes": wo.notes,
        "start_date": str(wo.start_date) if wo.start_date else None,
        "start_time": wo.start_time,
        "deadline_date": str(wo.deadline_date) if wo.deadline_date else None,
        "approximate_date": str(wo.approximate_date) if wo.approximate_date else None,
        "site_name": site_name,
        "site_address": site_address,
        "site_lat": wo.site.latitude if wo.site else None,
        "site_lon": wo.site.longitude if wo.site else None,
        "client_name": wo.client_name,
        "client_email": wo.client_email,
        "client_phone": wo.client_phone,
        "client_cui": wo.client.cui if wo.client else None,
        "client_reg_com": wo.client.reg_com if wo.client else None,
        "client_address": wo.client.address if wo.client else None,
        "client_type": wo.client.client_type if wo.client else "fizica",
        "work_type": wo.work_type,
        "requirements": wo.requirements or [],
        # Hide any material or volume containing 'nisip'/'sand'/'zand' for the public client quote
        "materials": [m for m in (wo.materials or []) if not any(x in str(m.get("name", "")).lower() for x in ["nisip", "sand", "zand", "sable"])],
        "volumes": [v for v in (wo.volumes or []) if not any(x in str(v.get("label", "")).lower() for x in ["nisip", "sand", "zand", "sable"])],
        "actual_surface_m2": wo.actual_surface_m2,
        "status": wo.status,
        "confirmed_at": wo.confirmed_at.isoformat() + "Z" if wo.confirmed_at else None,
        "confirmed_by_name": wo.confirmed_by_name,
        "client_signature": wo.client_signature,
        "date_confirmed_at": wo.date_confirmed_at.isoformat() + "Z" if wo.date_confirmed_at else None,
        "reschedule_requested": getattr(wo, "reschedule_requested", False),
        "final_confirmed_at": wo.final_confirmed_at.isoformat() + "Z" if wo.final_confirmed_at else None,
        "final_confirmed_by_name": wo.final_confirmed_by_name,
        "final_client_signature": wo.final_client_signature,
        "estimated_price": wo.estimated_price,
        "prices": wo.prices,
        "quote_number": wo.quote_number,
        "final_invoice_path": get_file_url(wo.final_invoice_path) if wo.final_invoice_path else None,
        "completion_photos": [
            {
                "id": p.id,
                "photo_url": get_file_url(p.photo_path),
                "description": p.description,
                "uploaded_at": p.uploaded_at.isoformat()
            }
            for p in wo.photos if p.photo_type == "completion"
        ] if wo.status == "completed" and getattr(wo, "photos", None) else [],
        "client_documents": [
            {
                "id": d.id,
                "filename": d.filename,
                "file_url": get_file_url(d.file_path),
                "uploaded_at": d.uploaded_at.isoformat()
            }
            for d in wo.documents if d.source == "client"
        ] if getattr(wo, "documents", None) else []
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
    if not wo or wo.status == 'deleted':
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită sau link-ul este invalid.")
    # Permitem vizualizarea și pentru draft (Deviz)
    
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
    if not wo or wo.status == 'deleted':
        raise HTTPException(status_code=404, detail="Proforma nu a fost găsită sau link-ul este invalid.")
    
    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    return {
        "workOrderData": _public_serialize(wo, org),
        "config": getattr(wo, 'proforma_data', None)
    }


# ──────────────────────────────────────────────────────────────────────────────
# POST — Confirmare comandă de către client
# ──────────────────────────────────────────────────────────────────────────────
class ConfirmPayload(BaseModel):
    confirmed_by_name: Optional[str] = None
    client_signature: Optional[str] = None   # Base64 PNG din canvas
    mode: Optional[str] = 'quote'            # 'quote', 'final', sau 'date'

class ReschedulePayload(BaseModel):
    requested_date: Optional[str] = None
    reason: Optional[str] = None

@router.post("/public/work-orders/{token}/reschedule")
def request_reschedule(token: str, payload: ReschedulePayload, request: Request, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
        
    wo.reschedule_requested = True
    wo.reschedule_reason = payload.reason
    if payload.requested_date:
        from datetime import datetime
        try:
            wo.reschedule_requested_date = datetime.strptime(payload.requested_date, '%Y-%m-%d').date()
        except ValueError:
            pass
            
    db.commit()
    db.refresh(wo)
    
    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    return _public_serialize(wo, org)

@router.post("/public/work-orders/{token}/confirm")
def confirm_work_order(
    token: str,
    payload: ConfirmPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Clientul confirmă oferta (Deviz) sau lucrarea finalizată.
    """
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
        
    client_ip = request.client.host if request.client else None
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    if payload.mode == "final":
        if wo.final_confirmed_at:
            raise HTTPException(status_code=400, detail="Lucrarea finalizată a fost deja confirmată.")
        
        wo.final_confirmed_at = datetime.utcnow()
        wo.final_confirmed_by_name = payload.confirmed_by_name or wo.client_name
        wo.final_confirmed_ip = client_ip
        if payload.client_signature:
            wo.final_client_signature = payload.client_signature
    elif payload.mode == "date":
        if wo.date_confirmed_at:
            raise HTTPException(status_code=400, detail="Data a fost deja confirmată.")
        wo.date_confirmed_at = datetime.utcnow()
        wo.date_confirmed_ip = client_ip
        
        hist = list(wo.date_history) if wo.date_history else []
        hist.append({
            "action": "confirmed_by_client",
            "timestamp": datetime.utcnow().isoformat(),
            "client_name": payload.confirmed_by_name or wo.client_name,
            "ip": client_ip
        })
        wo.date_history = hist
        
        # Trimitem și un mesaj automat în chat pentru a notifica adminul
        sys_msg = WorkOrderMessage(
            work_order_id=wo.id,
            sender="system",
            message=f"✅ La date d'intervention ({wo.start_date.strftime('%d.%m.%Y') if wo.start_date else ''}) a été confirmée par le client.",
            is_read_by_admin=False
        )
        db.add(sys_msg)
    else:
        # Mod "quote"
        if wo.status == "cancelled":
            raise HTTPException(status_code=400, detail="Comanda a fost anulată.")
        if wo.status not in ["draft", "sent"]:
            # Dacă e deja confirmed, in_progress, completed, nu mai dăm eroare dacă vrea doar să o vadă confirmată
            pass
        else:
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

@router.post("/public/work-orders/{token}/documents")
async def upload_public_documents(
    token: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    import os
    import uuid
    from app.storage import upload_file, get_content_type

    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost gasita sau link-ul este invalid.")

    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Poti incarca maxim 10 fisiere odata.")

    uploaded_docs = []
    
    for file in files:
        allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"}
        if file.content_type not in allowed:
            continue
            
        content = await file.read()
        if len(content) > 20 * 1024 * 1024:
            continue

        ext = os.path.splitext(file.filename or "doc.pdf")[1].lower() or ".pdf"
        safe_filename = f"{uuid.uuid4().hex[:8]}{ext}"
        storage_path = f"work_orders/{wo.id}/{safe_filename}"
        
        try:
            file_url = upload_file(content, storage_path, get_content_type(safe_filename))
            doc = WorkOrderDocument(
                id=str(uuid.uuid4()),
                work_order_id=wo.id,
                filename=file.filename or safe_filename,
                file_path=storage_path,
                file_size=len(content),
                content_type=file.content_type,
                source="client"
            )
            db.add(doc)
            uploaded_docs.append({
                "id": doc.id,
                "filename": doc.filename,
                "url": file_url,
                "size": doc.file_size,
                "uploaded_at": datetime.utcnow().isoformat()
            })
        except Exception as e:
            print(f"Eroare upload fisier {file.filename}: {str(e)}")

    db.commit()
    return {"message": f"{len(uploaded_docs)} documente incarcate cu succes.", "documents": uploaded_docs}

# ──────────────────────────────────────────────────────────────────────────────
# Chat Messages (Admin ↔ Client) Public Access
# ──────────────────────────────────────────────────────────────────────────────

from app.models import WorkOrderMessage

@router.get("/public/work-orders/{token}/messages")
def get_public_work_order_messages(
    token: str,
    db: Session = Depends(get_db)
):
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo or wo.status == 'deleted':
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    messages = db.query(WorkOrderMessage).filter(WorkOrderMessage.work_order_id == wo.id).order_by(WorkOrderMessage.created_at.asc()).all()
    
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
            "reactions": m.reactions
        } for m in messages if m.sender != "system" and not getattr(m, 'is_hidden', False)
    ]
    
    return initial_messages + db_messages

class PublicMessageCreate(BaseModel):
    message: str

@router.post("/public/work-orders/{token}/messages")
def post_public_work_order_message(
    token: str,
    payload: PublicMessageCreate,
    db: Session = Depends(get_db)
):
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    if getattr(wo, 'is_chat_closed', False):
        raise HTTPException(status_code=403, detail="Chat is closed")
        
    translations = {}
    try:
        # Auto-translate client message to Romanian for the admin
        translated = GoogleTranslator(source='auto', target='ro').translate(payload.message)
        translations['ro'] = translated
    except Exception as e:
        print(f"Translation failed: {e}")

    msg = WorkOrderMessage(
        work_order_id=wo.id,
        sender="client",
        message=payload.message,
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

@router.post("/public/work-orders/{token}/messages/{msg_id}/react")
def toggle_public_work_order_message_reaction(
    token: str,
    msg_id: str,
    payload: ReactionToggle,
    db: Session = Depends(get_db)
):
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    msg = db.query(WorkOrderMessage).filter(WorkOrderMessage.id == msg_id, WorkOrderMessage.work_order_id == wo.id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    reactions = msg.reactions or {}
    emoji = payload.emoji
    
    # Check if they are toggling off their current reaction
    was_toggling_off = False
    if emoji in reactions and "client" in reactions[emoji]:
        was_toggling_off = True
        
    # Remove 'client' from ALL emojis (max 1 reaction per user)
    for e in list(reactions.keys()):
        if "client" in reactions[e]:
            reactions[e].remove("client")
            if not reactions[e]:
                del reactions[e]
                
    # If they weren't toggling off, add the new reaction
    if not was_toggling_off:
        if emoji not in reactions:
            reactions[emoji] = []
        reactions[emoji].append("client")
    msg.reactions = reactions
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(msg, "reactions")
    
    db.commit()
    db.refresh(msg)
    
    return {
        "id": msg.id,
        "reactions": msg.reactions
    }

@router.delete("/public/work-orders/{token}/messages/{msg_id}")
def delete_public_work_order_message(
    token: str,
    msg_id: str,
    db: Session = Depends(get_db)
):
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    msg = db.query(WorkOrderMessage).filter(WorkOrderMessage.id == msg_id, WorkOrderMessage.work_order_id == wo.id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if msg.sender != 'client':
        raise HTTPException(status_code=403, detail="Cannot delete admin messages")
        
    db.delete(msg)
    db.commit()
    return {"message": "Mesajul a fost șters cu succes."}

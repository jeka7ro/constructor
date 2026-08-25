"""
Partner Work Orders API
CRUD operations for partner-created work orders.
All queries are filtered by the partner's client_id for strict isolation.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List
import secrets

from app.database import get_db
from app.models import Admin, Client, WorkOrder, WorkOrderPhoto, WorkOrderDocument, Organization, Team
from app.api.partner_auth import get_current_partner
from app.storage import get_file_url

router = APIRouter()


# ── Pydantic Models ──

class SurfaceItem(BaseModel):
    label: Optional[str] = "Surface"
    quantity: float
    unit: str = "m²"
    thickness: Optional[float] = 7
    has_foil: bool = False
    has_mesh: bool = False
    has_duramint: bool = True


class PartnerCreateWorkOrder(BaseModel):
    site_address: str
    work_type: str = "new"  # "new" or "repair"
    start_date: Optional[str] = None  # YYYY-MM-DD
    notes: Optional[str] = None
    surfaces: List[SurfaceItem] = []
    # Legacy single surface
    surface: Optional[float] = None
    thickness: Optional[float] = None
    has_foil: bool = False
    has_mesh: bool = False
    has_duramint: bool = True


class PartnerUpdateWorkOrder(BaseModel):
    site_address: Optional[str] = None
    work_type: Optional[str] = None
    start_date: Optional[str] = None
    deadline_date: Optional[str] = None
    notes: Optional[str] = None
    surfaces: Optional[List[SurfaceItem]] = None
    surface: Optional[float] = None
    thickness: Optional[float] = None
    has_foil: Optional[bool] = None
    has_mesh: Optional[bool] = None
    has_duramint: Optional[bool] = None
    assigned_team_id: Optional[str] = None
    duration_days: Optional[int] = None
    start_time: Optional[str] = None
    status: Optional[str] = None
    send_notification: Optional[bool] = False


def _build_volumes(payload):
    """Build volumes array from surfaces or legacy single surface"""
    volumes = []
    if payload.surfaces and len(payload.surfaces) > 0:
        for i, s in enumerate(payload.surfaces):
            volumes.append({
                "label": s.label or f"Surface {i+1}",
                "quantity": s.quantity,
                "unit": s.unit or "m²",
                "thickness": s.thickness or 7,
                "has_foil": s.has_foil,
                "has_mesh": s.has_mesh,
                "has_duramint": s.has_duramint,
            })
    elif payload.surface and payload.surface > 0:
        volumes.append({
            "label": "Chape",
            "quantity": payload.surface,
            "unit": "m²",
            "thickness": payload.thickness or 7,
            "has_foil": payload.has_foil,
            "has_mesh": payload.has_mesh,
            "has_duramint": payload.has_duramint,
        })
    return volumes


def _serialize_wo(wo):
    """Serialize a work order for partner view — NO prices, NO chat, NO cost.
    INCLUDES: photos, actual surfaces, team leader confirmation (visible post-completion).
    """
    vols = wo.volumes or []
    total_surface = sum(float(v.get('quantity', 0)) for v in vols if v.get('unit') == 'm²')
    
    # Photos — all types visible to partner (instruction, internal, completion)
    photos = []
    if wo.photos:
        for p in wo.photos:
            photos.append({
                "id": p.id,
                "photo_path": get_file_url(p.photo_path) if p.photo_path else None,
                "thumbnail_path": get_file_url(p.thumbnail_path) if p.thumbnail_path else None,
                "description": p.description,
                "photo_type": p.photo_type,
                "uploaded_at": p.uploaded_at.isoformat() if p.uploaded_at else None,
            })
    
    # Admin Documents
    documents = []
    if getattr(wo, 'documents', None):
        for d in wo.documents:
            documents.append({
                "id": d.id,
                "filename": d.filename,
                "file_path": get_file_url(d.file_path) if d.file_path else None,
                "file_size": d.file_size,
                "content_type": d.content_type,
                "source": getattr(d, 'source', 'admin'),
                "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            })
            
    # Team info
    team_name = None
    team_color = None
    if wo.assigned_team and wo.assigned_team.name:
        team_name = wo.assigned_team.name
        team_color = wo.assigned_team.color
    
    return {
        "id": wo.id,
        "title": wo.title,
        "site_address": wo.site_address,
        "site_latitude": wo.site_latitude,
        "site_longitude": wo.site_longitude,
        "work_type": wo.work_type,
        "quote_number": wo.quote_number,
        "start_date": str(wo.start_date) if wo.start_date else None,
        "start_time": str(wo.start_time) if wo.start_time else None,
        "status": wo.status,
        "notes": wo.notes,
        "volumes": vols,
        "total_surface": total_surface,
        "client_name": wo.client_name,
        "assigned_team_id": wo.assigned_team_id,
        "team_name": team_name,
        "assigned_team_color": team_color,
        "duration_days": getattr(wo, 'duration_days', 1),
        # Actual surfaces (filled by team leader at completion)
        "actual_surface_m2": wo.actual_surface_m2,
        "actual_thickness_cm": wo.actual_thickness_cm,
        # Photos
        "photos": photos,
        "documents": documents,
        # Check-in / Check-out timestamps
        "checkin_at": wo.checkin_at.isoformat() if wo.checkin_at else None,
        "checkout_at": wo.checkout_at.isoformat() if wo.checkout_at else None,
        # Team leader confirmation
        "team_leader_confirmed_at": wo.team_leader_confirmed_at.isoformat() if wo.team_leader_confirmed_at else None,
        "team_leader_confirmation_note": wo.team_leader_confirmation_note,
        # Final client confirmation
        "final_confirmed_at": wo.final_confirmed_at.isoformat() if wo.final_confirmed_at else None,
        "final_confirmed_by_name": wo.final_confirmed_by_name,
        # Meta
        "created_at": wo.created_at.isoformat() if wo.created_at else None,
        "updated_at": wo.updated_at.isoformat() if wo.updated_at else None,
    }


# ── Routes ──

@router.get("/teams")
def get_partner_teams(partner: Admin = Depends(get_current_partner), db: Session = Depends(get_db)):
    """Get active teams for the partner (to assign orders)"""
    query = db.query(Team).filter(
        Team.organization_id == partner.organization_id,
        Team.is_active == True
    )
    
    if partner.allowed_team_ids and len(partner.allowed_team_ids) > 0:
        query = query.filter(Team.id.in_(partner.allowed_team_ids))
        
    teams = query.all()
    
    return [
        {
            "id": t.id,
            "name": t.name,
            "color": t.color
        }
        for t in teams
    ]


@router.get("/work-orders")
def list_partner_work_orders(partner: Admin = Depends(get_current_partner), db: Session = Depends(get_db)):
    """List only work orders created by this partner — NOT all client work orders"""
    orders = db.query(WorkOrder).options(
        joinedload(WorkOrder.photos),
        joinedload(WorkOrder.assigned_team),
        joinedload(WorkOrder.documents)
    ).filter(
        WorkOrder.organization_id == partner.organization_id,
        WorkOrder.client_id == partner.client_id,
        WorkOrder.source_system == "partner",
        WorkOrder.status.notin_(["cancelled", "deleted"])
    ).order_by(WorkOrder.start_date.desc().nullslast(), WorkOrder.created_at.desc()).all()
    
    return [_serialize_wo(wo) for wo in orders]


@router.get("/work-orders/{wo_id}")
def get_partner_work_order(wo_id: str, partner: Admin = Depends(get_current_partner), db: Session = Depends(get_db)):
    """Get a single work order — only if it belongs to this partner"""
    wo = db.query(WorkOrder).options(
        joinedload(WorkOrder.photos),
        joinedload(WorkOrder.assigned_team),
        joinedload(WorkOrder.documents)
    ).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == partner.organization_id,
        WorkOrder.client_id == partner.client_id,
        WorkOrder.source_system == "partner"
    ).first()
    
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    return _serialize_wo(wo)


@router.post("/work-orders")
def create_partner_work_order(
        payload: PartnerCreateWorkOrder,
        request: Request,
        partner: Admin = Depends(get_current_partner),
        db: Session = Depends(get_db)
    ):
    """Create a new work order — automatically linked to the partner's company"""
    try:
        client = db.query(Client).filter(Client.id == partner.client_id).first()
        if not client:
            raise HTTPException(status_code=400, detail="Partner company not found")
        
        volumes = _build_volumes(payload)
        
        # Parse start_date and start_time
        parsed_date = None
        parsed_time = None
        if payload.start_date:
            try:
                date_str = payload.start_date.split('T')[0]
                parsed_date = date.fromisoformat(date_str)
                if 'T' in payload.start_date:
                    time_part = payload.start_date.split('T')[1]
                    # truncate to HH:MM
                    parsed_time = time_part[:5] if len(time_part) >= 5 else None
            except ValueError:
                pass
        
        wo = WorkOrder(
            organization_id=partner.organization_id,
            token=secrets.token_urlsafe(32),
            title=f"Commande partenaire - {client.name}",
            is_quote=True,
            status="planning" if parsed_date else "pending",
            work_type=payload.work_type or "new",
            site_address=payload.site_address,
            start_date=parsed_date,
            start_time=parsed_time,
            approximate_date=payload.start_date.split('T')[0] if payload.start_date else None,
            notes=payload.notes,
            client_id=client.id,
            client_name=client.name,
            client_email=client.email,
            client_phone=client.phone,
            client_language=client.preferred_language or "fr",
            volumes=volumes,
            source_system="partner",
            created_by=partner.id,
        )
        
        db.add(wo)
        db.commit()
        db.refresh(wo)
        
        # Audit
        from app.services.audit_service import log_audit
        log_audit(
            db=db,
            organization_id=partner.organization_id,
            admin_id=partner.id,
            action="PARTNER_CREATE_WO",
            details={
                "work_order_id": wo.id,
                "partner": partner.full_name,
                "client": client.name,
                "address": payload.site_address,
            }
        )
        
        return _serialize_wo(wo)
    except Exception as e:
        import traceback
        with open('error_debug.txt', 'a') as f:
            f.write(traceback.format_exc() + '\n')
        raise


@router.put("/work-orders/{wo_id}")
def update_partner_work_order(
    wo_id: str,
    payload: PartnerUpdateWorkOrder,
    partner: Admin = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Update a work order — only if it belongs to this partner"""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == partner.organization_id,
        WorkOrder.client_id == partner.client_id
    ).first()
    
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    if payload.site_address is not None:
        wo.site_address = payload.site_address
    
    if payload.work_type is not None:
        wo.work_type = payload.work_type
    
    if payload.start_date is not None:
        try:
            date_str = payload.start_date.split("T")[0] if payload.start_date else None
            wo.start_date = date.fromisoformat(date_str) if date_str else None
            if wo.status in ["draft", "planning", "pending"]:
                wo.status = "planning" if wo.start_date else "pending"
        except ValueError:
            pass

    if payload.deadline_date is not None:
        try:
            deadline_str = payload.deadline_date.split("T")[0] if payload.deadline_date else None
            wo.deadline_date = date.fromisoformat(deadline_str) if deadline_str else None
        except ValueError:
            pass
    
    if payload.notes is not None:
        wo.notes = payload.notes
    
    if payload.assigned_team_id is not None:
        if payload.assigned_team_id == "":
            wo.assigned_team_id = None
        else:
            wo.assigned_team_id = payload.assigned_team_id
            
    if payload.duration_days is not None:
        wo.duration_days = payload.duration_days
    
    if payload.start_time is not None:
        wo.start_time = payload.start_time
        
    if payload.status is not None:
        wo.status = payload.status
    
    # Rebuild volumes if surfaces provided
    if payload.surfaces is not None:
        wo.volumes = _build_volumes(payload)
    elif payload.surface is not None:
        wo.volumes = _build_volumes(payload)
    
    db.commit()
    
    if payload.send_notification:
        from app.services.email_service import send_admin_partner_reschedule_alert
        org_admins = db.query(Admin).filter(
            Admin.organization_id == partner.organization_id,
            Admin.role.in_(['owner', 'admin'])
        ).all()
        for adm in org_admins:
            if adm.email:
                send_admin_partner_reschedule_alert(
                    admin_email=adm.email,
                    partner_name=partner.full_name or "Partenaire",
                    client_name=wo.client_name,
                    address=wo.site_address,
                    new_date=str(wo.start_date) if wo.start_date else "",
                    new_time=wo.start_time,
                    org_id=wo.organization_id,
                    wo_id=wo.id
                )
    
    return _serialize_wo(wo)


@router.delete("/work-orders/{wo_id}")
def delete_partner_work_order(
    wo_id: str,
    partner: Admin = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Delete a work order — only if it belongs to this partner"""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == partner.organization_id,
        WorkOrder.client_id == partner.client_id
    ).first()
    
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    # Audit before deletion
    from app.services.audit_service import log_audit
    log_audit(
        db=db,
        organization_id=partner.organization_id,
        admin_id=partner.id,
        action="PARTNER_DELETE_WO",
        details={
            "work_order_id": wo.id,
            "partner": partner.full_name,
            "address": wo.site_address,
        }
    )
    
    db.delete(wo)
    db.commit()
    
    return {"message": "Work order deleted successfully"}


# ── Partner Attachments (PDF / Photos) ──

import os
import uuid as _uuid
from fastapi import UploadFile, File

PARTNER_UPLOAD_DIR = "uploads/partner_attachments"
os.makedirs(PARTNER_UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.bmp', '.tiff'}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/work-orders/{wo_id}/attachments")
async def upload_partner_attachment(
    wo_id: str,
    file: UploadFile = File(...),
    description: str = None,
    partner: Admin = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Upload a PDF or image attachment to a work order"""
    # Verify ownership
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == partner.organization_id,
        WorkOrder.client_id == partner.client_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    # Validate extension
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Type de fichier non autorisé. Extensions acceptées: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Read file
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Le fichier dépasse la taille maximale de 20 MB")
    
    # Save file to Supabase Storage
    safe_filename = f"partner_doc_{_uuid.uuid4().hex[:8]}{ext}"
    storage_path = f"partner_attachments/{wo_id}/{safe_filename}"
    
    try:
        from app.storage import upload_file, get_content_type
        file_url = upload_file(contents, storage_path, get_content_type(safe_filename))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    # Create DB record using WorkOrderDocument
    attachment = WorkOrderDocument(
        work_order_id=wo_id,
        filename=file.filename,
        file_path=storage_path,
        file_size=len(contents),
        content_type=get_content_type(safe_filename),
        source="partner",
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    
    return {
        "id": attachment.id,
        "filename": attachment.filename,
        "file_path": get_file_url(attachment.file_path) if attachment.file_path else None,
        "file_size": attachment.file_size,
        "content_type": attachment.content_type,
        "source": attachment.source,
        "uploaded_at": attachment.uploaded_at.isoformat() if attachment.uploaded_at else None,
    }


@router.get("/work-orders/{wo_id}/attachments")
def list_partner_attachments(
    wo_id: str,
    partner: Admin = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """List all partner-uploaded attachments for a work order"""
    # Verify ownership
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == partner.organization_id,
        WorkOrder.client_id == partner.client_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    attachments = db.query(WorkOrderDocument).filter(
        WorkOrderDocument.work_order_id == wo_id,
        WorkOrderDocument.source == "partner"
    ).order_by(WorkOrderDocument.uploaded_at.desc()).all()
    
    return [{
        "id": a.id,
        "filename": a.filename,
        "file_path": get_file_url(a.file_path) if a.file_path else None,
        "file_size": a.file_size,
        "content_type": a.content_type,
        "source": a.source,
        "uploaded_at": a.uploaded_at.isoformat() if a.uploaded_at else None,
    } for a in attachments]


@router.delete("/work-orders/{wo_id}/attachments/{attachment_id}")
def delete_partner_attachment(
    wo_id: str,
    attachment_id: str,
    partner: Admin = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Delete a partner-uploaded attachment"""
    # Verify ownership
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == partner.organization_id,
        WorkOrder.client_id == partner.client_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    attachment = db.query(WorkOrderDocument).filter(
        WorkOrderDocument.id == attachment_id,
        WorkOrderDocument.work_order_id == wo_id,
        WorkOrderDocument.source == "partner"
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    # Delete from Supabase Storage
    try:
        if attachment.file_path:
            from app.storage import delete_file
            delete_file(attachment.file_path)
    except Exception as e:
        print(f"Failed to delete file from storage: {e}")
    db.delete(attachment)
    db.commit()
    
    return {"message": "Attachment deleted successfully"}

# ── Chat Messages (Partner) ──

from app.models import WorkOrderMessage

class PartnerMessageCreate(BaseModel):
    message: str

@router.get("/work-orders/{wo_id}/messages")
def get_partner_work_order_messages(
    wo_id: str,
    partner: Admin = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get chat messages for a specific partner work order"""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == partner.organization_id,
        WorkOrder.client_id == partner.client_id
    ).first()
    
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    messages = db.query(WorkOrderMessage).filter(
        WorkOrderMessage.work_order_id == wo_id,
        WorkOrderMessage.is_hidden == False
    ).order_by(WorkOrderMessage.created_at.asc()).all()
    
    return [
        {
            "id": m.id,
            "sender": m.sender,
            "sender_name": m.sender_name,
            "message": m.message,
            "created_at": (m.created_at.isoformat() + "Z") if m.created_at else "",
            "attachments": m.attachments or []
        } for m in messages
    ]

@router.post("/work-orders/{wo_id}/messages")
def post_partner_work_order_message(
    wo_id: str,
    payload: PartnerMessageCreate,
    partner: Admin = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Post a new message to a work order from a partner"""
    wo = db.query(WorkOrder).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == partner.organization_id,
        WorkOrder.client_id == partner.client_id
    ).first()
    
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    if getattr(wo, 'is_chat_closed', False):
        raise HTTPException(status_code=403, detail="Chat is closed")
        
    client = db.query(Client).filter(Client.id == partner.client_id).first()
    sender_name = client.name if client else partner.name

    translations = {}
    
    try:
        import time
        from deep_translator import GoogleTranslator
        for attempt in range(3):
            try:
                translated = GoogleTranslator(source='auto', target='ro').translate(payload.message)
                if translated and ("Error 500" in translated or "That's an error" in translated or "Server Error" in translated):
                    time.sleep(1)
                    continue
                translations['ro'] = translated
                break
            except Exception as retry_err:
                if attempt < 2:
                    time.sleep(1)
    except Exception as e:
        print(f"Auto-translation to RO failed: {e}")

    new_msg = WorkOrderMessage(
        work_order_id=wo_id,
        sender='partner',
        sender_name=sender_name,
        message=payload.message,
        is_read_by_admin=False,
        translations=translations
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    
    return {
        "id": new_msg.id,
        "sender": new_msg.sender,
        "sender_name": new_msg.sender_name,
        "message": new_msg.message,
        "created_at": (new_msg.created_at.isoformat() + "Z") if new_msg.created_at else ""
    }

from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import WorkOrder, WorkOrderMessage
import logging
import re

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/ultramsg")
async def ultramsg_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Webhook for receiving incoming WhatsApp messages from UltraMsg.
    """
    try:
        payload = await request.json()
        logger.info(f"UltraMsg webhook received: {payload}")
    except Exception as e:
        logger.error(f"Failed to parse UltraMsg payload: {e}")
        return {"status": "error", "message": "Invalid JSON"}

    event_type = payload.get("event_type")
    
    # We only care about incoming messages
    if event_type != "message_received":
        return {"status": "ignored", "message": f"Event type {event_type} ignored"}

    data = payload.get("data", {})
    sender = data.get("from", "")
    message_type = data.get("type", "chat")
    body = data.get("body", "")
    media_url = data.get("media", "")

    # Extract clean phone number (remove @c.us or @g.us)
    phone_match = re.search(r'^(\d+)', sender)
    if not phone_match:
        return {"status": "error", "message": "Invalid sender format"}
        
    clean_phone = phone_match.group(1)

    # We need to find the most recent active WorkOrder that matches this phone number
    if len(clean_phone) < 9:
        return {"status": "error", "message": "Phone number too short"}
        
    phone_suffix = clean_phone[-9:]
    
    # Find the most recent active work order for this client
    recent_wo = db.query(WorkOrder).filter(
        WorkOrder.client_phone.ilike(f"%{phone_suffix}%"), WorkOrder.status != 'deleted'
    ).order_by(desc(WorkOrder.created_at)).first()

    if not recent_wo:
        logger.info(f"No matching WorkOrder found for WhatsApp number {clean_phone}")
        return {"status": "ignored", "message": "No matching work order"}

    # Determine attachments
    attachments = []
    if media_url and message_type in ["image", "document", "video", "audio"]:
        filename = "Fisier WhatsApp"
        if message_type == "image":
            filename = "Imagine_WhatsApp.jpg"
        elif message_type == "video":
            filename = "Video_WhatsApp.mp4"
        elif message_type == "audio":
            filename = "Audio_WhatsApp.ogg"
            
        attachments.append({
            "url": media_url,
            "name": filename,
            "type": message_type
        })
        
    # Create the message
    msg = WorkOrderMessage(
        work_order_id=recent_wo.id,
        sender="client",
        message=body if body else "Atașament primit via WhatsApp",
        is_read_by_admin=False,
        translations={},
        attachments=attachments
    )
    
    db.add(msg)
    db.commit()
    
    logger.info(f"WhatsApp message from {clean_phone} attached to WorkOrder {recent_wo.id}")
    return {"status": "success"}

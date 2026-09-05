from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import desc, text
from app.database import get_db
from app.models import WorkOrder, WorkOrderMessage
import logging
import re
import os

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/whatsapp")
async def verify_whatsapp_webhook(request: Request):
    """
    Verification endpoint for Meta WhatsApp Cloud API Webhook.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "davide_whatsapp_secret_2026")
    
    if mode == "subscribe" and token == verify_token:
        logger.info("WhatsApp webhook verified successfully by Meta.")
        return PlainTextResponse(content=challenge or "", status_code=200)
    else:
        logger.warning(f"WhatsApp webhook verification failed. Token received: {token}")
        raise HTTPException(status_code=403, detail="Verification token mismatch")

@router.post("/whatsapp")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Webhook for receiving incoming WhatsApp messages, reactions and delivery statuses from Meta Cloud API.
    """
    try:
        payload = await request.json()
        logger.info(f"Meta WhatsApp webhook received: {payload}")
    except Exception as e:
        logger.error(f"Failed to parse Meta WhatsApp payload: {e}")
        return {"status": "error", "message": "Invalid JSON"}

    entry = payload.get("entry", [])
    if not entry:
        return {"status": "ignored"}

    for item in entry:
        changes = item.get("changes", [])
        for change in changes:
            value = change.get("value", {})
            
            # 1. Handle delivery statuses (sent, delivered, read, failed)
            statuses = value.get("statuses", [])
            for status_item in statuses:
                status_id = status_item.get("id")
                status_str = status_item.get("status")
                if status_id and status_str:
                    try:
                        target_msg = db.query(WorkOrderMessage).filter(text("translations->>'_wamid' = :wamid")).params(wamid=status_id).first()
                        if target_msg:
                            trans = dict(target_msg.translations or {})
                            trans["_delivery_status"] = status_str
                            trans["_delivery_channel"] = "whatsapp"
                            target_msg.translations = trans
                            flag_modified(target_msg, "translations")
                            db.commit()
                            logger.info(f"Updated WhatsApp status for message {status_id} -> {status_str}")
                    except Exception as err:
                        logger.error(f"Error updating WhatsApp status for {status_id}: {err}")
                        db.rollback()

            # 2. Handle incoming messages & reactions
            messages = value.get("messages", [])
            for msg_item in messages:
                sender = msg_item.get("from", "")
                msg_id = msg_item.get("id", "")
                msg_type = msg_item.get("type", "text")
                
                # Handle client emoji reaction from WhatsApp
                if msg_type == "reaction":
                    reaction_data = msg_item.get("reaction", {})
                    target_wamid = reaction_data.get("message_id")
                    emoji = reaction_data.get("emoji")
                    if target_wamid:
                        try:
                            reacted_msg = db.query(WorkOrderMessage).filter(text("translations->>'_wamid' = :wamid")).params(wamid=target_wamid).first()
                            if reacted_msg:
                                reactions = dict(reacted_msg.reactions or {})
                                for e in list(reactions.keys()):
                                    if "client" in reactions[e]:
                                        reactions[e].remove("client")
                                        if not reactions[e]:
                                            del reactions[e]
                                if emoji:
                                    if emoji not in reactions:
                                        reactions[emoji] = []
                                    reactions[emoji].append("client")
                                reacted_msg.reactions = reactions
                                flag_modified(reacted_msg, "reactions")
                                db.commit()
                                logger.info(f"Updated client WhatsApp reaction '{emoji}' on message {target_wamid}")
                        except Exception as err:
                            logger.error(f"Error updating client reaction for {target_wamid}: {err}")
                            db.rollback()
                    continue

                body = ""
                if msg_type == "text":
                    body = msg_item.get("text", {}).get("body", "")
                elif msg_type == "button":
                    body = msg_item.get("button", {}).get("text", "")
                elif msg_type == "interactive":
                    body = msg_item.get("interactive", {}).get("button_reply", {}).get("title", "")
                else:
                    body = f"[{msg_type}]"

                if not sender or len(sender) < 9:
                    continue

                phone_suffix = sender[-9:]
                recent_wo = db.query(WorkOrder).filter(
                    WorkOrder.client_phone.ilike(f"%{phone_suffix}%"),
                    WorkOrder.status != 'deleted'
                ).order_by(desc(WorkOrder.created_at)).first()

                if recent_wo:
                    new_msg = WorkOrderMessage(
                        work_order_id=recent_wo.id,
                        sender="client",
                        message=body if body else "Mesaj primit via WhatsApp",
                        is_read_by_admin=False,
                        translations={"_wamid": msg_id, "_delivery_status": "delivered", "_delivery_channel": "whatsapp"} if msg_id else {},
                        attachments=[]
                    )
                    db.add(new_msg)
                    db.commit()
                    logger.info(f"WhatsApp message from {sender} attached to WorkOrder {recent_wo.id}")

    return {"status": "success"}

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

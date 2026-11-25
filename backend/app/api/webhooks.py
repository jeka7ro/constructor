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


def _find_best_work_order_for_phone(db: Session, phone_suffix: str):
    """
    Finds the best matching active WorkOrder for an incoming WhatsApp message.
    If the client has multiple work orders sharing the same phone number, prioritizes:
    1. A work order with a pending unconfirmed reminder (reminder_sent_at set, reminder_confirmed_at not set)
    2. The work order that most recently had an outgoing admin message in WorkOrderMessage
    3. The most recently created work order
    """
    candidates = db.query(WorkOrder).filter(
        WorkOrder.client_phone.ilike(f"%{phone_suffix}%"),
        WorkOrder.status != 'deleted'
    ).order_by(desc(WorkOrder.created_at)).all()

    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]

    # 1. Prioritize any candidate with an active unconfirmed reminder_sent_at
    with_pending_reminder = []
    for wo in candidates:
        p = wo.prices if isinstance(wo.prices, dict) else {}
        if p.get("reminder_sent_at") and not p.get("reminder_confirmed_at"):
            with_pending_reminder.append((str(p.get("reminder_sent_at")), wo))
    if with_pending_reminder:
        with_pending_reminder.sort(key=lambda x: x[0], reverse=True)
        return with_pending_reminder[0][1]

    # 2. Prioritize the candidate with the most recent admin message
    cand_ids = [wo.id for wo in candidates]
    latest_admin_msg = db.query(WorkOrderMessage).filter(
        WorkOrderMessage.work_order_id.in_(cand_ids),
        WorkOrderMessage.sender == 'admin'
    ).order_by(desc(WorkOrderMessage.created_at)).first()
    if latest_admin_msg:
        for wo in candidates:
            if wo.id == latest_admin_msg.work_order_id:
                return wo

    return candidates[0]

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
                                if emoji in ("👍", "👍🏻", "👍🏼", "✅", "☑️", "✔️", "👌", "🙏", "❤️"):
                                    reacted_wo = db.query(WorkOrder).filter(WorkOrder.id == reacted_msg.work_order_id).first()
                                    if reacted_wo and isinstance(reacted_wo.prices, dict) and reacted_wo.prices.get("reminder_sent_at") and not reacted_wo.prices.get("reminder_confirmed_at"):
                                        from app.services.translation_service import mark_work_order_reminder_confirmed
                                        mark_work_order_reminder_confirmed(reacted_wo, db, source="whatsapp", detail=f"Reacție {emoji}")
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
                recent_wo = _find_best_work_order_for_phone(db, phone_suffix)

                if recent_wo:
                    msg_translations = {"_wamid": msg_id, "_delivery_status": "delivered", "_delivery_channel": "whatsapp"} if msg_id else {}
                    if body and body.strip():
                        try:
                            from app.services.translation_service import translate_text
                            ro_trans = translate_text(body, 'ro')
                            if ro_trans:
                                msg_translations['ro'] = ro_trans
                        except Exception as e:
                            logger.warning(f"Webhook message auto-translation failed: {e}")

                    new_msg = WorkOrderMessage(
                        work_order_id=recent_wo.id,
                        sender="client",
                        message=body if body else "Mesaj primit via WhatsApp",
                        is_read_by_admin=False,
                        translations=msg_translations,
                        attachments=[]
                    )
                    db.add(new_msg)
                    db.commit()
                    logger.info(f"WhatsApp message from {sender} attached to WorkOrder {recent_wo.id}")

                    # Auto-detect client reminder response (OK / REPORT + date / ANNULER) from WhatsApp reply
                    if body and body.strip():
                        try:
                            from app.services.translation_service import (
                                parse_client_reminder_reply,
                                mark_work_order_reminder_confirmed,
                                mark_work_order_reminder_issue,
                            )
                            has_pending_or_active_date = bool(
                                recent_wo.start_date
                                or (isinstance(recent_wo.prices, dict) and recent_wo.prices.get("reminder_sent_at"))
                            )
                            if has_pending_or_active_date:
                                parsed = parse_client_reminder_reply(body, ref_date=recent_wo.start_date)
                                if parsed["intent"] == "confirm":
                                    mark_work_order_reminder_confirmed(recent_wo, db, source="whatsapp", detail=body)
                                elif parsed["intent"] in ("reschedule", "cancel"):
                                    mark_work_order_reminder_issue(
                                        recent_wo,
                                        db,
                                        issue_type=parsed["intent"],
                                        requested_date_iso=parsed.get("requested_date"),
                                        requested_date_display=parsed.get("requested_date_display"),
                                        client_message=body,
                                        source="whatsapp"
                                    )
                        except Exception as e:
                            logger.warning(f"Failed auto-confirm/issue detection on Meta WhatsApp message: {e}")

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
    
    # Ignore group messages (@g.us) or messages sent by the bot itself to prevent loops
    if "@g.us" in str(sender) or data.get("from_me") is True or data.get("fromMe") is True:
        return {"status": "ignored", "message": "Group or self message ignored"}

    message_type = data.get("type", "chat")
    body = data.get("body", "")
    media_url = data.get("media", "")

    # Extract clean phone number (remove @c.us)
    phone_match = re.search(r'^(\d+)', sender)
    if not phone_match:
        return {"status": "error", "message": "Invalid sender format"}
        
    clean_phone = phone_match.group(1)

    # We need to find the most recent active WorkOrder that matches this phone number
    if len(clean_phone) < 9:
        return {"status": "error", "message": "Phone number too short"}
        
    phone_suffix = clean_phone[-9:]
    
    # Find the most relevant active work order for this client
    recent_wo = _find_best_work_order_for_phone(db, phone_suffix)

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
        
    # Translate incoming message to Romanian for admin
    msg_translations = {"_delivery_channel": "whatsapp", "_delivery_status": "delivered"}
    if body and body.strip():
        try:
            from app.services.translation_service import translate_text
            ro_trans = translate_text(body, 'ro')
            if ro_trans:
                msg_translations['ro'] = ro_trans
        except Exception as e:
            logger.warning(f"UltraMsg webhook message auto-translation failed: {e}")

    # Create the message
    msg = WorkOrderMessage(
        work_order_id=recent_wo.id,
        sender="client",
        message=body if body else "Atașament primit via WhatsApp",
        is_read_by_admin=False,
        translations=msg_translations,
        attachments=attachments
    )
    
    db.add(msg)
    db.commit()
    
    logger.info(f"WhatsApp message from {clean_phone} attached to WorkOrder {recent_wo.id}")

    # Auto-detect client reminder response (OK / REPORT + date / ANNULER) from UltraMsg WhatsApp reply
    if body and body.strip():
        try:
            from app.services.translation_service import (
                parse_client_reminder_reply,
                mark_work_order_reminder_confirmed,
                mark_work_order_reminder_issue,
            )
            has_pending_or_active_date = bool(
                recent_wo.start_date
                or (isinstance(recent_wo.prices, dict) and recent_wo.prices.get("reminder_sent_at"))
            )
            if has_pending_or_active_date:
                parsed = parse_client_reminder_reply(body, ref_date=recent_wo.start_date)
                if parsed["intent"] == "confirm":
                    mark_work_order_reminder_confirmed(recent_wo, db, source="whatsapp", detail=body)
                elif parsed["intent"] in ("reschedule", "cancel"):
                    mark_work_order_reminder_issue(
                        recent_wo,
                        db,
                        issue_type=parsed["intent"],
                        requested_date_iso=parsed.get("requested_date"),
                        requested_date_display=parsed.get("requested_date_display"),
                        client_message=body,
                        source="whatsapp"
                    )
        except Exception as e:
            logger.warning(f"Failed auto-confirm/issue detection on UltraMsg WhatsApp message: {e}")

    return {"status": "success"}

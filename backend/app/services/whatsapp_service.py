import os
import httpx
import logging
import re

logger = logging.getLogger(__name__)

def normalize_phone_number(phone_number: str) -> str:
    """
    Cleans and converts phone numbers to international format without plus sign.
    e.g.:
    - Belgian mobile: '0488 12 34 56' -> '32488123456'
    - French mobile: '06 12 34 56 78' -> '33612345678'
    - Romanian mobile: '0722 123 456' -> '40722123456'
    - With country code: '+32 488 12 34 56' -> '32488123456'
    - With double zero: '0032 488 12 34 56' -> '32488123456'
    """
    if not phone_number:
        return ""
    
    digits = re.sub(r"[^\d]", "", str(phone_number))
    
    if digits.startswith("00"):
        digits = digits[2:]
        
    # Belgian mobile numbers (04xx xxx xxx -> 10 digits)
    if digits.startswith("04") and len(digits) == 10:
        digits = "32" + digits[1:]
    # Belgian landline or general (02, 03, 09 etc -> 9 digits)
    elif digits.startswith("0") and len(digits) == 9:
        digits = "32" + digits[1:]
    # French mobile numbers (06, 07 -> 10 digits)
    elif digits.startswith("06") and len(digits) == 10:
        digits = "33" + digits[1:]
    elif digits.startswith("07") and len(digits) == 10:
        digits = "40" + digits[1:]
            
    return digits


def send_quote_whatsapp(
    phone_number: str,
    client_name: str,
    client_language: str,
    signing_url: str,
    pdf_path_or_url: str,
    quote_number: str = "Devis"
) -> bool:
    """
    Sends the quote via WhatsApp using Meta Cloud API with the 'devis_client' template.
    Template requires:
    - Document Header: PDF link
    - Body parameter 1: Client name
    - Body parameter 2: Signing URL
    """
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1285477127985012")

    formatted_phone = normalize_phone_number(phone_number)
    if not formatted_phone:
        logger.warning("Empty or invalid phone number provided for WhatsApp.")
        return False

    if not access_token or not phone_number_id:
        logger.warning("WHATSAPP credentials not set in env. Falling back to UltraMsg if available.")
        return send_whatsapp_message(formatted_phone, client_name, client_language, signing_url)

    # Normalize language for Meta template ('fr', 'nl', 'en')
    lang_clean = (client_language or "fr").lower().split("-")[0].strip()
    if lang_clean not in ["fr", "nl", "en"]:
        lang_clean = "fr"

    meta_lang_code = lang_clean

    # Determine public PDF URL
    if pdf_path_or_url and (pdf_path_or_url.startswith("http://") or pdf_path_or_url.startswith("https://")):
        pdf_public_url = pdf_path_or_url
    elif pdf_path_or_url and os.path.exists(pdf_path_or_url):
        try:
            from app.storage import upload_file
            filename = os.path.basename(pdf_path_or_url)
            with open(pdf_path_or_url, "rb") as f:
                content = f.read()
            pdf_public_url = upload_file(content, f"pdfs/{filename}", "application/pdf")
            logger.info(f"Uploaded quote PDF to storage: {pdf_public_url}")
        except Exception as e:
            logger.error(f"Failed to upload PDF to storage: {e}")
            filename = os.path.basename(pdf_path_or_url)
            pdf_public_url = f"https://davidechape.pontaj.app/uploads/pdfs/{filename}"
    elif pdf_path_or_url:
        filename = os.path.basename(pdf_path_or_url)
        pdf_public_url = f"https://davidechape.pontaj.app/uploads/pdfs/{filename}"
    else:
        pdf_public_url = signing_url

    clean_quote_no = str(quote_number or "Devis").replace("/", "_").replace(" ", "")

    url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": formatted_phone,
        "type": "template",
        "template": {
            "name": "devis_client",
            "language": {
                "code": meta_lang_code
            },
            "components": [
                {
                    "type": "header",
                    "parameters": [
                        {
                            "type": "document",
                            "document": {
                                "link": pdf_public_url,
                                "filename": f"Devis_{clean_quote_no}.pdf"
                            }
                        }
                    ]
                },
                {
                    "type": "body",
                    "parameters": [
                        {
                            "type": "text",
                            "text": str(client_name or "Client")
                        },
                        {
                            "type": "text",
                            "text": str(signing_url)
                        }
                    ]
                }
            ]
        }
    }

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=15.0)
        res_data = response.json()
        if response.status_code >= 400:
            logger.warning(f"Meta WhatsApp template send error ({response.status_code}): {res_data}. Trying direct document fallback...")
            caption_text = f"Bonjour {client_name},\n\nMerci d'avoir demandé un devis chez Davide Chape.\nVous trouverez ci-joint votre devis officiel (PDF).\n\nConsulter et valider en ligne :\n{signing_url}\n\nCordialement,\nL'équipe Davide Chape"
            if lang_clean == "nl":
                caption_text = f"Hallo {client_name},\n\nBedankt voor uw offerteaanvraag bij Davide Chape.\nIn de bijlage vindt u uw officiële offerte (PDF).\n\nBekijken en ondertekenen :\n{signing_url}\n\nMet vriendelijke groet,\nHet Davide Chape Team"
            elif lang_clean == "en":
                caption_text = f"Hello {client_name},\n\nThank you for requesting a quote with Davide Chape.\nPlease find your official quote attached (PDF).\n\nReview and sign online :\n{signing_url}\n\nBest regards,\nDavide Chape Team"

            doc_payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": formatted_phone,
                "type": "document",
                "document": {
                    "link": pdf_public_url,
                    "caption": caption_text,
                    "filename": f"Devis_{clean_quote_no}.pdf"
                }
            }
            doc_res = httpx.post(url, json=doc_payload, headers=headers, timeout=15.0)
            if doc_res.status_code < 400:
                logger.info(f"Meta WhatsApp direct document quote sent successfully to {formatted_phone}: {doc_res.json()}")
                return True
            else:
                logger.error(f"Meta WhatsApp direct document also failed ({doc_res.status_code}): {doc_res.json()}")
                return False

        logger.info(f"Meta WhatsApp quote sent successfully to {formatted_phone}: {res_data}")
        return True
    except Exception as e:
        logger.error(f"Failed to send Meta WhatsApp quote to {formatted_phone}: {e}")
        return False


def send_whatsapp_message(phone_number: str, client_name: str, client_language: str, signing_url: str):
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID")
    api_token = os.getenv("ULTRAMSG_API_TOKEN")
    
    if not instance_id or not api_token:
        logger.warning("ULTRAMSG credentials not set. WhatsApp message not sent.")
        return False

    url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
    
    # Format phone number for UltraMsg (requires country code, without + if possible)
    formatted_phone = phone_number.replace("+", "").replace(" ", "").replace("-", "")

    # Default to French
    body_text = f"Bonjour {client_name},\n\nMerci d'avoir demandé un devis sur notre site.\n\nVeuillez trouver votre devis en cliquant sur ce lien : {signing_url}\n\nCordialement,\nL'équipe Davide Chape"
    
    if client_language == "ro":
        body_text = f"Bună ziua {client_name},\n\nAi solicitat un deviz pe site-ul nostru.\n\nTe rugăm să îl vizualizezi aici: {signing_url}\n\nCu respect,\nEchipa Davide Chape"
    elif client_language == "nl":
        body_text = f"Hallo {client_name},\n\nBedankt voor uw aanvraag op onze website.\n\nU kunt uw offerte hier vinden: {signing_url}\n\nMet vriendelijke groet,\nDavide Chape Team"

    payload = {
        "token": api_token,
        "to": formatted_phone,
        "body": body_text
    }

    try:
        # UltraMsg uses application/x-www-form-urlencoded by default
        response = httpx.post(url, data=payload, timeout=10.0)
        response.raise_for_status()
        logger.info(f"WhatsApp sent successfully to {formatted_phone}")
        return True
    except Exception as e:
        logger.error(f"Failed to send WhatsApp to {formatted_phone}: {e}")
        return False

def send_planning_update_whatsapp(phone_number: str, client_name: str, client_language: str, signing_url: str, new_date: str):
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID")
    api_token = os.getenv("ULTRAMSG_API_TOKEN")
    
    if not instance_id or not api_token:
        return False

    url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
    formatted_phone = phone_number.replace("+", "").replace(" ", "").replace("-", "")

    body_text = f"Bonjour {client_name},\n\nLa date de votre intervention a été mise à jour par l'équipe Davide Chape : {new_date}.\n\nVous pouvez consulter les détails ici : {signing_url}\n\nCordialement,\nL'équipe Davide Chape"
    
    if client_language == "ro":
        body_text = f"Bună ziua {client_name},\n\nData intervenției a fost actualizată de echipa Davide Chape: {new_date}.\n\nPoți consulta detaliile aici: {signing_url}\n\nCu respect,\nEchipa Davide Chape"
    elif client_language == "nl":
        body_text = f"Hallo {client_name},\n\nDe datum van uw interventie is bijgewerkt door het Davide Chape team: {new_date}.\n\nU kunt de details hier bekijken: {signing_url}\n\nMet vriendelijke groet,\nDavide Chape Team"
    elif client_language == "en":
        body_text = f"Dear {client_name},\n\nThe date of your intervention has been updated by the Davide Chape team: {new_date}.\n\nYou can view the details here: {signing_url}\n\nBest regards,\nThe Davide Chape Team"

    payload = {
        "token": api_token,
        "to": formatted_phone,
        "body": body_text
    }

    try:
        response = httpx.post(url, data=payload, timeout=10.0)
        response.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Failed to send planning update WhatsApp to {formatted_phone}: {e}")
        return False


def send_admin_new_quote_whatsapp(admin_phone: str, client_name: str, client_phone: str, proforma_url: str):
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID")
    api_token = os.getenv("ULTRAMSG_API_TOKEN")
    
    if not instance_id or not api_token or not admin_phone:
        return False

    url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
    formatted_phone = admin_phone.replace("+", "").replace(" ", "").replace("-", "")

    body_text = f"🚨 *Deviz Nou Generat!*\n\nClient: {client_name}\nTelefon: {client_phone or '-'}\n\nAccesează devizul aici:\n{proforma_url}"
    
    payload = {
        "token": api_token,
        "to": formatted_phone,
        "body": body_text
    }

    try:
        response = httpx.post(url, data=payload, timeout=10.0)
        response.raise_for_status()
        logger.info(f"Admin new quote WhatsApp sent to {formatted_phone}")
        return True
    except Exception as e:
        logger.error(f"Failed to send admin WhatsApp alert to {formatted_phone}: {e}")
        return False

def send_chat_text_whatsapp(phone_number: str, text: str):
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1285477127985012")

    formatted_phone = normalize_phone_number(phone_number)
    if not formatted_phone or not text:
        return False

    # 1. Try Meta Cloud API
    if access_token and phone_number_id:
        url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_phone,
            "type": "text",
            "text": {
                "preview_url": True,
                "body": text
            }
        }
        try:
            res = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            res_data = res.json()
            if res.status_code < 400:
                wamid = None
                if "messages" in res_data and len(res_data["messages"]) > 0:
                    wamid = res_data["messages"][0].get("id")
                logger.info(f"Chat text sent via Meta WhatsApp to {formatted_phone}: {res_data}")
                return {"success": True, "wamid": wamid}
            else:
                logger.error(f"Meta WhatsApp chat send error ({res.status_code}): {res_data}")
                return {"success": False, "wamid": None, "error": res_data.get("error", {}).get("message", "send_failed")}
        except Exception as e:
            logger.error(f"Failed to send Meta WhatsApp chat text to {formatted_phone}: {e}")
            return {"success": False, "wamid": None, "error": str(e)}

    # 2. Fallback to UltraMsg if configured
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID")
    api_token = os.getenv("ULTRAMSG_API_TOKEN")
    
    if not instance_id or not api_token:
        return {"success": False, "wamid": None, "error": "not_configured"}

    url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
    formatted_phone_ultramsg = phone_number.replace("+", "").replace(" ", "").replace("-", "")

    payload = {
        "token": api_token,
        "to": formatted_phone_ultramsg,
        "body": text
    }

    try:
        response = httpx.post(url, data=payload, timeout=10.0)
        response.raise_for_status()
        logger.info(f"Chat text sent via UltraMsg WhatsApp to {formatted_phone_ultramsg}")
        return {"success": True, "wamid": None}
    except Exception as e:
        logger.error(f"Failed to send UltraMsg WhatsApp chat text to {formatted_phone_ultramsg}: {e}")
        return {"success": False, "wamid": None, "error": str(e)}

def send_whatsapp_reaction(phone_number: str, message_wamid: str, emoji: str):
    """
    Sends an emoji reaction to a specific WhatsApp message via Meta Cloud API.
    To remove a reaction, emoji should be an empty string "".
    """
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1285477127985012")

    formatted_phone = normalize_phone_number(phone_number)
    if not formatted_phone or not message_wamid:
        return False

    if access_token and phone_number_id:
        url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_phone,
            "type": "reaction",
            "reaction": {
                "message_id": message_wamid,
                "emoji": emoji or ""
            }
        }
        try:
            res = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            if res.status_code < 400:
                logger.info(f"Reaction '{emoji}' sent via Meta WhatsApp for {message_wamid}: {res.json()}")
                return True
            else:
                logger.error(f"Meta WhatsApp reaction error ({res.status_code}): {res.json()}")
                return False
        except Exception as e:
            logger.error(f"Failed to send Meta WhatsApp reaction: {e}")
            return False

    return False

def send_chat_attachment_whatsapp(phone_number: str, file_url: str, filename: str):
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1285477127985012")

    formatted_phone = normalize_phone_number(phone_number)
    if not formatted_phone or not file_url:
        return False

    # 1. Try Meta Cloud API
    if access_token and phone_number_id:
        url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_phone,
            "type": "document",
            "document": {
                "link": file_url,
                "filename": filename or "document.pdf"
            }
        }
        try:
            res = httpx.post(url, json=payload, headers=headers, timeout=15.0)
            if res.status_code < 400:
                logger.info(f"Chat attachment sent via Meta WhatsApp to {formatted_phone}: {res.json()}")
                return True
            else:
                logger.error(f"Meta WhatsApp attachment send error ({res.status_code}): {res.json()}")
        except Exception as e:
            logger.error(f"Failed to send Meta WhatsApp attachment to {formatted_phone}: {e}")

    # 2. Fallback to UltraMsg if configured
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID")
    api_token = os.getenv("ULTRAMSG_API_TOKEN")
    
    if not instance_id or not api_token:
        return False

    formatted_phone_ultramsg = phone_number.replace("+", "").replace(" ", "").replace("-", "")
    
    url = f"https://api.ultramsg.com/{instance_id}/messages/document"

    payload = {
        "token": api_token,
        "to": formatted_phone_ultramsg,
        "document": file_url,
        "filename": filename
    }

    try:
        response = httpx.post(url, data=payload, timeout=15.0)
        response.raise_for_status()
        logger.info(f"Chat attachment sent via UltraMsg WhatsApp to {formatted_phone_ultramsg}")
        return True
    except Exception as e:
        logger.error(f"Failed to send UltraMsg WhatsApp chat attachment to {formatted_phone_ultramsg}: {e}")
        return False

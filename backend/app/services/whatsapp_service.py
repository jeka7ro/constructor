import os
import httpx
import logging

logger = logging.getLogger(__name__)

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

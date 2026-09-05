import os
import httpx
import logging
import re
import urllib.parse

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

    # 1. PRIMARY: UltraMsg (instant, no template restrictions or 24h limits)
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID")
    api_token = os.getenv("ULTRAMSG_API_TOKEN")
    if instance_id and api_token:
        try:
            success = send_whatsapp_message(formatted_phone, client_name, client_language, signing_url, quote_number)
            if success:
                logger.info(f"Quote WhatsApp successfully sent via UltraMsg to {formatted_phone}")
                return True
            else:
                logger.warning(f"UltraMsg quote send failed for {formatted_phone}, trying Meta fallback...")
        except Exception as e:
            logger.error(f"UltraMsg exception for {formatted_phone}: {e}, trying Meta fallback...")

    # 2. FALLBACK: Meta Cloud API
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1285477127985012")

    if not access_token or not phone_number_id:
        logger.warning("WHATSAPP credentials not set in env.")
        return False

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
            q_line_fr = f"📄 Numéro de devis : {clean_quote_no}\n" if clean_quote_no else ""
            q_line_nl = f"📄 Offertenummer : {clean_quote_no}\n" if clean_quote_no else ""
            q_line_en = f"📄 Quote number : {clean_quote_no}\n" if clean_quote_no else ""
            caption_text = f"Bonjour {client_name},\n\nMerci d'avoir demandé un devis chez Davide Chape.\n{q_line_fr}Vous trouverez ci-joint votre devis officiel (PDF).\n\nConsulter et valider en ligne :\n{signing_url}\n\nCordialement,\nL'équipe Davide Chape"
            if lang_clean == "nl":
                caption_text = f"Hallo {client_name},\n\nBedankt voor uw offerteaanvraag bij Davide Chape.\n{q_line_nl}In de bijlage vindt u uw officiële offerte (PDF).\n\nBekijken en ondertekenen :\n{signing_url}\n\nMet vriendelijke groet,\nHet Davide Chape Team"
            elif lang_clean == "en":
                caption_text = f"Hello {client_name},\n\nThank you for requesting a quote with Davide Chape.\n{q_line_en}Please find your official quote attached (PDF).\n\nReview and sign online :\n{signing_url}\n\nBest regards,\nDavide Chape Team"

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
                logger.info(f"Falling back to UltraMsg quote for {formatted_phone}...")
                return send_whatsapp_message(formatted_phone, client_name, client_language, signing_url, quote_number)

        logger.info(f"Meta WhatsApp quote sent successfully to {formatted_phone}: {res_data}")
        return True
    except Exception as e:
        logger.error(f"Failed to send Meta WhatsApp quote to {formatted_phone}: {e}")
        logger.info(f"Falling back to UltraMsg quote for {formatted_phone}...")
        return send_whatsapp_message(formatted_phone, client_name, client_language, signing_url, quote_number)


def send_whatsapp_message(phone_number: str, client_name: str, client_language: str, signing_url: str, quote_number: str = None):
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID")
    api_token = os.getenv("ULTRAMSG_API_TOKEN")
    
    if not instance_id or not api_token:
        logger.warning("ULTRAMSG credentials not set. WhatsApp message not sent.")
        return False

    url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
    
    # Format phone number for UltraMsg (requires country code, without + if possible)
    formatted_phone = phone_number.replace("+", "").replace(" ", "").replace("-", "")

    # Quote reference badge for easy searching in WhatsApp
    quote_ref_fr = f"\n\n📄 *Numéro de devis : {quote_number}*" if quote_number else ""
    quote_ref_ro = f"\n\n📄 *Număr deviz : {quote_number}*" if quote_number else ""
    quote_ref_nl = f"\n\n📄 *Offertenummer : {quote_number}*" if quote_number else ""
    quote_ref_en = f"\n\n📄 *Quote number : {quote_number}*" if quote_number else ""

    # Default to French
    body_text = f"Bonjour {client_name},\n\nMerci d'avoir demandé un devis chez Davide Chape.{quote_ref_fr}\n\nVeuillez trouver et valider votre devis en cliquant sur ce lien :\n{signing_url}\n\nCordialement,\nL'équipe Davide Chape"
    
    if client_language == "ro":
        body_text = f"Bună ziua {client_name},\n\nVă mulțumim pentru solicitarea de deviz la Davide Chape.{quote_ref_ro}\n\nVă rugăm să vizualizați și să validați devizul accesând acest link:\n{signing_url}\n\nCu respect,\nEchipa Davide Chape"
    elif client_language == "nl":
        body_text = f"Hallo {client_name},\n\nBedankt voor uw offerteaanvraag bij Davide Chape.{quote_ref_nl}\n\nU kunt uw offerte hier bekijken en ondertekenen:\n{signing_url}\n\nMet vriendelijke groet,\nDavide Chape Team"
    elif client_language == "en":
        body_text = f"Hello {client_name},\n\nThank you for requesting a quote with Davide Chape.{quote_ref_en}\n\nPlease find and review your quote by clicking here:\n{signing_url}\n\nBest regards,\nDavide Chape Team"

    payload = {
        "token": api_token,
        "to": formatted_phone,
        "body": body_text
    }

    try:
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


def format_volumes_and_materials(volumes: list) -> list:
    """Formats surfaces, thicknesses, and client-selected materials/options from volumes array."""
    if not volumes or not isinstance(volumes, list):
        return []

    lines = []
    surf_lines = []
    
    total_chape_m2 = 0.0
    total_sand_kg = 0.0
    
    has_foil = False
    has_mesh = False
    has_fiber = False
    has_sound_insulation = False
    has_floor_heating_add = False
    foil_m2 = 0.0
    mesh_m2 = 0.0
    
    pur_options = []

    # Count how many volumes exist per category
    chape_vols = [
        v for v in volumes if isinstance(v, dict) and 
        "pur" not in str(v.get("label", "")).lower() and "pur" not in str(v.get("type", "")).lower() and
        "eps" not in str(v.get("label", "")).lower() and "eps" not in str(v.get("type", "")).lower()
    ]
    has_multiple_chape = len(chape_vols) > 1

    pur_vols = [
        v for v in volumes if isinstance(v, dict) and 
        ("pur" in str(v.get("label", "")).lower() or "pur" in str(v.get("type", "")).lower())
    ]
    has_multiple_pur = len(pur_vols) > 1

    eps_vols = [
        v for v in volumes if isinstance(v, dict) and 
        ("eps" in str(v.get("label", "")).lower() or "eps" in str(v.get("type", "")).lower())
    ]
    has_multiple_eps = len(eps_vols) > 1

    chape_idx = 0
    pur_idx = 0
    eps_idx = 0
    for v in volumes:
        if not isinstance(v, dict):
            continue
            
        label = str(v.get("label") or "").strip()
        try:
            qty = float(v.get("quantity") or 0)
        except (ValueError, TypeError):
            qty = 0.0
        try:
            thick = float(v.get("thickness") or 0)
        except (ValueError, TypeError):
            thick = 0.0
        unit = str(v.get("unit") or "m²").strip()
        
        is_pur = "pur" in label.lower() or "pur" in str(v.get("type", "")).lower()
        is_eps = "eps" in label.lower() or "eps" in str(v.get("type", "")).lower()
        
        if is_pur:
            pur_idx += 1
            pur_lbl = f"Izolație PUR {pur_idx}" if has_multiple_pur else "Izolație PUR"
            thick_str = f"{thick:.1f}" if thick % 1 != 0 else f"{thick:.0f}"
            surf_lines.append(f"• {pur_lbl}: {qty:.0f} m² | Grosime: {thick_str} cm")
            pfx = f"{pur_lbl} - " if has_multiple_pur else "Opțiune PUR - "
            if v.get("pur_aspiration") or v.get("isolation_pur_aspiration"):
                pur_options.append(f"{pfx}Aspirare suport")
            if v.get("pur_niveller") or v.get("isolation_pur_niveller"):
                pur_options.append(f"{pfx}Nivelare laser")
            if v.get("pur_poncage") or v.get("isolation_pur_poncage"):
                pur_options.append(f"{pfx}Șlefuire spumă (Ponçage)")
            if v.get("pur_protection") or v.get("isolation_pur_protection"):
                pur_options.append(f"{pfx}Protecție peste 1M")
        elif is_eps:
            eps_idx += 1
            eps_lbl = f"Izolație EPS {eps_idx}" if has_multiple_eps else "Izolație EPS"
            thick_str = f"{thick:.1f}" if thick % 1 != 0 else f"{thick:.0f}"
            surf_lines.append(f"• {eps_lbl}: {qty:.0f} m² | Grosime: {thick_str} cm")
        else:
            chape_idx += 1
            clean_label = label
            if label.isdigit():
                clean_label = f"Șapă {label}" if has_multiple_chape else "Șapă"
            elif not label or label.lower() in ["chape", "șapă", "sapa"] or label.lower().startswith("chape ") or label.lower().startswith("șapă ") or label.lower().startswith("sapa "):
                clean_label = f"Șapă {chape_idx}" if has_multiple_chape else "Șapă"
            
            thick_str = f"{thick:.1f}" if thick % 1 != 0 else f"{thick:.0f}"
            surf_lines.append(f"• {clean_label}: {qty:.0f} {unit} | Grosime: {thick_str} cm")
            
            total_chape_m2 += qty
            if qty > 0 and thick > 0:
                total_sand_kg += (qty * thick * 16)
            
            if v.get("has_foil"):
                has_foil = True
                foil_m2 += qty
            if v.get("has_mesh"):
                has_mesh = True
                mesh_m2 += qty
            if v.get("has_duramint") or v.get("has_fiber"):
                has_fiber = True
            if v.get("has_sound_insulation"):
                has_sound_insulation = True
            if v.get("has_floor_heating_add"):
                has_floor_heating_add = True

    if not surf_lines:
        return []

    lines.append("📐 *Suprafețe & Grosime:*")
    lines.extend(surf_lines)
    if has_multiple_chape and total_chape_m2 > 0:
        lines.append(f"➡️ *Total suprafață șapă:* {total_chape_m2:.0f} m²")
    if total_sand_kg > 0:
        sand_tons = total_sand_kg / 1000.0
        sand_tons_str = f"{sand_tons:.1f}" if round(sand_tons, 1) == round(sand_tons, 2) else f"{sand_tons:.2f}"
        lines.append(f"🏖️ *Necesar Nisip:* {sand_tons_str} tone")

    # Materiale și opțiuni bifate de client în deviz
    mat_lines = []
    if has_mesh:
        mat_lines.append(f"✅ Plasă armare (Treillis): Da (~{mesh_m2:.0f} m²)")
    if has_foil:
        mat_lines.append(f"✅ Folie PE (Film): Da (~{foil_m2:.0f} m²)")
    if has_fiber:
        mat_lines.append("✅ Fibră / Duramint: Da")
    if has_sound_insulation:
        mat_lines.append("✅ Izolație acustică: Da")
    if has_floor_heating_add:
        mat_lines.append("✅ Additiv încălzire pardoseală: Da")
    if pur_options:
        for opt in pur_options:
            mat_lines.append(f"✅ {opt}: Da")

    if mat_lines:
        lines.append("")
        lines.append("📋 *Materiale & Opțiuni bifate:*")
        lines.extend(mat_lines)

    return lines


def format_client_language_with_flag(lang_code: str) -> str:
    code = str(lang_code or '').lower().split('-')[0].strip()
    if code in ['nl', 'dutch', 'vlaams']:
        return "🇳🇱 Olandeză (NL)"
    elif code in ['en', 'eng', 'english']:
        return "🇬🇧 Engleză (EN)"
    elif code in ['de', 'german', 'deutsch']:
        return "🇩🇪 Germană (DE)"
    elif code in ['ro', 'romana', 'romanian']:
        return "🇷🇴 Română (RO)"
    else:
        return "🇫🇷 Franceză (FR)"


def get_jobs_on_date(target_date_str: str, org_id: str = None):
    """
    Returns (count, client_names_list) of scheduled work orders on a specific date.
    """
    if not target_date_str:
        return None
    try:
        from app.database import SessionLocal
        from app.models import WorkOrder
        from datetime import datetime, timedelta
        
        clean_d = str(target_date_str).split("T")[0].strip()
        if "-" in clean_d:
            d = datetime.strptime(clean_d, "%Y-%m-%d").date()
        elif "/" in clean_d:
            parts = clean_d.split("/")
            if len(parts[0]) == 4:
                d = datetime.strptime(clean_d, "%Y/%m/%d").date()
            else:
                d = datetime.strptime(clean_d, "%d/%m/%Y").date()
        else:
            return None

        with SessionLocal() as db:
            q = db.query(WorkOrder).filter(
                WorkOrder.start_date.isnot(None),
                WorkOrder.status != 'cancelled'
            )
            if org_id:
                q = q.filter(WorkOrder.organization_id == org_id)
            wos = q.all()
            
            client_names = []
            count = 0
            for wo in wos:
                dur = max(1, getattr(wo, 'duration_days', 1) or 1)
                wo_end = wo.start_date + timedelta(days=dur)
                if wo.start_date <= d < wo_end:
                    count += 1
                    raw_name = (wo.client_name or (wo.client.name if getattr(wo, 'client', None) else '') or wo.title or '').strip()
                    clean_name = ' '.join(raw_name.split())
                    if clean_name:
                        client_names.append(clean_name)
                    else:
                        client_names.append("Client")
            return count, client_names
    except Exception as e:
        logger.error(f"Error checking jobs on date {target_date_str}: {e}")
        return None


def format_jobs_availability_str(target_date_str: str, org_id: str = None) -> str:
    """
    Returns formatted string with availability status and client names in parentheses, e.g.:
    - ' (✅ Liber - 0 lucrări)'
    - ' (⚠️ Ocupat - 1 lucrare: Elena Cazmal)'
    - ' (⚠️ Ocupat - 2 lucrări: Elena Cazmal, Mihalache Construct)'
    """
    jobs_info = get_jobs_on_date(target_date_str, org_id)
    if jobs_info is None:
        return ""
    count, client_names = jobs_info
    if count == 0:
        return " (✅ Liber - 0 lucrări)"
    
    unique_clients = []
    for c in client_names:
        if c and c not in unique_clients:
            unique_clients.append(c)
            
    if count == 1:
        c_str = f": {unique_clients[0]}" if unique_clients else ""
        return f" (⚠️ Ocupat - 1 lucrare{c_str})"
    else:
        if len(unique_clients) > 3:
            c_str = ": " + ", ".join(unique_clients[:3]) + f" + încă {len(unique_clients) - 3}"
        elif unique_clients:
            c_str = ": " + ", ".join(unique_clients)
        else:
            c_str = ""
        return f" (⚠️ Ocupat - {count} lucrări{c_str})"


def send_admin_new_quote_whatsapp(
    target_id: str,
    client_name: str,
    client_phone: str,
    proforma_url: str,
    quote_number: str = None,
    site_address: str = None,
    total_amount: str = None,
    distance_km: float = None,
    volumes: list = None,
    client_language: str = None,
    approximate_date: str = None,
    org_id: str = None
):
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID")
    api_token = os.getenv("ULTRAMSG_API_TOKEN")
    
    if not instance_id or not api_token or not target_id:
        return False

    url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
    
    if "@g.us" in target_id:
        formatted_target = target_id.strip()
    else:
        formatted_target = target_id.replace("+", "").replace(" ", "").replace("-", "")

    quote_str = f" *({quote_number})*" if quote_number else ""
    clean_client_phone = normalize_phone_number(client_phone) if client_phone else ""
    wa_link = f"https://wa.me/{clean_client_phone}" if clean_client_phone else ""

    lines = [
        f"🚨 *Deviz Nou Primit!*{quote_str}",
        "",
        f"👤 *Client:* {client_name or 'Nespecificat'}",
        f"📞 *Telefon:* {client_phone or '-'}",
    ]
    if client_language:
        lines.append(f"🌐 *Limbă client:* {format_client_language_with_flag(client_language)}")
    if site_address:
        encoded_addr = urllib.parse.quote_plus(site_address.strip())
        maps_link = f"https://maps.google.com/?q={encoded_addr}"
        lines.append(f"📍 *Adresă șantier:* {site_address}")
        if distance_km:
            try:
                d_val = f"{float(distance_km):.1f}"
            except Exception:
                d_val = str(distance_km)
            lines.append(f"🚗 *Distanță de la bază:* {d_val} km")
        lines.append(f"🗺️ *Deschide în Google Maps:*\n{maps_link}")
    
    if approximate_date:
        try:
            if "-" in str(approximate_date) and len(str(approximate_date).split("-")) == 3:
                parts = str(approximate_date).split("-")
                day = parts[2].split("T")[0].strip()
                formatted_date = f"{day}/{parts[1]}/{parts[0]}"
            else:
                formatted_date = str(approximate_date)
        except Exception:
            formatted_date = str(approximate_date)
            
        avail_str = format_jobs_availability_str(approximate_date, org_id)
        lines.append(f"📅 *Data solicitată de client:* {formatted_date}{avail_str}")
    else:
        lines.append("📅 *Data solicitată de client:* Nespecificată")

    if total_amount:
        lines.append(f"💰 *Total:* {total_amount}")

    if volumes:
        mat_block = format_volumes_and_materials(volumes)
        if mat_block:
            lines.append("")
            lines.extend(mat_block)

    lines.append("")
    lines.append(f"🔗 *Vizualizează devizul:*\n{proforma_url}")
    if wa_link:
        lines.append("")
        lines.append(f"💬 *Scrie direct clientului pe WhatsApp:*\n{wa_link}")

    body_text = "\n".join(lines)

    payload = {
        "token": api_token,
        "to": formatted_target,
        "body": body_text
    }

    try:
        response = httpx.post(url, data=payload, timeout=10.0)
        response.raise_for_status()
        logger.info(f"Admin new quote WhatsApp sent to {formatted_target}")
        return True
    except Exception as e:
        logger.error(f"Failed to send admin WhatsApp alert to {formatted_target}: {e}")
        return False


def send_admin_quote_confirmed_whatsapp(
    target_id: str,
    client_name: str,
    client_phone: str,
    quote_number: str = None,
    confirmed_by_name: str = None,
    site_address: str = None,
    intervention_date: str = None,
    wo_id: int = None,
    distance_km: float = None,
    volumes: list = None,
    client_language: str = None,
    org_id: str = None
):
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID")
    api_token = os.getenv("ULTRAMSG_API_TOKEN")
    
    if not instance_id or not api_token or not target_id:
        return False

    url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
    
    if "@g.us" in target_id:
        formatted_target = target_id.strip()
    else:
        formatted_target = target_id.replace("+", "").replace(" ", "").replace("-", "")

    quote_str = f" *({quote_number})*" if quote_number else ""
    clean_client_phone = normalize_phone_number(client_phone) if client_phone else ""
    wa_link = f"https://wa.me/{clean_client_phone}" if clean_client_phone else ""

    lines = [
        f"📝 *Deviz Acceptat de Client!*{quote_str}",
        "",
        f"👤 *Client:* {client_name or 'Client'}",
    ]
    if confirmed_by_name and confirmed_by_name != client_name:
        lines.append(f"✍️ *Semnat de:* {confirmed_by_name}")
    if client_phone:
        lines.append(f"📞 *Telefon:* {client_phone}")
    if client_language:
        lines.append(f"🌐 *Limbă client:* {format_client_language_with_flag(client_language)}")
    if site_address:
        encoded_addr = urllib.parse.quote_plus(site_address.strip())
        maps_link = f"https://maps.google.com/?q={encoded_addr}"
        lines.append(f"📍 *Adresă șantier:* {site_address}")
        if distance_km:
            try:
                d_val = f"{float(distance_km):.1f}"
            except Exception:
                d_val = str(distance_km)
            lines.append(f"🚗 *Distanță de la bază:* {d_val} km")
        lines.append(f"🗺️ *Deschide în Google Maps:*\n{maps_link}")
    if intervention_date:
        avail_str = format_jobs_availability_str(intervention_date, org_id)
        lines.append(f"📅 *Data solicitată de client:* {intervention_date}{avail_str}")
        lines.append("⚠️ *STATUS DATĂ:* Neconfirmată încă! Data este doar o solicitare a clientului.")
        lines.append("👉 *Acțiune:* Davide Chape trebuie să valideze data și să adauge lucrarea în planning.")

    if volumes:
        mat_block = format_volumes_and_materials(volumes)
        if mat_block:
            lines.append("")
            lines.extend(mat_block)
    
    if wo_id:
        lines.append("")
        lines.append(f"🔗 *Deschide în aplicație:*\nhttps://davidechape.pontaj.app/work-orders/{wo_id}")
    
    if wa_link:
        lines.append("")
        lines.append(f"💬 *Contactează clientul pe WhatsApp:*\n{wa_link}")

    body_text = "\n".join(lines)

    payload = {
        "token": api_token,
        "to": formatted_target,
        "body": body_text
    }

    try:
        response = httpx.post(url, data=payload, timeout=10.0)
        response.raise_for_status()
        logger.info(f"Quote confirmed WhatsApp sent to {formatted_target}")
        return True
    except Exception as e:
        logger.error(f"Failed to send quote confirmed WhatsApp to {formatted_target}: {e}")
        return False


def send_admin_client_message_whatsapp(
    target_id: str,
    client_name: str,
    client_phone: str,
    message_text: str,
    quote_number: str = None,
    wo_id: int = None
):
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID")
    api_token = os.getenv("ULTRAMSG_API_TOKEN")
    
    if not instance_id or not api_token or not target_id:
        return False

    url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
    
    if "@g.us" in target_id:
        formatted_target = target_id.strip()
    else:
        formatted_target = target_id.replace("+", "").replace(" ", "").replace("-", "")

    quote_str = f" · {quote_number}" if quote_number else ""
    clean_client_phone = normalize_phone_number(client_phone) if client_phone else ""
    wa_link = f"https://wa.me/{clean_client_phone}" if clean_client_phone else ""

    lines = [
        f"💬 *Mesaj Nou de la Client!* ({client_name}{quote_str})",
        "",
        f"\"{message_text}\"",
        "",
    ]
    if wa_link:
        lines.append(f"👉 *Răspunde-i direct pe WhatsApp:*\n{wa_link}")
    if wo_id:
        lines.append(f"🔗 *Vezi fișa lucrării:*\nhttps://davidechape.pontaj.app/work-orders/{wo_id}")

    body_text = "\n".join(lines)

    payload = {
        "token": api_token,
        "to": formatted_target,
        "body": body_text
    }

    try:
        response = httpx.post(url, data=payload, timeout=10.0)
        response.raise_for_status()
        logger.info(f"Admin client message WhatsApp notification sent to {formatted_target}")
        return True
    except Exception as e:
        logger.error(f"Failed to send client message notification to {formatted_target}: {e}")
        return False

def send_chat_text_whatsapp(phone_number: str, text: str):
    """
    Sends chat text strictly via UltraMsg (Official Company WhatsApp Number).
    American Meta test number is disabled to prevent confusion.
    """
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID")
    api_token = os.getenv("ULTRAMSG_API_TOKEN")

    if not instance_id or not api_token or not phone_number or not text:
        logger.warning("UltraMsg credentials missing or invalid chat text payload.")
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
    """
    Sends chat attachments strictly via UltraMsg (Official Company WhatsApp Number).
    """
    instance_id = os.getenv("ULTRAMSG_INSTANCE_ID")
    api_token = os.getenv("ULTRAMSG_API_TOKEN")

    if not instance_id or not api_token or not phone_number or not file_url:
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

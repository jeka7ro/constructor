import os
import base64
import httpx
import logging

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

def _build_calendar_links(new_date: str, client_name: str, address: str = "", wo_id: str = None):
    """Generate Google Calendar URL and .ics download URL for a work order."""
    from urllib.parse import quote
    from datetime import datetime, timedelta
    
    # Parse date from "DD/MM/YYYY" or "DD/MM/YYYY (HH:MM)" format
    date_part = new_date.split('(')[0].strip()
    time_part = None
    if '(' in new_date and ')' in new_date:
        time_part = new_date.split('(')[1].replace(')', '').strip()
    
    try:
        dt = datetime.strptime(date_part, "%d/%m/%Y")
        if time_part:
            try:
                t = datetime.strptime(time_part, "%H:%M")
                dt = dt.replace(hour=t.hour, minute=t.minute)
            except:
                dt = dt.replace(hour=7, minute=0)
        else:
            dt = dt.replace(hour=7, minute=0)
    except:
        return None, None
    
    dt_end = dt + timedelta(hours=8)
    dt_fmt = dt.strftime("%Y%m%dT%H%M%S")
    dt_end_fmt = dt_end.strftime("%Y%m%dT%H%M%S")
    
    title = f"Intervention Davide Chape - {client_name}"
    location = address or ""
    
    # Google Calendar URL
    gcal_url = (
        f"https://calendar.google.com/calendar/render?action=TEMPLATE"
        f"&text={quote(title)}"
        f"&dates={dt_fmt}/{dt_end_fmt}"
        f"&details={quote('Intervention planifiée par Davide Chape')}"
        f"&location={quote(location)}"
    )
    
    # .ics download URL (served by backend)
    ics_url = None
    if wo_id:
        ics_url = f"https://davidechape.pontaj.app/api/work-orders/{wo_id}/calendar.ics"
    
    return gcal_url, ics_url


def _log_email(org_id, wo_id, to_email, client_name, subject, html_content, status, error_message=None):
    from app.database import SessionLocal
    from app.models import EmailLog, WorkOrder, Organization
    db = SessionLocal()
    try:
        if not org_id and wo_id:
            wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
            if wo:
                org_id = wo.organization_id
        if not org_id:
            org = db.query(Organization).first()
            if org:
                org_id = org.id
        if org_id:
            log = EmailLog(
                organization_id=org_id,
                work_order_id=wo_id,
                client_email=to_email,
                client_name=client_name,
                subject=subject,
                html_content=html_content,
                status=status,
                error_message=error_message
            )
            db.add(log)
            db.commit()
    except Exception as e:
        logger.error(f"Failed to log email to DB: {e}")
    finally:
        db.close()

def send_quote_email(to_email: str, client_name: str, client_language: str, signing_url: str, pdf_path: str = None, org_id: str = None, wo_id: str = None, custom_html: str = None):
    client_language = str(client_language).lower().split('-')[0].strip() if client_language else 'fr'
    if client_language in ['eng', 'english']: client_language = 'en'
    if client_language in ['nl', 'dutch']: client_language = 'nl'
    if client_language in ['fr', 'french']: client_language = 'fr'
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if not brevo_api_key:
        logger.warning("BREVO_API_KEY is not set. Email not sent.")
        return False
        
    from_email = os.getenv("EMAIL_FROM", "info@davidechape.pontaj.app")

    # Email content per language
    if client_language == "nl":
        subject = "Bevestiging van uw aanvraag – Davide Chape"
        greeting = f"Beste {client_name}"
        intro = "Hartelijk dank voor uw aanvraag via onze website."
        body_main = "Uw offerte is succesvol aangemaakt. U kunt deze bekijken, downloaden en online aanvaarden via onderstaande knop."
        contact_msg = "Ons team zal u zo snel mogelijk contacteren om de uitvoeringsdatum te bespreken."
        btn_text = "Mijn offerte bekijken"
        fallback = "Als de knop niet werkt, kopieer en plak deze link in uw browser:"
        footer = "Het team van Davide Chape<br>Dit is een automatisch bericht, gelieve hier niet rechtstreeks op te antwoorden."
    elif client_language == "en":
        subject = "Confirmation of your request – Davide Chape"
        greeting = f"Dear {client_name}"
        intro = "Thank you for your request on our website."
        body_main = "Your quote has been successfully generated. You can view, download and accept it online by clicking the button below."
        contact_msg = "Our team will contact you as soon as possible to discuss the execution date."
        btn_text = "View my quote"
        fallback = "If the button does not work, please copy and paste this link into your browser:"
        footer = "The Davide Chape Team<br>This is an automated message, please do not reply directly."
    else:
        # Default: French
        subject = "Confirmation de votre demande – Davide Chape"
        greeting = f"Bonjour {client_name}"
        intro = "Nous vous remercions pour votre demande sur notre site."
        body_main = "Votre devis a été généré avec succès. Vous pouvez le consulter, le télécharger et l'accepter directement en ligne en cliquant sur le bouton ci-dessous."
        contact_msg = "Notre équipe vous contactera dans les plus brefs délais pour discuter de la date d'exécution des travaux."
        btn_text = "Voir mon devis"
        fallback = "Si le bouton ne fonctionne pas, veuillez copier et coller ce lien dans votre navigateur :"
        footer = "L'équipe Davide Chape<br>Ceci est un message automatique, merci de ne pas y répondre directement."

    primary_color = "#0ea5e9"  # Default fallback if org is not found or has no color
    try:
        from app.database import SessionLocal
        from app.models import Organization, WorkOrder
        db = SessionLocal()
        
        if not org_id and wo_id:
            wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
            if wo:
                org_id = wo.organization_id
        
        if org_id:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if org and org.primary_color:
                primary_color = org.primary_color
        elif not org_id:
            org = db.query(Organization).first()
            if org and org.primary_color:
                primary_color = org.primary_color
    except Exception as e:
        logger.error(f"Error fetching tenant primary_color for new quote email: {e}")
    finally:
        try:
            db.close()
        except:
            pass

    if custom_html:
        html_content = custom_html
    else:
        html_content = f"""
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid {primary_color};">
            <img src="https://davidechape.pontaj.app/davide_logo.png" alt="Davide Chape" style="max-height: 60px;" />
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px;"><strong>{greeting}</strong>,</p>
            <p style="font-size: 16px;">{intro}</p>
            <p style="font-size: 16px;">{body_main}</p>
            <p style="font-size: 16px; color: {primary_color}; font-weight: bold;">{contact_msg}</p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="{signing_url}" style="background-color: {primary_color}; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">{btn_text}</a>
            </div>
            

        </div>
        <div style="background-color: #f9f9f9; text-align: center; padding: 20px; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0;">{footer}</p>
        </div>
    </div>
    """

    payload = {
        "sender": {
            "name": "Davide Chape",
            "email": from_email
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }

    # Attach PDF if available
    if pdf_path and os.path.exists(pdf_path):
        try:
            with open(pdf_path, "rb") as f:
                pdf_data = base64.b64encode(f.read()).decode("utf-8")
            payload["attachment"] = [{
                "content": pdf_data,
                "name": "Devis_Davide_Chape.pdf"
            }]
            logger.info(f"PDF attached: {pdf_path}")
        except Exception as e:
            logger.warning(f"Could not attach PDF: {e}")

    try:
        response = httpx.post(
            BREVO_API_URL,
            json=payload,
            headers={
                "api-key": brevo_api_key,
                "accept": "application/json",
                "content-type": "application/json"
            },
            timeout=10.0
        )
        response.raise_for_status()
        logger.info(f"Email sent successfully to {to_email}")
        _log_email(org_id, wo_id, to_email, client_name, subject, html_content, "sent")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        _log_email(org_id, wo_id, to_email, client_name, subject, html_content, "failed", str(e))
        return False

def send_planning_update_email(to_email: str, client_name: str, client_language: str, signing_url: str, new_date: str, org_id: str = None, wo_id: str = None):
    client_language = str(client_language).lower().split('-')[0].strip() if client_language else 'fr'
    if client_language in ['eng', 'english']: client_language = 'en'
    if client_language in ['ro', 'romana', 'romanian']: client_language = 'ro'
    if client_language in ['nl', 'dutch']: client_language = 'nl'
    if client_language in ['fr', 'french']: client_language = 'fr'
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if not brevo_api_key:
        return False
        
    from_email = os.getenv("EMAIL_FROM", "info@davidechape.pontaj.app")

    if client_language == "nl":
        subject = "Mise à jour de votre intervention – Davide Chape"
        greeting = f"Beste {client_name}"
        intro = f"De datum van uw interventie is bijgewerkt: <strong>{new_date}</strong>."
        body_main = "U kunt uw bijgewerkte offerte bekijken via onderstaande knop."
        btn_text = "Mijn offerte bekijken"
        cal_label = "Toevoegen aan agenda"
        gcal_label = "Google Agenda"
        ics_label = "Outlook / Apple"
        fallback = "Als de knop niet werkt, kopieer en plak deze link:"
        footer = "Het team van Davide Chape"
    elif client_language == "en":
        subject = "Update on your intervention – Davide Chape"
        greeting = f"Dear {client_name}"
        intro = f"The date of your intervention has been updated to: <strong>{new_date}</strong>."
        body_main = "You can view your updated quote by clicking the button below."
        btn_text = "View my quote"
        cal_label = "Add to calendar"
        gcal_label = "Google Calendar"
        ics_label = "Outlook / Apple"
        fallback = "If the button does not work, copy and paste this link:"
        footer = "The Davide Chape Team"

    else:
        subject = "Mise à jour de votre intervention"
        greeting = f"Bonjour {client_name}"
        intro = f"La date de votre intervention a été mise à jour : <strong>{new_date}</strong>."
        body_main = "Vous pouvez consulter les détails en cliquant sur le bouton ci-dessous."
        btn_text = "Voir les détails"
        cal_label = "Ajouter au calendrier"
        gcal_label = "Google Agenda"
        ics_label = "Outlook / Apple"
        fallback = "Si le bouton ne fonctionne pas, veuillez copier et coller ce lien :"
        footer = "Ceci est un message automatique, merci de ne pas y répondre directement."

    primary_color = "#3b82f6"
    tenant_name = "Davide Chape"
    tenant_logo = "https://davidechape.pontaj.app/davide_logo.png"
    
    try:
        from app.database import SessionLocal
        from app.models import Organization, WorkOrder
        db = SessionLocal()
        
        if not org_id and wo_id:
            wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
            if wo:
                org_id = wo.organization_id
        
        if org_id:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if org:
                if org.primary_color: primary_color = org.primary_color
                if org.name: tenant_name = org.name
                if org.logo_url: tenant_logo = org.logo_url
        elif not org_id:
            org = db.query(Organization).first()
            if org:
                if org.primary_color: primary_color = org.primary_color
                if org.name: tenant_name = org.name
                if org.logo_url: tenant_logo = org.logo_url
    except Exception:
        pass
    finally:
        try:
            db.close()
        except:
            pass

    # Append tenant name dynamically if not already in subject
    if tenant_name not in subject:
        subject = f"{subject} - {tenant_name}"
    
    footer = f"L'équipe {tenant_name}<br>{footer}"

    # Build calendar links
    wo_address = ""
    try:
        if wo_id:
            from app.database import SessionLocal as SL2
            from app.models import WorkOrder as WO2
            db2 = SL2()
            wo_obj = db2.query(WO2).filter(WO2.id == wo_id).first()
            if wo_obj:
                wo_address = wo_obj.site_address or ""
            db2.close()
    except:
        pass
    
    gcal_url, ics_url = _build_calendar_links(new_date, client_name, wo_address, wo_id)
    
    calendar_html = ""
    if gcal_url or ics_url:
        cal_buttons = ""
        if gcal_url:
            cal_buttons += f'<a href="{gcal_url}" target="_blank" style="display:inline-block;padding:10px 18px;background-color:#4285f4;color:white;text-decoration:none;border-radius:5px;font-size:13px;font-weight:bold;margin:0 6px;">{gcal_label}</a>'
        if ics_url:
            cal_buttons += f'<a href="{ics_url}" style="display:inline-block;padding:10px 18px;background-color:#0078d4;color:white;text-decoration:none;border-radius:5px;font-size:13px;font-weight:bold;margin:0 6px;">{ics_label}</a>'
        calendar_html = f'''
            <div style="text-align:center;margin:25px 0 10px;">
                <p style="font-size:13px;color:#888;margin-bottom:10px;">{cal_label}</p>
                {cal_buttons}
            </div>
        '''

    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid {primary_color};">
            <img src="{tenant_logo}" alt="{tenant_name}" style="max-height: 60px;" />
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px;"><strong>{greeting}</strong>,</p>
            <p style="font-size: 16px;">{intro}</p>
            <p style="font-size: 16px;">{body_main}</p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="{signing_url}" style="background-color: {primary_color}; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">{btn_text}</a>
            </div>
            
            {calendar_html}

        </div>
        <div style="background-color: #f9f9f9; text-align: center; padding: 20px; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0;">{footer}</p>
        </div>
    </div>
    """

    payload = {
        "sender": {"name": tenant_name, "email": from_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }

    try:
        r = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={"api-key": brevo_api_key, "accept": "application/json", "content-type": "application/json"},
            timeout=10.0
        )
        r.raise_for_status()
        _log_email(org_id, wo_id, to_email, client_name, subject, html_content, "sent")
        return True
    except Exception as e:
        print(f"Email trimis esuat (update): {e}")
        logger.error(f"Failed to send planning email: {e}")
        _log_email(org_id, wo_id, to_email, client_name, subject, html_content, "failed", str(e))
        return False


def send_quote_update_email(to_email: str, client_name: str, client_language: str, signing_url: str, discount_pct: float = 0, org_id: str = None, wo_id: str = None):
    client_language = str(client_language).lower().split('-')[0].strip() if client_language else 'fr'
    if client_language in ['eng', 'english']: client_language = 'en'
    if client_language in ['ro', 'romana', 'romanian']: client_language = 'ro'
    if client_language in ['nl', 'dutch']: client_language = 'nl'
    if client_language in ['fr', 'french']: client_language = 'fr'
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if not brevo_api_key:
        return False
        
    from_email = os.getenv("EMAIL_FROM", "info@davidechape.pontaj.app")
    primary_color = "#3b82f6"
    
    try:
        from app.database import SessionLocal
        from app.models import Organization, WorkOrder
        db = SessionLocal()
        
        if not org_id and wo_id:
            wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
            if wo:
                org_id = wo.organization_id
        
        if org_id:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if org and org.primary_color:
                primary_color = org.primary_color
        elif not org_id:
            org = db.query(Organization).first()
            if org and org.primary_color:
                primary_color = org.primary_color
    except Exception as e:
        logger.error(f"Error fetching tenant primary_color: {e}")
    finally:
        try:
            db.close()
        except:
            pass

    if client_language == "nl":
        subject = "Update van uw offerte – Davide Chape"
        greeting = f"Beste {client_name}"
        if discount_pct > 0:
            intro = f"Er is een update voor uw offerte. Een extra korting van {discount_pct}% is toegepast."
        else:
            intro = "Er is een update voor uw offerte."
        body_main = "U kunt uw bijgewerkte offerte bekijken via onderstaande knop."
        btn_text = "Mijn offerte bekijken"
        fallback = "Als de knop niet werkt, kopieer en plak deze link:"
        footer = "Het team van Davide Chape"
    elif client_language == "en":
        subject = "Quote Update – Davide Chape"
        greeting = f"Dear {client_name}"
        if discount_pct > 0:
            intro = f"There has been an update to your quote. An additional discount of {discount_pct}% has been applied."
        else:
            intro = "There has been an update to your quote."
        body_main = "You can view your updated quote by clicking the button below."
        btn_text = "View my quote"
        fallback = "If the button does not work, copy and paste this link:"
        footer = "The Davide Chape Team"
    else:
        subject = "Mise à jour de votre devis – Davide Chape"
        greeting = f"Bonjour {client_name}"
        if discount_pct > 0:
            intro = f"Il y a eu une mise à jour de votre devis. Une remise supplémentaire de {discount_pct}% a été appliquée."
        else:
            intro = "Il y a eu une mise à jour de votre devis."
        body_main = "Vous pouvez consulter votre devis mis à jour en cliquant sur le bouton ci-dessous."
        btn_text = "Voir mon devis"
        fallback = "Si le bouton ne fonctionne pas, veuillez copier et coller ce lien :"
        footer = "L'équipe Davide Chape"

    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid {primary_color};">
            <img src="https://davidechape.pontaj.app/davide_logo.png" alt="Davide Chape" style="max-height: 60px;" />
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px;"><strong>{greeting}</strong>,</p>
            <p style="font-size: 16px;">{intro}</p>
            <p style="font-size: 16px;">{body_main}</p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="{signing_url}" style="background-color: {primary_color}; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">{btn_text}</a>
            </div>
            
            <p style="font-size: 13px; color: #666; margin-top: 30px;">
                {fallback}<br>
                <a href="{signing_url}" style="color: {primary_color}; word-break: break-all;">{signing_url}</a>
            </p>
        </div>
        <div style="background-color: #f9f9f9; text-align: center; padding: 20px; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0;">{footer}</p>
        </div>
    </div>
    """

    payload = {
        "sender": {"name": "Davide Chape", "email": from_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }

    try:
        r = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={"api-key": brevo_api_key, "accept": "application/json", "content-type": "application/json"},
            timeout=10.0
        )
        r.raise_for_status()
        _log_email(org_id, wo_id, to_email, client_name, subject, html_content, "sent")
        return True
    except Exception as e:
        logger.error(f"Failed to send quote update email: {e}")
        _log_email(org_id, wo_id, to_email, client_name, subject, html_content, "failed", str(e))
        return False


def send_admin_partner_reschedule_alert(admin_email: str, partner_name: str, client_name: str, address: str, new_date: str, new_time: str, org_id: str = None, wo_id: str = None):
    """Trimite notificare pe e-mail catre admin cand un partener schimba data unei comenzi."""
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if not brevo_api_key:
        return False
        
    from_email = os.getenv("EMAIL_FROM", "info@davidechape.pontaj.app")
    subject = f"NOTIFICATION: Modification de date par le partenaire {partner_name}"
    
    time_str = f" à {new_time}" if new_time else ""
    date_str = f"{new_date}{time_str}" if new_date else "Non définie"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: 0 auto; border-radius: 8px;">
        <h2 style="color: #2b5c8f; margin-top: 0;">Modification de Planification</h2>
        <p>Le partenaire <strong>{partner_name}</strong> a modifié la date de planification pour une commande.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Nouvelle Date :</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>{date_str}</strong></td>
            </tr>
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Client :</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{client_name or '-'}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Adresse :</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{address or '-'}</td>
            </tr>
        </table>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">Veuillez vous connecter à la plateforme pour plus de détails.</p>
    </div>
    """
    
    payload = {
        "sender": {"name": "SmartDevize Alerts", "email": from_email},
        "to": [{"email": admin_email}],
        "subject": subject,
        "htmlContent": html_content
    }
    
    try:
        r = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={"api-key": brevo_api_key, "accept": "application/json", "content-type": "application/json"},
            timeout=10.0
        )
        r.raise_for_status()
        logger.info(f"Partner reschedule alert sent to {admin_email}")
        _log_email(org_id, wo_id, admin_email, "Admin", subject, html_content, "sent")
        return True
    except Exception as e:
        logger.error(f"Failed to send partner reschedule alert to {admin_email}: {e}")
        _log_email(org_id, wo_id, admin_email, "Admin", subject, html_content, "failed", str(e))
        return False


def send_admin_new_quote_alert(admin_email: str, client_name: str, client_phone: str, proforma_url: str, org_id: str = None, wo_id: str = None):
    """Trimite notificare pe e-mail catre admin cand se face un deviz nou din site."""
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if not brevo_api_key:
        return False
        
    from_email = os.getenv("EMAIL_FROM", "info@davidechape.pontaj.app")
    subject = f"NOTIFICATION: Nouveau Devis de {client_name}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: 0 auto; border-radius: 8px;">
        <h2 style="color: #f5a623; margin-top: 0;">Un nouveau devis a été généré !</h2>
        <p>Un client a utilisé le formulaire Devis Online et a généré une demande de devis.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Client :</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{client_name}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Téléphone :</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{client_phone or '-'}</td>
            </tr>
        </table>
        <div style="text-align: center; margin-top: 30px;">
            <a href="{proforma_url}" style="background-color: #2b5c8f; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ouvrir le Devis (Proforma)</a>
        </div>
    </div>
    """
    
    payload = {
        "sender": {"name": "SmartDevize Alerts", "email": from_email},
        "to": [{"email": admin_email}],
        "subject": subject,
        "htmlContent": html_content
    }
    
    try:
        r = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={"api-key": brevo_api_key, "accept": "application/json", "content-type": "application/json"},
            timeout=10.0
        )
        r.raise_for_status()
        logger.info(f"Admin new quote alert sent to {admin_email}")
        _log_email(org_id, wo_id, admin_email, "Admin", subject, html_content, "sent")
        return True
    except Exception as e:
        logger.error(f"Failed to send admin quote alert: {e}")
        _log_email(org_id, wo_id, admin_email, "Admin", subject, html_content, "failed", str(e))
        return False
def send_chat_notification_email(to_email: str, client_name: str, client_language: str, chat_url: str, org_id: str = None, wo_id: str = None):
    client_language = str(client_language).lower().split('-')[0].strip() if client_language else 'fr'
    if client_language in ['eng', 'english']: client_language = 'en'
    if client_language in ['ro', 'romana', 'romanian']: client_language = 'ro'
    if client_language in ['nl', 'dutch']: client_language = 'nl'
    if client_language in ['fr', 'french']: client_language = 'fr'
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if not brevo_api_key:
        logger.warning("BREVO_API_KEY is not set. Email not sent.")
        return False
        
    from_email = os.getenv("EMAIL_FROM", "info@davidechape.pontaj.app")
    
    if client_language == "nl":
        subject = "Nieuw bericht van Davide Chape"
        greeting = f"Beste {client_name}"
        intro = "U heeft een nieuw bericht ontvangen van ons team."
        body_main = "U kunt het bericht lezen en erop reageren via de onderstaande knop."
        btn_text = "Bekijk bericht"
        fallback = "Als de knop niet werkt, kopieer en plak deze link in uw browser:"
        footer = "Het team van Davide Chape<br>Dit is een automatisch bericht, gelieve hier niet rechtstreeks op te antwoorden."
    elif client_language == "en":
        subject = "New message from Davide Chape"
        greeting = f"Dear {client_name}"
        intro = "You have received a new message from our team."
        body_main = "You can read and reply to the message using the button below."
        btn_text = "View message"
        fallback = "If the button doesn't work, copy and paste this link into your browser:"
        footer = "The Davide Chape Team<br>This is an automated message, please do not reply directly."
    else: # Default to FR
        subject = "Nouveau message de Davide Chape"
        greeting = f"Bonjour {client_name}"
        intro = "Vous avez reçu un nouveau message de notre équipe."
        body_main = "Vous pouvez lire et répondre au message via le bouton ci-dessous."
        btn_text = "Voir le message"
        fallback = "Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur:"
        footer = "L'équipe Davide Chape<br>Ceci est un message automatique, merci de ne pas y répondre directement."

    primary_color = "#3b82f6"
    tenant_name = "Davide Chape"
    tenant_logo = "https://davidechape.pontaj.app/davide_logo.png"
    
    try:
        from app.database import SessionLocal
        from app.models import Organization, WorkOrder
        db = SessionLocal()
        
        if not org_id and wo_id:
            wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
            if wo:
                org_id = wo.organization_id
        
        if org_id:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if org:
                if org.primary_color: primary_color = org.primary_color
                if org.name: tenant_name = org.name
                if org.logo_url: tenant_logo = org.logo_url
        elif not org_id:
            org = db.query(Organization).first()
            if org:
                if org.primary_color: primary_color = org.primary_color
                if org.name: tenant_name = org.name
                if org.logo_url: tenant_logo = org.logo_url
    except Exception:
        pass
    finally:
        try:
            db.close()
        except:
            pass
            
    # Replace "Davide Chape" in subject and footer dynamically
    subject = subject.replace("Davide Chape", tenant_name)
    footer = footer.replace("Davide Chape", tenant_name)
            
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid {primary_color};">
            <img src="{tenant_logo}" alt="{tenant_name}" style="max-height: 60px;" />
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px;"><strong>{greeting}</strong>,</p>
            <p style="font-size: 16px;">{intro}</p>
            <p style="font-size: 16px;">{body_main}</p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="{chat_url}#chat-section" style="background-color: {primary_color}; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">{btn_text}</a>
            </div>
            
            <p style="font-size: 13px; color: #666; margin-top: 30px;">
                {fallback}<br>
                <a href="{chat_url}#chat-section" style="color: {primary_color}; word-break: break-all;">{chat_url}#chat-section</a>
            </p>
        </div>
        <div style="background-color: #f9f9f9; text-align: center; padding: 20px; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0;">{footer}</p>
        </div>
    </div>
    """

    payload = {
        "sender": {
            "name": tenant_name,
            "email": from_email
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }

    try:
        response = httpx.post(
            BREVO_API_URL,
            json=payload,
            headers={
                "api-key": brevo_api_key,
                "accept": "application/json",
                "content-type": "application/json"
            },
            timeout=10.0
        )
        response.raise_for_status()
        logger.info(f"Chat notification email sent successfully to {to_email}")
        _log_email(org_id, wo_id, to_email, client_name, subject, html_content, "sent")
        return True
    except Exception as e:
        logger.error(f"Failed to send chat notification email to {to_email}: {e}")
        _log_email(org_id, wo_id, to_email, client_name, subject, html_content, "failed", str(e))
        return False

def send_order_confirmation_email(to_email: str, client_name: str, client_language: str, signing_url: str, date_str: str, org_id: str = None, wo_id: str = None):
    client_language = str(client_language).lower().split('-')[0].strip() if client_language else 'fr'
    if client_language in ['eng', 'english']: client_language = 'en'
    if client_language in ['ro', 'romana', 'romanian']: client_language = 'ro'
    if client_language in ['nl', 'dutch']: client_language = 'nl'
    if client_language in ['fr', 'french']: client_language = 'fr'
    import os
    from app.services.email_service import _log_email
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if not brevo_api_key:
        return False
        
    from_email = os.getenv("EMAIL_FROM", "info@davidechape.pontaj.app")

    if client_language == "nl":
        subject = "Orderbevestiging – Davide Chape"
        greeting = f"Beste {client_name}"
        intro = "Uw bestelling / offerte is succesvol geregistreerd."
        if date_str and date_str != "À déterminer":
            body_main = (
                f"U heeft als <strong>gewenste uitvoeringsdatum</strong> opgegeven: <strong>{date_str}</strong>.<br><br>"
                f"ℹ️ <em>Gelieve er rekening mee te houden dat dit een gewenste datum betreft. Ons planningsteam bekijkt uw dossier en neemt spoedig contact met u op om samen de definitieve datum af te stemmen en te bevestigen.</em><br><br>"
                f"Bedankt voor uw vertrouwen!"
            )
        else:
            body_main = (
                "Uw bevestiging is goed ontvangen.<br><br>"
                "Ons planningsteam neemt spoedig contact met u op om een datum voor de werken af te spreken.<br><br>"
                "Bedankt voor uw vertrouwen!"
            )
        btn_text = "Mijn offerte bekijken"
        fallback = "Als de knop niet werkt, kopieer en plak deze link:"
        footer = "Het team van Davide Chape<br>Dit is een automatisch bericht, gelieve niet rechtstreeks te antwoorden."
    elif client_language == "en":
        subject = "Order Confirmation – Davide Chape"
        greeting = f"Dear {client_name}"
        intro = "Your order / quote has been successfully registered."
        if date_str and date_str != "À déterminer":
            body_main = (
                f"You indicated as <strong>requested intervention date</strong>: <strong>{date_str}</strong>.<br><br>"
                f"ℹ️ <em>Please note that this is a requested date. Our planning team is currently reviewing your request and will contact you shortly to confirm and validate the final date together.</em><br><br>"
                f"Thank you for your trust!"
            )
        else:
            body_main = (
                "Your confirmation has been successfully recorded.<br><br>"
                "Our planning team will contact you shortly to agree on the intervention date.<br><br>"
                "Thank you for your trust!"
            )
        btn_text = "View my quote"
        fallback = "If the button does not work, copy and paste this link:"
        footer = "The Davide Chape Team<br>This is an automated message, please do not reply directly."
    else:
        subject = "Confirmation de commande – Davide Chape"
        greeting = f"Bonjour {client_name}"
        intro = "Votre commande / devis a bien été enregistré."
        if date_str and date_str != "À déterminer":
            body_main = (
                f"Vous avez indiqué comme <strong>date souhaitée d'intervention</strong> le : <strong>{date_str}</strong>.<br><br>"
                f"ℹ️ <em>Veuillez noter qu'il s'agit d'une date souhaitée. Notre équipe de planification examine actuellement votre dossier et vous recontactera très rapidement pour convenir et valider ensemble la date définitive des travaux.</em><br><br>"
                f"Merci pour votre confiance !"
            )
        else:
            body_main = (
                "Votre confirmation a bien été enregistrée.<br><br>"
                "Notre équipe de planification vous recontactera très rapidement afin de convenir de la date définitive d'intervention.<br><br>"
                "Merci pour votre confiance !"
            )
        btn_text = "Voir mon devis"
        fallback = "Si le bouton ne fonctionne pas, veuillez copier et coller ce lien :"
        footer = "L'équipe Davide Chape<br>Ceci est un message automatique, merci de ne pas y répondre directement."

    primary_color = "#10b981" # Green for confirmation
    tenant_name = "Davide Chape"
    tenant_logo = "https://davidechape.pontaj.app/davide_logo.png"
    
    try:
        from app.database import SessionLocal
        from app.models import Organization, WorkOrder
        db = SessionLocal()
        
        if not org_id and wo_id:
            wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
            if wo:
                org_id = wo.organization_id
        
        if org_id:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if org:
                if org.primary_color: primary_color = org.primary_color
                if org.name: tenant_name = org.name
                if org.logo_url: tenant_logo = org.logo_url
        elif not org_id:
            org = db.query(Organization).first()
            if org:
                if org.primary_color: primary_color = org.primary_color
                if org.name: tenant_name = org.name
                if org.logo_url: tenant_logo = org.logo_url
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching tenant info: {e}")
    finally:
        db.close()

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background-color: {primary_color}; padding: 30px; text-align: center;">
                                <img src="{tenant_logo}" alt="{tenant_name}" style="max-height: 50px; margin-bottom: 20px;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{subject}</h1>
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                                <p style="margin-top: 0;">{greeting},</p>
                                <p>{intro}</p>
                                <div style="background-color: #f8fafc; border-left: 4px solid {primary_color}; padding: 15px; margin: 25px 0;">
                                    <p style="margin: 0;">{body_main}</p>
                                </div>
                                
                                <div style="text-align: center; margin: 40px 0;">
                                    <a href="{signing_url}" style="background-color: {primary_color}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; display: inline-block;">
                                        {btn_text}
                                    </a>
                                </div>
                                
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px;">
                                <p style="margin: 0;">{footer}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    try:
        import requests
        headers = {
            "api-key": brevo_api_key,
            "Content-Type": "application/json"
        }
        data = {
            "sender": {"email": from_email, "name": tenant_name},
            "to": [{"email": to_email, "name": client_name}],
            "subject": subject,
            "htmlContent": html_content
        }
        resp = requests.post("https://api.brevo.com/v3/smtp/email", headers=headers, json=data, timeout=10)
        resp.raise_for_status()
        _log_email(org_id, wo_id, to_email, client_name, subject, html_content, "delivered")
        return True
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send order confirmation email: {e}")
        _log_email(org_id, wo_id, to_email, client_name, subject, html_content, "failed", str(e))
        return False


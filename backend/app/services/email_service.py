import os
import base64
import httpx
import logging

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

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

def send_quote_email(to_email: str, client_name: str, client_language: str, signing_url: str, pdf_path: str = None, org_id: str = None, wo_id: str = None):
    client_language = str(client_language).lower().split('-')[0].strip() if client_language else 'fr'
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
            
            <p style="font-size: 14px; color: #666;">{fallback}<br><a href="{signing_url}" style="color: {primary_color};">{signing_url}</a></p>
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
        fallback = "Als de knop niet werkt, kopieer en plak deze link:"
        footer = "Het team van Davide Chape"
    elif client_language == "en":
        subject = "Update on your intervention – Davide Chape"
        greeting = f"Dear {client_name}"
        intro = f"The date of your intervention has been updated to: <strong>{new_date}</strong>."
        body_main = "You can view your updated quote by clicking the button below."
        btn_text = "View my quote"
        fallback = "If the button does not work, copy and paste this link:"
        footer = "The Davide Chape Team"

    else:
        subject = "Mise à jour de votre intervention – Davide Chape"
        greeting = f"Bonjour {client_name}"
        intro = f"La date de votre intervention a été mise à jour : <strong>{new_date}</strong>."
        body_main = "Vous pouvez consulter les détails en cliquant sur le bouton ci-dessous."
        btn_text = "Voir les détails"
        fallback = "Si le bouton ne fonctionne pas, veuillez copier et coller ce lien :"
        footer = "L'équipe Davide Chape"

    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid #f5a623;">
            <img src="https://davidechape.pontaj.app/davide_logo.png" alt="Davide Chape" style="max-height: 60px;" />
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px;"><strong>{greeting}</strong>,</p>
            <p style="font-size: 16px;">{intro}</p>
            <p style="font-size: 16px;">{body_main}</p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="{signing_url}" style="background-color: #f5a623; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">{btn_text}</a>
            </div>
            
            <p style="font-size: 14px; color: #666;">{fallback}<br><a href="{signing_url}" style="color: #2b5c8f;">{signing_url}</a></p>
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
        print(f"Email trimis esuat (update): {e}")
        logger.error(f"Failed to send planning email: {e}")
        _log_email(org_id, wo_id, to_email, client_name, subject, html_content, "failed", str(e))
        return False


def send_quote_update_email(to_email: str, client_name: str, client_language: str, signing_url: str, discount_pct: float = 0, org_id: str = None, wo_id: str = None):
    client_language = str(client_language).lower().split('-')[0].strip() if client_language else 'fr'
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
            
            <p style="font-size: 14px; color: #666;">{fallback}<br><a href="{signing_url}" style="color: #2b5c8f;">{signing_url}</a></p>
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
            
            <p style="font-size: 14px; color: #666;">{fallback}<br><a href="{chat_url}#chat-section" style="color: {primary_color};">{chat_url}</a></p>
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

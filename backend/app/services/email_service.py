import os
import base64
import httpx
import logging

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

def send_quote_email(to_email: str, client_name: str, client_language: str, signing_url: str, pdf_path: str = None):
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

    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid #f26522;">
            <img src="https://davidechape.pontaj.app/davide_logo.png" alt="Davide Chape" style="max-height: 60px;" />
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px;"><strong>{greeting}</strong>,</p>
            <p style="font-size: 16px;">{intro}</p>
            <p style="font-size: 16px;">{body_main}</p>
            <p style="font-size: 16px; color: #2b5c8f; font-weight: bold;">{contact_msg}</p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="{signing_url}" style="background-color: #f26522; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">{btn_text}</a>
            </div>
            
            <p style="font-size: 14px; color: #666;">{fallback}<br><a href="{signing_url}" style="color: #2b5c8f;">{signing_url}</a></p>
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
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False

def send_planning_update_email(to_email: str, client_name: str, client_language: str, signing_url: str, new_date: str):
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
        <div style="background-color: #2b5c8f; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">Davide Chape</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px;"><strong>{greeting}</strong>,</p>
            <p style="font-size: 16px;">{intro}</p>
            <p style="font-size: 16px;">{body_main}</p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="{signing_url}" style="background-color: #f26522; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">{btn_text}</a>
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
        httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={"api-key": brevo_api_key, "accept": "application/json", "content-type": "application/json"},
            timeout=10.0
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send planning email: {e}")
        return False


def send_admin_new_quote_alert(admin_email: str, client_name: str, client_phone: str, proforma_url: str):
    """Trimite notificare pe e-mail catre admin cand se face un deviz nou din site."""
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if not brevo_api_key:
        return False
        
    from_email = os.getenv("EMAIL_FROM", "info@davidechape.pontaj.app")
    subject = f"NOTIFICARE: Deviz Nou de la {client_name}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: 0 auto; border-radius: 8px;">
        <h2 style="color: #f26522; margin-top: 0;">Un deviz nou a fost generat!</h2>
        <p>Un client a folosit calculatorul public de pe site si a generat un deviz estimativ.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Client:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{client_name}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Telefon:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{client_phone or '-'}</td>
            </tr>
        </table>
        <div style="text-align: center; margin-top: 30px;">
            <a href="{proforma_url}" style="background-color: #2b5c8f; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Deschide Devizul (Proforma)</a>
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
        httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={"api-key": brevo_api_key, "accept": "application/json", "content-type": "application/json"},
            timeout=10.0
        )
        logger.info(f"Admin new quote alert sent to {admin_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send admin quote alert: {e}")
        return False

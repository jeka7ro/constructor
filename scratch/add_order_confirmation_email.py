import sys

file_path = "backend/app/services/email_service.py"
with open(file_path, "r") as f:
    content = f.read()

new_func = """
def send_order_confirmation_email(to_email: str, client_name: str, client_language: str, signing_url: str, date_str: str, org_id: str = None, wo_id: str = None):
    client_language = str(client_language).lower().split('-')[0].strip() if client_language else 'fr'
    import os
    from app.services.email_service import _log_email
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if not brevo_api_key:
        return False
        
    from_email = os.getenv("EMAIL_FROM", "info@davidechape.pontaj.app")

    if client_language == "nl":
        subject = "Orderbevestiging – Davide Chape"
        greeting = f"Beste {client_name}"
        intro = "Uw bestelling/offerte is succesvol bevestigd."
        body_main = f"Wij hebben de volgende interventiedatum geregistreerd: <strong>{date_str}</strong>.<br><br>Bedankt voor uw vertrouwen!"
        btn_text = "Mijn offerte bekijken"
        fallback = "Als de knop niet werkt, kopieer en plak deze link:"
        footer = "Het team van Davide Chape"
    elif client_language == "en":
        subject = "Order Confirmation – Davide Chape"
        greeting = f"Dear {client_name}"
        intro = "Your order/quote has been successfully confirmed."
        body_main = f"We have registered the following intervention date: <strong>{date_str}</strong>.<br><br>Thank you for your trust!"
        btn_text = "View my quote"
        fallback = "If the button does not work, copy and paste this link:"
        footer = "The Davide Chape Team"
    else:
        subject = "Confirmation de commande – Davide Chape"
        greeting = f"Bonjour {client_name}"
        intro = "Votre commande/devis a bien été confirmée."
        body_main = f"Nous avons enregistré la date d'intervention suivante : <strong>{date_str}</strong>.<br><br>Merci pour votre confiance !"
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

    html_content = f\"\"\"
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
                                
                                <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
                                    {fallback}<br>
                                    <a href="{signing_url}" style="color: {primary_color}; word-break: break-all;">{signing_url}</a>
                                </p>
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
    \"\"\"

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

"""

if "def send_order_confirmation_email" not in content:
    with open(file_path, "a") as f:
        f.write(new_func)
    print("Appended send_order_confirmation_email to email_service.py")
else:
    print("Function already exists.")


import re

file_path = "backend/app/api/admin_work_orders.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

endpoint_code = """
@router.get("/{id}/email-preview")
def preview_work_order_email(id: str, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
        
    client = db.query(Client).filter(Client.id == wo.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    client_language = str(wo.client_language).lower().split('-')[0].strip() if wo.client_language else 'fr'
    client_name = client.name
    proforma_url = f"https://davidechape.pontaj.app/public/proforma/{wo.token}"
    
    if client_language == "nl":
        greeting = f"Beste {client_name}"
        intro = "Hartelijk dank voor uw aanvraag via onze website."
        body_main = "Uw offerte is succesvol aangemaakt. U kunt deze bekijken, downloaden en online aanvaarden via onderstaande knop."
        contact_msg = "Ons team zal u zo snel mogelijk contacteren om de uitvoeringsdatum te bespreken."
        btn_text = "Mijn offerte bekijken"
        fallback = "Als de knop niet werkt, kopieer en plak deze link in uw browser:"
        footer = "Het team van Davide Chape<br>Dit is een automatisch bericht, gelieve hier niet rechtstreeks op te antwoorden."
    elif client_language == "en":
        greeting = f"Dear {client_name}"
        intro = "Thank you for your request through our website."
        body_main = "Your quote has been successfully generated. You can view, download, and accept it online using the button below."
        contact_msg = "Our team will contact you as soon as possible to discuss the execution date."
        btn_text = "View my quote"
        fallback = "If the button doesn't work, copy and paste this link into your browser:"
        footer = "The Davide Chape Team<br>This is an automated message, please do not reply directly."
    elif client_language == "ro":
        greeting = f"Salut {client_name}"
        intro = "Îți mulțumim pentru cererea trimisă prin site-ul nostru."
        body_main = "Devizul tău a fost generat cu succes. Îl poți vizualiza, descărca și accepta online folosind butonul de mai jos."
        contact_msg = "Echipa noastră te va contacta în cel mai scurt timp pentru a stabili data execuției."
        btn_text = "Vezi devizul meu"
        fallback = "Dacă butonul nu funcționează, copiază și lipește acest link în browser:"
        footer = "Echipa Davide Chape<br>Acesta este un mesaj automat, te rugăm să nu răspunzi direct."
    else:
        greeting = f"Bonjour {client_name}"
        intro = "Nous vous remercions pour votre demande via notre site web."
        body_main = "Votre devis a été généré avec succès. Vous pouvez le consulter, le télécharger et l'accepter en ligne via le bouton ci-dessous."
        contact_msg = "Notre équipe vous contactera dans les plus brefs délais pour convenir de la date d'exécution."
        btn_text = "Consulter mon devis"
        fallback = "Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur:"
        footer = "L'équipe Davide Chape<br>Ceci est un message automatique, merci de ne pas y répondre directement."

    html_content = f\"\"\"
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-w-xl mx-auto p-4">
            <h2 style="color: #2563eb;">{greeting},</h2>
            <p>{intro}</p>
            <p>{body_main}</p>
            <p>{contact_msg}</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{proforma_url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    {btn_text}
                </a>
            </div>
            <p style="font-size: 12px; color: #666;">
                {fallback}<br>
                <a href="{proforma_url}">{proforma_url}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999;">{footer}</p>
        </div>
      </body>
    </html>
    \"\"\"

    return {"html": html_content}
"""

if "preview_work_order_email" not in content:
    content += "\n" + endpoint_code

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Backend patched with email preview")

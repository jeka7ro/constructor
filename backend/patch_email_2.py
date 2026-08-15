import re

file_path = "app/services/email_service.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace primary_color default and add tenant lookup if missing
# In send_chat_notification_email it just had `primary_color = "#3b82f6" # blue-500` without any DB lookup!
# Let's see the function body

old_func_part = """    else: # Default to FR
        subject = "Nouveau message de Davide Chape"
        greeting = f"Bonjour {client_name}"
        intro = "Vous avez reçu un nouveau message de notre équipe."
        body_main = "Vous pouvez lire et répondre au message via le bouton ci-dessous."
        btn_text = "Voir le message"
        fallback = "Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur:"
        footer = "L'équipe Davide Chape<br>Ceci est un message automatique, merci de ne pas y répondre directement."

    primary_color = "#3b82f6" # blue-500
    
    html_content = f\"\"\"
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">"""

new_func_part = """    else: # Default to FR
        subject = "Nouveau message de Davide Chape"
        greeting = f"Bonjour {client_name}"
        intro = "Vous avez reçu un nouveau message de notre équipe."
        body_main = "Vous pouvez lire et répondre au message via le bouton ci-dessous."
        btn_text = "Voir le message"
        fallback = "Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur:"
        footer = "L'équipe Davide Chape<br>Ceci est un message automatique, merci de ne pas y répondre directement."

    primary_color = "#f5a623"
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
    except Exception:
        pass
    finally:
        try:
            db.close()
        except:
            pass
            
    html_content = f\"\"\"
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">"""

content = content.replace(old_func_part, new_func_part)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Email service patched for DB lookup")

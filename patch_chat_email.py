import re

file_path = "backend/app/services/email_service.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the email content generation
old_func = """    primary_color = "#f5a623"
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
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid {primary_color};">
            <img src="https://davidechape.pontaj.app/davide_logo.png" alt="Davide Chape" style="max-height: 60px;" />
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px;"><strong>{greeting}</strong>,</p>
            <p style="font-size: 16px;">{intro}</p>
            <p style="font-size: 16px;">{body_main}</p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="{chat_url}" style="background-color: {primary_color}; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">{btn_text}</a>
            </div>
            
            <p style="font-size: 14px; color: #666;">{fallback}<br><a href="{chat_url}" style="color: {primary_color};">{chat_url}</a></p>
        </div>
        <div style="background-color: #f9f9f9; text-align: center; padding: 20px; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0;">{footer}</p>
        </div>
    </div>
    \"\"\"

    payload = {
        "sender": {
            "name": "Davide Chape",
            "email": from_email
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }"""

new_func = """    primary_color = "#f5a623"
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
            
    html_content = f\"\"\"
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
    \"\"\"

    payload = {
        "sender": {
            "name": tenant_name,
            "email": from_email
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }"""

if old_func in content:
    content = content.replace(old_func, new_func)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched email_service.py successfully.")
else:
    print("Could not find the code to patch in email_service.py.")

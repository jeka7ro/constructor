import sys

file_path = "backend/app/api/admin_work_orders.py"
with open(file_path, "r") as f:
    content = f.read()

target_str = """
            if wo.client_phone:
                try:
                    send_planning_update_whatsapp(wo.client_phone, wo.client_name, getattr(wo, 'client_language', 'fr'), proforma_url, formatted_date)
                except Exception as e:
                    print(f"Failed to send planning update whatsapp: {e}")
"""

replacement_str = """
            if wo.client_phone:
                try:
                    send_planning_update_whatsapp(wo.client_phone, wo.client_name, getattr(wo, 'client_language', 'fr'), proforma_url, formatted_date)
                except Exception as e:
                    print(f"Failed to send planning update whatsapp: {e}")
            
            # Adauga un mesaj in chat
            try:
                from app.models import WorkOrderMessage
                chat_fr = f"✅ L'équipe Davide Chape vous a programmé pour le {formatted_date}."
                chat_nl = f"✅ Het Davide Chape team heeft u ingepland op {formatted_date}."
                chat_en = f"✅ The Davide Chape team has scheduled you for {formatted_date}."
                chat_ro = f"✅ Echipa Davide Chape v-a programat pentru {formatted_date}."
                
                auto_msg = WorkOrderMessage(
                    work_order_id=wo.id,
                    sender="system",
                    message=chat_fr,
                    translations={
                        "fr": chat_fr,
                        "nl": chat_nl,
                        "en": chat_en,
                        "ro": chat_ro
                    }
                )
                db.add(auto_msg)
                db.commit()
            except Exception as e:
                print(f"Failed to add system message to chat: {e}")
"""

if target_str in content:
    content = content.replace(target_str, replacement_str)
    with open(file_path, "w") as f:
        f.write(content)
    print("Added chat message on planning")
else:
    print("Could not find target block")


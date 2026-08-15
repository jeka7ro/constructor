import sys

file_path = "backend/app/api/admin_work_orders.py"
with open(file_path, "r") as f:
    content = f.read()

target_str = """
            if client_email:
                send_planning_update_email(client_email, client_name, lang, signing_url, date_str)
            if client_phone:
                send_planning_update_whatsapp(client_phone, client_name, lang, signing_url, date_str)
"""

replacement_str = """
            if client_email:
                send_planning_update_email(client_email, client_name, lang, signing_url, date_str)
            if client_phone:
                send_planning_update_whatsapp(client_phone, client_name, lang, signing_url, date_str)
            
            # Adauga mesaj in chat
            try:
                from app.models import WorkOrderMessage
                chat_fr = f"✅ L'équipe Davide Chape vous a programmé pour le {date_str}."
                chat_nl = f"✅ Het Davide Chape team heeft u ingepland op {date_str}."
                chat_en = f"✅ The Davide Chape team has scheduled you for {date_str}."
                chat_ro = f"✅ Echipa Davide Chape v-a programat pentru {date_str}."
                
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
            except Exception as msg_e:
                print(f"Eroare adaugare mesaj chat la aprobare: {msg_e}")
"""

if target_str in content:
    content = content.replace(target_str, replacement_str)
    with open(file_path, "w") as f:
        f.write(content)
    print("Added chat message on approve")
else:
    print("Could not find target block")


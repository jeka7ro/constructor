from app.database import engine
from sqlalchemy import text

def fix():
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE saas_app.work_order_messages 
            SET message = '✅ La date d''intervention (12.08.2026) a été confirmée par le client.' 
            WHERE id = '6a4878f1-e290-4d7b-b94c-7c0cf50d8ebd'
        """))
        conn.execute(text("""
            UPDATE saas_app.work_order_messages 
            SET message = 'Merci pour la confirmation. La date de l''intervention est le 12.08.2026, à 10:00. L''équipe Davide Chape.' 
            WHERE id = 'fc6e114b-353b-4a85-9830-b460604d3fc4'
        """))
        print("Updated old messages to French.")

if __name__ == "__main__":
    fix()

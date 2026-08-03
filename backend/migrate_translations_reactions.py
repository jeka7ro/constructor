from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE saas_app.work_order_messages ADD COLUMN translations JSON;"))
            print("Added translations column")
        except Exception as e:
            print("Failed to add translations:", e)
            
        try:
            conn.execute(text("ALTER TABLE saas_app.work_order_messages ADD COLUMN reactions JSON;"))
            print("Added reactions column")
        except Exception as e:
            print("Failed to add reactions:", e)

if __name__ == "__main__":
    migrate()

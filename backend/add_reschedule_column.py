from app.database import engine
from sqlalchemy import text

def add_columns():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN reschedule_requested BOOLEAN DEFAULT FALSE NOT NULL;"))
            print("Added reschedule_requested column.")
        except Exception as e:
            print(f"Error adding reschedule_requested: {e}")
            
        try:
            conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN reschedule_reason TEXT;"))
            print("Added reschedule_reason column.")
        except Exception as e:
            print(f"Error adding reschedule_reason: {e}")
            
        conn.commit()

if __name__ == "__main__":
    add_columns()

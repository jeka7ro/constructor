from app.database import engine
from sqlalchemy import text

def add_columns():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN reschedule_requested_date DATE;"))
            print("Added reschedule_requested_date column.")
        except Exception as e:
            print(f"Error adding reschedule_requested_date: {e}")

if __name__ == "__main__":
    add_columns()

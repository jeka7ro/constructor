from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN duration_days INT DEFAULT 1 NOT NULL;"))
        conn.commit()
        print("Column added successfully!")
    except Exception as e:
        print(f"Error: {e}")

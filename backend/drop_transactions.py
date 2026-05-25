from app.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS warehouse_transactions;"))
        conn.commit()
    print("Dropped table successfully.")
except Exception as e:
    print(f"Error: {e}")

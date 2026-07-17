from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE saas_app.users ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP;"))
    db.execute(text("ALTER TABLE saas_app.admins ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP;"))
    db.execute(text("ALTER TABLE saas_app.admins ADD COLUMN IF NOT EXISTS accepted_dpa_at TIMESTAMP;"))
    db.commit()
    print("Columns added successfully.")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()

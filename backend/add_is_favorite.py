from app.database import SessionLocal, engine
from sqlalchemy import text

def run_migration():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE saas_app.clients ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;"))
            print("Migration successful")
    except Exception as e:
        print(f"Migration failed: {e}")

run_migration()

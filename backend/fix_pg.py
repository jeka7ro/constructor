from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE saas_app.clients ADD COLUMN rating INTEGER DEFAULT 0"))
        print("Added rating")
    except Exception as e:
        print(f"Error rating: {e}")
    try:
        conn.execute(text("ALTER TABLE saas_app.clients ADD COLUMN internal_notes TEXT"))
        print("Added internal_notes")
    except Exception as e:
        print(f"Error internal_notes: {e}")

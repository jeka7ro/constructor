from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE saas_app.admins ADD COLUMN allowed_team_ids JSON NOT NULL DEFAULT '[]'::json"))
    conn.commit()
    print("Done")

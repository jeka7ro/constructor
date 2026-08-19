import os
from sqlalchemy import create_engine, text

db_url = os.environ.get("DATABASE_URL", "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres")
engine = create_engine(db_url)
oldest_hash = "a5eab443d57859cd589c1bb445c86a31177a9dd7bff0ae3e32fffbad8ecaf114"

with engine.connect() as conn:
    conn.execute(text("UPDATE saas_app.admins SET password_hash = :h WHERE lower(email) = 'jeka7ro@gmail.com'"), {"h": oldest_hash})
    conn.commit()

print("Restored original sha256 hash successfully")

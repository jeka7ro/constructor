"""
Migration: Add live location tracking columns to users table.
Run: python3 migrations/add_user_live_location.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine
from sqlalchemy import text

COLUMNS = [
    ("last_lat",     "FLOAT"),
    ("last_lng",     "FLOAT"),
    ("last_seen_at", "TIMESTAMP"),
    ("last_speed",   "FLOAT"),
]

def run():
    print("Adding live location columns to users table...")
    for col_name, col_type in COLUMNS:
        with engine.connect() as conn:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                conn.commit()
                print(f"  OK {col_name}")
            except Exception as e:
                conn.rollback()
                print(f"  SKIP {col_name}: {e}")
    print("Done!")

if __name__ == "__main__":
    run()

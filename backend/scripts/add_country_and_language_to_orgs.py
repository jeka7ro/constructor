import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine

def apply_migration():
    with engine.connect() as conn:
        print("Checking if columns exist...")
        
        # Add country column
        try:
            conn.execute(text("ALTER TABLE saas_app.organizations ADD COLUMN country VARCHAR(50) DEFAULT 'BE';"))
            print("✅ Added 'country' column to saas_app.")
        except Exception as e:
            print(f"⚠️ 'country' column might already exist or error: {e}")

        # Add default_language column
        try:
            conn.execute(text("ALTER TABLE saas_app.organizations ADD COLUMN default_language VARCHAR(10) DEFAULT 'ro';"))
            print("✅ Added 'default_language' column to saas_app.")
        except Exception as e:
            print(f"⚠️ 'default_language' column might already exist or error: {e}")

        conn.commit()
        print("🎉 Migration completed.")

if __name__ == "__main__":
    apply_migration()

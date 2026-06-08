import os
import sys
from sqlalchemy import text
from sqlalchemy.orm import Session

# Add the parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base
from app.models import LogisticBase, LogisticSandStation, Team

def run_migration():
    print("Starting logistics schema migration via SQLAlchemy...")
    
    try:
        # This will create missing tables in the correct schema defined in database.py (saas_app)
        LogisticBase.__table__.create(engine, checkfirst=True)
        print("Created logistic_bases table")
        LogisticSandStation.__table__.create(engine, checkfirst=True)
        print("Created logistic_sand_stations table")
        
        # Now alter teams
        with engine.connect() as conn:
            schema = Base.metadata.schema or ""
            prefix = f"{schema}." if schema else ""
            try:
                conn.execute(text(f"ALTER TABLE {prefix}teams ADD COLUMN base_id VARCHAR(36) REFERENCES {prefix}logistic_bases(id) ON DELETE SET NULL"))
                conn.commit()
                print("Successfully added base_id to teams")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print("Column base_id already exists in teams.")
                else:
                    print(f"Failed to add base_id column: {e}")
            
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        raise

if __name__ == "__main__":
    run_migration()

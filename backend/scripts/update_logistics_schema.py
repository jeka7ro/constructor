import os
import sys
from sqlalchemy import text
from sqlalchemy.orm import Session

# Add the parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine

def run_migration():
    print("Starting logistics schema migration...")
    db = SessionLocal()
    
    try:
        # Create logistic_bases table
        print("Creating logistic_bases table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS logistic_bases (
                id VARCHAR(36) PRIMARY KEY,
                organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                address TEXT,
                latitude FLOAT,
                longitude FLOAT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create logistic_sand_stations table
        print("Creating logistic_sand_stations table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS logistic_sand_stations (
                id VARCHAR(36) PRIMARY KEY,
                organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                address TEXT,
                latitude FLOAT,
                longitude FLOAT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Add base_id to teams
        print("Adding base_id to teams...")
        try:
            # Check if it's SQLite or PostgreSQL
            dialect = db.get_bind().dialect.name
            
            if dialect == 'sqlite':
                # SQLite ALTER TABLE ADD COLUMN
                db.execute(text("ALTER TABLE teams ADD COLUMN base_id VARCHAR(36) REFERENCES logistic_bases(id) ON DELETE SET NULL"))
            else:
                # PostgreSQL
                db.execute(text("ALTER TABLE teams ADD COLUMN IF NOT EXISTS base_id VARCHAR(36) REFERENCES logistic_bases(id) ON DELETE SET NULL"))
            print("Successfully added base_id to teams")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("Column base_id already exists in teams.")
            else:
                print(f"Warning: Failed to add base_id column: {e}")
                
        db.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()

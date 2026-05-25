from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"), isolation_level="AUTOCOMMIT")

with engine.connect() as conn:
    try:
        conn.execute(text("""
        UPDATE warehouse_items 
        SET current_site_id = NULL 
        WHERE current_site_id NOT IN (SELECT id FROM construction_sites);
        """))
        print("Cleared invalid foreign keys")
    except Exception as e:
        print(f"Error clearing fk: {e}")

    try:
        conn.execute(text('ALTER TABLE warehouse_items ADD CONSTRAINT warehouse_items_current_site_id_fkey FOREIGN KEY (current_site_id) REFERENCES construction_sites(id) ON DELETE SET NULL;'))
        print("Added new constraint pointing to construction_sites")
    except Exception as e:
        print(f"Error adding constraint: {e}")

print("Done")

import os
import sys
from dotenv import load_dotenv
import psycopg2

load_dotenv("backend/.env")
db_url = os.environ.get("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    c = conn.cursor()
    
    columns_to_add = [
        ("is_foil_mandatory", "BOOLEAN DEFAULT FALSE"),
        ("is_mesh_mandatory", "BOOLEAN DEFAULT FALSE"),
        ("is_fiber_mandatory", "BOOLEAN DEFAULT FALSE"),
        ("is_pur_aspiration_mandatory", "BOOLEAN DEFAULT FALSE"),
        ("is_pur_niveller_mandatory", "BOOLEAN DEFAULT FALSE"),
        ("is_pur_poncage_mandatory", "BOOLEAN DEFAULT FALSE"),
        ("is_pur_protection_mandatory", "BOOLEAN DEFAULT FALSE"),
        ("pur_truck_distance_threshold_km", "FLOAT DEFAULT 50.0"),
        ("pur_truck_extra_price_flat", "FLOAT DEFAULT 0.0"),
        ("pur_truck_surface_threshold_free_sqm", "FLOAT DEFAULT 500.0"),
        ("eps_truck_distance_threshold_km", "FLOAT DEFAULT 50.0"),
        ("eps_truck_extra_price_flat", "FLOAT DEFAULT 0.0"),
        ("eps_truck_volume_threshold_free_m3", "FLOAT DEFAULT 40.0")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            c.execute(f"ALTER TABLE saas_app.pricing_settings ADD COLUMN {col_name} {col_type}")
            print(f"Added {col_name}")
        except psycopg2.errors.DuplicateColumn:
            print(f"Column {col_name} already exists")
            conn.rollback()
        except Exception as e:
            print(f"Error adding {col_name}: {e}")
            
except Exception as e:
    print(f"DB Error: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()

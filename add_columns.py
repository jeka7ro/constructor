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
        ("pur_base_price_3cm", "FLOAT DEFAULT 13.95"),
        ("pur_step_price_up_to_10cm", "FLOAT DEFAULT 1.65"),
        ("pur_extra_price_above_10cm", "FLOAT DEFAULT 2.10"),
        ("pur_minimum_execution_price", "FLOAT DEFAULT 1375.0"),
        ("pur_surface_discount_step", "FLOAT DEFAULT -0.50"),
        ("pur_opt_aspiration", "FLOAT DEFAULT 2.0"),
        ("pur_opt_niveller", "FLOAT DEFAULT 4.25"),
        ("pur_opt_poncage", "FLOAT DEFAULT 1.5"),
        ("pur_opt_protection", "FLOAT DEFAULT 1.5"),
        ("eps_volume_thresholds", "JSON DEFAULT '[{\"max_m3\": 10.0, \"price_flat\": 1495.0, \"price_per_m3\": null}, {\"max_m3\": 20.0, \"price_flat\": null, \"price_per_m3\": 160.0}, {\"max_m3\": 40.0, \"price_flat\": null, \"price_per_m3\": 155.0}, {\"max_m3\": 99999.0, \"price_flat\": null, \"price_per_m3\": 150.0}]'")
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

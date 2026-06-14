"""
add_invoice_fields.py — Adaugă câmpurile de facturare în work_orders
Run: python add_invoice_fields.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        # Verifică dacă coloanele există deja
        try:
            conn.execute(text("SELECT is_invoiced FROM work_orders LIMIT 1"))
            print("✅ Câmpurile de facturare există deja. Nimic de făcut.")
            return
        except Exception:
            pass

        print("📦 Adăugare câmpuri facturare în work_orders...")
        
        try:
            conn.execute(text("""
                ALTER TABLE work_orders
                ADD COLUMN is_invoiced BOOLEAN NOT NULL DEFAULT FALSE
            """))
            print("  ✓ is_invoiced")
        except Exception as e:
            print(f"  ⚠️  is_invoiced: {e}")

        try:
            conn.execute(text("""
                ALTER TABLE work_orders
                ADD COLUMN invoiced_at TIMESTAMP NULL
            """))
            print("  ✓ invoiced_at")
        except Exception as e:
            print(f"  ⚠️  invoiced_at: {e}")

        try:
            conn.execute(text("""
                ALTER TABLE work_orders
                ADD COLUMN invoice_number VARCHAR(100) NULL
            """))
            print("  ✓ invoice_number")
        except Exception as e:
            print(f"  ⚠️  invoice_number: {e}")

        try:
            conn.execute(text("""
                ALTER TABLE work_orders
                ADD COLUMN invoice_notes TEXT NULL
            """))
            print("  ✓ invoice_notes")
        except Exception as e:
            print(f"  ⚠️  invoice_notes: {e}")

        # Comenzile care au deja un PDF uploadat → marcate ca facturate
        try:
            conn.execute(text("""
                UPDATE work_orders
                SET is_invoiced = TRUE, invoiced_at = created_at
                WHERE final_invoice_path IS NOT NULL AND final_invoice_path != ''
            """))
            print("  ✓ Comenzile cu PDF existent marcate ca facturate")
        except Exception as e:
            print(f"  ⚠️  Update existing: {e}")

        conn.commit()
        print("✅ Migrare completă!")

if __name__ == "__main__":
    run()

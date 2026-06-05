import sqlite3
import os

def migrate():
    db_path = os.getenv("DATABASE_URL", "").replace("sqlite:///", "")
    if not db_path:
        db_path = "pontaj_digital.db" if os.path.exists("pontaj_digital.db") else "pontaj.db"

    print(f"Migrating {db_path}...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE warehouse_items ADD COLUMN reserved_quantity FLOAT DEFAULT 0.0 NOT NULL;")
        print("Successfully added reserved_quantity column.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column reserved_quantity already exists.")
        else:
            print(f"Error: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()

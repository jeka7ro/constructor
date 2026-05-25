import sqlite3

def run_alter():
    conn = sqlite3.connect('pontaj_digital.db')
    c = conn.cursor()

    try:
        c.execute("ALTER TABLE admins ADD COLUMN role VARCHAR(50) DEFAULT 'ADMIN'")
        print("Added role to admins")
    except sqlite3.OperationalError as e:
        print(f"Admins role: {e}")

    try:
        c.execute("ALTER TABLE warehouse_items ADD COLUMN current_site_id VARCHAR(36) REFERENCES construction_sites(id) ON DELETE SET NULL")
        print("Added current_site_id to warehouse_items")
    except sqlite3.OperationalError as e:
        print(f"warehouse_items current_site_id: {e}")

    try:
        c.execute("ALTER TABLE warehouse_items ADD COLUMN is_defective BOOLEAN DEFAULT 0")
        print("Added is_defective to warehouse_items")
    except sqlite3.OperationalError as e:
        print(f"warehouse_items is_defective: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    run_alter()

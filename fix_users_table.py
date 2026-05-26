import sqlite3

db_path = "backend/pontaj_digital.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(users)")
columns = [info[1] for info in cursor.fetchall()]

needed_columns = {
    "site_id": "VARCHAR(36)",
    "employee_code": "VARCHAR(50)",
    "pin_hash": "VARCHAR(255)",
    "full_name": "VARCHAR(255)",
    "birth_date": "DATE",
    "cnp": "VARCHAR(13)",
    "birth_place": "VARCHAR(255)",
    "id_card_series": "VARCHAR(20)",
    "phone": "VARCHAR(20)",
    "email": "VARCHAR(255)",
    "address": "TEXT",
    "avatar_path": "VARCHAR(500)",
    "id_card_path": "VARCHAR(500)",
    "contract_path": "VARCHAR(500)",
    "hourly_rate": "NUMERIC(8, 2)"
}

for col, dtype in needed_columns.items():
    if col not in columns:
        print(f"Adding column {col} to users table...")
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {dtype}")
        except Exception as e:
            print(f"Error adding {col}: {e}")

conn.commit()
conn.close()
print("Done patching users table.")

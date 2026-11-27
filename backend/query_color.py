import sqlite3

def test_db(db_name):
    try:
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, color FROM admins WHERE role='PARTNER';")
        rows = cursor.fetchall()
        print(f"\n--- {db_name} ---")
        for row in rows:
            print(f"ID: {row[0]}, Email: {row[1]}, Color: {row[2]}")
        conn.close()
    except Exception as e:
        print(f"Error on {db_name}: {e}")

test_db('pontaje.db')
test_db('pontaj_digital.db')
test_db('dev_office.db')
test_db('app.db')

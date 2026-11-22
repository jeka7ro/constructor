import sqlite3

try:
    conn = sqlite3.connect('pontaje.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE admins ADD COLUMN color VARCHAR(7);")
    conn.commit()
    print("Added color successfully to pontaje.db")
except Exception as e:
    print(f"Error on pontaje.db: {e}")
finally:
    conn.close()
    
try:
    conn = sqlite3.connect('pontaj_digital.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE admins ADD COLUMN color VARCHAR(7);")
    conn.commit()
    print("Added color successfully to pontaj_digital.db")
except Exception as e:
    print(f"Error on pontaj_digital.db: {e}")
finally:
    conn.close()
    
try:
    conn = sqlite3.connect('dev_office.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE admins ADD COLUMN color VARCHAR(7);")
    conn.commit()
    print("Added color successfully to dev_office.db")
except Exception as e:
    print(f"Error on dev_office.db: {e}")
finally:
    conn.close()

try:
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE admins ADD COLUMN color VARCHAR(7);")
    conn.commit()
    print("Added color successfully to app.db")
except Exception as e:
    print(f"Error on app.db: {e}")
finally:
    conn.close()


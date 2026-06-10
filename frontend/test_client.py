import sqlite3

conn = sqlite3.connect('backend/db.sqlite3')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT id, client_id, client_name, client_email, client_phone FROM work_orders WHERE site_address LIKE '%Charleroi%' ORDER BY id DESC LIMIT 1")
row = cursor.fetchone()
if row:
    print(dict(row))
else:
    print("No order found")
conn.close()

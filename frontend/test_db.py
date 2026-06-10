import sqlite3
import json

conn = sqlite3.connect('backend/db.sqlite3')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT id, title, site_address, volumes FROM work_orders ORDER BY id DESC LIMIT 5")
rows = cursor.fetchall()
for r in rows:
    print(f"ID: {r['id']} | Addr: {r['site_address']} | Vol: {r['volumes']}")
conn.close()

import sqlite3
import json

conn = sqlite3.connect('/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/backend/chape.db')
cursor = conn.cursor()
cursor.execute("SELECT prices, estimated_price FROM work_orders WHERE invoice_number='INV779' OR quote_number='INV779' OR id LIKE '%779%' OR id='cd458194-35cf-4dce-b55b-52e6e761223d'")
res = cursor.fetchone()
if res:
    print("prices:", res[0])
    print("estimated_price:", res[1])
else:
    print("Not found")

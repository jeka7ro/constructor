import sqlite3
conn = sqlite3.connect('pontaj.db')
c = conn.cursor()
try:
    c.execute('ALTER TABLE clients ADD COLUMN rating INTEGER DEFAULT 0')
except:
    print("rating already exists")
try:
    c.execute('ALTER TABLE clients ADD COLUMN internal_notes TEXT')
except:
    print("internal_notes already exists")
conn.commit()
conn.close()
print("Done")

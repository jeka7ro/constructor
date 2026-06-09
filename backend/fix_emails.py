from app.database import SessionLocal
from app.models import Client

db = SessionLocal()
clients_to_fix = db.query(Client).filter(Client.email == '').all()
print(f"Found {len(clients_to_fix)} clients with empty string email")
for c in clients_to_fix:
    c.email = None
db.commit()
print("Fixed.")

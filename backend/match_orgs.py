from app.database import SessionLocal
from app.models import Admin, Client

db = SessionLocal()
print("--- ADMINS ---")
for a in db.query(Admin).all():
    print(f"Name: {a.full_name}, Email: {a.email}, Org: {a.organization_id}")

print("\n--- CLIENTS ---")
for c in db.query(Client).all():
    print(f"Client: {c.name}, Org: {c.organization_id}")

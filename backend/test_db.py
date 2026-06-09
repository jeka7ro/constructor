from app.database import SessionLocal
from app.models import Client
db = SessionLocal()
clients = db.query(Client).all()
for c in clients:
    print(c.id, c.name, c.organization_id)

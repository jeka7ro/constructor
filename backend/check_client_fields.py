from app.database import SessionLocal
from app.models import Client
from app.api.admin_clients import ClientResponse
from pydantic import ValidationError

db = SessionLocal()
clients = db.query(Client).filter(Client.organization_id == '84b73e6b-8e3c-45f6-b133-9e19d41a1bf2').all()
for c in clients:
    try:
        ClientResponse.from_orm(c)
    except ValidationError as e:
        print(f"Validation error for client {c.name}: {e}")

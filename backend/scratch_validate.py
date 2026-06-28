from app.database import SessionLocal
from app.models import Client
from app.api.admin_clients import ClientResponse

db = SessionLocal()
clients = db.query(Client).all()
errors = 0
for c in clients:
    try:
        ClientResponse.from_orm(c)
    except Exception as e:
        print('Error on client', c.id, e)
        errors += 1
print('Total errors:', errors)

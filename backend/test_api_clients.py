from app.database import SessionLocal
from app.models import Admin
from app.api.admin_clients import get_clients

db = SessionLocal()
admin = db.query(Admin).filter_by(email="iulian@getapp.ro").first()
if not admin:
    admin = db.query(Admin).first()
print("Admin org:", admin.organization_id)
clients = get_clients(db=db, current_admin=admin)
print(clients)

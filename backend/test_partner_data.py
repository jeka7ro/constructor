import sys
from app.database import SessionLocal
from app.models import Admin, WorkOrder, Organization, Client
from sqlalchemy.orm import joinedload

db = SessionLocal()

# Find the partner
partner = db.query(Admin).filter(Admin.email == 'eugen1ro@gmail.com').first()
if not partner:
    print("Partner not found")
    sys.exit(1)

print(f"Partner: {partner.email}, Organization: {partner.organization_id}, Client: {partner.client_id}")

# Fetch client details
client = db.query(Client).filter(Client.id == partner.client_id).first()
if client:
    print(f"Client mapped: {client.name}")
else:
    print("Client mapped: NONE")

# Run the exact query from the API
orders = db.query(WorkOrder).filter(
    WorkOrder.organization_id == partner.organization_id,
    WorkOrder.client_id == partner.client_id,
    WorkOrder.status != "cancelled"
).order_by(WorkOrder.start_date.desc().nullslast(), WorkOrder.created_at.desc()).all()

print(f"Total WorkOrders returned by API logic: {len(orders)}")

for wo in orders:
    print(f"- {wo.id} | {wo.title} | {wo.start_date}")

db.close()

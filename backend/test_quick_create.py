import asyncio
from app.database import SessionLocal
from app.models import Organization, Client
from pydantic import BaseModel

db = SessionLocal()
org = db.query(Organization).first()
client = db.query(Client).first()

from app.api.admin_work_orders import create_work_order, WorkOrderCreate
class DummyAdmin:
    organization_id = org.id
    full_name = "Test Admin"

payload = WorkOrderCreate(
    title="Test",
    site_address="Ternat, Belgia",
    start_date=None,
    start_time=None,
    assigned_team_id=None,
    client_id=client.id,
    work_type="new",
    use_vat=True,
    status="draft",
    volumes=[{
        "label": "Chape",
        "quantity": 201.0,
        "unit": "m²",
        "thickness": 6.0,
        "has_foil": False,
        "has_mesh": False,
        "has_fiber": False,
        "has_duramint": False
    }],
    estimated_price="2500"
)

try:
    create_work_order(payload, current_admin=DummyAdmin(), db=db)
    print("Success")
except Exception as e:
    print(f"Error: {e}")

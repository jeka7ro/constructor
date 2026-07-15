import sys
import json
from fastapi.testclient import TestClient
from dotenv import load_dotenv

load_dotenv(".env")
from main import app
from app.database import SessionLocal
from app.models import Admin, WorkOrder

db = SessionLocal()
admin = db.query(Admin).filter(Admin.organization_id == "db8a2926-175d-47f8-b041-ec824993d6d5").first()

from app.api.admin_auth import get_current_admin
app.dependency_overrides[get_current_admin] = lambda: admin
client = TestClient(app)

response = client.get(f"/api/admin/logistics/daily-routes?target_date=2026-07-14")
with open("logistics_response.json", "w") as f:
    json.dump(response.json(), f, indent=2)
print("Done")

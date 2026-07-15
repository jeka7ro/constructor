import sys
import time
from datetime import date
from fastapi.testclient import TestClient
from dotenv import load_dotenv

load_dotenv(".env")
from main import app
from app.database import SessionLocal
from app.models import Admin, WorkOrder

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.id == "81917852-f4c8-40e9-a6a1-238be0fe90aa").first()
admin = db.query(Admin).filter(Admin.organization_id == wo.organization_id).first()

if not admin:
    print("No admin found for that org!")
    sys.exit(1)

from app.api.admin_auth import get_current_admin
app.dependency_overrides[get_current_admin] = lambda: admin
client = TestClient(app)

t0 = time.time()
response = client.get(f"/api/admin/logistics/daily-routes?target_date=2026-07-14")
t1 = time.time()
print(f"Status: {response.status_code}")
print(f"Time: {t1 - t0:.2f}s")
if response.status_code == 200:
    data = response.json()
    print(f"Routes count: {len(data.get('routes', []))}")
    if len(data.get('routes', [])) > 0:
        print(f"Waypoints for route 0: {len(data['routes'][0]['waypoints'])}")
else:
    print(response.text)

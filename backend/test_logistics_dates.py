import sys
from datetime import date, timedelta
from fastapi.testclient import TestClient
from dotenv import load_dotenv

load_dotenv(".env")
from main import app
from app.database import SessionLocal
from app.models import Admin
from app.api.admin_auth import get_current_admin

db = SessionLocal()
admin = db.query(Admin).first()
app.dependency_overrides[get_current_admin] = lambda: admin
client = TestClient(app)

for d in [date(2026, 7, 12), date(2026, 7, 13), date(2026, 7, 14), date(2026, 7, 15)]:
    try:
        response = client.get(f"/api/admin/logistics/daily-routes?target_date={d}")
        print(f"{d} - Status: {response.status_code}")
        if response.status_code != 200:
            print(f"{d} - Error: {response.text}")
    except Exception as e:
        print(f"Exception for {d}: {e}")

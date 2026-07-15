import sys
import time
from datetime import date
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

for d in [date(2026, 7, 10), date(2026, 7, 11), date(2026, 7, 12), date(2026, 7, 13), date(2026, 7, 14)]:
    t0 = time.time()
    response = client.get(f"/api/admin/logistics/daily-routes?target_date={d}")
    t1 = time.time()
    print(f"{d} - Time: {t1 - t0:.2f}s - Routes: {len(response.json().get('routes', []))}")

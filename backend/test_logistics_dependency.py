import sys
import os
import traceback
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
if not admin:
    print("No admin")
    sys.exit(1)

def override_get_current_admin():
    return admin

app.dependency_overrides[get_current_admin] = override_get_current_admin

client = TestClient(app)

try:
    response = client.get("/api/admin/logistics/daily-routes?target_date=2026-07-14")
    print(response.status_code)
    print(response.text[:1000])
except Exception as e:
    traceback.print_exc()


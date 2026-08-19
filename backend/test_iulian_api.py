from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app.models import Admin
from app.auth import create_access_token
import json

db = SessionLocal()
admin = db.query(Admin).filter(Admin.email == 'carabetiulian@gmail.com').first()
token = create_access_token(data={"sub": admin.id, "email": admin.email, "role": admin.role, "is_super_admin": False})

client = TestClient(app)
response = client.get(
    "/api/admin/work-orders?status=draft,pending,confirmed&is_quote=true&slim=true",
    headers={"Authorization": f"Bearer {token}", "x-tenant-subdomain": "davidechape"}
)
print("Status:", response.status_code)
data = response.json()
print("Returned length:", len(data) if isinstance(data, list) else type(data))
if isinstance(data, list) and len(data) > 0:
    q0 = data[0]
    print(f"First item status={q0.get('status')} is_quote={q0.get('is_quote')} start_date={q0.get('start_date')}")

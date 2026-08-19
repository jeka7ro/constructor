from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app.models import Admin
from app.auth import create_access_token
import json

db = SessionLocal()
admin = db.query(Admin).filter(Admin.email == 'jeka7ro@gmail.com').first()
token = create_access_token(data={"sub": admin.id, "email": admin.email, "role": admin.role, "is_super_admin": True})

client = TestClient(app)
response = client.get(
    "/api/admin/work-orders?status=draft,pending,confirmed&is_quote=true&slim=true",
    headers={"Authorization": f"Bearer {token}", "x-tenant-subdomain": "davidechape"}
)
with open("test_resp.json", "w") as f:
    f.write(response.text)

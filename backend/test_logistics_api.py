import os
import sys
from dotenv import load_dotenv
load_dotenv(".env")

from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app.models import Admin

db = SessionLocal()
admin = db.query(Admin).first()
db.close()

if not admin:
    print("No admin found.")
    sys.exit(1)

client = TestClient(app)

from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "secret")
ALGORITHM = "HS256"

to_encode = {"sub": admin.email, "role": "admin", "org_id": admin.organization_id}
expire = datetime.utcnow() + timedelta(minutes=15)
to_encode.update({"exp": expire})
token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

response = client.get(
    "/api/admin/logistics/daily-routes?target_date=2026-07-14",
    headers={"Authorization": f"Bearer {token}"}
)

print(response.status_code)
# print(response.text) # Too long possibly, print first 500 chars
print(response.text[:500])

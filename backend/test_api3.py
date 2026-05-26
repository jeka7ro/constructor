from fastapi.testclient import TestClient
from main import app
from app.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from jose import jwt
from app.api.admin_auth import SECRET_KEY, ALGORITHM

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
SessionLocal = sessionmaker(bind=engine)

def override_get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

db = SessionLocal()
from app.models import Admin
admin = db.query(Admin).first()
token_data = {"sub": admin.id}
token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

response = client.get("/api/admin/timesheets/stats", headers={"Authorization": f"Bearer {token}"})
print("Stats code:", response.status_code)
print("Stats body:", response.content)

response = client.get("/api/admin/dashboard-stats", headers={"Authorization": f"Bearer {token}"})
print("Dashboard code:", response.status_code)
print("Dashboard body:", response.content[:100])

response = client.get("/api/admin/sites/map-data/all", headers={"Authorization": f"Bearer {token}"})
print("Map code:", response.status_code)
print("Map body:", response.content[:100])

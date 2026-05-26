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

# Create a fake admin token
# We need to find an admin in the DB
db = SessionLocal()
from app.models import Admin
admin = db.query(Admin).first()
if not admin:
    print("No admin found")
    exit()

token_data = {"sub": admin.id}
token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

response = client.get("/admin/timesheets/stats", headers={"Authorization": f"Bearer {token}"})
print("Stats response:", response.status_code, response.json())

response = client.get("/admin/dashboard-stats", headers={"Authorization": f"Bearer {token}"})
print("Dashboard response:", response.status_code)

response = client.get("/admin/sites/map-data/all", headers={"Authorization": f"Bearer {token}"})
print("Sites response:", response.status_code, response.json())

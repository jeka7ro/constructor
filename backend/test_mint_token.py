from app.database import engine
from sqlalchemy.orm import sessionmaker
from app.models import Admin
from app.api.partner_auth import create_access_token
from datetime import timedelta
import requests

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

partner = db.query(Admin).filter(Admin.email == 'eugen1ro@gmail.com').first()
token = create_access_token(
    data={"sub": str(partner.id), "role": partner.role},
    expires_delta=timedelta(hours=1)
)

headers = {"Authorization": f"Bearer {token}"}
res = requests.get("http://localhost:8001/api/partner/teams", headers=headers)
print("Status:", res.status_code)
print("Body:", res.json())

import sys
from dotenv import load_dotenv

load_dotenv(".env")
from app.database import SessionLocal
from app.models import Admin, Team

db = SessionLocal()
admin = db.query(Admin).filter(Admin.organization_id == "db8a2926-175d-47f8-b041-ec824993d6d5").first()

teams = db.query(Team).all()
for t in teams:
    print(t.name, t.color, t.id)

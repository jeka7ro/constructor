import sys
from dotenv import load_dotenv

load_dotenv(".env")
from app.database import SessionLocal
from app.models import Admin, WorkOrder, Team

db = SessionLocal()
team = db.query(Team).filter(Team.id == "f472b2d4-3d28-4eff-bb3e-960e072f8985").first()
print(f"Team: {team.name}, Org: {team.organization_id}")

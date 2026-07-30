import sys
import os
sys.path.append(os.getcwd())
from app.database import SessionLocal
from app.models import Team
db = SessionLocal()
org_id = "84b73e6b-8e3c-45f6-b133-9e19d41a1bf2"
teams = db.query(Team).filter(Team.organization_id == org_id).all()
print(f"Found {len(teams)} teams for Davide Chape org")
for t in teams:
    print(f"Team: {t.name}, Color: {t.color}")

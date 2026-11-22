import asyncio
from app.database import engine
from sqlalchemy.orm import sessionmaker
from app.models import Admin, Team
from sqlalchemy import text

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

partner = db.query(Admin).filter(Admin.email == 'eugen1ro@gmail.com').first()
print("Partner allowed teams:", partner.allowed_team_ids)

query = db.query(Team).filter(
    Team.organization_id == partner.organization_id,
    Team.is_active == True
)

if partner.allowed_team_ids and len(partner.allowed_team_ids) > 0:
    query = query.filter(Team.id.in_(partner.allowed_team_ids))
    
teams = query.all()
print("Teams found:", len(teams))
for t in teams:
    print(t.name)

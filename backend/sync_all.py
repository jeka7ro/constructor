from app.database import SessionLocal
from app.models import Team
from app.services.robaws_scraper import run_api_sync_for_team

db = SessionLocal()
teams = db.query(Team).filter(Team.is_active == True).all()
for t in teams:
    run_api_sync_for_team(t, db)

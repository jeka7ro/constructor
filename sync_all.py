import sys
import os
sys.path.append(os.path.abspath('backend'))

from backend.app.database import SessionLocal
from backend.app.models import Team
from backend.app.services.robaws_scraper import run_api_sync_for_team

db = SessionLocal()
teams = db.query(Team).filter(Team.is_active == True).all()
for t in teams:
    run_api_sync_for_team(t, db)

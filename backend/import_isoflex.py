import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))
from app.database import SessionLocal
from app.models import Team
from app.services.robaws_scraper import run_api_sync_for_team

db = SessionLocal()
try:
    teams_keys = {
        "Vasea": ("DPZ0A0SL770Q3BDRW42P", "PGYJbARnH4inAMDBqJYsvMyGU17Q80L0KN757DM6"),
        "Petrea": ("TKO5LKMXDIMFQCLDRFC5", "Sk9ojmNjgE9skI8zQsiAW0RUYaO1NFxQw1HR979z"),
        "Badea": ("JUKXK8X9BKRYSXWCV94J", "MF2h55PzXLg2U63HytrvVsddT1oqKFGxa3iXE5Xg")
    }
    
    for team_name, (key, secret) in teams_keys.items():
        team = db.query(Team).filter(Team.name.ilike(f"%{team_name}%")).first()
        if team:
            print(f"Found team {team.name}, updating keys...")
            team.robaws_email = key
            team.robaws_password = secret
            db.commit()
        else:
            print(f"Team {team_name} not found!")
            
    print("Now modifying robaws_scraper.py to use these keys...")
    
finally:
    db.close()

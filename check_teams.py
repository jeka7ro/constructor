import os
import sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import engine
from app.models import Team
from sqlalchemy.orm import sessionmaker

Session = sessionmaker(bind=engine)
db = Session()

for t in db.query(Team).all():
    print(f"Team: {t.name} | Active: {t.is_active} | Leader ID: {t.team_leader_id}")


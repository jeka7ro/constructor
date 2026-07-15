import os
import sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import engine
from app.models import User
from sqlalchemy.orm import sessionmaker

Session = sessionmaker(bind=engine)
db = Session()

for u in db.query(User).all():
    if 'alex' in u.full_name.lower() or 'ionel' in u.full_name.lower():
        print(f"User: {u.full_name} | Role: {u.role}")


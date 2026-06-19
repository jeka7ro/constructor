from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
Session = sessionmaker(bind=engine)
session = Session()

from app.models import Admin

admins = session.query(Admin).all()
for a in admins:
    print(f"Name: {a.full_name if hasattr(a, 'full_name') else getattr(a, 'name', 'unknown')}, Email: {a.email}, OrgID: {a.organization_id}")

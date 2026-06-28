from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
Session = sessionmaker(bind=engine)
session = Session()

from app.models import Admin

a = session.query(Admin).filter_by(email='carabetiulian@gmail.com').first()
print(f"Iulian Admin ID: {a.id}")

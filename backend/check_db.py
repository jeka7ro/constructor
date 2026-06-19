from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
Session = sessionmaker(bind=engine)
session = Session()

from app.models import Client

clients = session.query(Client).filter(Client.organization_id == '84b73e6b-8e3c-45f6-b133-9e19d41a1bf2').all()
for c in clients:
    if getattr(c, 'latitude', None) == "": print("Empty latitude for", c.id)
    if getattr(c, 'longitude', None) == "": print("Empty longitude for", c.id)
    if getattr(c, 'email', None) == "": print("Empty email for", c.id)

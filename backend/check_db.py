from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
Session = sessionmaker(bind=engine)
session = Session()

from app.models import Client

clients = session.query(Client).all()
bad_clients = 0
for c in clients:
    if not c.name or len(c.name) < 2:
        print("Bad name:", c.id, c.name)
        bad_clients += 1
    if not c.country:
        print("Bad country:", c.id, c.country)
        bad_clients += 1
    if not c.client_type:
        print("Bad client_type:", c.id, c.client_type)
        bad_clients += 1

print(f"Found {bad_clients} bad clients.")

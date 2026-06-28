from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
Session = sessionmaker(bind=engine)
session = Session()

from app.models import Client
from app.api.admin_clients import ClientResponse

clients = session.query(Client).filter(Client.organization_id == '84b73e6b-8e3c-45f6-b133-9e19d41a1bf2').all()
try:
    for c in clients:
        ClientResponse.model_validate(c)
    print("model_validate OK!")
except Exception as e:
    print("Error:", e)

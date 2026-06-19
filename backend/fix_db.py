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
fixed = 0
for c in clients:
    if getattr(c, 'email', None) == "":
        c.email = None
        fixed += 1
    if getattr(c, 'cui', None) == "":
        c.cui = None
        fixed += 1
    if getattr(c, 'reg_com', None) == "":
        c.reg_com = None
        fixed += 1
    if getattr(c, 'contact_person', None) == "":
        c.contact_person = None
        fixed += 1
    if getattr(c, 'phone', None) == "":
        c.phone = None
        fixed += 1
    if getattr(c, 'bank_name', None) == "":
        c.bank_name = None
        fixed += 1
    if getattr(c, 'iban', None) == "":
        c.iban = None
        fixed += 1

if fixed > 0:
    session.commit()
    print(f"Fixed {fixed} fields in the database!")
else:
    print("No fields needed fixing.")

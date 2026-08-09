import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://")

engine = create_engine(db_url)
Session = sessionmaker(bind=engine)
session = Session()

bases = session.execute(text("SELECT id, name, latitude, longitude FROM logistic_bases")).fetchall()
print("BASES:")
for b in bases: print(b)

wos = session.execute(text("SELECT id, client_name, site_address, site_latitude, site_longitude FROM work_orders WHERE site_address LIKE '%Goé%'")).fetchall()
print("WOS:")
for w in wos: print(w)

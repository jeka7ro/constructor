import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

engine = create_engine('postgresql://postgres:postgres@localhost:5432/pontaj')
Session = sessionmaker(bind=engine)
session = Session()

result = session.execute(text('SELECT name, logo_url FROM saas_app.tenants')).fetchall()
print(result)

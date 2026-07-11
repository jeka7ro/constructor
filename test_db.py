import sys
import os
sys.path.insert(0, os.path.abspath('backend'))
from app.db.session import SessionLocal
from app.models import Organization
db = SessionLocal()
org = db.query(Organization).first()
print(type(org.transport_allowed_days), repr(org.transport_allowed_days))

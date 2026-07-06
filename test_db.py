import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.models import Organization

db = SessionLocal()
try:
    orgs = db.query(Organization).all()
    print(f"Success! Found {len(orgs)} organizations.")
    if len(orgs) > 0:
        print(f"First org country: {orgs[0].country}")
except Exception as e:
    print(f"Error querying organizations: {e}")

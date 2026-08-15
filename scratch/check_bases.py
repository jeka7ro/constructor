from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
sys.path.append('backend')
from app.database import SessionLocal
from app.models import Organization, LogisticBase

db = SessionLocal()
orgs = db.query(Organization).all()
for org in orgs:
    bases = db.query(LogisticBase).filter(LogisticBase.organization_id == org.id).all()
    print(f"Org: {org.name} - Bases count: {len(bases)}")
    for b in bases:
        print(f"  - {b.name}: {b.address}")

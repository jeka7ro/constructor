import sys
import os
sys.path.append(os.getcwd() + "/backend")
from app.database import SessionLocal
from app.models import LogisticBase, Team

db = SessionLocal()

# 1. Ensure the default base exists
base_name = 'H&H Resources Brussels'
base = db.query(LogisticBase).filter(LogisticBase.name == base_name).first()
if not base:
    # Get any organization_id from teams
    team = db.query(Team).first()
    org_id = team.organization_id if team else "default_org"
    base = LogisticBase(
        organization_id=org_id,
        name=base_name,
        address='H&H Resources Brussels',
        latitude=50.88243,
        longitude=4.39343
    )
    db.add(base)
    db.commit()
    db.refresh(base)
    print(f"Created base {base.name} with ID {base.id}")
else:
    print(f"Base {base.name} already exists with ID {base.id}")

# 2. Assign this base to ALL teams that don't have one
teams = db.query(Team).all()
updated = 0
for t in teams:
    t.base_id = base.id
    updated += 1
db.commit()
print(f"Assigned base to {updated} teams.")

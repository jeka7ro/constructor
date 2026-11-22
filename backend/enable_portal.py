import sys
import os

# Ensure the app context is available
sys.path.append('/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/backend')

from app.database import SessionLocal
from app.models import Organization

db = SessionLocal()
org = db.query(Organization).filter(Organization.slug == 'davidechape').first()
if org:
    features = org.features or []
    if 'partner_portal' not in features:
        features.append('partner_portal')
        # SQLAlchemy needs to know the JSON field changed
        org.features = list(features)
        db.commit()
        print("Successfully enabled partner_portal for davidechape!")
    else:
        print("partner_portal already enabled.")
else:
    print("Organization not found.")
db.close()

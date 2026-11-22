import sys
from app.database import SessionLocal
from app.models import Admin

print("Admin columns:")
for col in Admin.__table__.columns:
    print(f"- {col.name}")

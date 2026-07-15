from app.database import SessionLocal
from app.models import Role
db = SessionLocal()
for r in db.query(Role).all():
    print(r.id, r.name)

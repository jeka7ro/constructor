from app.database import SessionLocal
from app.models import User
db = SessionLocal()
roles = set(u.role for u in db.query(User).all())
print(roles)

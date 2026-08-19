from app.database import SessionLocal
from app.models import Admin
from app.auth import create_access_token
import json

db = SessionLocal()
admin = db.query(Admin).first()
token = create_access_token(data={"sub": admin.email})
with open("token.txt", "w") as f:
    f.write(token)

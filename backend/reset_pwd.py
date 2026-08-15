from app.database import SessionLocal
from app.models import Admin
from app.api.admin_auth import hash_password

db = SessionLocal()
admin = db.query(Admin).filter(Admin.email == 'jeka7ro@gmail.com').first()
if admin:
    admin.password_hash = hash_password('Davide2026!')
    db.commit()
    print("Password reset successfully!")
db.close()

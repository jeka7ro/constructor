from app.database import SessionLocal
from app.models import Admin, LogisticSandStation
db = SessionLocal()
admin = db.query(Admin).filter(Admin.email == 'carabetiulian@gmail.com').first()
print(f"Admin org id: {admin.organization_id}")
stations = db.query(LogisticSandStation).filter(LogisticSandStation.organization_id == admin.organization_id).all()
print(f"API would return {len(stations)} stations")

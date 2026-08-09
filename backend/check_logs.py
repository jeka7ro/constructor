from app.database import SessionLocal
from app.models import AuditLog
db = SessionLocal()
logs = db.query(AuditLog).all()
print(f"Total logs in DB: {len(logs)}")
for log in logs:
    print(log.action, log.organization_id, log.admin_id)

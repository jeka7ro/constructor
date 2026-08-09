import requests
try:
    from app.database import get_db, SessionLocal
    from app.models import AuditLog
    db = SessionLocal()
    log = db.query(AuditLog).first()
    print("Found log:", log)
except Exception as e:
    print("DB error:", e)

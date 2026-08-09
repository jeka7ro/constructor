import requests
try:
    from app.database import get_db, SessionLocal
    from app.models import Admin, AuditLog
    from app.api.admin_auth import create_access_token
    db = SessionLocal()
    admin = db.query(Admin).filter(Admin.organization_id != None).first()
    
    # Create a fake audit log to test
    log = AuditLog(organization_id=admin.organization_id, admin_id=admin.id, action="TEST_ACTION")
    db.add(log)
    db.commit()
    
    # Actually, we can just call the function directly!
    from app.api.admin_audit import get_audit_logs
    try:
        res = get_audit_logs(page=1, limit=50, search=None, action=None, db=db, current_admin=admin)
        print("RES:", res)
    except Exception as inner_e:
        import traceback
        traceback.print_exc()

    # Clean up
    db.delete(log)
    db.commit()
except Exception as e:
    print(e)

import requests
try:
    from app.database import get_db, SessionLocal
    from app.models import Admin
    from app.api.admin_auth import create_access_token
    db = SessionLocal()
    admin = db.query(Admin).filter(Admin.organization_id != None).first()
    token = create_access_token(data={"sub": admin.id, "role": admin.role})
    resp = requests.get('http://localhost:8000/api/admin/audit-logs/', headers={'Authorization': f'Bearer {token}'})
    print("STATUS:", resp.status_code)
    print("BODY:", resp.text)
except Exception as e:
    print(e)

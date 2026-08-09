import requests

try:
    from app.database import get_db, SessionLocal
    from app.models import Admin, Organization
    db = SessionLocal()
    
    # Gasim un super admin (are organization_id = None)
    super_admin = db.query(Admin).filter(Admin.is_super_admin == True).first()
    if super_admin:
        from app.api.admin_search import global_search
        res = global_search(db=db, current_admin=super_admin)
        print("Response direct call (SUPER ADMIN):", len(res))
        for r in res:
            print(f"Title: {r['title']}, Type: {r['type']}")
    else:
        print("Nu s-a gasit admin")
except Exception as e:
    print(e)

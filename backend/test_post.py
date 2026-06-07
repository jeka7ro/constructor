from datetime import datetime
from app.database import SessionLocal
from app.models import Admin
from app.api.admin_work_orders import create_work_order, WorkOrderCreate

db = SessionLocal()
admin = db.query(Admin).first()

if admin:
    payload = WorkOrderCreate(
        title="",
        client_name="Test Client",
        client_type="fizica",
        client_language="ro",
        client_email="",
        client_phone="",
        client_contact_person="",
        client_address="",
        client_company_reg_number="",
        client_company_vat="",
        client_company_bank="",
        client_company_iban="",
        client_company_swift="",
    )
    try:
        res = create_work_order(payload=payload, db=db, current_admin=admin)
        print("SUCCESS:", res)
    except Exception as e:
        print("ERROR:", e)
else:
    print("No admin")

from app.database import SessionLocal
from app.models import WorkOrder
from app.api.admin_work_orders import _serialize_audit_mode

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.is_quote == True).first()
if wo:
    import traceback
    try:
        res = _serialize_audit_mode(wo)
        print("recalculated_net:", res.get("recalculated_net"))
    except Exception as e:
        traceback.print_exc()
else:
    print("No quote found")

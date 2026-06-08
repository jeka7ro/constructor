from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wos = db.query(WorkOrder).order_by(WorkOrder.start_date.desc()).limit(10).all()
for wo in wos:
    print(wo.id, wo.external_id, wo.start_date, wo.title)


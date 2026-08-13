from app.database import SessionLocal
from app.models import WorkOrder
db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.quote_number.like('EST%')).all()
for wo in wos:
    print(wo.id, wo.quote_number)
db.close()

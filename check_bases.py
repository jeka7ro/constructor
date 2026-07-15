import sys, os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import engine
from sqlalchemy.orm import Session
from app.models import LogisticBase, WorkOrder

with Session(engine) as db:
    bases = db.query(LogisticBase).all()
    print("Bases:")
    for b in bases:
        print(f" - {b.name}: {b.latitude}, {b.longitude}")

    import datetime
    today = datetime.date.today()
    wos = db.query(WorkOrder).filter(
        (WorkOrder.start_date == today) | (WorkOrder.deadline_date == today)
    ).all()
    print("\nWorkOrders Today:")
    for w in wos:
        print(f" - {w.client_name} / {w.title}: {w.site_latitude}, {w.site_longitude}")

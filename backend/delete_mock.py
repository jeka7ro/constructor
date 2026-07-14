from app.database import SessionLocal
from app.models import TripLog
from datetime import date

db = SessionLocal()
target_date = date.today()

# Delete trips for today that we just generated
trips = db.query(TripLog).filter(TripLog.date == target_date, TripLog.status == "completed").all()
for t in trips:
    db.delete(t)
db.commit()
print(f"Deleted {len(trips)} mock trips.")

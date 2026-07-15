import os
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime, timezone
from app.api.admin_logistics import _calculate_daily_routes
from app.database import SessionLocal
from app.models import User

def main():
    db = SessionLocal()
    admin = db.query(User).filter(User.full_name == 'Iulian Carabet').first()
    if not admin:
        print("No user")
        return
    res = _calculate_daily_routes(datetime.utcnow().date(), db, admin)
    print("Routes returned length:", len(res.get("routes", [])))
    for r in res.get("routes", []):
        print("ROUTE:", r.get("team_name"), "-", r.get("total_distance_km"), "km", "(trace:", len(r.get("gps_trace", [])), ")")

main()

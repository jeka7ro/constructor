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
    res = _calculate_daily_routes(datetime.utcnow().date(), db, admin)
    
    for r in res.get("routes", []):
        if r.get("is_unassigned"):
            print(f"CRANE: {r.get('team_name')} - {r.get('total_distance_km')} km - {len(r.get('gps_trace', []))} trace points")
            
main()

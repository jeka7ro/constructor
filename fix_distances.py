import sys, math
import os
from dotenv import load_dotenv

# Load env before importing database
load_dotenv(dotenv_path='backend/.env')

sys.path.append('backend')
from app.database import SessionLocal
from app.models import WorkOrder
from sqlalchemy.orm.attributes import flag_modified

def hav(lat1, lon1, lat2, lon2):
    R = 6371
    dLat = math.radians(lat2-lat1)
    dLon = math.radians(lon2-lon1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dLon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

db = SessionLocal()
wos = db.query(WorkOrder).filter((WorkOrder.route_distance_km == None) | (WorkOrder.route_distance_km == 0)).all()
print('Found', len(wos), 'Work Orders with 0km')

fixed_count = 0
for w in wos:
    if w.site_latitude and w.site_longitude:
        w.route_distance_km = round(hav(50.88243, 4.39343, w.site_latitude, w.site_longitude) * 1.3 * 2, 2)
        # Update the fallback segment if it exists
        if w.route_segments and len(w.route_segments) > 0:
            for seg in w.route_segments:
                seg["km"] = round(w.route_distance_km / 2, 2)
        
        flag_modified(w, "route_segments")
        fixed_count += 1

db.commit()
print('Successfully fixed', fixed_count, 'Work Orders!')

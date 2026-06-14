import json
import math
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

with engine.connect() as conn:
    res = conn.execute(text("""
        SELECT w.id, w.title, w.site_address, w.site_latitude, w.site_longitude, w.route_segments, 
               t.name as team_name, b.name as base_name, b.latitude as base_lat, b.longitude as base_lng
        FROM saas_app.work_orders w
        LEFT JOIN saas_app.teams t ON w.assigned_team_id = t.id
        LEFT JOIN saas_app.logistic_bases b ON t.base_id = b.id
        WHERE w.site_latitude IS NOT NULL 
          AND w.site_longitude IS NOT NULL 
          AND w.assigned_team_id IS NOT NULL
          AND b.latitude IS NOT NULL
    """))
    wos = [dict(r._mapping) for r in res]

to_update = []
for wo in wos:
    # If empty array or None
    if not wo['route_segments'] or len(wo['route_segments']) == 0:
        dist_one_way = haversine(wo['base_lat'], wo['base_lng'], wo['site_latitude'], wo['site_longitude'])
        segments = [
            {
                "from": wo['base_name'],
                "to": wo['site_address'] or wo['title'],
                "km": round(dist_one_way, 2),
                "from_lat": wo['base_lat'],
                "from_lng": wo['base_lng']
            },
            {
                "from": wo['site_address'] or wo['title'],
                "to": wo['base_name'],
                "km": round(dist_one_way, 2),
                "from_lat": wo['site_latitude'],
                "from_lng": wo['site_longitude']
            }
        ]
        to_update.append((wo['id'], segments, round(dist_one_way * 2, 2)))

print(f"Found {len(to_update)} work orders to fix!")

with engine.begin() as conn:
    for uid, segs, dist in to_update:
        conn.execute(
            text("UPDATE saas_app.work_orders SET route_segments = :segs, route_distance_km = :dist WHERE id = :id"),
            {"segs": json.dumps(segs), "dist": dist, "id": uid}
        )
print("Fix applied to DB!")

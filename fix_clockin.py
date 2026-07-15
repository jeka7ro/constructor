import os

file_path = "backend/app/api/clockin.py"
with open(file_path, "r") as f:
    content = f.read()

# Add get_triplog_for_day import and math functions inside the endpoint
target = """        # 2. Fetch Vehicles (Flespi)
        vehicle_rows = db.execute(sqlt(\"\"\""""

replacement = """        # 2. Fetch Vehicles (Flespi)
        from app.api.admin_logistics import get_triplog_for_day
        from math import radians, cos, sin, asin, sqrt
        def haversine(lon1, lat1, lon2, lat2):
            lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
            dlon = lon2 - lon1 
            dlat = lat2 - lat1 
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a)) 
            return 6371 * c

        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        vehicle_rows = db.execute(sqlt(\"\"\""""

content = content.replace(target, replacement)

# Now update the query to include v.type
query_target = """            SELECT v.id, v.imei, v.name, v.plate_number, v.last_lat, v.last_lng, v.last_seen_at, v.last_speed,
                   COALESCE(u_direct.avatar_path, u_leader.avatar_path) AS avatar_path,"""
query_repl = """            SELECT v.id, v.imei, v.name, v.type, v.plate_number, v.last_lat, v.last_lng, v.last_seen_at, v.last_speed,
                   COALESCE(u_direct.avatar_path, u_leader.avatar_path) AS avatar_path,"""
content = content.replace(query_target, query_repl)

# Now update the distance logic inside the loop
loop_target = """        for v in vehicle_rows:
            result.append({
                "type":       "vehicle",
                "id":         v.id,
                "name":       f"{v.name} ({v.plate_number})" if v.plate_number else v.name,
                "vehicle_type": getattr(v, 'type', "Camion"),
                "lat":        v.last_lat,
                "lng":        v.last_lng,
                "last_seen":  str(v.last_seen_at).replace(' ', 'T') + 'Z' if v.last_seen_at else None,
                "speed":      v.last_speed,
                "team_name":  "GPS Flespi",
                "team_color": v.team_color or "#0ea5e9", # Use team color or default sky blue
                "avatar_url": v.avatar_path,
                "distance_today": v.distance_today if hasattr(v, 'distance_today') else 0, # Note: distance_today was computed in another function? Wait, I didn't see it in clockin.py!
            })"""

loop_repl = """        for v in vehicle_rows:
            dist = 0.0
            if getattr(v, 'imei', None):
                try:
                    fetched = get_triplog_for_day(v.imei, today_start)
                    if fetched and len(fetched) > 1:
                        for i in range(1, len(fetched)):
                            dist += haversine(
                                fetched[i-1]['lng'], fetched[i-1]['lat'],
                                fetched[i]['lng'], fetched[i]['lat']
                            )
                except Exception:
                    pass
            result.append({
                "type":       "vehicle",
                "id":         v.id,
                "name":       f"{v.name} ({v.plate_number})" if v.plate_number else v.name,
                "vehicle_type": getattr(v, 'type', "Camion"),
                "lat":        v.last_lat,
                "lng":        v.last_lng,
                "last_seen":  str(v.last_seen_at).replace(' ', 'T') + 'Z' if v.last_seen_at else None,
                "speed":      v.last_speed,
                "team_name":  "GPS Flespi",
                "team_color": v.team_color or "#0ea5e9",
                "avatar_url": v.avatar_path,
                "distance_today": round(dist, 1)
            })"""

content = content.replace(loop_target, loop_repl)

with open(file_path, "w") as f:
    f.write(content)

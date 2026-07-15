import os, sys, json
from datetime import date, datetime, time
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))

file_path = "backend/app/api/clockin.py"
with open(file_path, "r") as f:
    content = f.read()

old_code = """        # 2. Fetch Vehicles (Flespi)
        vehicle_rows = db.execute(sqlt(\"\"\"
            SELECT v.id, v.name, v.plate_number, v.last_lat, v.last_lng, v.last_seen_at, v.last_speed,
                   COALESCE(u_direct.avatar_path, u_leader.avatar_path) AS avatar_path,
                   COALESCE(t_direct.color, recent_team.team_color) AS team_color
            FROM saas_app.vehicles v"""

new_code = """        # 2. Fetch Vehicles (Flespi)
        vehicle_rows = db.execute(sqlt(\"\"\"
            SELECT v.id, v.imei, v.name, v.plate_number, v.last_lat, v.last_lng, v.last_seen_at, v.last_speed,
                   COALESCE(u_direct.avatar_path, u_leader.avatar_path) AS avatar_path,
                   COALESCE(t_direct.color, recent_team.team_color) AS team_color
            FROM saas_app.vehicles v"""

content = content.replace(old_code, new_code)

old_loop = """        for r in vehicle_rows:
            # Generate a distinct consistent color based on vehicle ID if team_color is missing
            import hashlib
            palette = [
                "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
                "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899",
                "#84cc16", "#8b5cf6", "#10b981", "#0ea5e9", "#d946ef"
            ]
            color_idx = int(hashlib.md5(r.id.encode()).hexdigest(), 16) % len(palette)
            fallback_color = palette[color_idx]

            out.append({
                "id": r.id,
                "name": r.name,
                "lat": r.last_lat,
                "lng": r.last_lng,
                "speed": r.last_speed,
                "last_seen": r.last_seen_at.isoformat() if r.last_seen_at else None,
                "team_color": r.team_color or fallback_color,
                "avatar_url": r.avatar_path
            })"""

new_loop = """        from app.services.flespi_service import get_triplog_for_day
        from math import radians, cos, sin, asin, sqrt

        def haversine(lon1, lat1, lon2, lat2):
            lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
            dlon = lon2 - lon1 
            dlat = lat2 - lat1 
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a)) 
            return 6371 * c

        today_start = int(datetime.combine(date.today(), time.min).timestamp())

        for r in vehicle_rows:
            import hashlib
            palette = [
                "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
                "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899",
                "#84cc16", "#8b5cf6", "#10b981", "#0ea5e9", "#d946ef"
            ]
            color_idx = int(hashlib.md5(r.id.encode()).hexdigest(), 16) % len(palette)
            fallback_color = palette[color_idx]

            gps_distance_km = 0.0
            if r.imei:
                try:
                    fetched = get_triplog_for_day(r.imei, today_start)
                    if fetched and len(fetched) > 1:
                        for i in range(1, len(fetched)):
                            gps_distance_km += haversine(
                                fetched[i-1]['lng'], fetched[i-1]['lat'],
                                fetched[i]['lng'], fetched[i]['lat']
                            )
                except Exception:
                    pass

            out.append({
                "id": r.id,
                "name": r.name,
                "lat": r.last_lat,
                "lng": r.last_lng,
                "speed": r.last_speed,
                "distance_today": round(gps_distance_km, 1),
                "last_seen": r.last_seen_at.isoformat() if r.last_seen_at else None,
                "team_color": r.team_color or fallback_color,
                "avatar_url": r.avatar_path
            })"""

content = content.replace(old_loop, new_loop)

with open(file_path, "w") as f:
    f.write(content)


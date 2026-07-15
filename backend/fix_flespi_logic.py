import os, sys, re

clockin_path = "backend/app/api/clockin.py"
with open(clockin_path, "r") as f:
    content = f.read()

# 1. Add global cache and haversine at the top of get_live_vehicles if not present
if "_flespi_cache" not in content:
    cache_code = """
_flespi_cache = {"ts": 0, "distances": {}}
def get_flespi_distances(token):
    import time, httpx, json, math
    from datetime import datetime, timezone
    global _flespi_cache
    if time.time() - _flespi_cache["ts"] < 60:
        return _flespi_cache["distances"]
    
    day = datetime.utcnow()
    tz_offset = 2
    ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
    ts_to = int(day.timestamp())
    url = "https://flespi.io/gw/devices/all/messages"
    headers = {"Authorization": f"FlespiToken {token}", "Accept": "application/json"}
    params = {"data": json.dumps({"from": ts_from, "to": ts_to, "fields": "ident,position.latitude,position.longitude"})}
    
    distances = {}
    try:
        resp = httpx.get(url, headers=headers, params=params, timeout=5.0)
        if resp.status_code == 200:
            msgs = resp.json().get("result", [])
            last_pos = {}
            for m in msgs:
                ident = str(m.get("ident"))
                lat = m.get("position.latitude")
                lng = m.get("position.longitude")
                if not lat or not lng: continue
                if ident not in distances:
                    distances[ident] = 0.0
                    last_pos[ident] = (lng, lat)
                else:
                    lon1, lat1 = last_pos[ident]
                    dlon = math.radians(lng - lon1)
                    dlat = math.radians(lat - lat1)
                    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat)) * math.sin(dlon/2)**2
                    d = 6371 * 2 * math.asin(math.sqrt(a))
                    distances[ident] += d
                    last_pos[ident] = (lng, lat)
            _flespi_cache = {"ts": time.time(), "distances": distances}
    except Exception as e:
        print("Flespi distance error:", e)
    return distances

"""
    # Insert it before get_live_vehicles
    content = content.replace("@router.get(\"/vehicles/live\")", cache_code + "\n@router.get(\"/vehicles/live\")")

# 2. Update the SQL Query
old_sql = """            SELECT v.id, v.imei, v.name, v.type, v.plate_number, v.last_lat, v.last_lng, v.last_seen_at, v.last_speed,
                   COALESCE(u_direct.avatar_path, u_leader.avatar_path) AS avatar_path,
                   COALESCE(t_direct.color, recent_team.team_color) AS team_color
            FROM saas_app.vehicles v"""
new_sql = """            SELECT v.id, v.imei, v.name, v.type, v.plate_number, v.last_lat, v.last_lng, v.last_seen_at, v.last_speed,
                   COALESCE(u_direct.avatar_path, u_leader.avatar_path) AS avatar_path,
                   COALESCE(t_direct.color, recent_team.team_color) AS team_color,
                   COALESCE(t_direct.name, recent_team.team_name, u_direct.full_name) AS driver_name
            FROM saas_app.vehicles v"""
content = content.replace(old_sql, new_sql)

old_recent = """                SELECT DISTINCT ON (wo.assigned_vehicle_id)
                       wo.assigned_vehicle_id, t.team_leader_id, t.color as team_color
                FROM saas_app.work_orders wo"""
new_recent = """                SELECT DISTINCT ON (wo.assigned_vehicle_id)
                       wo.assigned_vehicle_id, t.team_leader_id, t.color as team_color, t.name as team_name
                FROM saas_app.work_orders wo"""
content = content.replace(old_recent, new_recent)

# 3. Add Base and Work Order fetching inside get_live_vehicles
fetch_code = """        # Fetch Bases and Today's Work Orders for Location Matching
        bases = db.execute(sqlt("SELECT name, latitude, longitude FROM saas_app.logistic_bases WHERE latitude IS NOT NULL AND longitude IS NOT NULL")).fetchall()
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        wos = db.execute(sqlt("SELECT title, client_name, site_latitude, site_longitude FROM saas_app.work_orders WHERE (start_date = :td OR deadline_date = :td) AND status NOT IN ('draft', 'completed') AND site_latitude IS NOT NULL AND site_longitude IS NOT NULL"), {"td": today_str}).fetchall()
        
        # Calculate Flespi Distances
        flespi_distances = {}
        FLESPI_TOKEN = os.getenv("FLESPI_TOKEN")
        if FLESPI_TOKEN:
            flespi_distances = get_flespi_distances(FLESPI_TOKEN)
            
        def is_near(lat1, lng1, lat2, lng2):
            return haversine(lng1, lat1, lng2, lat2) < 0.2 # 200 meters
"""

content = content.replace("for v in vehicle_rows:", fetch_code + "\n        for v in vehicle_rows:")

# 4. Replace distance calculation and add location text
old_dist_loop = """            dist = 0.0
            try:
                trips = db.query(TripLog).filter(
                    TripLog.vehicle_id == v.id,
                    TripLog.date == today_start.date()
                ).all()
                if trips:
                    trip_ids = [t.id for t in trips]
                    pts = db.query(TripGPSPoint).filter(
                        TripGPSPoint.trip_id.in_(trip_ids)
                    ).order_by(TripGPSPoint.timestamp).all()
                    if len(pts) > 1:
                        for i in range(1, len(pts)):
                            dist += haversine(
                                pts[i-1].longitude, pts[i-1].latitude,
                                pts[i].longitude, pts[i].latitude
                            )
            except Exception as e:
                print(f"Error calculating distance for vehicle {v.id}: {e}")
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

new_dist_loop = """            dist = flespi_distances.get(str(v.imei), 0.0) if v.imei else 0.0
            
            loc_text = ""
            if v.last_speed is not None and v.last_speed < 5:
                # Check if at base
                for b in bases:
                    if is_near(v.last_lat, v.last_lng, b.latitude, b.longitude):
                        loc_text = f"La baza: {b.name}"
                        break
                # Check if at work order
                if not loc_text:
                    for w in wos:
                        if is_near(v.last_lat, v.last_lng, w.site_latitude, w.site_longitude):
                            loc_text = f"La lucrare: {w.client_name if w.client_name and w.client_name != 'None' else w.title}"
                            break

            # Format name: use driver_name/team_name if available, else vehicle name
            display_name = v.driver_name if hasattr(v, 'driver_name') and v.driver_name else (f"{v.name} ({v.plate_number})" if v.plate_number else v.name)
            if display_name and str(display_name).lower().startswith("echipa"):
                display_name = str(display_name)[6:].strip() # remove 'echipa'
                
            result.append({
                "type":       "vehicle",
                "id":         v.id,
                "name":       display_name,
                "vehicle_type": getattr(v, 'type', "Camion"),
                "lat":        v.last_lat,
                "lng":        v.last_lng,
                "last_seen":  str(v.last_seen_at).replace(' ', 'T') + 'Z' if v.last_seen_at else None,
                "speed":      v.last_speed,
                "team_name":  "GPS Flespi",
                "team_color": v.team_color or "#0ea5e9",
                "avatar_url": v.avatar_path,
                "distance_today": round(dist, 1),
                "location_text": loc_text
            })"""

content = content.replace(old_dist_loop, new_dist_loop)

with open(clockin_path, "w") as f:
    f.write(content)
print("Updated clockin.py")

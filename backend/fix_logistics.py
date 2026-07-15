import re
import os

with open("app/api/admin_logistics.py", "r") as f:
    content = f.read()

# 1. Insert global flespi fetch before the team loop
flespi_fetch_code = """
    # --- FLESPI GLOBAL FETCH ---
    day_flespi_data = []
    import os
    import httpx
    from datetime import datetime, timezone
    FLESPI_TOKEN = os.getenv("FLESPI_TOKEN", "")
    if FLESPI_TOKEN:
        try:
            day = target_date
            tz_offset = 2
            ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
            ts_to = int(datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
            url = f"https://flespi.io/gw/devices/all/messages"
            headers = {"Authorization": f"FlespiToken {FLESPI_TOKEN}", "Accept": "application/json"}
            import json
            params = {"data": json.dumps({"from": ts_from, "to": ts_to, "fields": "ident,timestamp,position.latitude,position.longitude,position.speed"})}
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url, headers=headers, params=params)
                if resp.status_code == 200:
                    day_flespi_data = resp.json().get("result", [])
        except Exception as e:
            print("Flespi global fetch error:", e)

    for team in teams:
"""
content = content.replace("    for team in teams:\n", flespi_fetch_code, 1)

# 2. Fix Team fallback
team_fallback_old = """
                    if FLESPI_TOKEN:
                        try:
                            day = target_date
                            tz_offset = 2
                            ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
                            ts_to = int(datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
                            
                            url = f"https://flespi.io/gw/devices/all/messages"
                            headers = {"Authorization": f"FlespiToken {FLESPI_TOKEN}", "Accept": "application/json"}
                            with httpx.Client(timeout=10.0) as client:
                                resp = client.get(url, headers=headers)
                                if resp.status_code == 200:
                                    flespi_data = resp.json().get("result", [])
                                    for msg in flespi_data:
                                        if str(msg.get("ident", "")) == str(getattr(v, "imei", "")):
                                            ts = msg.get("timestamp")
                                            if ts and ts >= ts_from and ts <= ts_to:
                                                lat = msg.get("position.latitude")
                                                lng = msg.get("position.longitude")
                                                if lat and lng:
                                                    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                                                    gps_trace.append({
                                                        "lat": lat,
                                                        "lng": lng,
                                                        "ts": dt.isoformat(),
                                                        "speed": round(msg.get("position.speed", 0), 1)
                                                    })
                                    gps_trace.sort(key=lambda x: x["ts"])
                        except Exception:
                            pass
"""
team_fallback_new = """
                    if FLESPI_TOKEN and day_flespi_data:
                        try:
                            day = target_date
                            tz_offset = 2
                            ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
                            ts_to = int(datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
                            for msg in day_flespi_data:
                                if str(msg.get("ident", "")) == str(getattr(v, "imei", "")):
                                    ts = msg.get("timestamp")
                                    if ts and ts >= ts_from and ts <= ts_to:
                                        lat = msg.get("position.latitude")
                                        lng = msg.get("position.longitude")
                                        if lat and lng:
                                            dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                                            gps_trace.append({
                                                "lat": lat,
                                                "lng": lng,
                                                "ts": dt.isoformat(),
                                                "speed": round(msg.get("position.speed", 0), 1)
                                            })
                            gps_trace.sort(key=lambda x: x["ts"])
                        except Exception:
                            pass
"""
if team_fallback_old.strip() in content:
    content = content.replace(team_fallback_old, team_fallback_new)
else:
    print("Could not find team_fallback_old!")

# 3. Add Haversine calculation for teams if works_count is 0 but gps_trace exists
team_gps_dist_code = """
        if len(works) == 0 and len(gps_trace) > 1:
            from math import radians, cos, sin, asin, sqrt
            def haversine_dist(lon1, lat1, lon2, lat2):
                lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
                dlon = lon2 - lon1 
                dlat = lat2 - lat1 
                a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                c = 2 * asin(sqrt(a)) 
                return 6371 * c
            for i in range(1, len(gps_trace)):
                team_distance_km += haversine_dist(
                    gps_trace[i-1]['lng'], gps_trace[i-1]['lat'],
                    gps_trace[i]['lng'], gps_trace[i]['lat']
                )
            grand_total_distance_km += team_distance_km

        routes.append({
"""
content = content.replace("        routes.append({\n", team_gps_dist_code, 1)

# 4. Remove the block I added previously for unassigned_flespi_data
unassigned_old = """
    # Pre-fetch Flespi data once for all unassigned vehicles to avoid rate limit
    unassigned_flespi_data = []
    import os
    import httpx
    from datetime import datetime, timezone
    FLESPI_TOKEN = os.getenv("FLESPI_TOKEN", "")
    if FLESPI_TOKEN and unassigned_vehicles:
        try:
            day = target_date
            tz_offset = 2
            ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
            ts_to = int(datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
            url = f"https://flespi.io/gw/devices/all/messages"
            headers = {"Authorization": f"FlespiToken {FLESPI_TOKEN}", "Accept": "application/json"}
            params = {"data": '{"from":' + str(ts_from) + ',"to":' + str(ts_to) + '}'}
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url, headers=headers, params=params)
                if resp.status_code == 200:
                    unassigned_flespi_data = resp.json().get("result", [])
        except Exception:
            pass

    for v in unassigned_vehicles:
"""
if unassigned_old.strip() in content:
    content = content.replace(unassigned_old, "    for v in unassigned_vehicles:\n")
else:
    print("Could not find unassigned_old!")

# 5. Fix Unassigned vehicles loop to use day_flespi_data
unassigned_loop_old = """
        if FLESPI_TOKEN and getattr(v, "imei", None) and unassigned_flespi_data:
            try:
                day = target_date
                tz_offset = 2
                ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
                ts_to = int(datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
                for msg in unassigned_flespi_data:
"""
unassigned_loop_new = """
        if FLESPI_TOKEN and getattr(v, "imei", None) and day_flespi_data:
            try:
                day = target_date
                tz_offset = 2
                ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
                ts_to = int(datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
                for msg in day_flespi_data:
"""
if unassigned_loop_old.strip() in content:
    content = content.replace(unassigned_loop_old, unassigned_loop_new)
else:
    print("Could not find unassigned_loop_old!")


with open("app/api/admin_logistics.py", "w") as f:
    f.write(content)
print("Done refactoring admin_logistics.py")

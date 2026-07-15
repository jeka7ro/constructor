import os
import json
import math
import httpx
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
token = os.getenv("FLESPI_TOKEN")

day = datetime.utcnow()
tz_offset = 2
ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
ts_to = int(day.timestamp())
url = "https://flespi.io/gw/devices/all/messages"
headers = {"Authorization": f"FlespiToken {token}", "Accept": "application/json"}
params = {"data": json.dumps({"from": ts_from, "to": ts_to, "fields": "ident,position.latitude,position.longitude"})}

resp = httpx.get(url, headers=headers, params=params, timeout=10.0)
msgs = resp.json().get("result", [])

distances = {}
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

print(distances)

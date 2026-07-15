import os, httpx, json, math
from dotenv import load_dotenv
from datetime import datetime, timezone

def haversine(lon1, lat1, lon2, lat2):
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return 6371 * 2 * math.asin(math.sqrt(a))

load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
FLESPI_TOKEN = os.getenv("FLESPI_TOKEN", "")

day = datetime.utcnow()
tz_offset = 2
ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
ts_to = int(day.timestamp())

url = "https://flespi.io/gw/devices/all/messages"
headers = {"Authorization": f"FlespiToken {FLESPI_TOKEN}", "Accept": "application/json"}
params = {
    "data": json.dumps({
        "from": ts_from,
        "to": ts_to,
        "fields": "ident,position.latitude,position.longitude,timestamp"
    })
}

resp = httpx.get(url, headers=headers, params=params, timeout=10.0)
msgs = resp.json().get("result", [])
print(f"Got {len(msgs)} messages")

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
        d = haversine(last_pos[ident][0], last_pos[ident][1], lng, lat)
        distances[ident] += d
        last_pos[ident] = (lng, lat)

print(distances)

import os, httpx, time
from dotenv import load_dotenv
load_dotenv()

FLESPI_TOKEN = os.getenv("FLESPI_TOKEN")
ts_from = int(time.mktime(time.strptime("2026-07-11", "%Y-%m-%d"))) - 7200
ts_to = ts_from + 86400

# First get list of device IDs from /gw/devices/all
headers = {"Authorization": f"FlespiToken {FLESPI_TOKEN}", "Accept": "application/json"}
with httpx.Client(timeout=15.0) as client:
    devs = client.get("https://flespi.io/gw/devices/all", headers=headers)
    device_ids = [str(d["id"]) for d in devs.json().get("result", [])]
    print(f"Found {len(device_ids)} devices: {device_ids}")
    
    # Now fetch messages for all those specific IDs
    url = f"https://flespi.io/gw/devices/{','.join(device_ids)}/messages"
    t0 = time.time()
    resp = client.get(url, headers=headers, params={"data": f'{{"from":{ts_from},"to":{ts_to}}}'})
    elapsed = time.time() - t0
    data = resp.json()
    print(f"Status: {resp.status_code}, Messages: {len(data.get('result', []))}, Time: {elapsed:.2f}s")

import os, httpx, time
from dotenv import load_dotenv
load_dotenv()
FLESPI_TOKEN = os.getenv("FLESPI_TOKEN")
ts_from = int(time.time()) - 3600
ts_to = ts_from + 3600

# all/messages
url = "https://flespi.io/gw/devices/all/messages"
headers = {"Authorization": f"FlespiToken {FLESPI_TOKEN}", "Accept": "application/json"}
params = {
    "data": f'{{"from":{ts_from},"to":{ts_to}}}'
    # removed fields for now to see what we get
}

with httpx.Client(timeout=30.0) as client:
    resp = client.get(url, headers=headers, params=params)
    print(resp.status_code)
    print(resp.text[:500])

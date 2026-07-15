import os, httpx, json
from dotenv import load_dotenv
from datetime import datetime, timezone
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
FLESPI_TOKEN = os.getenv("FLESPI_TOKEN", "")

day = datetime.utcnow()
ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp())
ts_to = int(day.timestamp())

url = f"https://flespi.io/gw/devices/all/calculate"
headers = {"Authorization": f"FlespiToken {FLESPI_TOKEN}", "Accept": "application/json"}
payload = {
    "selectors": [{"devices": "all"}],
    "expressions": [{"expression": "mileage", "name": "mileage"}],
    "from": ts_from,
    "to": ts_to
}
resp = httpx.post(url, headers=headers, json=payload)
print("Calc result:", resp.status_code, resp.text)

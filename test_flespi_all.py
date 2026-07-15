import os, httpx, json
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
FLESPI_TOKEN = os.getenv("FLESPI_TOKEN", "")

url = "https://flespi.io/gw/devices/all/telemetry"
headers = {"Authorization": f"FlespiToken {FLESPI_TOKEN}", "Accept": "application/json"}
resp = httpx.get(url, headers=headers)
print(json.dumps(resp.json(), indent=2))

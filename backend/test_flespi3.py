import os, httpx, time
from dotenv import load_dotenv
load_dotenv()
FLESPI_TOKEN = os.getenv("FLESPI_TOKEN")

# First, get a list of devices to see what selectors work
url = "https://flespi.io/gw/devices/all"
headers = {"Authorization": f"FlespiToken {FLESPI_TOKEN}", "Accept": "application/json"}

with httpx.Client(timeout=30.0) as client:
    resp = client.get(url, headers=headers)
    print("Devices Status:", resp.status_code)
    data = resp.json()
    if data.get("result"):
        device_id = data["result"][0]["id"]
        ident = data["result"][0]["configuration"]["ident"]
        print(f"Got device {device_id} with ident {ident}")
        
        # Now get messages for this specific device id
        msg_url = f"https://flespi.io/gw/devices/{device_id}/messages"
        msg_resp = client.get(msg_url, headers=headers, params={"data": '{"count": 1}'})
        print("Messages status:", msg_resp.status_code)
        print("Message fields:", list(msg_resp.json().get("result", [{}])[0].keys()))

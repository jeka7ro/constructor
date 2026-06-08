import os
import requests
from dotenv import load_dotenv

load_dotenv("backend/.env")
key = os.getenv("ROBAWS_API_KEY")
secret = os.getenv("ROBAWS_API_SECRET")

url = "https://app.robaws.com/api/v2/work-orders?limit=1&include=lineItems"
r = requests.get(url, auth=(key, secret), headers={"Accept": "application/json"})
if r.status_code == 200:
    items = r.json().get('items', [])
    for item in items:
        for li in item.get('lineItems', []):
            print(li)

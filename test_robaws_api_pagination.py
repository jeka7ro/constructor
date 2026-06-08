import requests
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
key = os.getenv("ROBAWS_API_KEY")
secret = os.getenv("ROBAWS_API_SECRET")

url = "https://app.robaws.com/api/v2/work-orders?limit=50&sort=-date"
r = requests.get(url, auth=(key, secret), headers={"Accept": "application/json"})
if r.status_code == 200:
    data = r.json()
    items = data.get('items', [])
    print(f"Got {len(items)} items")
    for item in items[:5]:
        print(f"ID: {item['id']} Date: {item['date']} Title: {item['title']}")
else:
    print("Error:", r.status_code, r.text)

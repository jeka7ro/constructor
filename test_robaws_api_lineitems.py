import os
import requests
from dotenv import load_dotenv

load_dotenv("backend/.env")
key = os.getenv("ROBAWS_API_KEY")
secret = os.getenv("ROBAWS_API_SECRET")

url = "https://app.robaws.com/api/v2/work-orders?limit=5&include=lineItems"
r = requests.get(url, auth=(key, secret), headers={"Accept": "application/json"})
if r.status_code == 200:
    items = r.json().get('items', [])
    for item in items:
        print(f"ID: {item['id']} - Title: {item['title']}")
        print(f"Has lineItems key? {'lineItems' in item}")
        print(f"Line items length: {len(item.get('lineItems', []))}")
        print("---")
else:
    print("Error", r.status_code)

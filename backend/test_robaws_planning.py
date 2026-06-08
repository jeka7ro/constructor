import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()
ROBAWS_API_KEY = os.getenv("ROBAWS_API_KEY")
ROBAWS_API_SECRET = os.getenv("ROBAWS_API_SECRET")

urls = [
    "https://app.robaws.com/api/v2/planning-items?limit=5",
    "https://app.robaws.com/api/v2/plannings?limit=5",
    "https://app.robaws.com/api/v2/projects?limit=5"
]

for url in urls:
    r = requests.get(url, auth=(ROBAWS_API_KEY, ROBAWS_API_SECRET), headers={"Accept": "application/json"})
    if r.status_code == 200:
        print(f"\nSUCCESS for {url}:")
        data = r.json()
        print("Total items:", data.get('totalItems'))
        items = data.get('items', [])
        if items:
            print("First item keys:", list(items[0].keys()))
            print("First item example:", {k: items[0][k] for k in ('id', 'date', 'title', 'start', 'end') if k in items[0]})
    else:
        print(f"\nFAILED for {url}: {r.status_code}")


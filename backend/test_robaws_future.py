import os
import requests
import json
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()
ROBAWS_API_KEY = os.getenv("ROBAWS_API_KEY")
ROBAWS_API_SECRET = os.getenv("ROBAWS_API_SECRET")

today = datetime.now().strftime("%Y-%m-%d")
future = (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")
past = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")

print(f"Today: {today} | Future: {future} | Past: {past}")
print(f"API KEY: {ROBAWS_API_KEY[:6]}..." if ROBAWS_API_KEY else "NO API KEY!")

# Test diferite variante de filtrare pe dată
test_urls = [
    ("NO FILTER (current)", f"https://app.robaws.com/api/v2/work-orders?limit=5"),
    ("dateFrom+dateTo", f"https://app.robaws.com/api/v2/work-orders?limit=5&dateFrom={past}&dateTo={future}"),
    ("from+to", f"https://app.robaws.com/api/v2/work-orders?limit=5&from={past}&to={future}"),
    ("startDate+endDate", f"https://app.robaws.com/api/v2/work-orders?limit=5&startDate={past}&endDate={future}"),
    ("dateFrom only (today+future)", f"https://app.robaws.com/api/v2/work-orders?limit=5&dateFrom={today}"),
    ("date_from+date_to", f"https://app.robaws.com/api/v2/work-orders?limit=5&date_from={past}&date_to={future}"),
]

for label, url in test_urls:
    r = requests.get(url, auth=(ROBAWS_API_KEY, ROBAWS_API_SECRET), headers={"Accept": "application/json"}, timeout=15)
    print(f"\n{'='*60}")
    print(f"[{label}]")
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        total = data.get('totalItems', data.get('total', '?'))
        pages = data.get('totalPages', '?')
        items = data.get('items', [])
        print(f"Total items: {total}, Pages: {pages}")
        if items:
            print(f"First: {items[0].get('date', 'N/A')} | {items[0].get('title', 'N/A')[:50]}")
            if len(items) > 1:
                print(f"Last:  {items[-1].get('date', 'N/A')} | {items[-1].get('title', 'N/A')[:50]}")
    else:
        print(f"Error: {r.text[:300]}")



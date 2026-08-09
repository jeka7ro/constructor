import os
import requests
from dotenv import load_dotenv

load_dotenv("/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
BACKUP_BUCKET = "backups"

print(f"URL: {SUPABASE_URL}")
print(f"KEY length: {len(SUPABASE_KEY) if SUPABASE_KEY else 0}")

list_url = f"{SUPABASE_URL}/storage/v1/object/list/{BACKUP_BUCKET}"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}
payload = {
    "prefix": "",
    "limit": 100,
    "offset": 0,
    "sortBy": {"column": "name", "order": "desc"}
}

r = requests.post(list_url, json=payload, headers=headers)
print(r.status_code)
print(r.text)

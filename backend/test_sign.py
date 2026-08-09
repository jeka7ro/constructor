import os
import requests
from dotenv import load_dotenv

load_dotenv("/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

sign_url = f"{SUPABASE_URL}/storage/v1/object/sign/backups/backup_20260809_135251.json.gz"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}
payload = {"expiresIn": 3600}

r = requests.post(sign_url, json=payload, headers=headers)
print(r.json())

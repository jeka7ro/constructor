import os
import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
STORAGE_BUCKET = "uploads"

file_content = b"fake image"
path = "chat_attachments/test/123.png"

url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{path}"
headers = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "apikey": SUPABASE_KEY,
    "Content-Type": "image/png",
    "x-upsert": "true",
}

print("POSTing to", url)
response = httpx.post(url, content=file_content, headers=headers, timeout=30.0)
print(response.status_code)
print(response.text)

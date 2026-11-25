import os
from app.storage import get_file_url

path = "partner_attachments/2e6d0e23-9efa-444f-97ab-805e1b6423d2/partner_doc_757bebb8.png"
print(f"Bucket from env: {os.getenv('SUPABASE_STORAGE_BUCKET')}")
print(get_file_url(path))

import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
key = os.getenv("SUPABASE_SERVICE_KEY")
print(f"Key starts with: {key[:10]}")
print(f"Key ends with: {key[-10:]}")
print(f"Has quotes: {'\"' in key}")

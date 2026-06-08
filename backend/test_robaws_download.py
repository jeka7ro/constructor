import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()
ROBAWS_API_KEY = os.getenv("ROBAWS_API_KEY")
ROBAWS_API_SECRET = os.getenv("ROBAWS_API_SECRET")

url = "https://app.robaws.com/documents/7914?inline=true&timestamp=1671440915333"

file_req = requests.get(url, auth=(ROBAWS_API_KEY, ROBAWS_API_SECRET), timeout=15)
print("File status:", file_req.status_code)
print("File len:", len(file_req.content))


import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()
ROBAWS_API_KEY = os.getenv("ROBAWS_API_KEY")
ROBAWS_API_SECRET = os.getenv("ROBAWS_API_SECRET")

# Test with order 1975 which has 3 docs
ext_id = "1975"
docs_url = f"https://app.robaws.com/api/v2/work-orders/{ext_id}/documents"
d_res = requests.get(docs_url, auth=(ROBAWS_API_KEY, ROBAWS_API_SECRET), headers={"Accept": "application/json"})
docs = d_res.json()
print("Docs JSON:", json.dumps(docs, indent=2))


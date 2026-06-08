import os
import requests
from dotenv import load_dotenv

load_dotenv()
ROBAWS_API_KEY = os.getenv("ROBAWS_API_KEY")
ROBAWS_API_SECRET = os.getenv("ROBAWS_API_SECRET")

url = "https://app.robaws.com/api/v2/work-orders?limit=1"
r = requests.get(url, auth=(ROBAWS_API_KEY, ROBAWS_API_SECRET), headers={"Accept": "application/json"})
if r.status_code == 200:
    it = r.json()
    print("totalItems:", it.get("totalItems"))
    print("totalPages:", it.get("totalPages"))


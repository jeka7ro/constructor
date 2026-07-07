import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("BILLTOBOX_API_KEY")
url = "https://api.billtobox.be/import/v1"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/xml"
}

# Sending empty/invalid XML to see if we get 401 Unauthorized or 400 Bad Request
response = requests.post(url, headers=headers, data="<test></test>")

print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")

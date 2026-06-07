import requests
import json
import base64

key = "6A7MI3DVO8RRX6LKEU5F"
secret = "nnR6NRbn3QU3VkZVJccUwBXBOWfhvQMpyxnQMJnx"

# Method 1: Basic Auth
auth = base64.b64encode(f"{key}:{secret}".encode()).decode()
headers1 = {
    "Authorization": f"Basic {auth}",
    "Accept": "application/json"
}

# Method 2: Bearer (sometimes key+secret are used to get a bearer, but let's try direct)
headers2 = {
    "X-Api-Key": key,
    "X-Api-Secret": secret,
    "Accept": "application/json"
}

url = "https://app.robaws.com/api/v2/work-orders"

print("Trying Basic Auth...")
r1 = requests.get(url, headers=headers1)
print(r1.status_code)
if r1.status_code == 200:
    print(len(r1.json().get('items', [])))
else:
    print(r1.text[:200])

print("\nTrying Custom Headers...")
r2 = requests.get(url, headers=headers2)
print(r2.status_code)
if r2.status_code == 200:
    print(len(r2.json().get('items', [])))
else:
    print(r2.text[:200])

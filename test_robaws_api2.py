import requests
import base64

key = "6A7MI3DVO8RRX6LKEU5F"
secret = "nnR6NRbn3QU3VkZVJccUwBXBOWfhvQMpyxnQMJnx"

# Must not contain newline!
auth_str = f"{key}:{secret}"
auth_bytes = auth_str.encode("utf-8")
b64_auth = base64.b64encode(auth_bytes).decode("utf-8")

headers = {
    "Authorization": f"Basic {b64_auth}",
    "Accept": "application/json"
}

url = "https://app.robaws.com/api/v2/work-orders"
print(f"Requesting {url} with headers {headers}")

r = requests.get(url, headers=headers)
print(r.status_code)
try:
    print(r.json())
except:
    print(r.text)

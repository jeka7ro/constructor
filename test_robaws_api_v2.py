import requests

api_key = "6A7MI3DVO8RRX6LKEU5F"
url = "https://app.robaws.com/api/v2/projects"

headers = {
    "X-Api-Key": api_key,
    "Accept": "application/json"
}

r = requests.get(url, headers=headers)
print(r.status_code)
print(r.text[:500])

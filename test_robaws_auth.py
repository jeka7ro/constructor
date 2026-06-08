import requests

api_key = "6A7MI3DVO8RRX6LKEU5F"
url = "https://app.robaws.com/api/v2/projects"

headers_to_test = [
    {"Authorization": f"Bearer {api_key}"},
    {"X-Robaws-Api-Key": api_key},
    {"Robaws-Api-Key": api_key},
    {"Api-Key": api_key},
    {"Authorization": f"Token {api_key}"},
    {"x-api-key": api_key}
]

for headers in headers_to_test:
    headers["Accept"] = "application/json"
    r = requests.get(url, headers=headers)
    print(f"Headers: {list(headers.keys())[0]} -> {r.status_code}")

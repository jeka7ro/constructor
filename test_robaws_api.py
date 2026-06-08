import requests

api_key = "6A7MI3DVO8RRX6LKEU5F"
endpoints = [
    "https://app.robaws.com/api/v1/workOrders",
    "https://app.robaws.com/api/v1/work-orders",
    "https://app.robaws.com/api/v2/workOrders",
    "https://api.robaws.com/v1/workOrders"
]

headers_to_test = [
    {"Authorization": f"Bearer {api_key}"},
    {"X-Api-Key": api_key},
    {"ApiKey": api_key},
    {"Authorization": f"Basic {api_key}"}
]

for url in endpoints:
    for headers in headers_to_test:
        try:
            r = requests.get(url, headers=headers, timeout=3)
            print(f"URL: {url} | Headers: {list(headers.keys())[0]} | Status: {r.status_code}")
            if r.status_code == 200:
                print(r.json())
        except Exception as e:
            print(f"URL: {url} | Error: {e}")


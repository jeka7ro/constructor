import os
import requests

api_key = "354dfbdc-73ed-4c47-a80d-ed06d1de1c06"
endpoints = [
    "https://v4-api.platform.eu.banqup.com/import/v1",
    "https://api.billtobox.com/import/v1",
    "https://crossnet.unifiedpost.com/import/v1",
    "https://services.billtobox.be/api/v1/import",
    "https://crossnet.unifiedpost.com/api/v1/import"
]

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/xml"
}

for url in endpoints:
    print(f"Testing {url} ...")
    try:
        response = requests.post(url, headers=headers, data="<test></test>", timeout=3)
        print(f"  Status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"  Failed: {e}")

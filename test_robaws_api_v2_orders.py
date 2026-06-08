import requests

key = "VAEHYND9BAPDHOQ0EMSE"
secret = "Pfit7TCLGDV1Z8G8ofEtPSJuzeV7gsOKBKL382X0"

urls = [
    "https://app.robaws.com/api/v2/work-orders?limit=50&page=0",
    "https://app.robaws.com/api/v2/work-orders?limit=50&page=1",
    "https://app.robaws.com/api/v2/work-orders?limit=50&offset=50",
    "https://app.robaws.com/api/v2/work-orders?limit=50&start=50",
    "https://app.robaws.com/api/v2/work-orders?limit=50&_page=1"
]

for url in urls:
    r = requests.get(url, auth=(key, secret), headers={"Accept": "application/json"}, timeout=3)
    if r.status_code == 200:
        data = r.json()
        print(f"{url} -> Current Page: {data.get('currentPage')}")

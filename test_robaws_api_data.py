import requests
import json

key = "VAEHYND9BAPDHOQ0EMSE"
secret = "Pfit7TCLGDV1Z8G8ofEtPSJuzeV7gsOKBKL382X0"
url = "https://app.robaws.com/api/v2/work-orders"

r = requests.get(url, auth=(key, secret), headers={"Accept": "application/json"})
if r.status_code == 200:
    data = r.json()
    items = data.get('items', [])
    if items:
        with open("robaws_sample_work_order.json", "w") as f:
            json.dump(items[0], f, indent=2)
        print("Sample saved to robaws_sample_work_order.json")

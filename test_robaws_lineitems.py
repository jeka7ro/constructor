import requests
import json

key = "VAEHYND9BAPDHOQ0EMSE"
secret = "Pfit7TCLGDV1Z8G8ofEtPSJuzeV7gsOKBKL382X0"
url = "https://app.robaws.com/api/v2/work-orders/1975?include=materialEntries,lineItems,project"

r = requests.get(url, auth=(key, secret), headers={"Accept": "application/json"})
if r.status_code == 200:
    data = r.json()
    if data.get('lineItems'):
        with open("robaws_lineitems.json", "w") as f:
            json.dump(data['lineItems'], f, indent=2)
        print("Saved lineItems")

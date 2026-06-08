import requests
import json

key = "VAEHYND9BAPDHOQ0EMSE"
secret = "Pfit7TCLGDV1Z8G8ofEtPSJuzeV7gsOKBKL382X0"
url = "https://app.robaws.com/api/v2/work-orders/1975"

r = requests.get(url, auth=(key, secret), headers={"Accept": "application/json"})
print("Default:", r.json().keys())

url2 = "https://app.robaws.com/api/v2/work-orders/1975?include=materialEntries,lineItems,project"
r2 = requests.get(url2, auth=(key, secret), headers={"Accept": "application/json"})
if r2.status_code == 200:
    data = r2.json()
    print("With Includes:", data.keys())
    if data.get('materialEntries'):
        print("Materials:", data['materialEntries'])
    if data.get('lineItems'):
        print("LineItems:", len(data['lineItems']))

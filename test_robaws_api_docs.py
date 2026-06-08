import requests
import json

key = "VAEHYND9BAPDHOQ0EMSE"
secret = "Pfit7TCLGDV1Z8G8ofEtPSJuzeV7gsOKBKL382X0"

url = "https://app.robaws.com/api/v2/work-orders/1975/documents"
r = requests.get(url, auth=(key, secret), headers={"Accept": "application/json"})
print("Docs endpoint:", r.status_code)
if r.status_code == 200:
    print(r.json())

url2 = "https://app.robaws.com/api/v2/work-orders/1975?include=documents"
r2 = requests.get(url2, auth=(key, secret), headers={"Accept": "application/json"})
if r2.status_code == 200:
    print("Includes docs:", r2.json().keys())

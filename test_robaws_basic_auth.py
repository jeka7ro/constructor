import requests

key = "VAEHYND9BAPDHOQ0EMSE"
secret = "Pfit7TCLGDV1Z8G8ofEtPSJuzeV7gsOKBKL382X0"

url_projects = "https://app.robaws.com/api/v2/projects"
url_orders = "https://app.robaws.com/api/v2/workOrders"

try:
    r1 = requests.get(url_projects, auth=(key, secret), headers={"Accept": "application/json"})
    print(f"Projects Status: {r1.status_code}")
    if r1.status_code == 200:
        data = r1.json()
        print(f"Items count: {len(data.get('items', []))}")
        
    r2 = requests.get(url_orders, auth=(key, secret), headers={"Accept": "application/json"})
    print(f"Orders Status: {r2.status_code}")
    if r2.status_code == 200:
        data = r2.json()
        print(f"Items count: {len(data.get('items', []))}")
        if data.get('items'):
            print("First item sample keys:", list(data['items'][0].keys()))
            
except Exception as e:
    print(e)


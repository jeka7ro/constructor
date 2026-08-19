import requests

r = requests.get('http://127.0.0.1:5000/api/admin/pricing-analytics')
if r.status_code == 200:
    data = r.json()
    for row in data.get('analytics', []):
        if row.get('difference', 0) != 0:
            print(f"WO ID: {row.get('wo_id')}")
            print(f"Client: {row.get('client_name')}")
            print(f"Saved: {row.get('saved_net')}")
            print(f"Recalculated: {row.get('recalculated_net')}")
            print(f"Diff: {row.get('difference')}")
            print("---")
else:
    print("API Error:", r.status_code)

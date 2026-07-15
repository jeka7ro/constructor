import requests
resp = requests.get('http://davidechape.localhost:5678/admin/logistics/daily-routes?date=2026-07-14', headers={"Authorization": "Bearer fake"})
print(resp.status_code)
print(resp.text)

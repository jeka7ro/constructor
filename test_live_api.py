import requests
import json
try:
    resp = requests.get('http://davidechape.localhost:5678/admin/vehicles/live', headers={"Authorization": "Bearer fake"})
    print(resp.status_code)
    # print(json.dumps(resp.json(), indent=2)[:500])
except Exception as e:
    print(e)

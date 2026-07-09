import requests

try:
    resp = requests.get('http://127.0.0.1:8000/api/worker/agenda', headers={'X-Tenant': 'davidechape'})
    print(resp.json())
except Exception as e:
    print(e)

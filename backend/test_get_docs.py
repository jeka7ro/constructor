import requests

r = requests.get('http://localhost:8000/api/v1/worker/orders/27108/documents')
print(r.status_code)

import requests

r = requests.get("http://127.0.0.1:6001/api/admin/clients")
print(r.status_code)
print(r.text)

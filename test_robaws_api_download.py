import requests

key = "VAEHYND9BAPDHOQ0EMSE"
secret = "Pfit7TCLGDV1Z8G8ofEtPSJuzeV7gsOKBKL382X0"

url = "https://app.robaws.com/documents/7914?inline=true&timestamp=1671440915333"
r = requests.get(url, auth=(key, secret))
print("Download status:", r.status_code)
print("Content-Type:", r.headers.get("Content-Type"))
print("Size:", len(r.content))

import requests

s = requests.Session()
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
}
r = s.get('https://app.robaws.com/login?v=2&_s=sso', headers=headers)
print("Status:", r.status_code)
print("URL after redirect:", r.url)
print("Content sample:", r.text[:500])

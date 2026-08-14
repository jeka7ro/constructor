import requests
login_url = "http://127.0.0.1:8001/admin/login"
resp = requests.post(login_url, json={"username": "jeka7ro@gmail.com", "password": "password"})
# wait, fastAPI login uses Form data not JSON!
import urllib.parse
resp = requests.post(login_url, data={"username": "jeka7ro@gmail.com", "password": "password"}, headers={"Content-Type": "application/x-www-form-urlencoded"})
if resp.status_code == 200:
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    url = "http://127.0.0.1:8001/api/admin/work-orders/4ac055f0-4d95-4fbe-aaf5-c46955763151/messages"
    payload = {
        "message": "test from request",
        "attachments": [{"url": "http://fake", "name": "fake.png", "type": "image"}]
    }
    msg_resp = requests.post(url, json=payload, headers=headers)
    print("STATUS", msg_resp.status_code)
    print("BODY", msg_resp.text)
else:
    print("LOGIN FAILED", resp.status_code, resp.text)

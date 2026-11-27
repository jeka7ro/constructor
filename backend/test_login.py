import requests

url = "http://localhost:8001/api/partner/login"
payload = {
    "email": "eugen1ro@gmail.com",
    "password": "password123"
}
try:
    response = requests.post(url, json=payload)
    print("Login:", response.status_code, response.json())
    if response.status_code == 200:
        token = response.json().get('token')
        headers = {"Authorization": f"Bearer {token}"}
        res2 = requests.get("http://localhost:8001/api/partner/teams", headers=headers)
        print("Teams:", res2.status_code, res2.json())
except Exception as e:
    print(e)

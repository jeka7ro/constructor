import requests

res = requests.post(
    "http://127.0.0.1:8000/api/admin/translate", 
    json={"text": "Hello", "target_lang": "ro"},
    headers={"Authorization": "Bearer fake_token"}
)
print(res.status_code)
print(res.text)

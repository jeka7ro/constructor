from fastapi.testclient import TestClient
from main import app
from app.api.admin_auth import create_access_token

client = TestClient(app)
# generate token for carabetiulian@gmail.com
token = create_access_token(data={"sub": "carabetiulian@gmail.com", "role": "admin"})
response = client.get("/admin/clients", headers={"Authorization": f"Bearer {token}"})
print("STATUS:", response.status_code)
print("BODY:", response.json())

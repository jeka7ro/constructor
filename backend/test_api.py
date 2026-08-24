from fastapi.testclient import TestClient
from main import app
from app.api.admin_auth import create_access_token

client = TestClient(app)
token = open("token.txt").read().strip() if open("token.txt").read().strip() else "mock"

response = client.get(
    "/api/admin/work-orders?start_date=2026-02-01&end_date=2027-08-28&slim=true",
    headers={"Authorization": f"Bearer {token}"}
)
print("Status:", response.status_code)
print("Response:", response.text)

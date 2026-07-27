from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

payload = {
    "domain": "app.davidechape.be",
    "client_type": "fizica",
    "client_first_name": "John",
    "client_last_name": "Doe",
    "client_email": "john.doe@example.com",
    "client_language": "en",
    "work_type": "new",
    "site_address": "123 Test St",
    "surface": 100,
    "thickness": 5,
    "has_foil": False,
    "has_mesh": False,
    "has_duramint": True
}

response = client.post("/api/public/calculator/submit", json=payload)
print("Response Status:", response.status_code)
print("Response JSON:", response.json())

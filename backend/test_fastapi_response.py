from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
# We need an admin token to test this endpoint
# but maybe we can just look at the get_clients function return type

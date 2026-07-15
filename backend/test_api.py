import requests
import json
import os
from datetime import datetime
from app.database import SessionLocal
from app.models import User
from app.api.admin_auth import create_access_token

def main():
    db = SessionLocal()
    admin = db.query(User).filter(User.full_name == 'Iulian Carabet').first()
    
    # Create token using FastAPI's token generator
    # wait, create_access_token takes dict
    token = create_access_token({"sub": admin.email, "role": "admin"})
    
    url = "http://localhost:5678/api/admin/logistics/daily-routes?target_date=2026-07-14"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Fetching {url}...")
    resp = requests.get(url, headers=headers)
    print("Status Code:", resp.status_code)
    
    if resp.status_code == 200:
        data = resp.json()
        print("Cached:", data.get("cached"))
        for r in data.get("routes", []):
            print(f"ROUTE: {r.get('team_name')} - {r.get('total_distance_km')} km (trace: {len(r.get('gps_trace', []))})")

main()

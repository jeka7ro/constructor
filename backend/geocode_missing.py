import requests
import time
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import WorkOrder

def geocode_address(address: str):
    if not address:
        return None, None
    url = f"https://nominatim.openstreetmap.org/search?format=json&q={address}&limit=1"
    headers = {"User-Agent": "PontajDigital/1.0", "Accept-Language": "ro"}
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 0:
                return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"Error geocoding {address}: {e}")
    return None, None

def main():
    db = SessionLocal()
    wos = db.query(WorkOrder).filter(WorkOrder.site_latitude == None, WorkOrder.site_address != None).all()
    print(f"Found {len(wos)} orders without coordinates. Geocoding...")
    
    count = 0
    for wo in wos:
        # Some addresses have typos like Zuidstraat24. Try to fix common ones
        addr = wo.site_address
        if "straat" in addr.lower() and any(c.isdigit() for c in addr):
            # Just let Nominatim try first
            pass
            
        lat, lon = geocode_address(addr)
        if not lat and "24" in addr and "Zuidstraat" in addr:
            lat, lon = geocode_address("Zuidstraat 24, Harelbeke")
            
        if lat and lon:
            wo.site_latitude = lat
            wo.site_longitude = lon
            count += 1
            print(f"Geocoded {wo.id} -> {lat}, {lon}")
        else:
            print(f"Failed to geocode: {addr}")
        time.sleep(1.1)  # Respect Nominatim rate limit
        
    db.commit()
    print(f"Successfully geocoded {count} orders.")

if __name__ == "__main__":
    main()

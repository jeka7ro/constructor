import sys
import os
import requests
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models import WorkOrder

def run():
    db = SessionLocal()
    orders = db.query(WorkOrder).filter(WorkOrder.site_address != None, WorkOrder.site_latitude == None).all()
    print(f"Found {len(orders)} orders to geocode.")
    
    updated = 0
    for wo in orders:
        if not wo.site_address.strip():
            continue
            
        address = wo.site_address
        # Clean up the address slightly if needed.
        query = address
        if "belgium" not in query.lower() and "belgie" not in query.lower() and "belgique" not in query.lower():
            query += ", Belgium"
            
        try:
            res = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": query, "format": "json", "limit": 1, "countrycodes": "be,nl,fr,lu,de"},
                headers={"User-Agent": "IsoflexApp/1.0"},
                timeout=5
            )
            data = res.json()
            if data and len(data) > 0:
                wo.site_latitude = float(data[0]["lat"])
                wo.site_longitude = float(data[0]["lon"])
                db.commit()
                updated += 1
                print(f"Geocoded: {address} -> {wo.site_latitude}, {wo.site_longitude}")
            else:
                print(f"Failed to geocode: {address}")
        except Exception as e:
            print(f"Error geocoding {address}: {e}")
            
        time.sleep(1.2) # Polite delay for Nominatim
        
    print(f"Done. Updated {updated} orders.")
    db.close()

if __name__ == "__main__":
    run()

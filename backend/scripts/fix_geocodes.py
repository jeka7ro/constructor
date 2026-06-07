import sys
import os
import requests
import time
import re

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models import WorkOrder

def run():
    db = SessionLocal()
    orders = db.query(WorkOrder).filter(WorkOrder.site_address != None, WorkOrder.site_latitude == None).all()
    print(f"Found {len(orders)} orders to fix.")
    
    headers = {"User-Agent": "IsoflexAppScraperFix/1.0"}
    updated = 0
    for wo in orders:
        addr = wo.site_address
        match = re.search(r'\b([1-9][0-9]{3})\b', addr)
        if match:
            fallback_query = f"{match.group(1)}, Belgium"
            try:
                res = requests.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": fallback_query, "format": "json", "limit": 1},
                    headers=headers,
                    timeout=5
                )
                data = res.json()
                if data and len(data) > 0:
                    wo.site_latitude = float(data[0]["lat"])
                    wo.site_longitude = float(data[0]["lon"])
                    db.commit()
                    updated += 1
                    print(f"Fixed {match.group(1)} for {addr}")
                else:
                    print(f"Still failed {fallback_query}")
            except Exception as e:
                print(e)
        else:
            print(f"No postal code in: {addr}")
            
        time.sleep(1.2)
        
    print(f"Fixed {updated} orders.")
    db.close()

if __name__ == "__main__":
    run()

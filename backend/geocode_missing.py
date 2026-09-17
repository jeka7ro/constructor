import os
import time
import requests
from dotenv import load_dotenv
from app.database import SessionLocal
from app.models import WorkOrder

load_dotenv()
API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

def geocode_address(address: str):
    if not address or not API_KEY or address.strip().lower() == "test address":
        return None, None
        
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    # Filter with Belgium country component to avoid mislocating Belgian streets
    params = {"address": address, "key": API_KEY, "components": "country:BE"}
    try:
        resp = requests.get(url, params=params, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "OK" and data.get("results"):
                loc = data["results"][0]["geometry"]["location"]
                return float(loc['lat']), float(loc['lng'])
            elif data.get("status") == "ZERO_RESULTS":
                # Fallback without components filter in case country is not strictly BE
                fallback_resp = requests.get(url, params={"address": address, "key": API_KEY}, timeout=5)
                if fallback_resp.status_code == 200:
                    fb_data = fallback_resp.json()
                    if fb_data.get("status") == "OK" and fb_data.get("results"):
                        loc = fb_data["results"][0]["geometry"]["location"]
                        return float(loc['lat']), float(loc['lng'])
    except Exception as e:
        print(f"Error geocoding {address}: {e}")
    return None, None

def main():
    if not API_KEY:
        print("GOOGLE_MAPS_API_KEY is missing from environment!")
        return

    db = SessionLocal()
    try:
        # Only select real work orders that have a site_address but missing coordinates
        wos = (
            db.query(WorkOrder)
            .filter(
                WorkOrder.site_latitude == None,
                WorkOrder.site_address != None,
                WorkOrder.site_address != "",
                WorkOrder.site_address != "Test Address"
            )
            .all()
        )
        print(f"Found {len(wos)} orders to geocode.")
        
        count = 0
        for i, wo in enumerate(wos):
            addr = wo.site_address.strip()
            lat, lon = geocode_address(addr)
            if lat and lon:
                wo.site_latitude = lat
                wo.site_longitude = lon
                count += 1
                print(f"[{i+1}/{len(wos)}] Geocoded order {wo.id} ({wo.start_date}): {addr} -> ({lat}, {lon})")
            else:
                print(f"[{i+1}/{len(wos)}] Could not locate: {addr}")
            time.sleep(0.15)  # 150ms delay to prevent rate issues
            
        db.commit()
        print(f"\nDone! Successfully updated {count} out of {len(wos)} orders in database.")
    except Exception as ex:
        db.rollback()
        print(f"Error during geocoding: {ex}")
    finally:
        db.close()

if __name__ == "__main__":
    main()


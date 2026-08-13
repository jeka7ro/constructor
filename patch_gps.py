import re

file_path = "backend/app/api/gps_verification.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add wo_id to POI
old_poi = """            pois.append({
                "type": "work_order",
                "name": getattr(wo, 'client_name', None) or "Chantier",
                "address": getattr(wo, 'site_address', None) or "—",
                "lat": lat,
                "lng": lng
            })"""
new_poi = """            pois.append({
                "type": "work_order",
                "id": str(wo.id),
                "name": getattr(wo, 'client_name', None) or "Chantier",
                "address": getattr(wo, 'site_address', None) or "—",
                "lat": lat,
                "lng": lng
            })"""
content = content.replace(old_poi, new_poi)

# Copy id to itinerary
old_itinerary = """                    itinerary.append({
                        "type": current_poi["type"],
                        "name": current_poi["name"],
                        "address": current_poi["address"],
                        "arrived": local_arr,
                        "departed": local_dep,
                        "duration_min": round((last_seen_ts - arrival_ts) / 60)
                    })"""
new_itinerary = """                    itinerary.append({
                        "type": current_poi["type"],
                        "id": current_poi.get("id"),
                        "name": current_poi["name"],
                        "address": current_poi["address"],
                        "arrived": local_arr,
                        "departed": local_dep,
                        "duration_min": round((last_seen_ts - arrival_ts) / 60)
                    })"""
content = content.replace(old_itinerary, new_itinerary)

# Second itinerary append (at the end)
content = content.replace(old_itinerary, new_itinerary) # It should replace both if they are identical

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("GPS backend updated.")

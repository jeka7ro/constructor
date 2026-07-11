import requests

bbox = "50.84,4.34,50.86,4.36" # min_lat, min_lon, max_lat, max_lon
query = f'[out:json];way({bbox})["maxspeed"];out tags geom;'

resp = requests.post("https://overpass-api.de/api/interpreter", data={"data": query}, headers={"User-Agent": "SmartTimesheet/1.0"})
if resp.status_code == 200:
    data = resp.json()
    print("SUCCESS, ways found:", len(data.get("elements", [])))
else:
    print("FAILED", resp.status_code)

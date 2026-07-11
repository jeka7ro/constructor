import requests

pts = [(50.85, 4.35), (50.851, 4.351)]
query = "[out:json];("
for lat, lon in pts:
    query += f'way(around:30,{lat},{lon})["maxspeed"];'
query += ");out tags;"

resp = requests.post("https://overpass-api.de/api/interpreter", data={"data": query}, headers={"User-Agent": "SmartTimesheet/1.0"})
if resp.status_code == 200:
    print("SUCCESS")
    print(str(resp.json())[:200])
else:
    print("FAILED", resp.status_code)
    print(resp.text[:200])

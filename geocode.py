import requests
import json
import time

stations = [
    { "name": "BAZA GHENT", "lat": 51.0538286, "lng": 3.7250121 },
    { "name": "BAZZA NINOVE", "lat": 50.8340156, "lng": 4.0150992 },
    { "name": "NHM WIELSBEKE", "lat": 50.9080277, "lng": 3.3644265 },
    { "name": "NHM BAZA OSTENDE", "lat": 51.2263435, "lng": 2.9152345 },
    { "name": "BAZA DOUR (Rougraff)", "lat": 50.3957242, "lng": 3.7778393 },
    { "name": "BAZA LUMMEN (Minera)", "lat": 51.0107703, "lng": 5.2366141 },
    { "name": "BAZA ATH (Stock Ath)", "lat": 50.630554, "lng": 3.7788481 },
    { "name": "Baza dranaco Antwerpen", "lat": 51.2372207, "lng": 4.4569835 },
    { "name": "MINERA LUMEN", "lat": 50.9255869, "lng": 4.8354728 },
    { "name": "BAZZA HALLE (Denayer)", "lat": 50.7358744, "lng": 4.2365449 },
    { "name": "BAZA SODEMAF TOURNAI", "lat": 50.6055532, "lng": 3.3888362 },
    { "name": "BAZA JOASSIN NAMUR", "lat": 50.4665283, "lng": 4.8661886 },
    { "name": "BAZA ERPE-MERE", "lat": 50.9238304, "lng": 3.9664654 },
    { "name": "BAZA SABLE ET GRANULATS LIEGE", "lat": 50.6451384, "lng": 5.5734203 },
    { "name": "Baza Antoing TUORNAI", "lat": 50.5623588, "lng": 3.4379506 },
    { "name": "BAZA AALST", "lat": 50.9383224, "lng": 4.0392149 },
    { "name": "BAZA GENT", "lat": 51.0538286, "lng": 3.7250121 },
    { "name": "BAZA BOOM", "lat": 51.0875913, "lng": 4.3577297 },
    { "name": "BAZA TEMSE", "lat": 51.1220674, "lng": 4.2265680 },
    { "name": "BAZA ANTWERP", "lat": 51.2373003, "lng": 4.4571109 },
    { "name": "BAZA ECODREAM LIEGE", "lat": 50.6451384, "lng": 5.5734203 },
    { "name": "BAZA INTRE MONS SI ATH", "lat": 50.4549557, "lng": 3.951958 }
]

def reverse_geocode(lat, lng):
    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=18&addressdetails=1"
    headers = {"User-Agent": "PontajDigital/1.0"}
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            return data.get("display_name", "")
    except:
        pass
    return ""

results = []
for idx, s in enumerate(stations):
    # print(f"Geocoding {idx+1}/{len(stations)}: {s['name']}...")
    addr = reverse_geocode(s['lat'], s['lng'])
    if addr:
        parts = addr.split(", ")
        addr = ", ".join(parts[:3])
    s['address'] = addr
    results.append(s)
    time.sleep(1.1)

with open('scratch_stations.json', 'w') as f:
    json.dump(results, f, indent=4)
print(json.dumps(results, indent=4))

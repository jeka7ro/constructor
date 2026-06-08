import requests
import time

names = [
    "BAZA GHENT", "BAZZA NINOVE", "NHM WIELSBEKE", "NHM BAZA OSTENDE", 
    "Rougraff DOUR", "MINERA LUMMEN", "Stock Ath", "dranaco Antwerpen",
    "Denayer bouwmaterialen HALLE", "SODEMAF TOURNAI", "JOASSIN NAMUR",
    "ERPE-MERE", "SABLE ET GRANULATS LIEGE", "Antoing TUORNAI", "AALST",
    "GENT", "BOOM", "TEMSE", "ECODREAM LIEGE"
]

for name in names:
    query = f"{name}, Belgium"
    headers = {"User-Agent": "IsoflexAppAPI/1.0"}
    try:
        res = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1},
            headers=headers,
            timeout=5
        )
        data = res.json()
        if data and len(data) > 0:
            print(f"{{ name: '{name}', lat: {data[0]['lat']}, lng: {data[0]['lon']} }},")
        else:
            # try just the city
            city = name.split()[-1]
            res = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": city + ", Belgium", "format": "json", "limit": 1},
                headers=headers,
                timeout=5
            )
            data2 = res.json()
            if data2 and len(data2) > 0:
                print(f"{{ name: '{name}', lat: {data2[0]['lat']}, lng: {data2[0]['lon']} }},")
            else:
                print(f"// Not found: {name}")
    except Exception as e:
         print(f"// Error {name}: {e}")
    time.sleep(1.1)

import requests

def test():
    query = "[out:json];(way(around:25,50.85,4.35)[\"maxspeed\"];);out tags geom;"
    resp = requests.post("https://overpass-api.de/api/interpreter", data={"data": query}, headers={"User-Agent": "SmartTimesheet/1.0"})
    data = resp.json()
    for el in data.get("elements", []):
        print(el["tags"].get("maxspeed"), el.get("geometry", [])[0:2])

test()

import requests

urls = [
    "https://gadgets.buienradar.nl/gadget/zoommap/?lat=50.85&lng=4.35&overname=2&zoom=8&size=3",
    "https://gadgets.buienradar.be/gadget/zoommap",
    "https://widget.buienradar.nl/widget/1.0/radar",
    "https://www.buienradar.nl/widgets/radarmap"
]

for url in urls:
    try:
        r = requests.get(url, timeout=3)
        print(f"{url}: {r.status_code}")
    except Exception as e:
        print(f"{url}: {e}")

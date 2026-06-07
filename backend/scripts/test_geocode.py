import re
import requests

def clean_address(addr):
    # Try to extract 4 digit postal code
    match = re.search(r'\b([1-9][0-9]{3})\b', addr)
    if match:
        return f"{match.group(1)}, Belgium"
    return addr

test_addrs = [
    "4130 Esneux, Chemin d'Amostrennes",
    "1140 Evere, Oud-Strijderslaan 260 ( voir plan en annexe)",
    "Binche, Place des Droits de l'Homme 5/1",
    "9406 Ninove/Nederhasselt, Nederhasseltstraat 182",
    "1730 Asse-----------------------------------------------------------, Kasteelstraat 45"
]

for a in test_addrs:
    cleaned = clean_address(a)
    print(f"Original: {a}")
    print(f"Cleaned:  {cleaned}")
    res = requests.get("https://nominatim.openstreetmap.org/search", params={"q": cleaned, "format": "json", "limit": 1})
    data = res.json()
    if data:
        print(f"-> Success: {data[0]['lat']}, {data[0]['lon']}")
    else:
        print("-> Failed")
    print()

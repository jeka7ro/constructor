import json

files = ["frontend/src/i18n/ro.json", "frontend/src/i18n/nl.json", "frontend/src/i18n/fr.json"]

new_keys = {
    "mandatory": "Obligatoriu / Verplicht / Obligatoire",
    "eps_truck_free": "Gratuit pentru volum mare / Gratis voor groot volume / Gratuit pour grand volume",
    "eps_truck_free_sub": "Fără taxe dacă volumul > m³ / Geen kosten als volume > m³ / Pas de frais si volume > m³"
}

for file_path in files:
    if "ro.json" in file_path:
        idx = 0
    elif "nl.json" in file_path:
        idx = 1
    else:
        idx = 2
        
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    if "pricing_settings" not in data:
        data["pricing_settings"] = {}
        
    for k, v in new_keys.items():
        data["pricing_settings"][k] = v.split(" / ")[idx]
        
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
print("Translations v2 added successfully.")

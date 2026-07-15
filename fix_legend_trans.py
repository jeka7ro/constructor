import json, os

files = {
    "frontend/src/i18n/fr.json": {"legend": "Légende"},
    "frontend/src/i18n/nl.json": {"legend": "Legende"},
    "frontend/src/i18n/en.json": {"legend": "Legend"},
    "frontend/src/i18n/ro.json": {"legend": "Legendă"},
}

for filepath, keys in files.items():
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        if "logistics" not in data:
            data["logistics"] = {}
            
        for k, v in keys.items():
            if k not in data["logistics"]:
                data["logistics"][k] = v
            else:
                data["logistics"][k] = v
                
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

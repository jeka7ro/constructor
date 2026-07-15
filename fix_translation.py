import json, os

files = {
    "frontend/src/i18n/fr.json": {"stopped": "À l'arrêt", "today": "aujourd'hui", "last_seen": "Vu", "speed": "Vitesse", "active": "actif"},
    "frontend/src/i18n/nl.json": {"stopped": "Gestopt", "today": "vandaag", "last_seen": "Gezien", "speed": "Snelheid", "active": "actief"},
    "frontend/src/i18n/en.json": {"stopped": "Stopped", "today": "today", "last_seen": "Seen", "speed": "Speed", "active": "active"},
    "frontend/src/i18n/ro.json": {"stopped": "Staționează", "today": "azi", "last_seen": "Văzut", "speed": "Viteza", "active": "activ"},
}

for filepath, keys in files.items():
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        if "live" not in data:
            data["live"] = {}
            
        for k, v in keys.items():
            if k not in data["live"]:
                data["live"][k] = v
                
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

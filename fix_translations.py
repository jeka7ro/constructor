import json

file_path = "frontend/src/i18n/nl.json"
with open(file_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Fix NL translations that got cut off or translated badly
if "pricing_settings" in data:
    data["pricing_settings"]["pur_step"] = "Prijsstijging / cm (tot 10cm)"
    data["pricing_settings"]["pur_extra"] = "Prijs / extra cm (>10cm)"

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

file_path_ro = "frontend/src/i18n/ro.json"
with open(file_path_ro, "r", encoding="utf-8") as f:
    data_ro = json.load(f)

# Fix RO translations
if "pricing_settings" in data_ro:
    data_ro["pricing_settings"]["pur_step"] = "Creștere preț / cm (până la 10cm)"
    data_ro["pricing_settings"]["pur_extra"] = "Preț / cm supl. (peste 10cm)"

with open(file_path_ro, "w", encoding="utf-8") as f:
    json.dump(data_ro, f, indent=2, ensure_ascii=False)
    

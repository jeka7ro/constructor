import os

file_path = "frontend/src/pages/admin/PricingSettingsForm.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix sublabels in PricingSettingsForm
content = content.replace('sublabel="Appliqué à >100, >200, >300 m²"', 'sublabel={t("pricing_settings.pur_discount_sub", "Appliqué à >100, >200, >300 m²")}')
content = content.replace('sublabel="Plafond minimum pour petit chantier"', 'sublabel={t("pricing_settings.pur_min_sub", "Plafond minimum pour petit chantier")}')
content = content.replace('sublabel="(obligatoire pour chauffage au sol)"', 'sublabel={t("pricing_settings.pur_opt_poncage_sub", "(obligatoire pour chauffage au sol)")}')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated PricingSettingsForm")

import json
files = ["frontend/src/i18n/ro.json", "frontend/src/i18n/nl.json", "frontend/src/i18n/fr.json"]
new_keys = {
    "pur_discount_sub": "Aplicat la >100, >200, >300 m² / Toegepast op >100, >200, >300 m² / Appliqué à >100, >200, >300 m²",
    "pur_min_sub": "Plafon minim pentru lucrări mici / Minimum voor kleine werven / Plafond minimum pour petit chantier",
    "pur_opt_poncage_sub": "(obligatoriu pentru încălzire în pardoseală) / (verplicht voor vloerverwarming) / (obligatoire pour chauffage au sol)"
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
        
print("Updated JSONs")

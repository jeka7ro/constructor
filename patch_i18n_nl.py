import json
import os

file_path = "frontend/src/i18n/nl.json"

with open(file_path, "r", encoding="utf-8") as f:
    data = json.load(f)

if "calculator" not in data:
    data["calculator"] = {}

# We update the 'calculator' object with the Dutch translations.
calc = data["calculator"]

calc["isolation_choose"] = "Isolatietype"
calc["pur_desc"] = "Gespoten polyurethaanschuim"
calc["eps_desc"] = "Geëxpandeerd polystyreen"
calc["step_details"] = "Details"
calc["step_address"] = "Adres"
calc["step_date"] = "Datum"
calc["step_contact"] = "Contact"
calc["step_photos"] = "Foto's"
calc["pur_aspiration"] = "Afzuiging"
calc["pur_niveller"] = "Laser nivellering"
calc["pur_poncage"] = "Schuim schuren"
calc["pur_poncage_sub"] = "verplicht voor vloerverwarming"
calc["pur_protection"] = "Bescherming boven 1M"

keys_to_remove = [
    "isolation_question", "duramint_always_included", "pur_desc", "eps_desc", "isolation_choose",
    "step_details", "step_address", "step_date", "step_contact", "step_photos",
    "pur_aspiration", "pur_niveller", "pur_poncage", "pur_protection"
]
for k in keys_to_remove:
    if k in data:
        del data[k]

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

print("Updated nl.json")

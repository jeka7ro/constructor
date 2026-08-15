import json
import os

file_path = "frontend/src/i18n/en.json"

with open(file_path, "r", encoding="utf-8") as f:
    data = json.load(f)

if "calculator" not in data:
    data["calculator"] = {}

# We update the 'calculator' object with the English translations.
calc = data["calculator"]

calc["isolation_choose"] = "Insulation Type"
calc["pur_desc"] = "Sprayed polyurethane foam"
calc["eps_desc"] = "Expanded polystyrene"
calc["step_details"] = "Details"
calc["step_address"] = "Address"
calc["step_date"] = "Date"
calc["step_contact"] = "Contact"
calc["step_photos"] = "Photos"
calc["pur_aspiration"] = "Aspiration"
calc["pur_niveller"] = "Laser leveling"
calc["pur_poncage"] = "Foam sanding"
calc["pur_poncage_sub"] = "mandatory for underfloor heating"
calc["pur_protection"] = "Protection above 1M"

# Clean up any bad keys that were appended to the root
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

print("Updated en.json")

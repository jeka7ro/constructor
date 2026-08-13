import json

# Fix fr.json
for lang_file in ["frontend/src/i18n/fr.json", "frontend/src/i18n/ro.json"]:
    with open(lang_file, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace('"tab_chape": "Chape (Screed)"', '"tab_chape": "Chape"')
    content = content.replace('"tab_chape": "Șapă (Screed)"', '"tab_chape": "Chape"')
    with open(lang_file, "w", encoding="utf-8") as f:
        f.write(content)

# Fix PricingSettingsForm.jsx
file_path = "frontend/src/pages/admin/PricingSettingsForm.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("'Chape (Screed)'", "'Chape'")
content = content.replace("'Transport Chape (Screed)'", "'Transport Chape'")
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

# Fix ActivitiesManagement.jsx
file_path = "frontend/src/pages/admin/ActivitiesManagement.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("'Șapă (Screed)'", "'Chape'")
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

# Fix WorkOrderConfirm.jsx - en translation
file_path = "frontend/src/pages/public/WorkOrderConfirm.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("en: 'Screed'", "en: 'Chape'")
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

# Fix DevisView.jsx
file_path = "frontend/src/pages/admin/DevisView.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("Screed installation", "Chape")
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("All 'Screed' references removed from UI!")

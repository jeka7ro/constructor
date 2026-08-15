import re

file_path = "frontend/src/pages/admin/DevisView.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace "if (truckCost > 0 || distKm > 0) {" with "if (truckCost > 0) {"
old_code = "if (truckCost > 0 || distKm > 0) {"
new_code = "if (truckCost > 0) {"

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched DevisView.jsx successfully.")
else:
    print("Could not find the code to patch in DevisView.jsx.")

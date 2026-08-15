import re

files = [
    "frontend/src/pages/admin/DevisView.jsx",
    "frontend/src/pages/admin/ProformaView.jsx"
]

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # We want to change wo.prices?.extra_thickness_price_per_cm ?? wo.prices?.extra
    # to wo.prices?.extra ?? wo.prices?.extra_thickness_price_per_cm
    # This ensures that manual edits (which save to 'extra') take precedence over the generated 'extra_thickness_price_per_cm'.
    
    content = content.replace("wo.prices?.extra_thickness_price_per_cm ?? wo.prices?.extra", "wo.prices?.extra ?? wo.prices?.extra_thickness_price_per_cm")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print(f"Patched priority in {file_path}")


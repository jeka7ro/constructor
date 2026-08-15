import re
file_path = "frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("extraRate = parseFloat(prices?.extra || 1.25);", "extraRate = parseFloat(prices?.extra ?? prices?.extra_thickness_price_per_cm ?? 1.25);")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("WorkOrderDetail extraRate patched")

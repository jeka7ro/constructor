import re

file_path = "frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_code = "{estimCalc.actualDistKm > 0 && ("
new_code = "{estimCalc.truck_cost > 0 && ("

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched WorkOrderDetail.jsx successfully.")
else:
    print("Could not find the code to patch in WorkOrderDetail.jsx.")

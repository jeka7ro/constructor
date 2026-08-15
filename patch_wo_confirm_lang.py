import re

file_path = "frontend/src/pages/public/WorkOrderConfirm.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_get = "const res = await api.get(`/public/work-orders/${token}`)"
new_get = "const res = await api.get(`/public/work-orders/${token}?lang=${lang}`)"

if old_get in content:
    content = content.replace(old_get, new_get)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched WorkOrderConfirm.jsx successfully.")
else:
    print("Could not find get call to patch.")

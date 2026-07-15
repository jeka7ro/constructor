import re

with open("app/api/admin_logistics.py", "r") as f:
    content = f.read()

# Fix 1: w.assigned_vehicle_id -> getattr(w, 'assigned_vehicle_id', None)
content = re.sub(r'w\.assigned_vehicle_id', r"getattr(w, 'assigned_vehicle_id', None)", content)

# Fix 2: t.assigned_vehicle_id -> getattr(t, 'assigned_vehicle_id', None)
content = re.sub(r't\.assigned_vehicle_id', r"getattr(t, 'assigned_vehicle_id', None)", content)

with open("app/api/admin_logistics.py", "w") as f:
    f.write(content)

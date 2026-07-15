import re

with open("app/api/admin_logistics.py", "r") as f:
    content = f.read()

content = re.sub(r'wo\.assigned_vehicle_id', r"getattr(wo, 'assigned_vehicle_id', None)", content)

with open("app/api/admin_logistics.py", "w") as f:
    f.write(content)

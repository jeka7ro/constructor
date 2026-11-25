import re

file_path = "backend/app/api/admin_work_orders.py"
with open(file_path, "r") as f:
    content = f.read()

# Revert to only partner_portal
content = re.sub(
    r'"client_color": partner_colors\.get\(wo\.client_id\),',
    r'"client_color": partner_colors.get(wo.client_id) if wo.source_system == \'partner_portal\' else None,',
    content
)

with open(file_path, "w") as f:
    f.write(content)
print("Done")

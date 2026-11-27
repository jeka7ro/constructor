import re

file_path = "backend/app/api/admin_work_orders.py"
with open(file_path, "r") as f:
    content = f.read()

# Replace all occurrences of conditional partner color
content = re.sub(
    r'"client_color": partner_colors\.get\(wo\.client_id\) if wo\.source_system == \'partner_portal\' else None',
    r'"client_color": partner_colors.get(wo.client_id)',
    content
)

with open(file_path, "w") as f:
    f.write(content)
print("Done")

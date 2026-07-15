import re

with open("app/api/admin_logistics.py", "r") as f:
    content = f.read()

content = re.sub(
    r'wp_name = wo_obj\.client_name or "UNKNOWN_CLIENT_LOGISTICS"',
    r'wp_name = wo_obj.client_name or "UNKNOWN_CLIENT_LOGISTICS"',
    content
)

with open("app/api/admin_logistics.py", "w") as f:
    f.write(content)

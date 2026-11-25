import re

file_path = "backend/app/api/admin_work_orders.py"
with open(file_path, "r") as f:
    content = f.read()

# Remove the backslashes
content = content.replace(r"\'partner_portal\'", "'partner_portal'")

with open(file_path, "w") as f:
    f.write(content)
print("Done")

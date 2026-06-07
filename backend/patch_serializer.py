import re

with open("app/api/admin_work_orders.py", "r") as f:
    code = f.read()

code = code.replace(
    '"client_phone": wo.client_phone,',
    '"client_phone": wo.client_phone,\n        "client_type": wo.client.client_type if wo.client else "juridica",'
)

with open("app/api/admin_work_orders.py", "w") as f:
    f.write(code)


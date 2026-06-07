import re
with open("app/api/admin_invoices.py", "r") as f:
    code = f.read()

code = code.replace("from .auth import get_current_admin", "from .admin_auth import get_current_admin")

with open("app/api/admin_invoices.py", "w") as f:
    f.write(code)

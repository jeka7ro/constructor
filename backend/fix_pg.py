import re

with open("update_pg_clients_type.py", "r") as f:
    code = f.read()

code = code.replace("ALTER TABLE clients", "ALTER TABLE saas_app.clients")

with open("update_pg_clients_type.py", "w") as f:
    f.write(code)


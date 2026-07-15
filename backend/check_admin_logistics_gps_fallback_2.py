import re

with open("app/api/admin_logistics.py", "r") as f:
    content = f.read()

content = re.sub(
    r'ident = msg\.get\("ident", ""\)',
    r'',
    content
)

with open("app/api/admin_logistics.py", "w") as f:
    f.write(content)

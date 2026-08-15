import re

with open("backend/app/services/pdf_generator.py", "r") as f:
    content = f.read()

# Fix items = proforma.get("items", [])
content = content.replace('items = proforma.get("items", [])', 'items = proforma.get("items") or []')

with open("backend/app/services/pdf_generator.py", "w") as f:
    f.write(content)

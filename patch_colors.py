import re

file_path = "backend/app/services/email_service.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace all occurrences of "#f5a623" with "#3b82f6" (Tailwind Blue 500)
content = content.replace('"#f5a623"', '"#3b82f6"')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched colors successfully.")

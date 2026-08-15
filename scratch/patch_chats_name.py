import re

files = ["frontend/src/pages/admin/AdminChats.jsx", "frontend/src/pages/admin/WorkOrderDetail.jsx"]

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("'Équipe Davide Chape'", "'Equipe Davide Chape'")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Name patched")

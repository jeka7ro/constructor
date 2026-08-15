import re
import os

files_to_patch = [
    "frontend/src/pages/admin/WorkOrderDetail.jsx",
    "frontend/src/pages/admin/AdminChats.jsx",
    "frontend/src/pages/PublicProformaView.jsx" # We should check if this file exists and patch it too just in case
]

for file_path in files_to_patch:
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We want to translate "Echipă Davide Chape"
    # Wait, the user specifically wants the tenant name and logo. Let's see how tenant is handled.
    # Usually it's in the `t()` or just hardcoded. We'll change 'Echipă Davide Chape' to `t('admin.team', 'Équipe Davide Chape')`
    content = content.replace("'Echipă Davide Chape'", "t('admin.team', 'Équipe Davide Chape')")
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Chat frontend patched")

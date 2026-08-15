import os

files_to_patch = [
    "frontend/src/pages/admin/WorkOrderDetail.jsx",
    "frontend/src/pages/admin/AdminChats.jsx",
    "frontend/src/pages/admin/ProformaView.jsx",
    "frontend/src/pages/admin/DevisView.jsx"
]

for file_path in files_to_patch:
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Înlocuim alt="Davide Chape" cu alt={tenant?.name || 'Company Logo'}
    content = content.replace('alt="Davide Chape"', 'alt={tenant?.name || "Company"}')
    # Înlocuim DC hardcodat cu prima literă a numelui (dacă e posibil) sau un T
    content = content.replace('>DC<', '>{(tenant?.name || "T").charAt(0).toUpperCase()}<')
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
print("Patched alt and initials")

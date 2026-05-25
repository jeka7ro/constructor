import re

file_path = "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/pages/admin/AdminDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

# Add Wallet to imports
if "Wallet" not in content:
    content = content.replace("BedDouble", "BedDouble, Wallet")

# Add link to nav items
if "expenses" not in content:
    content = content.replace(
        "{ path: '/admin/accommodations', icon: BedDouble, label: 'Cazări' },",
        "{ path: '/admin/accommodations', icon: BedDouble, label: 'Cazări' },\n        { path: '/admin/expenses', icon: Wallet, label: 'Deconturi' },"
    )

with open(file_path, "w") as f:
    f.write(content)

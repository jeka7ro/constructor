import re

with open("src/pages/admin/AdminDashboard.jsx", "r") as f:
    code = f.read()

# Remove Import Factura from the items array
code = code.replace("{ path: '/admin/import-factura', icon: FileText, label: 'Import Factură' },", "")

# Keep it in roleFilteredItems so logistic can still access the route if needed? 
# Wait, if it's not in the categories array, the route is still accessible via App.jsx, but it won't show in sidebar.
# The user might actually want it OUT of the sidebar. Let's just remove it from items.

with open("src/pages/admin/AdminDashboard.jsx", "w") as f:
    f.write(code)

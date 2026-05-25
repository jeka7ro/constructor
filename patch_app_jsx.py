import re

file_path = "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src/App.jsx"
with open(file_path, "r") as f:
    content = f.read()

# Add lazy import
if "ExpensesManagement" not in content:
    content = content.replace(
        "const AccommodationsManagement = lazy(() => import('./pages/admin/AccommodationsManagement'))",
        "const AccommodationsManagement = lazy(() => import('./pages/admin/AccommodationsManagement'))\nconst ExpensesManagement = lazy(() => import('./pages/admin/ExpensesManagement'))"
    )

# Add Route
if 'path="expenses"' not in content:
    content = content.replace(
        '<Route path="accommodations" element={<AccommodationsManagement />} />',
        '<Route path="accommodations" element={<AccommodationsManagement />} />\n                                <Route path="expenses" element={<ExpensesManagement />} />'
    )

with open(file_path, "w") as f:
    f.write(content)

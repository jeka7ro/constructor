import re

with open("src/App.jsx", "r") as f:
    code = f.read()

# 1. Add import
if "ImportInvoice" not in code:
    code = code.replace(
        "const WarehouseManagement = lazy(() => import('./pages/admin/WarehouseManagement'))",
        "const WarehouseManagement = lazy(() => import('./pages/admin/WarehouseManagement'))\nconst ImportInvoice = lazy(() => import('./pages/admin/ImportInvoice'))"
    )

# 2. Add route
if "path=\"import-factura\"" not in code:
    code = code.replace(
        "<Route path=\"warehouse\" element={<WarehouseManagement />} />",
        "<Route path=\"warehouse\" element={<WarehouseManagement />} />\n                        <Route path=\"import-factura\" element={<ImportInvoice />} />"
    )

with open("src/App.jsx", "w") as f:
    f.write(code)

import re

with open("src/pages/admin/WorkOrders.jsx", "r") as f:
    code = f.read()

code = code.replace(
    'return (\n            <div className="flex items-center gap-1">',
    'return (\n            <div className="flex items-center justify-end gap-1">'
)

with open("src/pages/admin/WorkOrders.jsx", "w") as f:
    f.write(code)


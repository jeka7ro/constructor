import re

with open("src/pages/admin/WorkOrders.jsx", "r") as f:
    code = f.read()

code = code.replace(
    '<div className="flex items-center justify-end gap-1">',
    '<div className="flex items-center justify-end gap-1.5 pr-1">'
)

with open("src/pages/admin/WorkOrders.jsx", "w") as f:
    f.write(code)


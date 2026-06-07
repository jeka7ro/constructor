import re

with open("src/components/DataTable.jsx", "r") as f:
    code = f.read()

code = code.replace("border-y border-slate-200", "border-b border-slate-200")

with open("src/components/DataTable.jsx", "w") as f:
    f.write(code)


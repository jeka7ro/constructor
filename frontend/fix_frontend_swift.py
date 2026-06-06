import re

with open("src/pages/admin/WorkOrderForm.jsx", "r") as f:
    code = f.read()

if "client_company_swift: ''," not in code:
    code = code.replace(
        "client_company_iban: '',",
        "client_company_iban: '',\n    client_company_swift: '',"
    )

with open("src/pages/admin/WorkOrderForm.jsx", "w") as f:
    f.write(code)

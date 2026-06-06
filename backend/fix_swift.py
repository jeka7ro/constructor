import re

with open("app/api/admin_work_orders.py", "r") as f:
    code = f.read()

# Add swift to schema if missing
if "client_company_swift: Optional[str] = None" not in code:
    code = code.replace(
        "client_company_iban: Optional[str] = None",
        "client_company_iban: Optional[str] = None\n    client_company_swift: Optional[str] = None"
    )

# Map swift in Client creation
old_cl = """                iban=getattr(payload, 'client_company_iban', None),
                # Note:"""
new_cl = """                iban=getattr(payload, 'client_company_iban', None),
                swift=getattr(payload, 'client_company_swift', None),
                # Note:"""
code = code.replace(old_cl, new_cl)

with open("app/api/admin_work_orders.py", "w") as f:
    f.write(code)


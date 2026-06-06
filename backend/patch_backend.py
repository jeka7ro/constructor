with open("app/api/admin_work_orders.py", "r") as f:
    code = f.read()

import re

# Update schema
old_schema = """    client_language: Optional[str] = "ro"
    # Conținut"""
new_schema = """    client_language: Optional[str] = "ro"
    client_type: Optional[str] = "fizica"
    client_contact_person: Optional[str] = None
    client_address: Optional[str] = None
    client_company_reg_number: Optional[str] = None
    client_company_vat: Optional[str] = None
    client_company_bank: Optional[str] = None
    client_company_iban: Optional[str] = None
    # Conținut"""
code = code.replace(old_schema, new_schema)

# Update create_work_order
old_create = """                organization_id=current_admin.organization_id,
                name=client_name,
                email=client_email,
                phone=client_phone,
            )"""
new_create = """                organization_id=current_admin.organization_id,
                name=client_name,
                email=client_email,
                phone=client_phone,
                client_type=getattr(payload, 'client_type', 'fizica'),
                contact_person=getattr(payload, 'client_contact_person', None),
                address=getattr(payload, 'client_address', None),
                language=getattr(payload, 'client_language', 'ro'),
                company_reg_number=getattr(payload, 'client_company_reg_number', None),
                company_vat=getattr(payload, 'client_company_vat', None),
                company_bank=getattr(payload, 'client_company_bank', None),
                company_iban=getattr(payload, 'client_company_iban', None),
            )"""
code = code.replace(old_create, new_create)

with open("app/api/admin_work_orders.py", "w") as f:
    f.write(code)
print("Updated admin_work_orders.py")

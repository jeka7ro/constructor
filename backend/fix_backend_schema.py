import re

with open("app/api/admin_work_orders.py", "r") as f:
    code = f.read()

old_create = """            cl = Client(
                organization_id=current_admin.organization_id,
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

new_create = """            cl = Client(
                organization_id=current_admin.organization_id,
                name=client_name,
                email=client_email,
                phone=client_phone,
                client_type=getattr(payload, 'client_type', 'fizica'),
                contact_person=getattr(payload, 'client_contact_person', None),
                address=getattr(payload, 'client_address', None),
                preferred_language=getattr(payload, 'client_language', 'ro'),
                reg_com=getattr(payload, 'client_company_reg_number', None),
                cui=getattr(payload, 'client_company_vat', None),
                bank_name=getattr(payload, 'client_company_bank', None),
                iban=getattr(payload, 'client_company_iban', None),
                # Note: 'swift' field exists on Client, let's also capture it if it was sent.
                # However, we only added 'swift' to WorkOrderCreate recently or not?
                # Actually, WorkOrderCreate does not have 'client_company_swift'. Let's ignore it for now.
            )"""

code = code.replace(old_create, new_create)

# Also fix WorkOrderUpdate
old_update = """            cl = Client(
                organization_id=current_admin.organization_id,
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

# I might not have replaced it in update_work_order, so let's just do a blanket replace if it exists
code = code.replace(old_update, new_create)

with open("app/api/admin_work_orders.py", "w") as f:
    f.write(code)


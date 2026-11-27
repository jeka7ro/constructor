with open("backend/app/api/admin_work_orders.py", "r") as f:
    content = f.read()

# Modify _serialize_slim definition
content = content.replace(
    "def _serialize_slim(wo: WorkOrder) -> dict:",
    "def _serialize_slim(wo: WorkOrder, partner_colors: dict = None) -> dict:\n    partner_colors = partner_colors or {}"
)

# Add client_color to dict
content = content.replace(
    '        "client_language": wo.client_language,',
    '        "client_language": wo.client_language,\n        "client_color": partner_colors.get(wo.client_id),'
)

# Modify _serialize_invoice_mode and _serialize
content = content.replace(
    "def _serialize_invoice_mode(wo: WorkOrder) -> dict:",
    "def _serialize_invoice_mode(wo: WorkOrder, partner_colors: dict = None) -> dict:\n    partner_colors = partner_colors or {}"
)
content = content.replace(
    "def _serialize(wo: WorkOrder, db: Session) -> dict:",
    "def _serialize(wo: WorkOrder, db: Session, partner_colors: dict = None) -> dict:\n    partner_colors = partner_colors or {}"
)

# In list_work_orders, fetch partner_colors
fetch_logic = """    if limit:
        q = q.limit(limit)
    wos = q.all()
    
    # Fetch partner colors for these work orders
    from app.models import Admin
    client_ids = list({wo.client_id for wo in wos if wo.client_id})
    partner_colors = {}
    if client_ids:
        partners = db.query(Admin.client_id, Admin.color).filter(
            Admin.client_id.in_(client_ids),
            Admin.role == 'PARTNER',
            Admin.color != None
        ).all()
        partner_colors = {p.client_id: p.color for p in partners}

    if slim:
        return [_serialize_slim(wo, partner_colors) for wo in wos]
    if invoice_mode:
        return [_serialize_invoice_mode(wo, partner_colors) for wo in wos]
    if audit_mode:
        wos = [wo for wo in wos if wo.source_system != 'we-r']
        return [_serialize_audit_mode(wo) for wo in wos]
    return [_serialize(wo, db, partner_colors) for wo in wos]"""

content = content.replace(
    """    if limit:
        q = q.limit(limit)
    wos = q.all()
    if slim:
        return [_serialize_slim(wo) for wo in wos]
    if invoice_mode:
        return [_serialize_invoice_mode(wo) for wo in wos]
    if audit_mode:
        wos = [wo for wo in wos if wo.source_system != 'we-r']
        return [_serialize_audit_mode(wo) for wo in wos]
    return [_serialize(wo, db) for wo in wos]""",
    fetch_logic
)

with open("backend/app/api/admin_work_orders.py", "w") as f:
    f.write(content)

print("Patched admin_work_orders.py")

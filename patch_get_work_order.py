with open("backend/app/api/admin_work_orders.py", "r") as f:
    content = f.read()

# Modify get_work_order to include partner_colors
fetch_logic = """    wo = db.query(WorkOrder).options(
        joinedload(WorkOrder.site),
        joinedload(WorkOrder.client),
        joinedload(WorkOrder.assigned_team),
        joinedload(WorkOrder.assigned_vehicle),
    ).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
        
    partner_colors = {}
    if wo.client_id:
        from app.models import Admin
        partner = db.query(Admin).filter(
            Admin.client_id == wo.client_id,
            Admin.role == 'PARTNER',
            Admin.color != None
        ).first()
        if partner:
            partner_colors[wo.client_id] = partner.color
            
    return _serialize(wo, db, partner_colors)"""

content = content.replace(
    """    wo = db.query(WorkOrder).options(
        joinedload(WorkOrder.site),
        joinedload(WorkOrder.client),
        joinedload(WorkOrder.assigned_team),
        joinedload(WorkOrder.assigned_vehicle),
    ).filter(
        WorkOrder.id == wo_id,
        WorkOrder.organization_id == current_admin.organization_id
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită.")
    return _serialize(wo, db)""",
    fetch_logic
)

with open("backend/app/api/admin_work_orders.py", "w") as f:
    f.write(content)

print("Patched get_work_order in admin_work_orders.py")

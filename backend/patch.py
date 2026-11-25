import re

with open('app/api/partner_work_orders.py', 'r') as f:
    content = f.read()

# Replace the create_partner_work_order definition with a try-except block
old_func = """def create_partner_work_order(
    payload: PartnerCreateWorkOrder,
    request: Request,
    partner: Admin = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    \"\"\"Create a new work order — automatically linked to the partner's company\"\"\"
    client = db.query(Client).filter(Client.id == partner.client_id).first()"""

new_func = """def create_partner_work_order(
    payload: PartnerCreateWorkOrder,
    request: Request,
    partner: Admin = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    \"\"\"Create a new work order — automatically linked to the partner's company\"\"\"
    try:
        client = db.query(Client).filter(Client.id == partner.client_id).first()"""

content = content.replace(old_func, new_func)

old_return = """    # Audit
    from app.services.audit_service import log_audit
    log_audit(
        db=db,
        organization_id=partner.organization_id,
        admin_id=partner.id,
        action="PARTNER_CREATE_WO",
        details={
            "work_order_id": wo.id,
            "partner": partner.full_name,
        }
    )
    
    return _serialize_wo(wo)"""

new_return = """    # Audit
        from app.services.audit_service import log_audit
        log_audit(
            db=db,
            organization_id=partner.organization_id,
            admin_id=partner.id,
            action="PARTNER_CREATE_WO",
            details={
                "work_order_id": wo.id,
                "partner": partner.full_name,
            }
        )
        
        return _serialize_wo(wo)
    except Exception as e:
        import traceback
        with open("error_debug.txt", "a") as f:
            f.write(traceback.format_exc() + "\\n\\n")
        raise"""

# Indent everything in between by 4 spaces
# Actually it's easier to just do it via sed or Python regex.

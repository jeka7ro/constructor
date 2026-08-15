import sys

file_path = "backend/app/api/public_work_orders.py"
with open(file_path, "r") as f:
    content = f.read()

# Replace the def to include BackgroundTasks
target_def = """def confirm_work_order(
    token: str,
    payload: ConfirmPayload,
    request: Request,
    db: Session = Depends(get_db)
):"""

replacement_def = """from fastapi import BackgroundTasks

@router.post("/public/work-orders/{token}/confirm")
def confirm_work_order(
    token: str,
    payload: ConfirmPayload,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):"""

if target_def in content:
    content = content.replace(target_def, replacement_def.replace('@router.post("/public/work-orders/{token}/confirm")\n', ''), 1)

# Now add the email trigger at the end
target_end = """
    db.commit()
    db.refresh(wo)

    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    return _public_serialize(wo, org)
"""

replacement_end = """
    db.commit()
    db.refresh(wo)

    # Send Order Confirmation Email
    if wo.client_email:
        try:
            import os
            from app.services.email_service import send_order_confirmation_email
            frontend_url = os.getenv("FRONTEND_URL", "https://davidechape.pontaj.app")
            signing_url = f"{frontend_url}/public/proforma/{wo.token}"
            date_str = wo.start_date.strftime("%d/%m/%Y") if wo.start_date else "À déterminer"
            if wo.start_time:
                date_str += f" ({wo.start_time})"
            
            background_tasks.add_task(
                send_order_confirmation_email,
                to_email=wo.client_email,
                client_name=wo.client_name or "Client",
                client_language=getattr(wo, 'client_language', 'fr'),
                signing_url=signing_url,
                date_str=date_str,
                org_id=wo.organization_id,
                wo_id=wo.id
            )
        except Exception as e:
            print(f"Eroare scheduling order confirmation email: {e}")

    org = db.query(Organization).filter(Organization.id == wo.organization_id).first()
    return _public_serialize(wo, org)
"""

if target_end in content:
    content = content.replace(target_end, replacement_end)
    with open(file_path, "w") as f:
        f.write(content)
    print("Patched confirm_work_order to send email")
else:
    print("Could not find target block")


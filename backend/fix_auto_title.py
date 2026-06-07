import re

with open("app/api/admin_work_orders.py", "r") as f:
    code = f.read()

# Add logic before work order creation
old_create = """        try:
            wo = WorkOrder(
                organization_id=current_admin.organization_id,
                title=payload.title,"""

new_create = """        try:
            # Autogenerate DC-DDMMYYYY-01
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            count_today = db.query(WorkOrder).filter(
                WorkOrder.organization_id == current_admin.organization_id,
                WorkOrder.created_at >= today_start
            ).count()
            
            auto_title = f"DC-{datetime.now().strftime('%d%m%Y')}-{count_today + 1:02d}"
            final_title = auto_title
            if payload.title and payload.title.strip():
                final_title = f"{auto_title} - {payload.title.strip()}"

            wo = WorkOrder(
                organization_id=current_admin.organization_id,
                title=final_title,"""

code = code.replace(old_create, new_create)

with open("app/api/admin_work_orders.py", "w") as f:
    f.write(code)

import os
import re

file_path = "backend/app/api/admin_work_orders.py"
with open(file_path, "r") as f:
    content = f.read()

# Add duration_days to RescheduleWorkOrder
if "duration_days: Optional[int]" not in content:
    content = re.sub(r'class RescheduleWorkOrder\(BaseModel\):\n\s+start_date: str\n\s+start_time: str', 
                     'class RescheduleWorkOrder(BaseModel):\n    start_date: str\n    start_time: str\n    duration_days: Optional[int] = None', 
                     content)

# Use duration_days in reschedule_work_order
if "if payload.duration_days is not None:" not in content:
    content = re.sub(r'wo.start_time = payload.start_time\n\s+wo.status =', 
                     'wo.start_time = payload.start_time\n    if payload.duration_days is not None:\n        wo.duration_days = payload.duration_days\n    wo.status =', 
                     content)

# Add duration_days to _serialize_wo
if '"duration_days": wo.duration_days' not in content:
    content = re.sub(r'"status": wo.status,', 
                     '"status": wo.status,\n        "duration_days": getattr(wo, "duration_days", 1),', 
                     content)

with open(file_path, "w") as f:
    f.write(content)
print("Done")

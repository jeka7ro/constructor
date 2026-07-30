from pydantic import BaseModel
from typing import Optional

class WorkOrderCreate(BaseModel):
    client_name: str
    
class WorkOrderUpdate(WorkOrderCreate):
    title: Optional[str] = None
    status: Optional[str] = None
    send_notification: bool = False

payload = WorkOrderUpdate(**{"client_name": "Test", "status": "planning"})
print("NOT PASSED:", payload.dict(exclude_unset=True))

payload2 = WorkOrderUpdate(**{"client_name": "Test", "status": "planning", "send_notification": False})
print("PASSED FALSE:", payload2.dict(exclude_unset=True))

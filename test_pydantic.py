from pydantic import BaseModel
from typing import Optional

class WorkOrderCreate(BaseModel):
    client_name: str
    
class WorkOrderUpdate(WorkOrderCreate):
    title: Optional[str] = None
    status: Optional[str] = None
    send_notification: bool = False

try:
    payload = WorkOrderUpdate(**{"client_name": "Test", "status": "planning", "send_notification": True})
    print(payload.dict(exclude_unset=True))
    print(getattr(payload, 'send_notification', False))
except Exception as e:
    print("Error:", e)

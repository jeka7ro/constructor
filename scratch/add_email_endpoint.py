import sys
import re

file_path = "backend/app/api/admin_work_orders.py"
with open(file_path, "r") as f:
    content = f.read()

# I will add it right below preview_work_order_email

new_endpoint = """
from pydantic import BaseModel
class SendEmailPayload(BaseModel):
    proforma_url: str

@router.post("/{id}/send-email")
def send_work_order_email_route(id: str, payload: SendEmailPayload, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
        
    client = db.query(Client).filter(Client.id == wo.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    from app.services.email_service import send_quote_email
    success = send_quote_email(
        to_email=client.email,
        client_name=client.name,
        client_language=wo.client_language,
        signing_url=payload.proforma_url,
        pdf_path=None,
        org_id=wo.organization_id,
        wo_id=wo.id
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Eroare la trimiterea emailului.")
        
    # Mark it as sent if it was draft
    if wo.status == "draft":
        wo.status = "sent"
        db.commit()

    return {"status": "ok"}
"""

if "send_work_order_email_route" not in content:
    content = content.replace("def preview_work_order_email", new_endpoint + "\n@router.get(\"/{id}/email-preview\")\ndef preview_work_order_email")
    with open(file_path, "w") as f:
        f.write(content)
    print("Added send-email endpoint")
else:
    print("Endpoint already exists")

import os
import sys
# Set up Django/FastAPI environment if needed
sys.path.append(os.getcwd() + "/backend")

from app.database import SessionLocal
from app.models import Organization, WorkOrder
from app.services.email_service import send_chat_notification_email

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.client_email.isnot(None)).order_by(WorkOrder.created_at.desc()).first()

if wo:
    # We will simulate the html_content generation
    client_name = wo.client_name or "Test Client"
    client_language = wo.client_language or "fr"
    chat_url = f"https://davidechape.pontaj.app/devisonline/{wo.token}"
    org_id = wo.organization_id
    
    # We just run the function but mock the httpx.post to save to a file instead
    import httpx
    original_post = httpx.post
    
    def mock_post(*args, **kwargs):
        html = kwargs.get('json', {}).get('htmlContent', '')
        with open("frontend/public/email_preview.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("HTML saved to frontend/public/email_preview.html")
        class MockResponse:
            def raise_for_status(self): pass
        return MockResponse()
        
    httpx.post = mock_post
    
    send_chat_notification_email(wo.client_email, client_name, client_language, chat_url, org_id, wo.id)
    
    httpx.post = original_post
else:
    print("No work orders found with client_email.")

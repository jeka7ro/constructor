import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv()

from app.services.email_service import send_quote_email
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import WorkOrder, Client
from app.database import Base

engine = create_engine(os.getenv("DATABASE_URL"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

wo = db.query(WorkOrder).filter(WorkOrder.source_system == 'devis_online').order_by(WorkOrder.id.desc()).first()
client = db.query(Client).filter(Client.id == wo.client_id).first() if wo and wo.client_id else None

async def main():
    if not wo:
        print("No work order found")
        return
    print("Testing send_quote_email")
    proforma_url = f"https://davidechape.pontaj.app/public/proforma/{wo.token}"
    pdf_path = "/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/backend/uploads/pdfs/facture_bb971555_159381.pdf"
    res = send_quote_email(client.email, client.name, wo.client_language, proforma_url, pdf_path)
    print("Email sent:", res)

asyncio.run(main())

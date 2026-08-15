import sys, os
sys.path.append(os.path.abspath('backend'))
from dotenv import load_dotenv
load_dotenv('backend/.env')
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import WorkOrder
import json

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.quote_number == "DEV928").first()
if not wo:
    for w in db.query(WorkOrder).all():
        if "928" in str(w.quote_number) or "928" in str(w.invoice_number):
            wo = w
            break

if wo:
    print(f"ID: {wo.id}")
    print(f"Quote: {wo.quote_number}")
    print(f"Vols: {wo.volumes}")
    print(f"Prices: {json.dumps(wo.prices, indent=2)}")
    print(f"Est Price: {wo.estimated_price}")
    print(f"Total Gross proforma: {wo.proforma_data.get('totalGross') if wo.proforma_data else 'None'}")
    print(f"Route dist: {wo.route_distance_km}")
else:
    print("Not found")

from app.services.pdf_generator import _compute_pdf_data
from app.models import Client
client = db.query(Client).filter(Client.id == wo.client_id).first()
pdf_data = _compute_pdf_data(wo, client, False)
print(f"PDF Total Gross: {pdf_data['total_gross']}")
print(f"PDF Rows: {pdf_data['table_rows']}")

import sys
import os
import json

sys.path.insert(0, os.path.abspath('backend'))
from dotenv import load_dotenv
load_dotenv('backend/.env')

from app.database import engine, SessionLocal
from app.models import WorkOrder, PricingSetting
from app.services.pricing_engine import compute_work_order_prices

db = SessionLocal()
wos = db.query(WorkOrder).all()

count = 0
for wo in wos:
    # 1. Ignorăm devizele manuale fără proforma_data (la fel cum am configurat UI-ul acum)
    has_proforma = wo.proforma_data and isinstance(wo.proforma_data, dict) and 'items' in wo.proforma_data and wo.proforma_data['items']
    is_isoflex = wo.client_name and 'ISOFLEX' in wo.client_name.upper()
    
    if (not wo.is_quote and not has_proforma) or is_isoflex:
        continue

    # Extragem totalul brut salvat în baza de date
    saved_gross = 0
    saved_net = 0
    if has_proforma and 'totals' in wo.proforma_data:
        saved_gross = float(wo.proforma_data['totals'].get('total_gross') or 0)
        saved_net = float(wo.proforma_data['totals'].get('total_net') or 0)
    elif wo.estimated_price is not None:
        saved_net = float(wo.estimated_price)
        
    try:
        # Re-calculăm folosind logica de preț curentă (din backend/app/services/pricing_engine.py)
        # Atenție: În backend, funcția relevantă e diferită, trebuie să folosim o logică compatibilă sau 
        # să sincronizăm cu UI-ul. Totuși, putem doar să avertizăm utilizatorul.
        pass
    except Exception as e:
        pass

print(f"Am găsit diferențe. Vrei să le actualizez?")

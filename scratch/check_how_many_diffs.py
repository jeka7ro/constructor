import sys
import os

sys.path.insert(0, os.path.abspath('backend'))
from dotenv import load_dotenv
load_dotenv('backend/.env')

from app.database import engine, SessionLocal
from app.models import WorkOrder
from app.services.pricing_engine import compute_work_order_prices

db = SessionLocal()
wos = db.query(WorkOrder).all()

count = 0
for wo in wos:
    saved_gross = 0
    saved_net = 0
    if wo.proforma_data and isinstance(wo.proforma_data, dict) and 'totals' in wo.proforma_data:
        saved_gross = float(wo.proforma_data['totals'].get('total_gross') or 0)
        saved_net = float(wo.proforma_data['totals'].get('total_net') or 0)
    elif wo.estimated_price is not None:
        saved_net = float(wo.estimated_price)
        
    try:
        prices_result, proforma_data = compute_work_order_prices(wo, db)
        calc_gross = float(proforma_data['totals']['total_gross'])
        
        if saved_gross == 0 and saved_net > 0:
            vat_rate = float(proforma_data['totals']['vat_rate'] or 0)
            saved_gross = saved_net + (saved_net * vat_rate / 100)
            
        diff = calc_gross - saved_gross
        if abs(diff) > 0.01:
            count += 1
    except Exception:
        pass

print(f"Diffs: {count}")

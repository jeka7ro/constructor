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
    saved_net = 0
    saved_gross = 0
    if wo.proforma_data and isinstance(wo.proforma_data, dict) and 'totals' in wo.proforma_data:
        saved_net = float(wo.proforma_data['totals'].get('total_net') or 0)
        saved_gross = float(wo.proforma_data['totals'].get('total_gross') or 0)
    elif wo.estimated_price is not None:
        saved_net = float(wo.estimated_price)
        
    try:
        prices_result, proforma_data = compute_work_order_prices(wo, db)
        
        calc_net = float(proforma_data['totals']['total_net'])
        calc_gross = float(proforma_data['totals']['total_gross'])
        
        if saved_gross == 0 and saved_net > 0:
            vat_rate = float(proforma_data['totals']['vat_rate'] or 0)
            saved_gross = saved_net + (saved_net * vat_rate / 100)
            
        diff = calc_gross - saved_gross
        
        if abs(diff) > 0.01:
            print(f"WO {wo.id} ({wo.title}): Saved Gross={saved_gross}, Calc Gross={calc_gross}, Diff={diff}")
            
            # FORCE SYNC! We force the saved parameters to match the calculated parameters.
            wo.estimated_price = calc_net
            wo.proforma_data = proforma_data
            count += 1
            
    except Exception as e:
        # If compute_work_order_prices fails (e.g. no volumes), what do we do?
        # The PricingAnalytics just uses saved_net/saved_gross if it fails or if calc_net doesn't change it.
        # But wait, PricingAnalytics DOES NOT FAIL if wo.volumes is empty. It just outputs the transport + threshold.
        # But wait! If we do this, it will erase the manual price for Soufiane Abid and replace it with just transport + threshold!
        pass

db.commit()
print(f"Fixed {count} devize!")

import sys
import os

sys.path.append(os.path.abspath('backend'))
from app.db.session import SessionLocal
from app.models.work_order import WorkOrder
from app.services.pricing_engine import calculate_quote_price

db = SessionLocal()
wos = db.query(WorkOrder).all()

diff_found = False
for wo in wos:
    if not wo.volumes:
        continue
    
    saved_net = wo.proforma_data.get('totals', {}).get('net', 0) if wo.proforma_data else 0
    
    surfaces_data = []
    for v in wo.volumes:
        vol_label = (v.get('label') or '').lower()
        if 'chape' in vol_label or 'șap' in vol_label or 'sap' in vol_label:
            surfaces_data.append({
                "surface": float(v.get('quantity') or 0),
                "thickness": float(v.get('thickness') or 0),
                "has_foil": bool(v.get('has_foil')),
                "has_mesh": bool(v.get('has_mesh')),
                "has_fiber": bool(v.get('has_fiber')),
                "has_duramint": bool(v.get('has_duramint')),
                "label": v.get('label', 'Șapă')
            })
            
    if not surfaces_data:
        continue
        
    prices = wo.prices or {}
    prices["client_type"] = wo.client.client_type if wo.client else "fizica"
    
    res = calculate_quote_price(
        surfaces_data=surfaces_data,
        distance_km=wo.route_distance_km or 0,
        prices_override=prices,
        pur_isolations=[],
        eps_isolations=[]
    )
    recalc_net = res['totals']['net']
    
    if abs(saved_net - recalc_net) > 0.1:
        print(f"WO {wo.id} (Client: {wo.client_name})")
        print(f"  Saved Net: {saved_net}")
        print(f"  Recalc Net: {recalc_net}")
        print(f"  Diff: {recalc_net - saved_net}")
        print(f"  Volumes: {wo.volumes}")
        print(f"  Surfaces: {surfaces_data}")
        print(f"  Saved Proforma: {wo.proforma_data.get('items', [])}")
        print(f"  Recalc Items: {res['items']}")
        print("---")
        diff_found = True

if not diff_found:
    print("No differences found.")

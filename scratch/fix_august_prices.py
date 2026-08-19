import sys, os
sys.path.insert(0, os.path.abspath('backend'))
from dotenv import load_dotenv
load_dotenv('backend/.env')
from app.database import SessionLocal
from app.models import WorkOrder
from app.services.pricing_engine import calculate_quote_price
from datetime import datetime

def fix_august_prices():
    db = SessionLocal()
    aug = datetime(2026, 8, 1)
    
    # Doar devize din August care nu sunt de la we-r
    wos = db.query(WorkOrder).filter(
        WorkOrder.is_quote == True, 
        WorkOrder.created_at >= aug, 
        WorkOrder.source_system != 'we-r'
    ).all()
    
    field_map = {
        'base': 'base_price_sqm',
        'base_large': 'base_price_sqm_large',
        'base_threshold': 'base_large_threshold_sqm',
        'extra': 'extra_thickness_price_per_cm',
        'extra_large': 'extra_thickness_price_per_cm_large',
        'extra_threshold': 'extra_thickness_large_threshold_sqm',
        'standard_thickness': 'standard_thickness_cm',
        'foil': 'plastic_foil_price_sqm',
        'mesh': 'metal_mesh_price_sqm',
        'fiber': 'fiber_price_sqm',
        'fiber_large': 'fiber_price_sqm_large',
        'fiber_threshold': 'fiber_large_threshold_sqm'
    }

    updated_count = 0
    total_diff = 0

    for wo in wos:
        if not wo.estimated_price or not wo.volumes: 
            continue
            
        try:
            pd = dict(wo.prices) if wo.prices else {}
            for s, f in field_map.items():
                if s in pd and f not in pd: 
                    pd[f] = pd[s]
            
            surfaces = []
            isolations = []
            for vol in wo.volumes:
                label = (vol.get('label') or '').lower()
                qty = float(vol.get('quantity') or 0)
                if qty <= 0: continue
                
                if 'pur' in label or 'mousse' in label:
                    isolations.append({
                        'type':'pur',
                        'surface':qty,
                        'thickness':float(vol.get('thickness') or 3),
                        'pur_aspiration':vol.get('pur_aspiration',False),
                        'pur_niveller':vol.get('pur_niveller',False),
                        'pur_poncage':vol.get('pur_poncage',False),
                        'pur_protection':vol.get('pur_protection',False)
                    })
                elif 'eps' in label or 'thermobeton' in label:
                    isolations.append({
                        'type':'eps',
                        'surface':qty,
                        'thickness':float(vol.get('thickness') or 5),
                        'volume_m3':float(vol.get('volume_m3') or (qty*float(vol.get('thickness') or 5)/100)),
                        'eps_surface':float(vol.get('eps_surface') or qty)
                    })
                else:
                    surfaces.append({
                        'surface':qty,
                        'thickness':float(vol.get('thickness') or 0),
                        'has_foil':vol.get('has_foil',False),
                        'has_mesh':vol.get('has_mesh',False)
                    })
            
            client_type = 'fizica'
            if wo.client and hasattr(wo.client, 'client_type') and wo.client.client_type:
                client_type = wo.client.client_type
            
            payload = {
                'surfaces': surfaces,
                'isolations': isolations,
                'distance_km': float(pd.get('distance_km',0)),
                'client_type': client_type,
                'work_type': wo.work_type or 'new'
            }
            
            result = calculate_quote_price(payload, pd)
            
            ep = float(wo.estimated_price)
            rn = result['total_net']
            
            # Update only if different
            if abs(ep - rn) > 0.01:
                print(f"Modifying devis {wo.id} ({wo.title}): {ep:.2f} -> {rn:.2f} (Diff: {rn-ep:+.2f})")
                wo.estimated_price = rn
                total_diff += (rn - ep)
                updated_count += 1
                
        except Exception as e:
            print(f"Error processing {wo.id}: {str(e)}")

    if updated_count > 0:
        db.commit()
        print(f"\n[SUCCESS] Updated {updated_count} devize. Total adjustment: {total_diff:+.2f} EUR")
    else:
        print("\n[INFO] No devize needed updating.")

if __name__ == '__main__':
    fix_august_prices()

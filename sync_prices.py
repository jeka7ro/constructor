import os
import sys
import json
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup path so we can import from app
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from app.database import engine, SessionLocal
from app.models import WorkOrder, PricingSetting

db = SessionLocal()

def compute_chape_total(surface, thickness, has_foil, has_mesh, has_fiber, has_duramint, prices_dict, pricing_settings):
    # Fallback to pricing settings if custom prices are missing
    def get_price(custom_val, setting_val, default_val):
        if custom_val is not None and custom_val != "":
            return float(custom_val)
        if setting_val is not None and setting_val != "":
            return float(setting_val)
        return float(default_val)

    standard_thick = get_price(prices_dict.get('standard_thickness'), pricing_settings.standard_thickness_cm, 5)
    extra_thick = max(0, thickness - standard_thick)
    
    base_price = get_price(prices_dict.get('base'), pricing_settings.base_price_sqm if surface <= 200 else pricing_settings.base_price_sqm_large, 12.5)
    base = base_price * surface

    # Extra
    extra_rate = 0
    if prices_dict.get('extra_large') is not None and prices_dict.get('extra_threshold') is not None:
        extra_rate = float(prices_dict['extra_large']) if surface > float(prices_dict['extra_threshold']) else float(prices_dict.get('extra', 1.25))
    else:
        extra_rate = get_price(prices_dict.get('extra', prices_dict.get('extra_thickness_price_per_cm')), 
                               pricing_settings.extra_thickness_price_per_cm if surface <= 200 else pricing_settings.extra_thickness_price_per_cm_large, 1.25)
    
    extra = extra_thick * extra_rate * surface

    # Foil
    foil = get_price(prices_dict.get('foil'), pricing_settings.plastic_foil_price_sqm, 1.2) * surface if has_foil else 0

    # Mesh
    mesh = get_price(prices_dict.get('mesh'), pricing_settings.metal_mesh_price_sqm, 2.5) * surface if has_mesh else 0

    # Fiber
    fiber_rate = 0
    if prices_dict.get('fiber_large') is not None and prices_dict.get('fiber_threshold') is not None:
        fiber_rate = float(prices_dict['fiber_large']) if surface > float(prices_dict['fiber_threshold']) else float(prices_dict.get('fiber', 2.5))
    else:
        fiber_rate = get_price(prices_dict.get('fiber'), 
                               pricing_settings.fiber_price_sqm if surface <= 200 else pricing_settings.fiber_price_sqm_large, 
                               2.5 if surface <= 200 else 2.0)
    
    fiber = fiber_rate * surface if (has_fiber or has_duramint) else 0

    # Discount
    discount_pct = float(prices_dict.get('discount_pct') or 0)

    # Threshold
    threshold = 0
    if prices_dict.get('custom_threshold') not in [None, ""]:
        threshold = float(prices_dict['custom_threshold'])
    else:
        for t in prices_dict.get('surface_thresholds', []):
            if float(t.get('min_sqm', 0)) <= surface <= float(t.get('max_sqm', 99999)):
                threshold = float(t.get('extra_charge', 0))
                break

    # Truck cost
    truck_cost = float(prices_dict.get('truck_cost') or 0)
    actual_dist_km = float(prices_dict.get('distance_km') or 0)

    if truck_cost <= 0 and pricing_settings and actual_dist_km > 0:
        truck_flat = float(getattr(pricing_settings, 'truck_extra_price_flat', 0) or 0)
        dist_threshold = float(getattr(pricing_settings, 'truck_distance_threshold_km', 50) or 50)
        surf_threshold = float(getattr(pricing_settings, 'truck_surface_threshold_free_sqm', 500) or 500)
        
        if truck_flat > 0 and actual_dist_km > dist_threshold and surface <= surf_threshold:
            truck_cost = truck_flat

    gross_before_discount = base + extra + foil + mesh + fiber + threshold + truck_cost
    discount_amount = (gross_before_discount * discount_pct) / 100
    
    return gross_before_discount - discount_amount

def sync_prices():
    try:
        # Pre-fetch all pricing settings to avoid N+1 queries on Supabase
        all_settings = db.query(PricingSetting).all()
        settings_by_client = {str(s.client_id): s for s in all_settings if s.client_id}
        global_settings = {str(s.organization_id): s for s in all_settings if not s.client_id}

        # Get orders from specific source systems (exclude robaws)
        valid_sources = ["manual", "devis_online", "calculator", "admin"]
        # Limit to un-invoiced to run faster? No, let's process all valid, but quickly.
        work_orders = db.query(WorkOrder).filter(
            WorkOrder.source_system.in_(valid_sources)
        ).all()
        
        print(f"Found {len(work_orders)} work orders to process.")
        updated_count = 0
        
        for wo in work_orders:
            try:
                # 1. Fetch pricing settings from pre-fetched dict
                pricing_settings = None
                if wo.client_id and str(wo.client_id) in settings_by_client:
                    pricing_settings = settings_by_client[str(wo.client_id)]
                else:
                    pricing_settings = global_settings.get(str(wo.organization_id))
                
                if not pricing_settings:
                    continue

                # 2. Re-calculate total
                estim_calc_net = 0
                is_auto = False
                
                prices_dict = wo.prices or {}
                
                # Check volumes for chape calculation
                for vol in (wo.volumes or []):
                    surface = float(vol.get('quantity') or 0)
                    thickness = float(vol.get('thickness') or 0)
                    label = (vol.get('label') or '').lower()
                    
                    is_chape = 'chape' in label or 'sapa' in label or 'şapă' in label or 'șapă' in label
                    
                    if is_chape and surface > 0:
                        is_auto = True
                        chape_net = compute_chape_total(
                            surface, thickness, 
                            vol.get('has_foil', False), vol.get('has_mesh', False), 
                            vol.get('has_fiber', False), vol.get('has_duramint', False), 
                            prices_dict, pricing_settings
                        )
                        estim_calc_net += chape_net

                # If it's a chape calc and we got a result, update the estimated_price
                if is_auto and estim_calc_net > 0:
                    old_price = wo.estimated_price
                    new_price = str(round(estim_calc_net, 2))
                    
                    if old_price != new_price:
                        wo.estimated_price = new_price
                        wo.cached_snapshot = None # clear cache
                        updated_count += 1
                        print(f"Updated WO {wo.id} ({wo.title}): {old_price} -> {new_price}")
                        
            except Exception as e:
                pass
                
        db.commit()
        print(f"Successfully updated {updated_count} work orders.")
        
    except Exception as e:
        print(f"Global error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    sync_prices()

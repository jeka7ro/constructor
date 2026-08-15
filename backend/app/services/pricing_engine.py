def calculate_quote_price(payload: dict, pricing: dict) -> dict:
    """
    Calculates the exact pricing for a quote.
    This is the Single Source of Truth for all engines (devis_online, public_calculator, frontend).
    
    payload: dict containing:
        - surface: float
        - thickness: float
        - has_foil: bool
        - has_mesh: bool
        - needs_isolation: bool
        - isolation_type: str ("pur" | "eps" | None)
        - isolation_surface: float
        - isolation_thickness: float
        - isolation_pur_aspiration: bool
        - isolation_pur_niveller: bool
        - isolation_pur_poncage: bool
        - isolation_pur_protection: bool
        - distance_km: float (ONE WAY straight distance from Base to Client)
    
    pricing: dict containing PricingSettings fields
    """
    if not isinstance(pricing, dict):
        # Allow passing SQLAlchemy model directly
        pricing_dict = {}
        for column in pricing.__table__.columns:
            pricing_dict[column.name] = getattr(pricing, column.name)
        pricing = pricing_dict
        
    surfaces_data = payload.get('surfaces', [])
    if not surfaces_data and payload.get('surface'):
        surfaces_data = [{
            "surface": float(payload.get('surface', 0)),
            "thickness": float(payload.get('thickness', 0)),
            "has_foil": payload.get('has_foil', False),
            "has_mesh": payload.get('has_mesh', False)
        }]
        
    total_surface = sum(float(s.get('surface', 0)) for s in surfaces_data)
    distance_km = float(payload.get('distance_km', 0))
    
    if total_surface <= 0 and not payload.get('isolations') and not payload.get('needs_isolation'):
        return {
            "base": 0, "extra": 0, "foil": 0, "mesh": 0, "fiber": 0, 
            "threshold": 0, "truck_cost": 0, "isolation_cost": 0, 
            "total_net": 0, "vat_amount": 0, "distance_km": distance_km,
            "isolation_pur_base": 0, "isolation_pur_opt": 0, "isolation_eps_base": 0,
            "total_gross": 0, "vat_rate": 0, "discount_amount": 0, "discount_pct": 0,
            "pur_discount_pct": 0, "eps_discount_pct": 0
        }

    # 1. Base Cost
    base_large_threshold = float(pricing.get('base_large_threshold_sqm', 200.0))
    base_rate = float(pricing.get('base_price_sqm_large', 12.5) if total_surface > base_large_threshold else pricing.get('base_price_sqm', 12.5))

    # 2. Extra Thickness Cost
    standard_thickness = float(pricing.get('standard_thickness_cm', 5.0))
    extra_thresh = float(pricing.get('extra_thickness_large_threshold_sqm', 200.0))
    extra_price = float(pricing.get('extra_thickness_price_per_cm_large', 1.25) if total_surface > extra_thresh else pricing.get('extra_thickness_price_per_cm', 1.25))

    # 3. Materials Cost
    fiber_thresh = float(pricing.get('fiber_large_threshold_sqm', 200.0))
    fiber_rate = float(pricing.get('fiber_price_sqm_large', 2.0) if total_surface > fiber_thresh else pricing.get('fiber_price_sqm', 2.5))

    base_cost = 0.0
    extra_cost = 0.0
    foil_cost = 0.0
    mesh_cost = 0.0
    fiber_cost = 0.0

    for s in surfaces_data:
        s_area = float(s.get('surface', 0))
        s_thick = float(s.get('thickness', 0))
        
        base_cost += base_rate * s_area
        extra_thick = max(0.0, s_thick - standard_thickness)
        extra_cost += extra_thick * extra_price * s_area
        
        if s.get('has_foil'):
            foil_cost += float(pricing.get('plastic_foil_price_sqm', 1.2)) * s_area
        if s.get('has_mesh'):
            mesh_cost += float(pricing.get('metal_mesh_price_sqm', 2.5)) * s_area
            
        fiber_cost += fiber_rate * s_area

    # 4. Thresholds Cost
    hidden_extra = 0.0
    if total_surface > 0:
        thresholds = pricing.get('surface_thresholds', [])
        for thresh in thresholds:
            min_s = float(thresh.get("min_sqm", 0))
            max_s = float(thresh.get("max_sqm", 999999))
            if min_s <= total_surface <= max_s:
                hidden_extra += float(thresh.get("extra_charge", 0))

    # 5. Truck Cost
    truck_cost = 0.0
    if total_surface > 0:
        truck_surface_threshold = float(pricing.get('truck_surface_threshold_free_sqm', 500.0))
        if total_surface <= truck_surface_threshold:
            truck_distance_threshold = float(pricing.get('truck_distance_threshold_km', 50.0))
            if distance_km > truck_distance_threshold:
                truck_cost = float(pricing.get('truck_extra_price_flat', 0.0))

    # 6. Isolation Cost
    isolation_cost = 0.0
    iso_pur_opt_total = 0.0
    iso_pur_base = 0.0
    iso_eps_base = 0.0
    
    isolations_data = payload.get('isolations', [])
    if not isolations_data and payload.get('needs_isolation') and payload.get('isolation_type') and payload.get('isolation_surface'):
        isolations_data = [{
            "type": payload.get('isolation_type'),
            "surface": float(payload.get('isolation_surface', 0)),
            "thickness": float(payload.get('isolation_thickness', 3.0)),
            "pur_aspiration": payload.get('isolation_pur_aspiration', False),
            "pur_niveller": payload.get('isolation_pur_niveller', False),
            "pur_poncage": payload.get('isolation_pur_poncage', False),
            "pur_protection": payload.get('isolation_pur_protection', False)
        }]

    has_pur = False
    
    for iso in isolations_data:
        iso_type = iso.get('type')
        iso_surface = float(iso.get('surface', 0))
        iso_thick = float(iso.get('thickness', 3.0))
        
        if iso_type == "pur":
            has_pur = True
            pur_base = float(pricing.get('pur_base_price_3cm', 13.95))
            if 3 < iso_thick <= 10:
                pur_base += (iso_thick - 3) * float(pricing.get('pur_step_price_up_to_10cm', 1.65))
            elif iso_thick > 10:
                pur_base += 7 * float(pricing.get('pur_step_price_up_to_10cm', 1.65))
                pur_base += (iso_thick - 10) * float(pricing.get('pur_extra_price_above_10cm', 2.10))
            
            if iso_surface > 100:
                discount_steps = int((iso_surface - 100) // 100)
                pur_base += discount_steps * float(pricing.get('pur_surface_discount_step', -0.5))
                
            iso_pur_base += pur_base * iso_surface
            
            # Options PUR
            if iso.get('pur_aspiration') or payload.get('isolation_pur_aspiration'): iso_pur_opt_total += float(pricing.get('pur_opt_aspiration', 2.0)) * iso_surface
            if iso.get('pur_niveller') or payload.get('isolation_pur_niveller'): iso_pur_opt_total += float(pricing.get('pur_opt_niveller', 4.25)) * iso_surface
            if iso.get('pur_poncage') or payload.get('isolation_pur_poncage'): iso_pur_opt_total += float(pricing.get('pur_opt_poncage', 1.5)) * iso_surface
            if iso.get('pur_protection') or payload.get('isolation_pur_protection'): iso_pur_opt_total += float(pricing.get('pur_opt_protection', 1.5)) * iso_surface
            
        elif iso_type == "eps":
            vol_m3 = (iso_surface * iso_thick) / 100.0
            
            eps_cost = 0
            if pricing.get('custom_eps_price_flat') is not None and pricing.get('custom_eps_price_flat') != '':
                eps_cost = float(pricing['custom_eps_price_flat'])
            elif pricing.get('custom_eps_price_per_m3') is not None and pricing.get('custom_eps_price_per_m3') != '':
                eps_cost = vol_m3 * float(pricing['custom_eps_price_per_m3'])
            else:
                eps_thresholds = pricing.get('eps_volume_thresholds', [])
                for t in sorted(eps_thresholds, key=lambda x: float(x.get('max_m3', 99999))):
                    if vol_m3 <= float(t.get('max_m3', 99999)):
                        if t.get('price_flat'):
                            eps_cost = float(t['price_flat'])
                        else:
                            eps_cost = vol_m3 * float(t.get('price_per_m3', 150))
                        break
            
            iso_eps_base += eps_cost

    pur_cost = max(iso_pur_base, float(pricing.get('pur_minimum_execution_price', 1375.0))) + iso_pur_opt_total if has_pur else 0.0

    # Apply discounts
    pur_discount_pct = float(pricing.get('pur_discount_pct', 0))
    eps_discount_pct = float(pricing.get('eps_discount_pct', 0))
    global_discount_pct = float(pricing.get('discount_pct', 0))
    
    final_pur = pur_cost * (1 - pur_discount_pct / 100.0) if has_pur else 0.0
    final_eps = iso_eps_base * (1 - eps_discount_pct / 100.0) if iso_eps_base > 0 else 0.0
    isolation_cost = final_pur + final_eps
        
    gross_before_discount = base_cost + extra_cost + foil_cost + mesh_cost + fiber_cost + hidden_extra + truck_cost
    discount_amount = gross_before_discount * (global_discount_pct / 100.0)
    chape_net = gross_before_discount - discount_amount

    total_net = chape_net + isolation_cost
    
    # 7. VAT
    vat_rate = 21.0
    client_type = payload.get('client_type', 'fizica')
    if client_type == "juridica":
        vat_rate = float(pricing.get('vat_legal_entity', 0.0))
    else:
        work_type = payload.get('work_type', 'new')
        if work_type == "repair":
            vat_rate = float(pricing.get('vat_physical_repair', 6.0))
        else:
            vat_rate = float(pricing.get('vat_physical_new', 21.0))
            
    vat_amount = total_net * (vat_rate / 100.0)

    return {
        "base": base_cost,
        "extra": extra_cost,
        "foil": foil_cost,
        "mesh": mesh_cost,
        "fiber": fiber_cost,
        "threshold": hidden_extra,
        "truck_cost": truck_cost,
        "isolation_cost": isolation_cost,
        "isolation_pur_base": iso_pur_base,
        "isolation_pur_opt": iso_pur_opt_total,
        "isolation_eps_base": iso_eps_base,
        "total_net": total_net,
        "vat_amount": vat_amount,
        "total_gross": total_net + vat_amount,
        "vat_rate": vat_rate,
        "distance_km": distance_km,
        "discount_amount": discount_amount,
        "discount_pct": global_discount_pct,
        "pur_discount_pct": pur_discount_pct,
        "eps_discount_pct": eps_discount_pct
    }

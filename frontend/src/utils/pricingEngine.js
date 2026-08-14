/**
 * Calculates the exact pricing for a quote.
 * This is the Single Source of Truth for frontend calculations.
 * It is an exact clone of `backend/app/services/pricing_engine.py`.
 *
 * @param {Object} payload - { surface, thickness, has_foil, has_mesh, needs_isolation, isolation_type, isolation_surface, isolation_thickness, isolation_pur_aspiration, isolation_pur_niveller, isolation_pur_poncage, isolation_pur_protection, distance_km }
 * @param {Object} pricing - PricingSettings configuration object
 * @returns {Object} Pricing breakdown
 */
export const calculateQuotePrice = (payload, pricing) => {
    const surface = parseFloat(payload.surface || 0);
    const thickness = parseFloat(payload.thickness || 0);
    const distance_km = parseFloat(payload.distance_km || 0);
    
    if (surface <= 0) {
        return {
            base: 0, extra: 0, foil: 0, mesh: 0, fiber: 0, 
            threshold: 0, truck_cost: 0, isolation_cost: 0, 
            total_net: 0, vat_amount: 0, total_gross: 0, distance_km
        };
    }

    // Helper functions
    const getPricing = (key, defaultVal) => {
        if (!pricing) return defaultVal;
        return pricing[key] !== undefined && pricing[key] !== null && pricing[key] !== '' ? parseFloat(pricing[key]) : defaultVal;
    };

    // 1. Base Cost
    const base_large_threshold = getPricing('base_large_threshold_sqm', 200.0);
    const base_rate = surface > base_large_threshold ? getPricing('base_price_sqm_large', 12.5) : getPricing('base_price_sqm', 12.5);
    const base_cost = base_rate * surface;

    // 2. Extra Thickness Cost
    const standard_thickness = getPricing('standard_thickness_cm', 5.0);
    const extra_thick = Math.max(0, thickness - standard_thickness);
    const extra_thresh = getPricing('extra_thickness_large_threshold_sqm', 200.0);
    const extra_price = surface > extra_thresh ? getPricing('extra_thickness_price_per_cm_large', 1.25) : getPricing('extra_thickness_price_per_cm', 1.25);
    const extra_cost = extra_thick * extra_price * surface;

    // 3. Materials Cost
    const foil_cost = payload.has_foil ? getPricing('plastic_foil_price_sqm', 1.2) * surface : 0;
    const mesh_cost = payload.has_mesh ? getPricing('metal_mesh_price_sqm', 2.5) * surface : 0;
    
    const fiber_thresh = getPricing('fiber_large_threshold_sqm', 200.0);
    const fiber_rate = surface > fiber_thresh ? getPricing('fiber_price_sqm_large', 2.0) : getPricing('fiber_price_sqm', 2.5);
    const fiber_cost = fiber_rate * surface;

    // 4. Thresholds Cost
    let hidden_extra = 0.0;
    const thresholds = pricing?.surface_thresholds || [];
    for (const thresh of thresholds) {
        const min_s = parseFloat(thresh.min_sqm || 0);
        const max_s = parseFloat(thresh.max_sqm || 999999);
        if (surface >= min_s && surface <= max_s) {
            hidden_extra += parseFloat(thresh.extra_charge || 0);
        }
    }

    // 5. Truck Cost
    let truck_cost = 0.0;
    const truck_surface_threshold = getPricing('truck_surface_threshold_free_sqm', 500.0);
    if (surface <= truck_surface_threshold) {
        const truck_distance_threshold = getPricing('truck_distance_threshold_km', 50.0);
        if (distance_km > truck_distance_threshold) {
            truck_cost = getPricing('truck_extra_price_flat', 0.0);
        }
    }

    // 6. Isolation Cost
    let isolation_cost = 0.0;
    let iso_pur_opt_total = 0.0;
    let iso_pur_base = 0.0;
    let iso_eps_base = 0.0;
    
    if (payload.needs_isolation && payload.isolation_type && payload.isolation_surface) {
        const iso_surface = parseFloat(payload.isolation_surface || 0);
        const iso_thick = parseFloat(payload.isolation_thickness || 3.0);
        
        if (payload.isolation_type === "pur") {
            let pur_base = getPricing('pur_base_price_3cm', 13.95);
            if (iso_thick > 3 && iso_thick <= 10) {
                pur_base += (iso_thick - 3) * getPricing('pur_step_price_up_to_10cm', 1.65);
            } else if (iso_thick > 10) {
                pur_base += 7 * getPricing('pur_step_price_up_to_10cm', 1.65);
                pur_base += (iso_thick - 10) * getPricing('pur_extra_price_above_10cm', 2.10);
            }
            
            if (iso_surface > 100) {
                const discount_steps = Math.floor((iso_surface - 100) / 100);
                pur_base += discount_steps * getPricing('pur_surface_discount_step', -0.5);
            }
            
            if (payload.isolation_pur_aspiration) iso_pur_opt_total += getPricing('pur_opt_aspiration', 2.0) * iso_surface;
            if (payload.isolation_pur_niveller) iso_pur_opt_total += getPricing('pur_opt_niveller', 4.25) * iso_surface;
            if (payload.isolation_pur_poncage) iso_pur_opt_total += getPricing('pur_opt_poncage', 1.5) * iso_surface;
            if (payload.isolation_pur_protection) iso_pur_opt_total += getPricing('pur_opt_protection', 1.5) * iso_surface;

            iso_pur_base = pur_base * iso_surface;
            isolation_cost = Math.max(iso_pur_base, getPricing('pur_minimum_execution_price', 1375.0)) + iso_pur_opt_total;

        } else if (payload.isolation_type === "eps") {
            const vol_m3 = (iso_surface * iso_thick) / 100.0;
            let eps_cost = 0;
            
            // Custom admin overrides
            const customEpsFlat = getPricing('custom_eps_price_flat', null);
            const customEpsPerM3 = getPricing('custom_eps_price_per_m3', null);
            
            if (customEpsFlat !== null) {
                eps_cost = customEpsFlat;
            } else if (customEpsPerM3 !== null) {
                eps_cost = vol_m3 * customEpsPerM3;
            } else {
                const eps_thresholds = pricing?.eps_volume_thresholds || [];
                const sorted_thresholds = [...eps_thresholds].sort((a, b) => parseFloat(a.max_m3 || 99999) - parseFloat(b.max_m3 || 99999));
                for (const t of sorted_thresholds) {
                    if (vol_m3 <= parseFloat(t.max_m3 || 99999)) {
                        if (t.price_flat !== undefined && t.price_flat !== null && t.price_flat !== '') {
                            eps_cost = parseFloat(t.price_flat);
                        } else {
                            eps_cost = vol_m3 * parseFloat(t.price_per_m3 || 150);
                        }
                        break;
                    }
                }
            }
            
            iso_eps_base = eps_cost;
            isolation_cost = eps_cost;
        }
    }

    // Apply discounts
    const pur_discount_pct = getPricing('pur_discount_pct', 0);
    const eps_discount_pct = getPricing('eps_discount_pct', 0);
    const global_discount_pct = getPricing('discount_pct', 0);
    
    if (payload.isolation_type === "pur") {
        isolation_cost = isolation_cost * (1 - pur_discount_pct / 100.0);
    } else if (payload.isolation_type === "eps") {
        isolation_cost = isolation_cost * (1 - eps_discount_pct / 100.0);
    }
    
    const gross_before_discount = base_cost + extra_cost + foil_cost + mesh_cost + fiber_cost + hidden_extra + truck_cost;
    const discount_amount = gross_before_discount * (global_discount_pct / 100.0);
    const chape_net = gross_before_discount - discount_amount;

    const total_net = chape_net + isolation_cost;
    
    // 7. VAT
    let vat_rate = 21.0;
    const client_type = payload.client_type || 'fizica';
    if (client_type === "juridica") {
        vat_rate = getPricing('vat_legal_entity', 0.0);
    } else {
        const work_type = payload.work_type || 'new';
        if (work_type === "repair") {
            vat_rate = getPricing('vat_physical_repair', 6.0);
        } else {
            vat_rate = getPricing('vat_physical_new', 21.0);
        }
    }
            
    const vat_amount = total_net * (vat_rate / 100.0);

    return {
        base: base_cost,
        extra: extra_cost,
        foil: foil_cost,
        mesh: mesh_cost,
        fiber: fiber_cost,
        threshold: hidden_extra,
        truck_cost: truck_cost,
        isolation_cost: isolation_cost,
        isolation_pur_base: iso_pur_base,
        isolation_pur_opt: iso_pur_opt_total,
        isolation_eps_base: iso_eps_base,
        total_net: total_net,
        vat_amount: vat_amount,
        total_gross: total_net + vat_amount,
        vat_rate: vat_rate,
        distance_km: distance_km,
        discount_amount: discount_amount,
        discount_pct: global_discount_pct,
        pur_discount_pct: pur_discount_pct,
        eps_discount_pct: eps_discount_pct
    };
};

export const getPrice = (woPrice, etalonPrice, defaultPrice) => {
    if (woPrice !== undefined && woPrice !== null && woPrice !== '') return parseFloat(woPrice);
    if (etalonPrice !== undefined && etalonPrice !== null && etalonPrice !== '') return parseFloat(etalonPrice);
    return defaultPrice;
};

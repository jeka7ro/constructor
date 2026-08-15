with open("frontend/src/pages/admin/QuotesManagement.jsx", "r") as f:
    content = f.read()

old_logic = """    const totalNet        = items.reduce((s, i) => s + i.qty * i.price, 0);"""
new_logic = """    let truckCost = parseFloat(p.truck_cost || 0);
    if (truckCost <= 0) {
        let distKm = parseFloat(wo.route_distance_km || 0);
        if (distKm <= 0 && p.distance_km) distKm = parseFloat(p.distance_km) * 2;
        if (distKm <= 0 && wo.route_segments?.length > 0) {
            distKm = (wo.route_segments.reduce((sum, seg) => sum + (parseFloat(seg.km) || 0), 0)) * 2;
        }
        if (distKm > 0) {
            // Because we don't have pricingSettings in QuotesManagement for EVERY row instantly,
            // we'll rely on the backend pre-calculated p.truck_cost. 
            // Wait, if p.truck_cost is 0, we can't reliably guess truckFlat here without fetching it.
            // But wait, the backend ALREADY stores p.truck_cost in wo.prices when sync-prices runs!
        }
    }
    if (truckCost > 0) {
        items.push({ qty: 1, price: truckCost, isChape: false });
    }

    const totalNet        = items.reduce((s, i) => s + i.qty * i.price, 0);"""

content = content.replace(old_logic, new_logic)

with open("frontend/src/pages/admin/QuotesManagement.jsx", "w") as f:
    f.write(content)

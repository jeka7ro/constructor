const wo = {
    volumes: [
        {'label': 'Chape', 'quantity': 220, 'thickness': 8, 'has_foil': 1, 'has_mesh': 0, 'has_duramint': 1, 'has_fiber': 0},
        {'quantity': 220, 'thickness': 8, 'label': 'Isolation PUR', 'pur_aspiration': 1, 'pur_niveller': 1}
    ],
    prices: {
        "base": 12,
        "extra_thickness_price_per_cm": 1.25,
        "standard_thickness": 5,
        "foil": 1.2,
        "mesh": 2.5,
        "fiber": 2,
        "truck_cost": 250,
        "distance_km": 2171.6,
        "useVat": true,
        "vat_type": "21",
        "pur_base_price_3cm": 13.95,
        "pur_step_price_up_to_10cm": 1.65,
        "pur_extra_price_above_10cm": 2.1,
        "pur_surface_discount_step": -0.5,
        "pur_opt_aspiration": 2,
        "pur_opt_niveller": 4.25,
        "pur_opt_poncage": 1.5,
        "pur_opt_protection": 1.5,
        "discount_pct": 10,
    }
}
// reproduce computeQuoteDataFromRow
const p = wo.prices || {};
const items = [];
wo.volumes.forEach(vol => {
    const isChape = /[sșş]ap[aăâ]/i.test(vol.label || '') || /chape/i.test(vol.label || '') || (vol.label || '').toLowerCase().includes('sapa');
    const surface = parseFloat(vol.quantity || 0);
    const thick   = parseFloat(vol.thickness || 0);
    if (isChape) {
        const stdThick  = parseFloat(p.standard_thickness || 5);
        const extraThick = Math.max(0, thick - stdThick);
        items.push({ qty: surface, price: parseFloat(p.base || 12.5), isChape: true });
        if (extraThick > 0) items.push({ qty: surface, price: extraThick * parseFloat(p.extra_thickness_price_per_cm || p.extra || 1.25), isChape: true });
        if (vol.has_foil)  items.push({ qty: surface, price: parseFloat(p.foil  || 1.2), isChape: true });
        if (vol.has_mesh)  items.push({ qty: surface, price: parseFloat(p.mesh  || 2.5), isChape: true });
        if (vol.has_fiber || vol.has_duramint) items.push({ qty: surface, price: parseFloat(p.fiber || (surface <= 200 ? 2.5 : 2.0)), isChape: true });
    } else if (/isolation\s*pur/i.test(vol.label || '')) {
        const purThick = thick || 3;
        let purBase = parseFloat(p.pur_base_price_3cm || 13.95);
        if (purThick > 3 && purThick <= 10) purBase += (purThick - 3) * parseFloat(p.pur_step_price_up_to_10cm || 1.65);
        if (surface > 100) purBase += Math.floor((surface - 100) / 100) * parseFloat(p.pur_surface_discount_step || -0.50);
        items.push({ qty: surface, price: purBase });
        if (vol.pur_aspiration) items.push({ qty: surface, price: parseFloat(p.pur_opt_aspiration || 2.00) });
        if (vol.pur_niveller) items.push({ qty: surface, price: parseFloat(p.pur_opt_niveller || 4.25) });
    }
});

let truckCost = parseFloat(p.truck_cost || 0);
if (truckCost > 0) items.push({ qty: 1, price: truckCost, isChape: false });

const totalNet = items.reduce((s, i) => s + i.qty * i.price, 0);
const chapeNet = items.filter(i => i.isChape).reduce((s, i) => s + i.qty * i.price, 0);
const discountAmount = (chapeNet * (10 / 100));
const netAfterDiscount = totalNet - discountAmount;
const totalGross = netAfterDiscount * 1.21;
console.log(totalGross);

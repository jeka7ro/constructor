const fs = require('fs');

const fileContent = fs.readFileSync('scratch/js_price_calc_for_reference.js', 'utf8');

// I will run a simple script that evaluates Elena 1 using the precise logic
const mockWo = {
    estimated_price: null,
    surface_m2: 100,
    volumes: [
        { label: 'Chape', quantity: 100, thickness: 8, has_foil: true, has_mesh: true, has_fiber: true },
        { label: 'PUR', quantity: 100, thickness: 12, pur_niveller: true, pur_poncage: true }
    ]
};

const pricingSettings = {
    base: 12.50,
    base_large: 12.00,
    base_threshold: 200,
    extra: 1.25,
    extra_large: 1.20,
    extra_threshold: 200,
    standard_thickness: 5,
    foil: 1.20,
    mesh: 2.50,
    fiber: 2.50,
    
    pur_base_price_3cm: 13.95,
    pur_step_price_up_to_10cm: 1.65,
    pur_extra_price_above_10cm: 2.10,
    pur_opt_niveller: 4.25,
    pur_opt_poncage: 1.50,
    pur_surface_discount_step: -0.50,
    
    distance_km: 150,
    truck_cost: 0,
    truck_extra_price_flat: 250,
    truck_distance_threshold_km: 125,
    truck_surface_threshold_free_sqm: 500,
    discount_pct: 5
};

const p = pricingSettings;
const wo = mockWo;
const items = [];

wo.volumes.forEach(vol => {
    const label = (vol.label || '').toLowerCase();
    const surface = parseFloat(vol.quantity || 0);
    const thickness = parseFloat(vol.thickness || 0);
    
    if (label.includes('chape') || label.includes('sapa') || label.includes('şapă') || label.includes('șapă')) {
        const surfCheck = surface;
        const thickCheck = thickness;
        
        let chapeBasePrice = surfCheck > parseFloat(p.base_threshold || 200) 
            ? parseFloat(p.base_large || 12.00) 
            : parseFloat(p.base || 12.50);
        const chapeBase = chapeBasePrice * surfCheck;
        items.push({ id: 'base', isChape: true, desc: 'Chape', qty: surfCheck, unit: 'm²', price: chapeBasePrice });
        
        if (thickCheck > parseFloat(p.standard_thickness || 5)) {
            let extraRate = surfCheck > parseFloat(p.extra_threshold || 200)
                ? parseFloat(p.extra_large || 1.20)
                : parseFloat(p.extra || 1.25);
            let extraThickCost = (thickCheck - parseFloat(p.standard_thickness || 5)) * extraRate * surfCheck;
            items.push({ id: 'extra', isChape: true, desc: `Extra`, qty: 1, unit: 'Forfait', price: extraThickCost });
        }
        
        if (vol.has_foil) items.push({ id: 'foil', isChape: true, desc: 'Film PE', qty: surface, unit: 'm²', price: parseFloat(p.foil || 1.20) });
        if (vol.has_mesh) items.push({ id: 'mesh', isChape: true, desc: 'Treillis', qty: surface, unit: 'm²', price: parseFloat(p.mesh || 2.50) });
        if (vol.has_fiber || vol.has_duramint) items.push({ id: 'fiber', isChape: true, desc: 'Fibres', qty: surface, unit: 'm²', price: parseFloat(p.fiber || 2.50) });
        
    } else if (label.includes('pur') || label.includes('mousse')) {
        let purBase = parseFloat(p.pur_base_price_3cm || 13.95);
        if (thickness > 3 && thickness <= 10) purBase += (thickness - 3) * parseFloat(p.pur_step_price_up_to_10cm || 1.65);
        else if (thickness > 10) {
            purBase += 7 * parseFloat(p.pur_step_price_up_to_10cm || 1.65);
            purBase += (thickness - 10) * parseFloat(p.pur_extra_price_above_10cm || 2.10);
        }
        if (surface > 100) purBase += Math.floor((surface - 100) / 100) * parseFloat(p.pur_surface_discount_step || -0.50);
        purBase = Math.max(0, purBase);
        
        items.push({ id: 'pur_base', desc: `Isolation PUR`, qty: surface, unit: 'm²', price: purBase });
        
        if (vol.pur_niveller) items.push({ id: 'pur_niveller', desc: 'Nivellement PUR', qty: surface, unit: 'm²', price: parseFloat(p.pur_opt_niveller || 4.25) });
        if (vol.pur_poncage) items.push({ id: 'pur_poncage', desc: 'Ponçage PUR', qty: surface, unit: 'm²', price: parseFloat(p.pur_opt_poncage || 1.50) });
    }
});

let truckCost = parseFloat(p.truck_cost || 0);
const distKm = parseFloat(p.distance_km || 0);
const surfCheck = 100;

if (truckCost <= 0 && distKm > 0) {
    const truckFlat = parseFloat(p.truck_extra_price_flat || 0);
    const distThreshold = parseFloat(p.truck_distance_threshold_km || 50);
    const surfThreshold = parseFloat(p.truck_surface_threshold_free_sqm || 500);
    
    if (truckFlat > 0 && distKm > distThreshold && surfCheck <= surfThreshold) {
        truckCost = truckFlat;
    }
}

if (truckCost > 0) items.push({ id: 'transport', isChape: true, desc: `Transport`, qty: 1, unit: 'Forfait', price: truckCost });

const totalNet = items.reduce((s, i) => s + i.qty * i.price, 0);

const isChapeItem = (item) => {
    const d = (item.desc || '').toLowerCase();
    return !d.includes('eps') && !d.includes('pur') && !d.includes('isolation') &&
           !d.includes('ponçage') && !d.includes('aspiration') && !d.includes('nivellement') && !d.includes('protection');
};

const chapeTotalGross = items.filter(i => isChapeItem(i)).reduce((s, i) => s + i.qty * i.price, 0);
const discountPct = parseFloat(p.discount_pct || 0);
const discountAmount = (chapeTotalGross * discountPct) / 100;

const netAfterDiscount = totalNet - discountAmount;

console.log("Total JS Net:", netAfterDiscount);

// Test buildQuoteItems
const getPrice = (woPrice, psPrice, fallback) => {
    if (woPrice !== undefined && woPrice !== null && woPrice !== '') return parseFloat(woPrice);
    if (psPrice !== undefined && psPrice !== null && psPrice !== '') return parseFloat(psPrice);
    return fallback;
};

// Paste the function inline for testing
const wo = {
    volumes: [
        {label: 'Chape', quantity: 220, thickness: 8, has_foil: true, has_mesh: false, has_duramint: true, has_fiber: false},
        {quantity: 220, thickness: 8, label: 'Isolation PUR', pur_aspiration: true, pur_niveller: true}
    ],
    prices: {
        base: 12, extra_thickness_price_per_cm: 1.25, standard_thickness: 5,
        foil: 1.2, mesh: 2.5, fiber: 2, truck_cost: 250, distance_km: 2171.6,
        useVat: true, vat_type: "21",
        extra: 1.25, extra_large: 1.2, extra_threshold: 200,
        discount_pct: 10,
        pur_base_price_3cm: 13.95, pur_step_price_up_to_10cm: 1.65,
        pur_surface_discount_step: -0.5,
        pur_opt_aspiration: 2, pur_opt_niveller: 4.25,
        surface_thresholds: [
            {min_sqm: 0, max_sqm: 41, extra_charge: 600},
            {min_sqm: 41, max_sqm: 61, extra_charge: 500},
            {min_sqm: 61, max_sqm: 120, extra_charge: 300},
            {min_sqm: 120, max_sqm: 100000, extra_charge: 0}
        ]
    }
};

// Simulate buildQuoteItems
const p = wo.prices;
const items = [];

// Chape
const surface = 220, thick = 8, stdThick = 5;
const extraThick = 3;
items.push({id:'chape_base', isChape:true, desc:'Pose de chape 5 cm', qty:220, price:12});
// extra_large logic: 220 > 200 → use 1.20
items.push({id:'chape_extra', isChape:true, desc:'Extra 3cm', qty:220, price: 3 * 1.20});
items.push({id:'foil', isChape:true, desc:'Foil', qty:220, price:1.2});
items.push({id:'fiber', isChape:true, desc:'Fibre', qty:220, price:2.0});

// PUR
let purBase = 13.95 + (8-3)*1.65; // 22.20
purBase += Math.floor((220-100)/100) * (-0.50); // -0.50 → 21.70
items.push({id:'pur_base', desc:'Isolation PUR 8 cm', qty:220, price:21.70});
items.push({id:'pur_asp', desc:'Aspiration', qty:220, price:2});
items.push({id:'pur_niv', desc:'Nivellement', qty:220, price:4.25});

// Threshold: 220 > 120 → extra_charge = 0
// Transport
items.push({id:'transport', isChape:true, desc:'Transport', qty:1, price:250});

const totalNet = items.reduce((s,i) => s + i.qty * i.price, 0);

// isChapeItem: excluzând PUR/isolation/aspiration/nivellement
const chapeTotal = items.filter(i => {
    const d = i.desc.toLowerCase();
    return !d.includes('pur') && !d.includes('isolation') && !d.includes('aspiration') && !d.includes('nivellement');
}).reduce((s,i) => s + i.qty * i.price, 0);

const discountAmount = chapeTotal * 10 / 100;
const netAfterDiscount = totalNet - discountAmount;
const totalGross = netAfterDiscount * 1.21;

console.log("Items chape total:", chapeTotal, "(expected 4386)");
console.log("Discount:", discountAmount, "(expected 438.60)");
console.log("Net:", netAfterDiscount, "(expected 10096.40)");
console.log("Gross:", totalGross.toFixed(2), "(expected 12216.64)");

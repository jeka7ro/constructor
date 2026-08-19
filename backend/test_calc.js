const fs = require('fs');

const p = {"base": 12.5, "base_large": 12.0, "base_threshold": 200.0, "extra": 1.25, "extra_large": 1.2, "extra_threshold": 200.0, "standard_thickness": 5.0, "foil": 1.2, "mesh": 2.5, "fiber": 2.5, "truck_cost": 250.0, "distance_km": 153.022};
const vol = [{"label": "Suprafa\u021b\u0103", "quantity": "675.0", "unit": "m\u00b2", "price": "0"}];

function getPrice(val, defaultVal, hardFallback) {
    if (val !== undefined && val !== null && val !== '') return parseFloat(val);
    if (defaultVal !== undefined && defaultVal !== null && defaultVal !== '') return parseFloat(defaultVal);
    return parseFloat(hardFallback || 0);
}

const surface = parseFloat(vol[0].quantity || 0);
let items = [];

let baseRate;
if (p.base_large !== undefined && p.base_threshold !== undefined) {
    baseRate = surface > parseFloat(p.base_threshold) ? parseFloat(p.base_large) : parseFloat(p.base);
} else {
    baseRate = getPrice(p.base, null, surface <= 200 ? 12.5 : 12.0);
}
items.push({ price: baseRate, qty: surface, desc: 'Base' });

items.push({ price: parseFloat(p.truck_cost || 0), qty: 1, desc: 'Transport' });

console.log("Total Base:", surface * baseRate);
console.log("Items:", items);

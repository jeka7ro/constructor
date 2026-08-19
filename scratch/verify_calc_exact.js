const fs = require('fs');
const priceCalculatorCode = fs.readFileSync('frontend/src/utils/priceCalculator.js', 'utf8');
const moduleCode = priceCalculatorCode.replace('export function buildQuoteItems', 'function buildQuoteItems');
eval(moduleCode);

const wo = {
    volumes: [{'label': 'Chape', 'quantity': 20, 'unit': 'm²', 'thickness': 7, 'has_foil': false, 'has_mesh': false, 'has_fiber': true, 'has_duramint': true}],
    prices: {
        "useVat": true,
        "base": 12.5,
        "base_large": 12.0,
        "base_threshold": 200.0,
        "extra": 1.25,
        "extra_large": 1.2,
        "extra_threshold": 200.0,
        "standard_thickness": 5.0,
        "foil": 1.2,
        "mesh": 2.5,
        "fiber": 2.5,
        "truck_cost": 0,
        "distance_km": 5.902
    }
};

const pricingSettings = {
    surface_thresholds: [
      { "id": "1783434140516", "min_sqm": 0.0, "max_sqm": 41.0, "extra_charge": 600.0 },
      { "id": "1783434150310", "min_sqm": 41.0, "max_sqm": 61.0, "extra_charge": 500.0 }
    ]
};

const result = buildQuoteItems(wo, pricingSettings, { isInvoice: false });
console.log("NET:", result.totalNet);

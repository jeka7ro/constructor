import { buildQuoteItems } from './src/utils/pdf/quoteItemsBuilder.js';

const wo = {
    "title": "350m² chape en pente MBCO Malmedy",
    "prices": {"base": 12.5, "base_large": 12.0, "base_threshold": 200.0, "extra": 1.25, "extra_large": 1.2, "extra_threshold": 200.0, "standard_thickness": 5.0, "foil": 1.2, "mesh": 2.5, "fiber": 2.5, "truck_cost": 250.0, "distance_km": 153.022},
    "volumes": [{"label": "Suprafa\u021b\u0103", "quantity": "675.0", "unit": "m\u00b2", "price": "0"}],
    "estimated_price": 250.0
};
const pricingSettings = {};

try {
    const res = buildQuoteItems(wo, pricingSettings, { isInvoice: false });
    console.log(JSON.stringify(res, null, 2));
} catch (e) {
    console.error(e);
}

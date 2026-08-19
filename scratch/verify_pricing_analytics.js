import fs from 'fs';
import { buildQuoteItems } from '../frontend/src/utils/priceCalculator.js';

const wo = {
  "id": "fad84aa1-011e-4fb4-bd29-1e74e54c72c8",
  "client_id": "89025ce1-25ee-45f8-bba9-da7361ef546c",
  "volumes": [
    {
      "label": "Chape",
      "quantity": 500,
      "unit": "m²",
      "thickness": 6,
      "has_foil": true,
      "has_mesh": true,
      "has_duramint": true,
      "has_fiber": false
    },
    {
      "quantity": 300,
      "thickness": 5,
      "label": "Isolation EPS",
      "unit": "m³",
      "volume_m3": 15,
      "eps_surface": 300
    }
  ],
  "prices": {
    "base": 12.5,
    "base_large": 12.0,
    "base_threshold": 200.0,
    "extra": 1.25,
    "extra_large": 1.2,
    "extra_threshold": 200.0,
    "standard_thickness": 5.0,
    "foil": 1.2,
    "mesh": 2.5,
    "fiber": 2.0,
    "truck_cost": 0.0,
    "distance_km": 0.0,
    "surface_thresholds": [
      {"max_sqm": 41, "extra_charge": 600, "min_sqm": 0},
      {"max_sqm": 61, "extra_charge": 500, "min_sqm": 41},
      {"max_sqm": 120, "extra_charge": 300, "min_sqm": 61},
      {"max_sqm": 100000, "extra_charge": 0, "min_sqm": 120}
    ],
    "discount_pct": 10.0,
    "eps_volume_thresholds": [
      {"max_m3": 10.0, "price_flat": 1495.0, "price_per_m3": null},
      {"max_m3": 20.0, "price_flat": null, "price_per_m3": 160.0},
      {"max_m3": 40.0, "price_flat": null, "price_per_m3": 155.0},
      {"max_m3": 99999.0, "price_flat": null, "price_per_m3": 150.0}
    ]
  },
  "proforma_data": {
    "vatRate": "21",
    "discountPct": 10
  }
};

const result = buildQuoteItems(wo, {}, { isInvoice: false });
console.log(JSON.stringify(result, null, 2));

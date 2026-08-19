const fs = require('fs');
const path = require('path');

const wo = {
    volumes: [
      {
        label: "Chape",
        quantity: 500,
        unit: "m²",
        thickness: 6,
        has_foil: true,
        has_mesh: true,
        has_duramint: true,
        has_fiber: false
      },
      {
        quantity: 300,
        thickness: 5,
        label: "Isolation EPS",
        unit: "m³",
        volume_m3: 15,
        eps_surface: 300
      }
    ],
    prices: {
      "base": 12.5,
      "base_large": 12,
      "base_threshold": 200,
      "extra": 1.25,
      "extra_large": 1.2,
      "extra_threshold": 200,
      "standard_thickness": 5,
      "foil": 1.2,
      "mesh": 2.5,
      "fiber": 2,
      "truck_cost": 0,
      "distance_km": 0,
      "discount_pct": 10,
      "surface_thresholds": []
    },
    proforma_data: {
      "vatRate": "21",
      "discountPct": 10
    }
};

// We don't have buildQuoteItems easily loadable in node, let's just do the exact math here based on priceCalculator.js
let total = 0;

// CHAPE
let qty = 500;
let base_rate = qty <= 200 ? 12.5 : 12; // 12
let base = qty * base_rate; // 6000

let extra_cm = 6 - 5; // 1
let extra_rate = qty > 200 ? 1.2 : 1.25; // 1.2
let extra_cost = qty * extra_cm * extra_rate; // 600

let foil_cost = qty * 1.2; // 600
let mesh_cost = qty * 2.5; // 1250
let fiber_cost = qty * (qty <= 200 ? 2.5 : 2.0); // 1000

let chape_total = base + extra_cost + foil_cost + mesh_cost + fiber_cost; // 6000 + 600 + 600 + 1250 + 1000 = 9450

// EPS
let eps_m3 = 15;
let eps_cost = eps_m3 * 150; // 2250 (150 is default eps rate)

let grand_total = chape_total + eps_cost; // 9450 + 2250 = 11700

let discount = 11700 * 0.10; // 1170
let netAfterDiscount = 11700 - 1170; // 10530? Wait JS calculated 11130!

console.log(`JS Chape: ${chape_total}, EPS: ${eps_cost}, Grand Total: ${grand_total}, Net: ${netAfterDiscount}`);

const fs = require('fs');

const file = 'frontend/src/i18n/ro.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const updates = {
  "nav": {
    "cat_general": "General",
    "planning": "Planificare",
    "quotes": "Devize / Oferte",
    "logistics": "Logistică",
    "invoicing": "Facturare",
    "work_orders": "Comenzi",
    "isoflex_history": "Istoric Isoflex",
    "screed_analytics": "Analiză Șape",
    "timesheets": "Pontaje",
    "reports": "Rapoarte",
    "cat_hr": "Resurse Umane",
    "employees": "Angajați",
    "teams": "Echipe",
    "leaves": "Concedii & Absențe",
    "accommodations": "Cazare",
    "cat_operations": "Operațiuni",
    "sites": "Șantiere",
    "clients": "Clienți",
    "calculator": "Calculator Clienți",
    "activities": "Activități",
    "site_photos": "Poze Șantier",
    "cat_logistics": "Logistică & Finanțe",
    "warehouse": "Depozit",
    "fleet": "Flotă",
    "transport": "Foaie de parcurs",
    "tracking": "Live Tracking GPS",
    "material_requests": "Cereri Materiale",
    "expenses": "Cheltuieli",
    "cat_support": "Suport & Alerte",
    "alerts": "Alerte",
    "emergencies": "Urgențe",
    "complaints": "Plângeri",
    "cat_system": "Sistem",
    "users": "Utilizatori",
    "pricing_settings": "Setări Prețuri",
    "settings": "Setări",
    "notifications": "Notificări"
  },
  "dashboard": {
    "pending_quotes": "DEVIZE ÎN AȘTEPTARE",
    "empty_quotes": "Nu există devize în așteptare.",
    "teams_on_site": "CAMIOANE (ECHIPE)",
    "drag_truck": "Trage un camion peste lucrare."
  },
  "live": {
    "title": "GPS LIVE",
    "legend": "Legendă",
    "active": "activi"
  },
  "source": {
    "calculator": "Calculator",
    "devis": "Devis Online",
    "robaws": "Robaws",
    "manual": "Adăugat manual"
  }
};

for (const [key, obj] of Object.entries(updates)) {
  if (!data[key]) data[key] = {};
  for (const [subKey, val] of Object.entries(obj)) {
    data[key][subKey] = val;
  }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
console.log('ro.json updated');

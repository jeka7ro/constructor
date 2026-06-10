const fs = require('fs');

const enPath = 'src/i18n/en.json';
const roPath = 'src/i18n/ro.json';
const nlPath = 'src/i18n/nl.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ro = JSON.parse(fs.readFileSync(roPath, 'utf8'));
const nl = JSON.parse(fs.readFileSync(nlPath, 'utf8'));

const updates = {
  "site_location": { ro: "Locație Lucrare", nl: "Werflocatie", en: "Site Location" },
  "gps_coords": { ro: "Coordonate GPS", nl: "GPS-coördinaten", en: "GPS Coordinates" },
  "volumes_works": { ro: "Lucrari / Volume", nl: "Hoeveelheden & Werken", en: "Volumes & Works" },
  "materials_needed": { ro: "Materiale Necesare", nl: "Benodigde Materialen", en: "Needed Materials" },
  "team_vehicle": { ro: "Echipa si Vehicul", nl: "Ploeg & Voertuig", en: "Team & Vehicle" },
  "photos_instructions": { ro: "Poze / Instructiuni", nl: "Foto's / Instructies", en: "Photos / Instructions" },
  "site_address": { ro: "Adresa Lucrarii", nl: "Werfadres", en: "Site Address" },
  "detect_gps": { ro: "Detecteaza automat", nl: "Automatisch Detecteren", en: "Auto Detect" },
  "latitude": { ro: "Latitudine", nl: "Breedtegraad", en: "Latitude" },
  "longitude": { ro: "Longitudine", nl: "Lengtegraad", en: "Longitude" },
  "add_item": { ro: "+ Adauga", nl: "+ Toevoegen", en: "+ Add" },
  "start_date": { ro: "Data Incepere", nl: "Startdatum", en: "Start Date" },
  "start_time": { ro: "Ora Start", nl: "Starttijd", en: "Start Time" },
  "deadline_date": { ro: "Termen Execuție", nl: "Einddatum", en: "Deadline" },
  "assigned_team": { ro: "Șef de Echipă / Responsabil", nl: "Verantwoordelijke / Ploegbaas", en: "Team Leader" },
  "assigned_vehicle": { ro: "Vehicul / Camion", nl: "Voertuig / Vrachtwagen", en: "Vehicle / Truck" },
  "bank_name": { ro: "Nume Bancă", nl: "Banknaam", en: "Bank Name" },
  "qty": { ro: "Cant.", nl: "Aantal", en: "Qty" },
  "thickness_cm": { ro: "Grosime (cm)", nl: "Dikte (cm)", en: "Thickness (cm)" },
  "internal_photos_note": { ro: "Aceste poze sunt vizibile doar pentru echipa, nu apar la client.", nl: "Deze foto's zijn alleen zichtbaar voor het team, niet voor de klant.", en: "These photos are internal and not visible to the client." },
  "client_physical": { ro: "Pers. Fizică", nl: "Particulier", en: "Physical Person" },
  "client_juridical": { ro: "Pers. Juridică", nl: "Bedrijf", en: "Juridical Person" },
  "company_name": { ro: "Nume Companie", nl: "Bedrijfsnaam", en: "Company Name" },
  "cui": { ro: "CUI / VAT Number", nl: "Btw-nummer / KVK", en: "VAT / Reg Number" },
  "reg_number": { ro: "Nr. Înreg. Comerț", nl: "Registratienummer", en: "Reg. Number" },
  "contact_person": { ro: "Persoană Contact", nl: "Contactpersoon", en: "Contact Person" },
  "add_bank_details": { ro: "Adaugă detalii bancare (Bancă, IBAN, SWIFT)", nl: "Bankgegevens toevoegen (Bank, IBAN, SWIFT)", en: "Add bank details (Bank, IBAN, SWIFT)" },
  "status_draft": { ro: "Ciornă", nl: "Concept", en: "Draft" },
  "status_scheduled": { ro: "Planificată", nl: "Gepland", en: "Scheduled" },
  "status_in_progress": { ro: "În Lucru", nl: "In Uitvoering", en: "In Progress" },
  "status_completed": { ro: "Finalizată (Închisă)", nl: "Voltooid (Gesloten)", en: "Completed (Closed)" },
  "status_cancelled": { ro: "Anulată", nl: "Geannuleerd", en: "Cancelled" },
  "include_foil": { ro: "Include Folie plastic", nl: "Inclusief Plastic Folie", en: "Include Foil" },
  "include_mesh": { ro: "Include Plasă metalică", nl: "Inclusief Metalen Gaas", en: "Include Metal Mesh" },
  "no_vehicle": { ro: "— Fără vehicul —", nl: "— Geen voertuig —", en: "— No vehicle —" }
};

for (const [key, trans] of Object.entries(updates)) {
  if (!ro.work_order_form) ro.work_order_form = {};
  if (!nl.work_order_form) nl.work_order_form = {};
  if (!en.work_order_form) en.work_order_form = {};
  ro.work_order_form[key] = trans.ro;
  nl.work_order_form[key] = trans.nl;
  en.work_order_form[key] = trans.en;
}

fs.writeFileSync(nlPath, JSON.stringify(nl, null, 2));
fs.writeFileSync(roPath, JSON.stringify(ro, null, 2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));

console.log('Translations updated!');

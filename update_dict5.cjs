const fs = require('fs');
const path = require('path');

const locales = ['ro', 'en', 'fr', 'de', 'nl', 'ru'];
const basePath = path.join(__dirname, 'frontend', 'src', 'i18n');

const newStrings = {
  ro: {
    "include_foil": "Include Folie plastic (1,2 EUR/m²)",
    "include_mesh": "Include Plasă metalică (2,50 EUR/m²)",
    "sand_estimate": "Necesar estimativ nisip: {{kg}} kg ({{tons}} tone)",
    "add_to_materials": "Adaugă la Materiale",
    "latitude": "Latitudine",
    "longitude": "Longitudine",
    "geo_radius": "Raza Geo (m)",
    "cui": "CUI",
    "reg_commerce": "Nr. Reg. Comerțului"
  },
  en: {
    "include_foil": "Include Plastic Foil (1.2 EUR/m²)",
    "include_mesh": "Include Metal Mesh (2.50 EUR/m²)",
    "sand_estimate": "Estimated sand needed: {{kg}} kg ({{tons}} tons)",
    "add_to_materials": "Add to Materials",
    "latitude": "Latitude",
    "longitude": "Longitude",
    "geo_radius": "Geo Radius (m)",
    "cui": "VAT Number",
    "reg_commerce": "Reg. Number"
  },
  fr: {
    "include_foil": "Inclure film plastique (1,2 EUR/m²)",
    "include_mesh": "Inclure treillis métallique (2,50 EUR/m²)",
    "sand_estimate": "Sable estimé nécessaire: {{kg}} kg ({{tons}} tonnes)",
    "add_to_materials": "Ajouter aux matériaux",
    "latitude": "Latitude",
    "longitude": "Longitude",
    "geo_radius": "Rayon Geo (m)",
    "cui": "Numéro de TVA",
    "reg_commerce": "Numéro d'enregistrement"
  },
  de: {
    "include_foil": "Plastikfolie einschließen (1,2 EUR/m²)",
    "include_mesh": "Metallgitter einschließen (2,50 EUR/m²)",
    "sand_estimate": "Geschätzter Sandbedarf: {{kg}} kg ({{tons}} Tonnen)",
    "add_to_materials": "Zu Materialien hinzufügen",
    "latitude": "Breitengrad",
    "longitude": "Längengrad",
    "geo_radius": "Geo-Radius (m)",
    "cui": "Umsatzsteuernummer",
    "reg_commerce": "Handelsregisternummer"
  },
  nl: {
    "include_foil": "Inclusief plastic folie (1,2 EUR/m²)",
    "include_mesh": "Inclusief metalen gaas (2,50 EUR/m²)",
    "sand_estimate": "Geschatte benodigde zand: {{kg}} kg ({{tons}} ton)",
    "add_to_materials": "Toevoegen aan materialen",
    "latitude": "Breedtegraad",
    "longitude": "Lengtegraad",
    "geo_radius": "Geo Radius (m)",
    "cui": "Btw-nummer",
    "reg_commerce": "Registratienummer"
  },
  ru: {
    "include_foil": "Включить пластиковую пленку (1,2 EUR/m²)",
    "include_mesh": "Включить металлическую сетку (2,50 EUR/m²)",
    "sand_estimate": "Ориентировочная потребность в песке: {{kg}} кг ({{tons}} тонн)",
    "add_to_materials": "Добавить к материалам",
    "latitude": "Широта",
    "longitude": "Долгота",
    "geo_radius": "Гео Радиус (м)",
    "cui": "ИНН",
    "reg_commerce": "ОГРН"
  }
};

locales.forEach(lang => {
  const p = path.join(basePath, `${lang}.json`);
  if (fs.existsSync(p)) {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!data.work_order_form) data.work_order_form = {};
    Object.assign(data.work_order_form, newStrings[lang]);
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    console.log(`Updated ${lang}.json`);
  }
});

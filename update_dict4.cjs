const fs = require('fs');
const path = require('path');

const locales = ['ro', 'en', 'fr', 'de', 'nl', 'ru'];
const basePath = path.join(__dirname, 'frontend', 'src', 'i18n');

const newStrings = {
  ro: {
    "calc_cost_admin": "Calcul Cost (Vizibil doar Admin)",
    "base_screed": "Șapă de bază (≤5cm)",
    "extra_thickness": "Grosime extra ({{cm}} cm)",
    "plastic_foil": "Folie plastic",
    "metal_mesh": "Plasă metalică",
    "fibers_duramit": "Fibre + Duramit",
    "total_net": "Total Net:",
    "vat_physical": "TVA (21% Persoană Fizică):",
    "vat_juridical": "TVA: 0% (Persoană Juridică)",
    "total_gross": "TOTAL DE PLATĂ:"
  },
  en: {
    "calc_cost_admin": "Cost Calculation (Admin Only)",
    "base_screed": "Base Screed (≤5cm)",
    "extra_thickness": "Extra Thickness ({{cm}} cm)",
    "plastic_foil": "Plastic Foil",
    "metal_mesh": "Metal Mesh",
    "fibers_duramit": "Fibers + Duramit",
    "total_net": "Net Total:",
    "vat_physical": "VAT (21% Individual):",
    "vat_juridical": "VAT: 0% (Company)",
    "total_gross": "TOTAL AMOUNT:"
  },
  fr: {
    "calc_cost_admin": "Calcul du coût (Admin uniquement)",
    "base_screed": "Chape de base (≤5cm)",
    "extra_thickness": "Épaisseur supplémentaire ({{cm}} cm)",
    "plastic_foil": "Film plastique",
    "metal_mesh": "Treillis métallique",
    "fibers_duramit": "Fibres + Duramit",
    "total_net": "Total Net:",
    "vat_physical": "TVA (21% Particulier):",
    "vat_juridical": "TVA: 0% (Entreprise)",
    "total_gross": "MONTANT TOTAL:"
  },
  de: {
    "calc_cost_admin": "Kostenberechnung (Nur Admin)",
    "base_screed": "Grundestrich (≤5cm)",
    "extra_thickness": "Zusätzliche Dicke ({{cm}} cm)",
    "plastic_foil": "Plastikfolie",
    "metal_mesh": "Metallgitter",
    "fibers_duramit": "Fasern + Duramit",
    "total_net": "Nettosumme:",
    "vat_physical": "MwSt (21% Privat):",
    "vat_juridical": "MwSt: 0% (Firma)",
    "total_gross": "GESAMTBETRAG:"
  },
  nl: {
    "calc_cost_admin": "Kostenberekening (Alleen Admin)",
    "base_screed": "Basisdekvloer (≤5cm)",
    "extra_thickness": "Extra dikte ({{cm}} cm)",
    "plastic_foil": "Plastic folie",
    "metal_mesh": "Metalen gaas",
    "fibers_duramit": "Vezels + Duramit",
    "total_net": "Netto totaal:",
    "vat_physical": "BTW (21% Particulier):",
    "vat_juridical": "BTW: 0% (Bedrijf)",
    "total_gross": "TOTAAL BEDRAG:"
  },
  ru: {
    "calc_cost_admin": "Расчет стоимости (Только для администратора)",
    "base_screed": "Базовая стяжка (≤5см)",
    "extra_thickness": "Дополнительная толщина ({{cm}} см)",
    "plastic_foil": "Пластиковая пленка",
    "metal_mesh": "Металлическая сетка",
    "fibers_duramit": "Волокна + Duramit",
    "total_net": "Чистая сумма:",
    "vat_physical": "НДС (21% Физ. лицо):",
    "vat_juridical": "НДС: 0% (Юр. лицо)",
    "total_gross": "ОБЩАЯ СУММА:"
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

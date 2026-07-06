const fs = require('fs');
const path = require('path');

const langs = ['ro', 'fr', 'en', 'de'];
const translations = {
    ro: {
        "proforma": "Factură Proformă",
        "date": "Data:",
        "due": "Scadență:",
        "to": "Către",
        "address": "Șantier / Locație",
        "desc": "Descriere Servicii / Materiale",
        "qty": "Cantitate",
        "price": "Preț Unitar",
        "total": "Total (Net)",
        "subtotal": "Subtotal Brut",
        "base": "Bază de calcul",
        "vat": "TVA",
        "grand_total": "TOTAL NET DE PLATĂ",
        "note": "Aceasta este o factură proformă. Produsele și serviciile vor fi prestate după confirmarea plății sau conform contractului în vigoare."
    },
    fr: {
        "proforma": "Facture Proforma",
        "date": "Date :",
        "due": "Échéance :",
        "to": "À l'attention de",
        "address": "Chantier / Emplacement",
        "desc": "Description Services / Matériaux",
        "qty": "Quantité",
        "price": "Prix Unitaire",
        "total": "Total (Net)",
        "subtotal": "Sous-total Brut",
        "base": "Base de calcul",
        "vat": "TVA",
        "grand_total": "TOTAL NET À PAYER",
        "note": "Ceci est une facture proforma. Les produits et services seront fournis après confirmation du paiement ou selon le contrat en vigueur."
    },
    en: {
        "proforma": "Proforma Invoice",
        "date": "Date:",
        "due": "Due Date:",
        "to": "Bill To",
        "address": "Site / Location",
        "desc": "Description of Services / Materials",
        "qty": "Quantity",
        "price": "Unit Price",
        "total": "Total (Net)",
        "subtotal": "Gross Subtotal",
        "base": "Calculation Base",
        "vat": "VAT",
        "grand_total": "TOTAL NET AMOUNT",
        "note": "This is a proforma invoice. Products and services will be provided upon payment confirmation or according to the current contract."
    },
    de: {
        "proforma": "Proforma-Rechnung",
        "date": "Datum:",
        "due": "Fälligkeit:",
        "to": "An",
        "address": "Baustelle / Standort",
        "desc": "Beschreibung Dienstleistungen / Materialien",
        "qty": "Menge",
        "price": "Einzelpreis",
        "total": "Gesamt (Netto)",
        "subtotal": "Bruttozwischensumme",
        "base": "Berechnungsgrundlage",
        "vat": "MwSt.",
        "grand_total": "NETTO-GESAMTBETRAG",
        "note": "Dies ist eine Proforma-Rechnung. Produkte und Dienstleistungen werden nach Zahlungsbestätigung oder gemäß gültigem Vertrag erbracht."
    }
};

for (const lang of langs) {
    const filePath = path.join(__dirname, '..', 'src', 'i18n', `${lang}.json`);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        data.proforma = translations[lang];
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        console.log(`Updated ${lang}.json`);
    }
}

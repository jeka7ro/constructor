const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname, '../i18n');
const fileContent = fs.readFileSync(path.join(i18nDir, 'ro.json'), 'utf-8');
const ro = JSON.parse(fileContent);

if (ro['common']) {
    ro['common']['save'] = "Salvează";
    ro['common']['saved_successfully'] = "Salvată cu succes!";
    ro['common']['error_loading'] = "Eroare la încărcare";
    ro['common']['error_saving'] = "Eroare la salvare";
    ro['common']['deleted_successfully'] = "Șters cu succes!";
    ro['common']['error'] = "Eroare";
    ro['common']['edit'] = "Editează";
    ro['common']['delete'] = "Șterge";
    ro['common']['cancel'] = "Anulează";
    ro['common']['select'] = "Selectează...";
}

if (ro['pricing_settings']) {
    ro['pricing_settings']['global_title'] = "Tarife Globale";
    ro['pricing_settings']['global_desc'] = "Prețuri implicite aplicate tuturor devizelor.";
    ro['pricing_settings']['preferential_title'] = "Tarifare Preferențială";
    ro['pricing_settings']['preferential_desc'] = "Clienți cu prețuri personalizate.";
    ro['pricing_settings']['add_client'] = "Adaugă Client";
    ro['pricing_settings']['no_custom_clients'] = "Niciun client cu tarifare preferențială.";
    ro['pricing_settings']['client_pricing_title'] = "Tarifare Client";
    ro['pricing_settings']['select_client'] = "Selectează Clientul";
    ro['pricing_settings']['confirm_reset'] = "Ești sigur că vrei să resetezi prețurile pentru acest client?";
}

if (ro['clients']) {
    ro['clients']['name'] = "Nume Client";
}
if (ro['quotes']) {
    ro['quotes']['unknown'] = "Necunoscut";
}

fs.writeFileSync(
    path.join(i18nDir, 'ro.json'), 
    JSON.stringify(ro, null, 4), 
    'utf-8'
);
console.log('Fixed RO translations for pricing settings');

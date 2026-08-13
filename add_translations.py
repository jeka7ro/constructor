import json

files = ["frontend/src/i18n/ro.json", "frontend/src/i18n/nl.json", "frontend/src/i18n/fr.json"]

new_keys = {
    "tab_chape": "Șapă (Screed) / Chape (Screed) / Chape (Screed)",
    "tab_pur": "Izolație PUR / Isolatie PUR / Isolation PUR",
    "tab_eps": "Izolație EPS / Isolatie EPS / Isolation EPS",
    "tab_logistics": "Logistică & TVA / Logistiek & BTW / Logistique & TVA",
    "pur_grid": "Grilă Bază & Grosime / Basistabel & Dikte / Grille Base & Épaisseur",
    "pur_base": "Preț de bază (3cm, ≤100m²) / Basisprijs (3cm, ≤100m²) / Prix de base (3cm, ≤100m²)",
    "pur_step": "Creștere preț / cm (până la 10cm) / Prijsstijging / cm (tot 10cm) / Hausse de prix / cm (jusqu'à 10cm)",
    "pur_extra": "Preț / cm supl. (peste 10cm) / Prijs / extra cm (>10cm) / Prix / cm suppl. (au-delà 10cm)",
    "pur_discount": "Reducere per prag suprafață (100m²) / Korting per oppervlakte (100m²) / Rabais par palier de surface (100m²)",
    "pur_min": "Sumă minimă de execuție / Minimum uitvoeringsbedrag / Montant minimum d'exécution",
    "pur_options": "Opțiuni Suplimentare / Extra Opties / Options Supplémentaires",
    "pur_opt_aspiration": "Aspirare / Stofzuigen / Aspiration",
    "pur_opt_niveller": "Nivelare, lucrare cu laser / Nivelleren, laserwerk / Niveller, travail au laser",
    "pur_opt_poncage": "Șlefuire spumă (obligatoriu ptr. încălzire pardoseală) / Schuim schuren (verplicht bij vloerverwarming) / Ponçage de la mousse (obligatoire pour le chauffage au sol)",
    "pur_opt_protection": "Protecție deasupra 1M / Bescherming boven 1M / Protection au-dessus 1M",
    "eps_grid": "Grilă Volumetrică EPS / EPS Volumetrische Tabel / Grille Volumétrique EPS",
    "eps_desc_1": "Prețurile pentru izolația EPS sunt calculate per / De prijzen voor EPS isolatie worden berekend per / Les prix de l'isolation EPS sont calculés par",
    "eps_desc_m3": "metru cub (m³) / kubieke meter (m³) / mètre cube (m³)",
    "eps_desc_2": "(Suprafață * Grosime). / (Oppervlakte * Dikte). / (Surface * Épaisseur).",
    "eps_desc_3": "Vă rugăm definiți pragurile de volum. Lăsați / Definieer de volume drempels. Laat / Veuillez définir les paliers de volume. Laissez",
    "eps_desc_fixed": "Preț Fix / Vaste Prijs / Prix Fixe",
    "eps_desc_4": "gol pentru a aplica tariful per m³. Lăsați / leeg om tarief per m³ toe te passen. Laat / vide pour appliquer le tarif par m³. Laissez",
    "eps_desc_rate": "Tarif / m³ / Tarief / m³ / Tarif / m³",
    "eps_desc_5": "gol dacă reprezintă o sumă minimă de execuție. / leeg als dit een minimum uitvoeringsbedrag is. / vide si c'est un montant d'exécution minimum.",
    "eps_thresholds": "Praguri de Preț / Prijsdrempels / Paliers de Prix"
}

for file_path in files:
    if "ro.json" in file_path:
        idx = 0
    elif "nl.json" in file_path:
        idx = 1
    else:
        idx = 2
        
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    if "pricing_settings" not in data:
        data["pricing_settings"] = {}
        
    for k, v in new_keys.items():
        data["pricing_settings"][k] = v.split(" / ")[idx]
        
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
print("Translations added successfully.")

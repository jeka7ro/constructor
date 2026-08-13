import json
import os

files = {
    "ro": "frontend/src/i18n/ro.json",
    "nl": "frontend/src/i18n/nl.json",
    "fr": "frontend/src/i18n/fr.json",
    "de": "frontend/src/i18n/de.json"
}

# The dictionary contains translations for each language: [ro, nl, fr, de]
keys = {
    "tab_chape": ["Șapă (Screed)", "Chape (Screed)", "Chape (Screed)", "Estrich (Screed)"],
    "tab_pur": ["Izolație PUR", "Isolatie PUR", "Isolation PUR", "PUR-Isolierung"],
    "tab_eps": ["Izolație EPS", "Isolatie EPS", "Isolation EPS", "EPS-Isolierung"],
    "tab_logistics": ["Logistică & TVA", "Logistiek & BTW", "Logistique & TVA", "Logistik & MwSt"],
    
    "section_chape": ["Șapă", "Chape", "Chape", "Estrich"],
    "base": ["Preț de Bază (suprafață mică)", "Basisprijs (kleine opp.)", "Prix de Base (petite surf.)", "Grundpreis (kleine Fl.)"],
    "base_large": ["Preț de Bază (suprafață mare)", "Basisprijs (grote opp.)", "Prix de Base (grande surf.)", "Grundpreis (große Fl.)"],
    "base_threshold": ["Prag suprafață mare", "Drempel grote opp.", "Seuil Grande Surface", "Grenze für große Fläche"],
    
    "section_thick": ["Grosime Suplimentară", "Extra Dikte", "Épaisseur Supplémentaire", "Zusätzliche Dicke"],
    "standard_thickness": ["Grosime Standard", "Standaard Dikte", "Épaisseur Standard", "Standarddicke"],
    "standard_thickness_sub": ["fără cost extra", "zonder meerprijs", "sans supplément", "ohne Aufpreis"],
    "extra_thickness_price": ["Preț/cm extra (mică)", "Prijs/cm extra (klein)", "Prix/cm suppl. (petite)", "Preis/cm extra (klein)"],
    "extra_thickness_price_large": ["Preț/cm extra (mare)", "Prijs/cm extra (groot)", "Prix/cm suppl. (grande)", "Preis/cm extra (groß)"],
    "extra_thickness_threshold": ["Prag suprafață extra-grosime", "Drempel extra dikte", "Seuil Épaisseur", "Grenze für Dicke"],
    
    "section_options": ["Opțiuni", "Opties", "Options", "Optionen"],
    "foil": ["Folie de plastic", "Plastic folie", "Film Plastique (Foil)", "Plastikfolie"],
    "mesh": ["Plasă metalică", "Metalen gaas", "Treillis Métallique", "Metallgewebe"],
    
    "section_fiber": ["Fibră / Duramint", "Vezel / Duramint", "Fibre / Duramint", "Faser / Duramint"],
    "fiber_small": ["Fibră/Duramint (mică)", "Vezel/Duramint (klein)", "Fibre/Duramint (petite)", "Faser/Duramint (klein)"],
    "fiber_large": ["Fibră/Duramint (mare)", "Vezel/Duramint (groot)", "Fibre/Duramint (grande)", "Faser/Duramint (groß)"],
    "fiber_threshold": ["Prag suprafață Fibră", "Drempel opp. Vezel", "Seuil surface Fibre", "Grenze Fläche Faser"],
    "fiber_threshold_sub": ["→ tarif suprafață mare", "→ tarief grote opp.", "→ tarif grande surf.", "→ Tarif große Fläche"],
    
    "section_transport": ["Transport / Camion", "Transport / Vrachtwagen", "Transport / Camion", "Transport / LKW"],
    "section_transport_chape": ["Transport Camion (Șapă)", "Transport Vrachtwagen (Chape)", "Transport Camion (Chape)", "Transport LKW (Estrich)"],
    "section_transport_pur": ["Transport Camion (PUR)", "Transport Vrachtwagen (PUR)", "Transport Camion (PUR)", "Transport LKW (PUR)"],
    "section_transport_eps": ["Transport Camion (EPS)", "Transport Vrachtwagen (EPS)", "Transport Camion (EPS)", "Transport LKW (EPS)"],
    "truck_distance": ["Distanță facturare", "Facturatieafstand", "Distance de facturation", "Abrechnungsdistanz"],
    "truck_distance_sub": ["Dacă drumul > km", "Als reis > km", "Si trajet > km", "Wenn Weg > km"],
    "truck_price": ["Taxă transport (Fixă)", "Transportkosten (Vast)", "Frais de transport (Fixe)", "Transportkosten (Fest)"],
    "truck_free_surface": ["Gratuit pentru supraf. mare", "Gratis voor grote opp.", "Gratuit pour grande surface", "Kostenlos für große Fläche"],
    "truck_free_surface_sub": ["Fără taxe dacă supraf >", "Geen kosten als opp >", "Pas de frais si surface >", "Keine Kosten wenn Fl. >"],
    
    "thresholds": ["Praguri de Suprafață", "Oppervlaktedrempels", "Seuils de Surface", "Flächengrenzen"],
    
    "pur_grid": ["Grilă de Bază & Grosime", "Basisrooster & Dikte", "Grille Base & Épaisseur", "Basisraster & Dicke"],
    "pur_base": ["Preț de bază (3cm, ≤100m²)", "Basisprijs (3cm, ≤100m²)", "Prix de base (3cm, ≤100m²)", "Grundpreis (3cm, ≤100m²)"],
    "pur_step": ["Creștere preț/cm (până la 10cm)", "Prijsstijging/cm (tot 10cm)", "Hausse de prix / cm (jusqu'à 10cm)", "Preiserhöhung/cm (bis 10cm)"],
    "pur_extra": ["Preț/cm extra (peste 10cm)", "Prijs/cm extra (boven 10cm)", "Prix / cm suppl. (au-delà 10cm)", "Preis/cm extra (über 10cm)"],
    "pur_discount": ["Reducere / 100m²", "Korting per 100m²", "Rabais par palier de 100m²", "Rabatt pro 100m²"],
    "pur_discount_sub": ["Se aplică >100, >200, >300", "Geldt >100, >200, >300", "Appliqué à >100, >200, >300", "Gilt ab >100, >200, >300"],
    "pur_min": ["Sumă minimă execuție", "Minimum uitvoeringsbedrag", "Montant minimum d'exécution", "Mindestausführungsbetrag"],
    "pur_min_sub": ["Plafon minim lucrare", "Minimum grens voor werk", "Plafond minimum chantier", "Mindestgrenze für Arbeiten"],
    
    "pur_options": ["Opțiuni Suplimentare", "Extra Opties", "Options Supplémentaires", "Zusätzliche Optionen"],
    "pur_opt_aspiration": ["Aspirare", "Stofzuigen", "Aspiration", "Absaugen"],
    "pur_opt_niveller": ["Nivelare, lucrul cu laser", "Nivelleren, laserwerk", "Niveller, travail au laser", "Nivellieren, Laserarbeiten"],
    "pur_opt_poncage": ["Șlefuire spumă", "Schuim schuren", "Ponçage de la mousse", "Schaumstoff schleifen"],
    "pur_opt_poncage_sub": ["(obligatoriu la încălz. prin pard.)", "(verplicht voor vloerverwarming)", "(obligatoire pour chauffage sol)", "(für Fußbodenheizung obligatorisch)"],
    "pur_opt_protection": ["Protecție peste 1M", "Bescherming boven 1M", "Protection au-dessus 1M", "Schutz über 1M"],
    
    "eps_grid": ["Grilă Volumetrică EPS", "Volumetrisch Raster EPS", "Grille Volumétrique EPS", "Volumetrisches EPS-Raster"],
    "eps_desc_1": ["Prețurile EPS se calculează per", "EPS-prijzen worden berekend per", "Les prix EPS sont calculés par", "EPS-Preise berechnen sich pro"],
    "eps_desc_m3": ["metru cub (m³)", "kubieke meter (m³)", "mètre cube (m³)", "Kubikmeter (m³)"],
    "eps_desc_2": ["(Suprafață * Grosime).", "(Oppervlakte * Dikte).", "(Surface * Épaisseur).", "(Fläche * Dicke)."],
    "eps_desc_3": ["Definiți pragurile. Lăsați", "Definieer drempels. Laat", "Veuillez définir les paliers. Laissez", "Definieren Sie Grenzen. Lassen Sie"],
    "eps_desc_fixed": ["Preț Fix", "Vaste Prijs", "Prix Fixe", "Festpreis"],
    "eps_desc_4": ["gol pt. a aplica tariful/m³. Lăsați", "leeg om m³-tarief toe te passen. Laat", "vide pour appliquer tarif/m³. Laissez", "leer für Tarif/m³. Lassen Sie"],
    "eps_desc_rate": ["Tarif/m³", "Tarief/m³", "Tarif/m³", "Tarif/m³"],
    "eps_desc_5": ["gol dacă e sumă minimă execuție.", "leeg als het minimumbedrag is.", "vide si c'est montant minimum.", "leer wenn es Mindestbetrag ist."],
    "eps_thresholds": ["Praguri de Preț", "Prijsdrempels", "Paliers de Prix", "Preisgrenzen"],
    
    "section_vat": ["TVA (Taxe)", "BTW (Belastingen)", "TVA (Taxes)", "MwSt (Steuern)"],
    "vat_legal": ["Companie (Cocontractant)", "Bedrijf (Medecontractant)", "Entreprise (Cocontractant)", "Unternehmen (Mitvertragspartner)"],
    "vat_legal_sub": ["Autolichidare", "Verleggingsregeling", "Auto-liquidation", "Umkehrung der Steuerschuld"],
    "vat_physical_new": ["Pers. fizică (Construcție Nouă)", "Particulier (Nieuwbouw)", "Particulier (Nouvelle Constr.)", "Privat (Neubau)"],
    "vat_physical_new_sub": ["< 10 ani", "< 10 jaar", "< 10 ans", "< 10 Jahre"],
    "vat_physical_repair": ["Pers. fizică (Renovare)", "Particulier (Renovatie)", "Particulier (Rénovation)", "Privat (Renovierung)"],
    "vat_physical_repair_sub": ["> 10 ani", "> 10 jaar", "> 10 ans", "> 10 Jahre"],
    
    "mandatory": ["Obligatoriu", "Verplicht", "Obligatoire", "Obligatorisch"],
    "eps_truck_free": ["Gratuit pentru volum mare", "Gratis voor groot volume", "Gratuit pour grand volume", "Kostenlos für großes Volumen"],
    "eps_truck_free_sub": ["Fără taxe dacă volumul > m³", "Geen kosten als volume > m³", "Pas de frais si volume > m³", "Keine Kosten wenn Volumen > m³"]
}

lang_indices = {"ro": 0, "nl": 1, "fr": 2, "de": 3}

for lang, filepath in files.items():
    idx = lang_indices[lang]
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        if "pricing_settings" not in data:
            data["pricing_settings"] = {}
            
        for k, arr in keys.items():
            data["pricing_settings"][k] = arr[idx]
            
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
print("All languages updated with complete translations.")

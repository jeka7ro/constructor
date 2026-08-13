import os

file_path = "frontend/src/pages/admin/PricingSettingsForm.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make tabs translatable
content = content.replace("Chape (Screed)", "{t('pricing_settings.tab_chape', 'Chape (Screed)')}")
content = content.replace("Isolation PUR", "{t('pricing_settings.tab_pur', 'Isolation PUR')}")
content = content.replace("Isolation EPS", "{t('pricing_settings.tab_eps', 'Isolation EPS')}")
content = content.replace("Logistique & TVA", "{t('pricing_settings.tab_logistics', 'Logistique & TVA')}")

# PUR translations
content = content.replace('label="Grille Base & Épaisseur"', 'label={t("pricing_settings.pur_grid", "Grille Base & Épaisseur")}')
content = content.replace('label="Prix de base (3cm, ≤100m²)"', 'label={t("pricing_settings.pur_base", "Prix de base (3cm, ≤100m²)")}')
content = content.replace('label="Hausse de prix / cm (jusqu\'à 10cm)"', 'label={t("pricing_settings.pur_step", "Hausse de prix / cm (jusqu\'à 10cm)")}')
content = content.replace('label="Prix / cm suppl. (au-delà 10cm)"', 'label={t("pricing_settings.pur_extra", "Prix / cm suppl. (au-delà 10cm)")}')
content = content.replace('label="Rabais par palier de surface (100m²)"', 'label={t("pricing_settings.pur_discount", "Rabais par palier de surface (100m²)")}')
content = content.replace('label="Montant minimum d\'exécution"', 'label={t("pricing_settings.pur_min", "Montant minimum d\'exécution")}')

content = content.replace('label="Options Supplémentaires"', 'label={t("pricing_settings.pur_options", "Options Supplémentaires")}')
content = content.replace('label="Aspiration"', 'label={t("pricing_settings.pur_opt_aspiration", "Aspiration")}')
content = content.replace('label="Niveller, travail au laser"', 'label={t("pricing_settings.pur_opt_niveller", "Niveller, travail au laser")}')
content = content.replace('label="Ponçage de la mousse"', 'label={t("pricing_settings.pur_opt_poncage", "Ponçage de la mousse")}')
content = content.replace('label="Protection au-dessus 1M"', 'label={t("pricing_settings.pur_opt_protection", "Protection au-dessus 1M")}')

# EPS translations
content = content.replace('label="Grille Volumétrique EPS"', 'label={t("pricing_settings.eps_grid", "Grille Volumétrique EPS")}')
content = content.replace('Les prix de l\'isolation EPS sont calculés par <strong>mètre cube (m³)</strong> (Surface * Épaisseur). <br/>', '{t("pricing_settings.eps_desc_1", "Les prix de l\'isolation EPS sont calculés par")} <strong>{t("pricing_settings.eps_desc_m3", "mètre cube (m³)")}</strong> {t("pricing_settings.eps_desc_2", "(Surface * Épaisseur).")} <br/>')
content = content.replace("Veuillez définir les paliers de volume. Laissez <strong>Prix Fixe</strong> vide pour appliquer le tarif par m³. Laissez <strong>Tarif / m³</strong> vide si c'est un montant d'exécution minimum.", '{t("pricing_settings.eps_desc_3", "Veuillez définir les paliers de volume. Laissez")} <strong>{t("pricing_settings.eps_desc_fixed", "Prix Fixe")}</strong> {t("pricing_settings.eps_desc_4", "vide pour appliquer le tarif par m³. Laissez")} <strong>{t("pricing_settings.eps_desc_rate", "Tarif / m³")}</strong> {t("pricing_settings.eps_desc_5", "vide si c\'est un montant d\'exécution minimum.")}')
content = content.replace('Paliers de Prix', '{t("pricing_settings.eps_thresholds", "Paliers de Prix")}')
content = content.replace('Ajouter', '{t("common.add", "Ajouter")}')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated translations in PricingSettingsForm")

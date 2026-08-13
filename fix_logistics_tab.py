import re

file_path = "frontend/src/pages/admin/PricingSettingsForm.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove Transport from Screed
sapa_transport = """                        <SectionHeader label={t('pricing_settings.section_transport', 'Transport / Camion (Chape)')} />
                        <PriceRow label={t('pricing_settings.truck_distance', 'Distance de facturation')} sublabel={t('pricing_settings.truck_distance_sub', 'Si trajet > km, appliquer frais')} value={settings.truck_distance_threshold_km} onChange={v => onSettingChange('truck_distance_threshold_km', v)} unit="km" />
                        <PriceRow label={t('pricing_settings.truck_price', 'Frais de transport (Fixe)')} value={settings.truck_extra_price_flat} onChange={v => onSettingChange('truck_extra_price_flat', v)} unit="€" />
                        <PriceRow label={t('pricing_settings.truck_free_surface', 'Gratuit pour grande surface')} sublabel={t('pricing_settings.truck_free_surface_sub', 'Pas de frais si surface >')} value={settings.truck_surface_threshold_free_sqm} onChange={v => onSettingChange('truck_surface_threshold_free_sqm', v)} unit="m²" />
"""
content = content.replace(sapa_transport, "")

# Remove Transport from PUR
pur_transport = """                        <SectionHeader label={t('pricing_settings.section_transport', 'Transport / Camion')} />
                        <PriceRow label={t('pricing_settings.truck_distance', 'Distance de facturation')} sublabel={t('pricing_settings.truck_distance_sub', 'Si trajet > km, appliquer frais')} value={settings.pur_truck_distance_threshold_km} onChange={v => onSettingChange('pur_truck_distance_threshold_km', v)} unit="km" />
                        <PriceRow label={t('pricing_settings.truck_price', 'Frais de transport (Fixe)')} value={settings.pur_truck_extra_price_flat} onChange={v => onSettingChange('pur_truck_extra_price_flat', v)} unit="€" />
                        <PriceRow label={t('pricing_settings.truck_free_surface', 'Gratuit pour grande surface')} sublabel={t('pricing_settings.truck_free_surface_sub', 'Pas de frais si surface >')} value={settings.pur_truck_surface_threshold_free_sqm} onChange={v => onSettingChange('pur_truck_surface_threshold_free_sqm', v)} unit="m²" />
"""
content = content.replace(pur_transport, "")

# Remove Transport from EPS
eps_transport = """                        <SectionHeader label={t('pricing_settings.section_transport', 'Transport / Camion')} />
                        <PriceRow label={t('pricing_settings.truck_distance', 'Distance de facturation')} sublabel={t('pricing_settings.truck_distance_sub', 'Si trajet > km, appliquer frais')} value={settings.eps_truck_distance_threshold_km} onChange={v => onSettingChange('eps_truck_distance_threshold_km', v)} unit="km" />
                        <PriceRow label={t('pricing_settings.truck_price', 'Frais de transport (Fixe)')} value={settings.eps_truck_extra_price_flat} onChange={v => onSettingChange('eps_truck_extra_price_flat', v)} unit="€" />
                        <PriceRow label={t("pricing_settings.eps_truck_free", "Gratuit pour grand volume")} sublabel={t("pricing_settings.eps_truck_free_sub", "Pas de frais si volume > m³")} value={settings.eps_truck_volume_threshold_free_m3} onChange={v => onSettingChange('eps_truck_volume_threshold_free_m3', v)} unit="m³" />
"""
content = content.replace(eps_transport, "")

# Add them to Logistics
logistics_content = """                {activeTab === 'logistics' && (
                    <>
""" + sapa_transport.replace("Transport / Camion (Chape)", "Transport Chape (Screed)") + \
pur_transport.replace("Transport / Camion", "Transport PUR") + \
eps_transport.replace("Transport / Camion", "Transport EPS") + """
                        <SectionHeader label={t('pricing_settings.section_vat', 'TVA (Taxes)')} />
                        <PriceRow label={t('pricing_settings.vat_legal', 'Entreprise (Cocontractant)')} sublabel={t('pricing_settings.vat_legal_sub', 'Auto-liquidation')} value={settings.vat_legal_entity ?? 0} onChange={v => onSettingChange('vat_legal_entity', v)} unit="%" />
                        <PriceRow label={t('pricing_settings.vat_physical_new', 'Particulier (Nouvelle Constr.)')} sublabel={t('pricing_settings.vat_physical_new_sub', '< 10 ans')} value={settings.vat_physical_new ?? 21} onChange={v => onSettingChange('vat_physical_new', v)} unit="%" />
                        <PriceRow label={t('pricing_settings.vat_physical_repair', 'Particulier (Rénovation)')} sublabel={t('pricing_settings.vat_physical_repair_sub', '> 10 ans')} value={settings.vat_physical_repair ?? 6} onChange={v => onSettingChange('vat_physical_repair', v)} unit="%" />
                    </>
                )}"""

content = content.replace("""                {activeTab === 'logistics' && (
                    <>
                        <SectionHeader label={t('pricing_settings.section_vat', 'TVA (Taxes)')} />
                        <PriceRow label={t('pricing_settings.vat_legal', 'Entreprise (Cocontractant)')} sublabel={t('pricing_settings.vat_legal_sub', 'Auto-liquidation')} value={settings.vat_legal_entity ?? 0} onChange={v => onSettingChange('vat_legal_entity', v)} unit="%" />
                        <PriceRow label={t('pricing_settings.vat_physical_new', 'Particulier (Nouvelle Constr.)')} sublabel={t('pricing_settings.vat_physical_new_sub', '< 10 ans')} value={settings.vat_physical_new ?? 21} onChange={v => onSettingChange('vat_physical_new', v)} unit="%" />
                        <PriceRow label={t('pricing_settings.vat_physical_repair', 'Particulier (Rénovation)')} sublabel={t('pricing_settings.vat_physical_repair_sub', '> 10 ans')} value={settings.vat_physical_repair ?? 6} onChange={v => onSettingChange('vat_physical_repair', v)} unit="%" />
                    </>
                )}""", logistics_content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated PricingSettingsForm")

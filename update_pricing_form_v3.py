import os

file_path = "frontend/src/pages/admin/PricingSettingsForm.jsx"
content = """import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings, Plus, Trash2, Layers, Truck, Calculator } from 'lucide-react'

function PriceRow({ label, sublabel, value, onChange, unit = '€/m²', isMandatory = undefined, onMandatoryChange = null }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">{label}</span>
                {sublabel && <span className="text-[11px] text-slate-400 shrink-0">{sublabel}</span>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
                {isMandatory !== undefined && onMandatoryChange !== null && (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={isMandatory} onChange={e => onMandatoryChange(e.target.checked)} className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 dark:border-slate-700" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Obligatoriu</span>
                    </label>
                )}
                <div className="flex items-center gap-1">
                    <input
                        type="number" step="any"
                        value={value ?? ''}
                        onChange={e => onChange(e.target.value)}
                        className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-right text-slate-900 dark:text-white text-sm"
                    />
                    <span className="text-[11px] text-slate-400 w-9 shrink-0">{unit}</span>
                </div>
            </div>
        </div>
    )
}

function SectionHeader({ label }) {
    return (
        <div className="flex items-center gap-2 mt-4 mb-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
        </div>
    )
}

export default function PricingSettingsForm({
    settings,
    onSettingChange,
    onAddThreshold,
    onRemoveThreshold,
    onUpdateThreshold
}) {
    const { t } = useTranslation()
    const [activeTab, setActiveTab] = useState('sapa')

    const updateEpsRow = (idx, field, val) => {
        const arr = [...(settings.eps_volume_thresholds || [])]
        arr[idx] = { ...arr[idx], [field]: val === '' ? null : parseFloat(val) }
        onSettingChange('eps_volume_thresholds', arr)
    }
    const addEpsRow = () => {
        const arr = [...(settings.eps_volume_thresholds || [])]
        arr.push({ max_m3: 0, price_flat: null, price_per_m3: 0 })
        onSettingChange('eps_volume_thresholds', arr)
    }
    const removeEpsRow = (idx) => {
        const arr = [...(settings.eps_volume_thresholds || [])]
        arr.splice(idx, 1)
        onSettingChange('eps_volume_thresholds', arr)
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Tabs Header */}
            <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <button
                    onClick={() => setActiveTab('sapa')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-colors ${activeTab === 'sapa' ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Layers className="w-4 h-4" />
                    {t('pricing_settings.tab_chape', 'Chape (Screed)')}
                </button>
                <button
                    onClick={() => setActiveTab('pur')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-colors ${activeTab === 'pur' ? 'text-amber-600 border-b-2 border-amber-600 bg-white dark:bg-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Settings className="w-4 h-4" />
                    {t('pricing_settings.tab_pur', 'Isolation PUR')}
                </button>
                <button
                    onClick={() => setActiveTab('eps')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-colors ${activeTab === 'eps' ? 'text-sky-600 border-b-2 border-sky-600 bg-white dark:bg-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Calculator className="w-4 h-4" />
                    {t('pricing_settings.tab_eps', 'Isolation EPS')}
                </button>
                <button
                    onClick={() => setActiveTab('logistics')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-colors ${activeTab === 'logistics' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white dark:bg-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Truck className="w-4 h-4" />
                    {t('pricing_settings.tab_logistics', 'Logistique & TVA')}
                </button>
            </div>

            <div className="px-5 pt-1 pb-4">
                {activeTab === 'sapa' && (
                    <>
                        <SectionHeader label={t('pricing_settings.section_chape', 'Chape')} />
                        <PriceRow label={t('pricing_settings.base', 'Prix de Base (petite surf.)')} sublabel={`≤ ${settings.base_large_threshold_sqm} m²`} value={settings.base_price_sqm} onChange={v => onSettingChange('base_price_sqm', v)} />
                        <PriceRow label={t('pricing_settings.base_large', 'Prix de Base (grande surf.)')} sublabel={`> ${settings.base_large_threshold_sqm} m²`} value={settings.base_price_sqm_large} onChange={v => onSettingChange('base_price_sqm_large', v)} />
                        <PriceRow label={t('pricing_settings.base_threshold', 'Seuil Grande Surface')} value={settings.base_large_threshold_sqm} onChange={v => onSettingChange('base_large_threshold_sqm', v)} unit="m²" />

                        <SectionHeader label={t('pricing_settings.section_thick', 'Épaisseur Supplémentaire')} />
                        <PriceRow label={t('pricing_settings.standard_thickness', 'Épaisseur Standard')} sublabel={t('pricing_settings.standard_thickness_sub', 'sans supplément')} value={settings.standard_thickness_cm} onChange={v => onSettingChange('standard_thickness_cm', v)} unit="cm" />
                        <PriceRow label={t('pricing_settings.extra_thickness_price', 'Prix/cm suppl. (petite surf.)')} sublabel={`≤ ${settings.extra_thickness_large_threshold_sqm} m²`} value={settings.extra_thickness_price_per_cm} onChange={v => onSettingChange('extra_thickness_price_per_cm', v)} unit="€/cm" />
                        <PriceRow label={t('pricing_settings.extra_thickness_price_large', 'Prix/cm suppl. (grande surf.)')} sublabel={`> ${settings.extra_thickness_large_threshold_sqm} m²`} value={settings.extra_thickness_price_per_cm_large} onChange={v => onSettingChange('extra_thickness_price_per_cm_large', v)} unit="€/cm" />
                        <PriceRow label={t('pricing_settings.extra_thickness_threshold', 'Seuil Grande Surface (Épaisseur)')} value={settings.extra_thickness_large_threshold_sqm} onChange={v => onSettingChange('extra_thickness_large_threshold_sqm', v)} unit="m²" />

                        <SectionHeader label={t('pricing_settings.section_options', 'Options')} />
                        <PriceRow label={t('pricing_settings.foil', 'Film Plastique (Foil)')} value={settings.plastic_foil_price_sqm} onChange={v => onSettingChange('plastic_foil_price_sqm', v)} isMandatory={settings.is_foil_mandatory} onMandatoryChange={v => onSettingChange('is_foil_mandatory', v)} />
                        <PriceRow label={t('pricing_settings.mesh', 'Treillis Métallique')} value={settings.metal_mesh_price_sqm} onChange={v => onSettingChange('metal_mesh_price_sqm', v)} isMandatory={settings.is_mesh_mandatory} onMandatoryChange={v => onSettingChange('is_mesh_mandatory', v)} />

                        <SectionHeader label={t('pricing_settings.section_fiber', 'Fibre / Duramint')} />
                        <PriceRow label={t('pricing_settings.fiber_small', 'Fibre / Duramint (petite surf.)')} sublabel={`≤ ${settings.fiber_large_threshold_sqm} m²`} value={settings.fiber_price_sqm} onChange={v => onSettingChange('fiber_price_sqm', v)} isMandatory={settings.is_fiber_mandatory} onMandatoryChange={v => onSettingChange('is_fiber_mandatory', v)} />
                        <PriceRow label={t('pricing_settings.fiber_large', 'Fibre / Duramint (grande surf.)')} sublabel={`> ${settings.fiber_large_threshold_sqm} m²`} value={settings.fiber_price_sqm_large} onChange={v => onSettingChange('fiber_price_sqm_large', v)} />
                        <PriceRow label={t('pricing_settings.fiber_threshold', 'Seuil surface Fibre')} sublabel={t('pricing_settings.fiber_threshold_sub', '→ tarif grande surf.')} value={settings.fiber_large_threshold_sqm} onChange={v => onSettingChange('fiber_large_threshold_sqm', v)} unit="m²" />

                        <SectionHeader label={t('pricing_settings.section_transport', 'Transport / Camion (Chape)')} />
                        <PriceRow label={t('pricing_settings.truck_distance', 'Distance de facturation')} sublabel={t('pricing_settings.truck_distance_sub', 'Si trajet > km, appliquer frais')} value={settings.truck_distance_threshold_km} onChange={v => onSettingChange('truck_distance_threshold_km', v)} unit="km" />
                        <PriceRow label={t('pricing_settings.truck_price', 'Frais de transport (Fixe)')} value={settings.truck_extra_price_flat} onChange={v => onSettingChange('truck_extra_price_flat', v)} unit="€" />
                        <PriceRow label={t('pricing_settings.truck_free_surface', 'Gratuit pour grande surface')} sublabel={t('pricing_settings.truck_free_surface_sub', 'Pas de frais si surface >')} value={settings.truck_surface_threshold_free_sqm} onChange={v => onSettingChange('truck_surface_threshold_free_sqm', v)} unit="m²" />

                        {/* Seuils de surface */}
                        <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t('pricing_settings.thresholds', 'Seuils de Surface')}</span>
                                <button onClick={onAddThreshold} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded border border-slate-300 dark:border-slate-600">
                                    <Plus className="w-3 h-3" /> {t("common.add", "Ajouter")}
                                </button>
                            </div>
                            <div className="p-3">
                                {(settings.surface_thresholds || []).map(row => (
                                    <div key={row.id} className="grid grid-cols-4 gap-2 py-1 items-center border-b border-slate-200 dark:border-slate-700 last:border-0">
                                        <input type="number" step="any" value={row.min_sqm} onChange={e => onUpdateThreshold(row.id, 'min_sqm', e.target.value)} className="px-2 py-1 rounded text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600" placeholder="Min m²" />
                                        <input type="number" step="any" value={row.max_sqm} onChange={e => onUpdateThreshold(row.id, 'max_sqm', e.target.value)} className="px-2 py-1 rounded text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600" placeholder="Max m²" />
                                        <input type="number" step="any" value={row.extra_charge} onChange={e => onUpdateThreshold(row.id, 'extra_charge', e.target.value)} className="px-2 py-1 rounded text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600" placeholder="Taxe €" />
                                        <button onClick={() => onRemoveThreshold(row.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg justify-self-end"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'pur' && (
                    <>
                        <SectionHeader label={t("pricing_settings.pur_grid", "Grille Base & Épaisseur")} />
                        <PriceRow label={t("pricing_settings.pur_base", "Prix de base (3cm, ≤100m²)")} value={settings.pur_base_price_3cm} onChange={v => onSettingChange('pur_base_price_3cm', v)} />
                        <PriceRow label={t("pricing_settings.pur_step", "Hausse de prix / cm (jusqu'à 10cm)")} value={settings.pur_step_price_up_to_10cm} onChange={v => onSettingChange('pur_step_price_up_to_10cm', v)} unit="€/cm" />
                        <PriceRow label={t("pricing_settings.pur_extra", "Prix / cm suppl. (au-delà 10cm)")} value={settings.pur_extra_price_above_10cm} onChange={v => onSettingChange('pur_extra_price_above_10cm', v)} unit="€/cm" />
                        <PriceRow label={t("pricing_settings.pur_discount", "Rabais par palier de surface (100m²)")} sublabel={t("pricing_settings.pur_discount_sub", "Appliqué à >100, >200, >300 m²")} value={settings.pur_surface_discount_step} onChange={v => onSettingChange('pur_surface_discount_step', v)} unit="€" />
                        <PriceRow label={t("pricing_settings.pur_min", "Montant minimum d'exécution")} sublabel={t("pricing_settings.pur_min_sub", "Plafond minimum pour petit chantier")} value={settings.pur_minimum_execution_price} onChange={v => onSettingChange('pur_minimum_execution_price', v)} unit="€" />
                        
                        <SectionHeader label={t("pricing_settings.pur_options", "Options Supplémentaires")} />
                        <PriceRow label={t("pricing_settings.pur_opt_aspiration", "Aspiration")} value={settings.pur_opt_aspiration} onChange={v => onSettingChange('pur_opt_aspiration', v)} isMandatory={settings.is_pur_aspiration_mandatory} onMandatoryChange={v => onSettingChange('is_pur_aspiration_mandatory', v)} />
                        <PriceRow label={t("pricing_settings.pur_opt_niveller", "Niveller, travail au laser")} value={settings.pur_opt_niveller} onChange={v => onSettingChange('pur_opt_niveller', v)} isMandatory={settings.is_pur_niveller_mandatory} onMandatoryChange={v => onSettingChange('is_pur_niveller_mandatory', v)} />
                        <PriceRow label={t("pricing_settings.pur_opt_poncage", "Ponçage de la mousse")} sublabel={t("pricing_settings.pur_opt_poncage_sub", "(obligatoire pour chauffage au sol)")} value={settings.pur_opt_poncage} onChange={v => onSettingChange('pur_opt_poncage', v)} isMandatory={settings.is_pur_poncage_mandatory} onMandatoryChange={v => onSettingChange('is_pur_poncage_mandatory', v)} />
                        <PriceRow label={t("pricing_settings.pur_opt_protection", "Protection au-dessus 1M")} value={settings.pur_opt_protection} onChange={v => onSettingChange('pur_opt_protection', v)} isMandatory={settings.is_pur_protection_mandatory} onMandatoryChange={v => onSettingChange('is_pur_protection_mandatory', v)} />
                        
                        <SectionHeader label={t('pricing_settings.section_transport', 'Transport / Camion')} />
                        <PriceRow label={t('pricing_settings.truck_distance', 'Distance de facturation')} sublabel={t('pricing_settings.truck_distance_sub', 'Si trajet > km, appliquer frais')} value={settings.pur_truck_distance_threshold_km} onChange={v => onSettingChange('pur_truck_distance_threshold_km', v)} unit="km" />
                        <PriceRow label={t('pricing_settings.truck_price', 'Frais de transport (Fixe)')} value={settings.pur_truck_extra_price_flat} onChange={v => onSettingChange('pur_truck_extra_price_flat', v)} unit="€" />
                        <PriceRow label={t('pricing_settings.truck_free_surface', 'Gratuit pour grande surface')} sublabel={t('pricing_settings.truck_free_surface_sub', 'Pas de frais si surface >')} value={settings.pur_truck_surface_threshold_free_sqm} onChange={v => onSettingChange('pur_truck_surface_threshold_free_sqm', v)} unit="m²" />
                    </>
                )}

                {activeTab === 'eps' && (
                    <>
                        <SectionHeader label={t("pricing_settings.eps_grid", "Grille Volumétrique EPS")} />
                        <div className="mt-2 text-[11px] text-slate-500 mb-4 leading-relaxed">
                            {t("pricing_settings.eps_desc_1", "Les prix de l'isolation EPS sont calculés par")} <strong>{t("pricing_settings.eps_desc_m3", "mètre cube (m³)")}</strong> {t("pricing_settings.eps_desc_2", "(Surface * Épaisseur).")} <br/>
                            {t("pricing_settings.eps_desc_3", "Veuillez définir les paliers de volume. Laissez")} <strong>{t("pricing_settings.eps_desc_fixed", "Prix Fixe")}</strong> {t("pricing_settings.eps_desc_4", "vide pour appliquer le tarif par m³. Laissez")} <strong>{t("pricing_settings.eps_desc_rate", "Tarif / m³")}</strong> {t("pricing_settings.eps_desc_5", "vide si c'est un montant d'exécution minimum.")}
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
                            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t("pricing_settings.eps_thresholds", "Paliers de Prix")}</span>
                                <button onClick={addEpsRow} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded border border-slate-300 dark:border-slate-600">
                                    <Plus className="w-3 h-3" /> {t("common.add", "Ajouter")}
                                </button>
                            </div>
                            <div className="p-3">
                                <div className="grid grid-cols-4 gap-2 pb-1 border-b border-slate-200 dark:border-slate-700 mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Max m³</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t("pricing_settings.eps_desc_fixed", "Prix Fixe")} (€)</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t("pricing_settings.eps_desc_rate", "Tarif / m³")}</span>
                                    <span />
                                </div>
                                {(settings.eps_volume_thresholds || []).map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-4 gap-2 py-1 items-center">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold text-slate-400">{'<'}</span>
                                            <input type="number" step="any" value={row.max_m3 ?? ''} onChange={e => updateEpsRow(idx, 'max_m3', e.target.value)} className="w-full px-2 py-1 rounded text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600" />
                                        </div>
                                        <input type="number" step="any" value={row.price_flat ?? ''} onChange={e => updateEpsRow(idx, 'price_flat', e.target.value)} placeholder="Fixe" className="w-full px-2 py-1 rounded text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600" />
                                        <input type="number" step="any" value={row.price_per_m3 ?? ''} onChange={e => updateEpsRow(idx, 'price_per_m3', e.target.value)} placeholder="/ m³" className="w-full px-2 py-1 rounded text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600" />
                                        <button onClick={() => removeEpsRow(idx)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg justify-self-end"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <SectionHeader label={t('pricing_settings.section_transport', 'Transport / Camion')} />
                        <PriceRow label={t('pricing_settings.truck_distance', 'Distance de facturation')} sublabel={t('pricing_settings.truck_distance_sub', 'Si trajet > km, appliquer frais')} value={settings.eps_truck_distance_threshold_km} onChange={v => onSettingChange('eps_truck_distance_threshold_km', v)} unit="km" />
                        <PriceRow label={t('pricing_settings.truck_price', 'Frais de transport (Fixe)')} value={settings.eps_truck_extra_price_flat} onChange={v => onSettingChange('eps_truck_extra_price_flat', v)} unit="€" />
                        <PriceRow label="Gratuit pour grand volume" sublabel="Pas de frais si volume > m³" value={settings.eps_truck_volume_threshold_free_m3} onChange={v => onSettingChange('eps_truck_volume_threshold_free_m3', v)} unit="m³" />
                    </>
                )}

                {activeTab === 'logistics' && (
                    <>
                        <SectionHeader label={t('pricing_settings.section_vat', 'TVA (Taxes)')} />
                        <PriceRow label={t('pricing_settings.vat_legal', 'Entreprise (Cocontractant)')} sublabel={t('pricing_settings.vat_legal_sub', 'Auto-liquidation')} value={settings.vat_legal_entity ?? 0} onChange={v => onSettingChange('vat_legal_entity', v)} unit="%" />
                        <PriceRow label={t('pricing_settings.vat_physical_new', 'Particulier (Nouvelle Constr.)')} sublabel={t('pricing_settings.vat_physical_new_sub', '< 10 ans')} value={settings.vat_physical_new ?? 21} onChange={v => onSettingChange('vat_physical_new', v)} unit="%" />
                        <PriceRow label={t('pricing_settings.vat_physical_repair', 'Particulier (Rénovation)')} sublabel={t('pricing_settings.vat_physical_repair_sub', '> 10 ans')} value={settings.vat_physical_repair ?? 6} onChange={v => onSettingChange('vat_physical_repair', v)} unit="%" />
                    </>
                )}
            </div>
        </div>
    )
}
"""
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated PricingSettingsForm")

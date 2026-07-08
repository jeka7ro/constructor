import React from 'react'
import { useTranslation } from 'react-i18next'
import { Settings, Plus, Trash2 } from 'lucide-react'

// ─── Rând compact ───────────────────────────────────────────────────────────
function PriceRow({ label, sublabel, value, onChange, unit = '€/m²' }) {
    return (
        <div className="flex items-center gap-2 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div className="flex-1 min-w-0 flex items-baseline gap-2">
                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">{label}</span>
                {sublabel && <span className="text-[11px] text-slate-400 shrink-0">{sublabel}</span>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <input
                    type="number" step="any"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-right text-slate-900 dark:text-white text-sm"
                />
                <span className="text-[11px] text-slate-400 w-9 shrink-0">{unit}</span>
            </div>
        </div>
    )
}

// ─── Header secțiune inline ─────────────────────────────────────────────────
function SectionHeader({ label }) {
    return (
        <div className="flex items-center gap-2 mt-3 mb-0.5">
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

    return (
        <>
            {/* ── Un singur card compact ─────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-blue-500" />
                    <h2 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                        {t('pricing_settings.all_rates', 'Grille Tarifaire')}
                    </h2>
                </div>

                <div className="px-5 pt-1 pb-4">
                    <SectionHeader label={t('pricing_settings.section_chape', 'Chape')} />
                    <PriceRow
                        label={t('pricing_settings.base', 'Prix de Base')}
                        sublabel={t('pricing_settings.base_sub', '≤ ép. standard')}
                        value={settings.base_price_sqm}
                        onChange={v => onSettingChange('base_price_sqm', v)}
                    />

                    <SectionHeader label={t('pricing_settings.section_thick', 'Épaisseur Supplémentaire')} />
                    <PriceRow
                        label={t('pricing_settings.standard_thickness', 'Épaisseur Standard')}
                        sublabel={t('pricing_settings.standard_thickness_sub', 'sans supplément')}
                        value={settings.standard_thickness_cm}
                        onChange={v => onSettingChange('standard_thickness_cm', v)}
                        unit="cm"
                    />
                    <PriceRow
                        label={t('pricing_settings.extra_thickness_price', 'Prix/cm suppl.')}
                        sublabel={t('pricing_settings.extra_thickness_sub', 'au-dessus standard')}
                        value={settings.extra_thickness_price_per_cm}
                        onChange={v => onSettingChange('extra_thickness_price_per_cm', v)}
                        unit="€/cm"
                    />

                    <SectionHeader label={t('pricing_settings.section_options', 'Options')} />
                    <PriceRow
                        label={t('pricing_settings.foil', 'Film Plastique (Foil)')}
                        value={settings.plastic_foil_price_sqm}
                        onChange={v => onSettingChange('plastic_foil_price_sqm', v)}
                    />
                    <PriceRow
                        label={t('pricing_settings.mesh', 'Treillis Métallique')}
                        value={settings.metal_mesh_price_sqm}
                        onChange={v => onSettingChange('metal_mesh_price_sqm', v)}
                    />

                    <SectionHeader label={t('pricing_settings.section_fiber', 'Fibre / Duramint')} />
                    <PriceRow
                        label={t('pricing_settings.fiber_small', 'Fibre / Duramint (petite surf.)')}
                        sublabel={`≤ ${settings.fiber_large_threshold_sqm} m²`}
                        value={settings.fiber_price_sqm}
                        onChange={v => onSettingChange('fiber_price_sqm', v)}
                    />
                    <PriceRow
                        label={t('pricing_settings.fiber_large', 'Fibre / Duramint (grande surf.)')}
                        sublabel={`> ${settings.fiber_large_threshold_sqm} m²`}
                        value={settings.fiber_price_sqm_large}
                        onChange={v => onSettingChange('fiber_price_sqm_large', v)}
                    />
                    <PriceRow
                        label={t('pricing_settings.fiber_threshold', 'Seuil surface Fibre')}
                        sublabel={t('pricing_settings.fiber_threshold_sub', '→ tarif grande surf.')}
                        value={settings.fiber_large_threshold_sqm}
                        onChange={v => onSettingChange('fiber_large_threshold_sqm', v)}
                        unit="m²"
                    />
                </div>
            </div>

            {/* ── Seuils de surface ──────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-3">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                            {t('pricing_settings.thresholds', 'Seuils de Surface')}
                        </h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            {t('pricing_settings.thresholds_desc', 'Taxes suppl. si la surface se situe dans l\'intervalle.')}
                        </p>
                    </div>
                    <button
                        onClick={onAddThreshold}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 font-bold rounded-lg transition-colors text-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {t('pricing_settings.add_threshold', 'Ajouter')}
                    </button>
                </div>

                {(settings.surface_thresholds || []).length === 0 ? (
                    <div className="px-5 py-4 text-center text-xs text-slate-400">
                        {t('pricing_settings.no_thresholds', 'Aucun seuil défini.')}
                    </div>
                ) : (
                    <div className="px-5 py-2">
                        <div className="grid grid-cols-4 gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Min m²</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max m²</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taxe (€)</span>
                            <span />
                        </div>
                        {(settings.surface_thresholds || []).map(row => (
                            <div key={row.id} className="grid grid-cols-4 gap-2 py-1 items-center border-b border-slate-50 dark:border-slate-800 last:border-0">
                                <input type="number" step="any" value={row.min_sqm}
                                    onChange={e => onUpdateThreshold(row.id, 'min_sqm', e.target.value)}
                                    className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                />
                                <input type="number" step="any" value={row.max_sqm}
                                    onChange={e => onUpdateThreshold(row.id, 'max_sqm', e.target.value)}
                                    className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                />
                                <input type="number" step="any" value={row.extra_charge}
                                    onChange={e => onUpdateThreshold(row.id, 'extra_charge', e.target.value)}
                                    className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                />
                                <button onClick={() => onRemoveThreshold(row.id)}
                                    className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors justify-self-end">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Settings, Plus, Trash2 } from 'lucide-react'
import DataTable from '../../components/DataTable'

export default function PricingSettingsForm({ 
    settings, 
    onSettingChange, 
    onAddThreshold, 
    onRemoveThreshold, 
    onUpdateThreshold 
}) {
    const { t } = useTranslation()

    const columns = [
        {
            key: 'min_sqm',
            label: 'Min m²',
            render: (row) => (
                <input 
                    type="number" step="any"
                    value={row.min_sqm}
                    onChange={(e) => onUpdateThreshold(row.id, 'min_sqm', e.target.value)}
                    className="w-24 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
                />
            )
        },
        {
            key: 'max_sqm',
            label: 'Max m²',
            render: (row) => (
                <input 
                    type="number" step="any"
                    value={row.max_sqm}
                    onChange={(e) => onUpdateThreshold(row.id, 'max_sqm', e.target.value)}
                    className="w-24 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
                />
            )
        },
        {
            key: 'extra_charge',
            label: 'Taxe Suppl. (€)',
            render: (row) => (
                <input 
                    type="number" step="any"
                    value={row.extra_charge}
                    onChange={(e) => onUpdateThreshold(row.id, 'extra_charge', e.target.value)}
                    className="w-24 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
                />
            )
        },
        {
            key: 'actions',
            label: '',
            render: (row) => (
                <button 
                    onClick={() => onRemoveThreshold(row.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )
        }
    ]

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Standard Prices Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <Settings className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                            {t('pricing_settings.standard', 'Prix Standards (€/m²)')}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('pricing_settings.base', 'Prix de Base (Chape)')}
                            </label>
                            <input 
                                type="number" step="any"
                                value={settings.base_price_sqm}
                                onChange={e => onSettingChange('base_price_sqm', e.target.value)}
                                className="w-32 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-right"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('pricing_settings.foil', 'Film Plastique (Foil)')}
                            </label>
                            <input 
                                type="number" step="any"
                                value={settings.plastic_foil_price_sqm}
                                onChange={e => onSettingChange('plastic_foil_price_sqm', e.target.value)}
                                className="w-32 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-right"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('pricing_settings.mesh', 'Treillis Métallique (Mesh)')}
                            </label>
                            <input 
                                type="number" step="any"
                                value={settings.metal_mesh_price_sqm}
                                onChange={e => onSettingChange('metal_mesh_price_sqm', e.target.value)}
                                className="w-32 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-right"
                            />
                        </div>
                    </div>
                </div>

                {/* Specific Logic Card */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">
                            {t('pricing_settings.thickness', 'Épaisseur Supplémentaire')}
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('pricing_settings.standard_thickness', 'Épaisseur Standard (cm)')}
                                </label>
                                <input 
                                    type="number" step="any"
                                    value={settings.standard_thickness_cm}
                                    onChange={e => onSettingChange('standard_thickness_cm', e.target.value)}
                                    className="w-32 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-right"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('pricing_settings.extra_thickness_price', 'Prix Suppl. par cm (au-dessus du standard)')}
                                </label>
                                <input 
                                    type="number" step="any"
                                    value={settings.extra_thickness_price_per_cm}
                                    onChange={e => onSettingChange('extra_thickness_price_per_cm', e.target.value)}
                                    className="w-32 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-right"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">
                            {t('pricing_settings.fiber', 'Fibre (Duramint)')}
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('pricing_settings.fiber_threshold', 'Seuil de Surface Fibre (m²)')}
                                </label>
                                <input 
                                    type="number" step="any"
                                    value={settings.fiber_large_threshold_sqm}
                                    onChange={e => onSettingChange('fiber_large_threshold_sqm', e.target.value)}
                                    className="w-32 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-right"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('pricing_settings.price_below', 'Prix (≤ seuil)')}
                                </label>
                                <input 
                                    type="number" step="any"
                                    value={settings.fiber_price_sqm}
                                    onChange={e => onSettingChange('fiber_price_sqm', e.target.value)}
                                    className="w-32 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-right"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('pricing_settings.price_above', 'Prix (> seuil)')}
                                </label>
                                <input 
                                    type="number" step="any"
                                    value={settings.fiber_price_sqm_large}
                                    onChange={e => onSettingChange('fiber_price_sqm_large', e.target.value)}
                                    className="w-32 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-right"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thresholds Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-6">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                            {t('pricing_settings.thresholds', 'Seuils de Surface')}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {t('pricing_settings.thresholds_desc', 'Taxes supplémentaires appliquées automatiquement au devis si la surface totale se situe dans l\'intervalle.')}
                        </p>
                    </div>
                    <button 
                        onClick={onAddThreshold}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 font-medium rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('pricing_settings.add_threshold', 'Ajouter un Seuil')}
                    </button>
                </div>
                
                <DataTable 
                    columns={columns}
                    data={settings.surface_thresholds || []}
                    defaultPageSize={10}
                    emptyText={t('pricing_settings.no_thresholds', 'Aucun seuil défini.')}
                />
            </div>
        </>
    )
}

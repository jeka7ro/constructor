import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, Loader2, Settings, Users, Plus, Edit2, Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import DataTable from '../../components/DataTable'
import SearchableSelect from '../../components/SearchableSelect'
import PricingSettingsForm from './PricingSettingsForm'

export default function PricingSettingsPage() {
    const { t } = useTranslation()
    const showToast = useUIStore(state => state.showToast)
    
    //Global Settings
    const [globalSettings, setGlobalSettings] = useState({
        base_price_sqm: 12.5, extra_thickness_price_per_cm: 1.25, standard_thickness_cm: 5.0,
        plastic_foil_price_sqm: 1.2, metal_mesh_price_sqm: 2.5, fiber_price_sqm: 2.5,
        fiber_price_sqm_large: 2.0, fiber_large_threshold_sqm: 250.0, surface_thresholds: []
    })
    const [loadingGlobal, setLoadingGlobal] = useState(true)
    const [savingGlobal, setSavingGlobal] = useState(false)

    // Clients Data
    const [clients, setClients] = useState([])
    const [customClientIds, setCustomClientIds] = useState([])
    const [loadingClients, setLoadingClients] = useState(true)

    // Modal State for Specific Client
    const [modalOpen, setModalOpen] = useState(false)
    const [editingClientId, setEditingClientId] = useState('')
    const [clientSettings, setClientSettings] = useState(null)
    const [loadingClientSettings, setLoadingClientSettings] = useState(false)
    const [savingClient, setSavingClient] = useState(false)
    const [confirmResetClientId, setConfirmResetClientId] = useState(null)

    const toFloatOrDefault = (val, defaultVal = 0) => {
        if (val === '' || val === null || val === undefined) return defaultVal
        const parsed = parseFloat(String(val).replace(',', '.'))
        return isNaN(parsed) ? defaultVal : parsed
    }

    const sanitizeSettingsPayload = (rawSettings, clientId = null) => {
        const s = { ...(rawSettings || {}) }
        const basePrice = toFloatOrDefault(s.base_price_sqm, 0)
        const extraThickPrice = toFloatOrDefault(s.extra_thickness_price_per_cm, 0)
        const fiberPrice = toFloatOrDefault(s.fiber_price_sqm, 0)

        return {
            ...s,
            client_id: clientId,
            base_price_sqm: basePrice,
            base_price_sqm_large: toFloatOrDefault(s.base_price_sqm_large, basePrice),
            base_large_threshold_sqm: toFloatOrDefault(s.base_large_threshold_sqm, 250.0),
            extra_thickness_price_per_cm: extraThickPrice,
            extra_thickness_price_per_cm_large: toFloatOrDefault(s.extra_thickness_price_per_cm_large, extraThickPrice),
            extra_thickness_large_threshold_sqm: toFloatOrDefault(s.extra_thickness_large_threshold_sqm, 250.0),
            standard_thickness_cm: toFloatOrDefault(s.standard_thickness_cm, 5.0),
            plastic_foil_price_sqm: toFloatOrDefault(s.plastic_foil_price_sqm, 0),
            metal_mesh_price_sqm: toFloatOrDefault(s.metal_mesh_price_sqm, 0),
            fiber_price_sqm: fiberPrice,
            fiber_price_sqm_large: toFloatOrDefault(s.fiber_price_sqm_large, fiberPrice),
            fiber_large_threshold_sqm: toFloatOrDefault(s.fiber_large_threshold_sqm, 250.0),
            min_invoice_threshold_sqm: toFloatOrDefault(s.min_invoice_threshold_sqm, 40.0),
            min_invoice_fixed_price_under: toFloatOrDefault(s.min_invoice_fixed_price_under, null),
            min_invoice_min_price_over: toFloatOrDefault(s.min_invoice_min_price_over, null),
            vat_legal_entity: toFloatOrDefault(s.vat_legal_entity, 0),
            vat_physical_new: toFloatOrDefault(s.vat_physical_new, 21),
            vat_physical_repair: toFloatOrDefault(s.vat_physical_repair, 6),
            truck_distance_threshold_km: toFloatOrDefault(s.truck_distance_threshold_km, 50),
            truck_extra_price_flat: toFloatOrDefault(s.truck_extra_price_flat, 0),
            truck_surface_threshold_free_sqm: toFloatOrDefault(s.truck_surface_threshold_free_sqm, 500),
            pur_truck_distance_threshold_km: toFloatOrDefault(s.pur_truck_distance_threshold_km, 50),
            pur_truck_extra_price_flat: toFloatOrDefault(s.pur_truck_extra_price_flat, 0),
            pur_truck_surface_threshold_free_sqm: toFloatOrDefault(s.pur_truck_surface_threshold_free_sqm, 500),
            eps_truck_distance_threshold_km: toFloatOrDefault(s.eps_truck_distance_threshold_km, 50),
            eps_truck_extra_price_flat: toFloatOrDefault(s.eps_truck_extra_price_flat, 0),
            eps_truck_volume_threshold_free_m3: toFloatOrDefault(s.eps_truck_volume_threshold_free_m3, 40),
            pur_base_price_3cm: toFloatOrDefault(s.pur_base_price_3cm, 13.95),
            pur_step_price_up_to_10cm: toFloatOrDefault(s.pur_step_price_up_to_10cm, 1.65),
            pur_extra_price_above_10cm: toFloatOrDefault(s.pur_extra_price_above_10cm, 2.10),
            pur_minimum_execution_price: toFloatOrDefault(s.pur_minimum_execution_price, 1375.0),
            pur_surface_discount_step: toFloatOrDefault(s.pur_surface_discount_step, -0.50),
            pur_opt_aspiration: toFloatOrDefault(s.pur_opt_aspiration, 2.0),
            pur_opt_niveller: toFloatOrDefault(s.pur_opt_niveller, 4.25),
            pur_opt_poncage: toFloatOrDefault(s.pur_opt_poncage, 1.5),
            pur_opt_protection: toFloatOrDefault(s.pur_opt_protection, 1.5),
            surface_thresholds: (s.surface_thresholds || []).map(row => ({
                id: String(row.id || Date.now()),
                min_sqm: toFloatOrDefault(row.min_sqm, 0),
                max_sqm: toFloatOrDefault(row.max_sqm, 0),
                extra_charge: toFloatOrDefault(row.extra_charge, 0)
            }))
        }
    }

    const formatServerError = (error, fallback) => {
        const detail = error?.response?.data?.detail
        if (!detail) return fallback
        if (typeof detail === 'string') return detail
        if (Array.isArray(detail)) {
            return detail.map(item => {
                const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : ''
                return field ? `${field}: ${item.msg}` : (item?.msg || JSON.stringify(item))
            }).join(' | ')
        }
        return fallback
    }

    useEffect(() => {
        loadGlobalSettings()
        loadClientsData()
    }, [])

    const loadGlobalSettings = async () => {
        try {
            setLoadingGlobal(true)
            const res = await api.get('/admin/pricing-settings')
            setGlobalSettings(res.data)
        } catch (error) {
            console.error("Failed to load global pricing settings:", error)
            showToast(t('common.error_loading', 'Erreur de chargement des paramètres globaux'), 'error')
        } finally {
            setLoadingGlobal(false)
        }
    }

    const loadClientsData = async () => {
        try {
            setLoadingClients(true)
            const [clientsRes, customRes] = await Promise.all([
                api.get('/admin/clients'),
                api.get('/admin/pricing-settings/custom-clients')
            ])
            setClients(clientsRes.data || [])
            setCustomClientIds(customRes.data || [])
        } catch (error) {
            console.error("Failed to load clients data:", error)
            showToast(t('common.error_loading', 'Erreur de chargement des clients'), 'error')
        } finally {
            setLoadingClients(false)
        }
    }

    const loadClientSettings = async (clientId) => {
        if (!clientId) {
            setClientSettings(null)
            return
        }
        try {
            setLoadingClientSettings(true)
            const res = await api.get(`/admin/pricing-settings?client_id=${clientId}`)
            setClientSettings(res.data)
        } catch (error) {
            console.error("Failed to load client settings:", error)
            showToast(t('common.error_loading', 'Erreur de chargement des paramètres'), 'error')
        } finally {
            setLoadingClientSettings(false)
        }
    }

    const validateSurfaceThresholds = (thresholds) => {
        if (!thresholds || !Array.isArray(thresholds) || thresholds.length === 0) return null;
        for (let i = 0; i < thresholds.length; i++) {
            const minS = parseFloat(thresholds[i].min_sqm);
            const maxS = parseFloat(thresholds[i].max_sqm);
            if (isNaN(minS) || isNaN(maxS)) {
                return t('pricing_settings.threshold_nan_error', 'Veuillez saisir des nombres valides pour tous les seuils de surface.');
            }
            if (minS < 0 || maxS < 0) {
                return t('pricing_settings.threshold_negative_error', 'Les surfaces ne peuvent pas être négatives.');
            }
            if (minS >= maxS) {
                return t('pricing_settings.threshold_order_error', `Le minimum (${minS} m²) doit être strictement inférieur au maximum (${maxS} m²).`);
            }
        }
        const sorted = [...thresholds].sort((a, b) => parseFloat(a.min_sqm) - parseFloat(b.min_sqm));
        for (let i = 0; i < sorted.length - 1; i++) {
            const currMax = parseFloat(sorted[i].max_sqm);
            const nextMin = parseFloat(sorted[i + 1].min_sqm);
            const nextMax = parseFloat(sorted[i + 1].max_sqm);
            if (nextMin <= currMax) {
                return t('pricing_settings.threshold_overlap_error', 
                    `Chevauchement détecté entre [${sorted[i].min_sqm} - ${currMax} m²] et [${nextMin} - ${nextMax} m²]. Les intervalles ne doivent pas se chevaucher (ex: 0-40, 41-60).`);
            }
        }
        return null;
    };

    const handleSaveGlobal = async () => {
        const thresholdErr = validateSurfaceThresholds(globalSettings.surface_thresholds);
        if (thresholdErr) {
            showToast(thresholdErr, 'error');
            return;
        }
        try {
            setSavingGlobal(true)
            const payload = sanitizeSettingsPayload(globalSettings, null)
            await api.put('/admin/pricing-settings', payload)
            setGlobalSettings(payload)
            showToast(t('common.saved_successfully', 'Paramètres globaux enregistrés avec succès!'), 'success')
        } catch (error) {
            console.error("Failed to save global pricing settings:", error)
            showToast(formatServerError(error, t('common.error_saving', "Erreur lors de l'enregistrement")), 'error')
        } finally {
            setSavingGlobal(false)
        }
    }

    const handleSaveClient = async () => {
        if (!editingClientId || !clientSettings) return
        const thresholdErr = validateSurfaceThresholds(clientSettings.surface_thresholds);
        if (thresholdErr) {
            showToast(thresholdErr, 'error');
            return;
        }
        try {
            setSavingClient(true)
            const payload = sanitizeSettingsPayload(clientSettings, editingClientId)
            await api.put('/admin/pricing-settings', payload)
            showToast(t('common.saved_successfully', 'Prix client enregistrés avec succès!'), 'success')
            setModalOpen(false)
            loadClientsData() // Refresh list of custom clients
        } catch (error) {
            console.error("Failed to save client pricing settings:", error)
            showToast(formatServerError(error, t('common.error_saving', "Erreur lors de l'enregistrement")), 'error')
        } finally {
            setSavingClient(false)
        }
    }

    const handleResetClient = (clientId) => {
        if (!clientId) return
        setConfirmResetClientId(clientId)
    }

    const confirmResetClient = async () => {
        const clientId = confirmResetClientId
        if (!clientId) return
        setConfirmResetClientId(null)
        try {
            await api.delete(`/admin/pricing-settings?client_id=${clientId}`)
            showToast(t('common.deleted_successfully', 'Prix réinitialisés avec succès!'), 'success')
            if (modalOpen) setModalOpen(false)
            loadClientsData()
        } catch (error) {
            console.error("Failed to reset client pricing settings:", error)
            showToast(t('common.error', 'Erreur'), 'error')
        }
    }

    const openClientModal = (clientId = '') => {
        setEditingClientId(clientId)
        setClientSettings(null)
        setModalOpen(true)
        if (clientId) {
            loadClientSettings(clientId)
        }
    }

    // Handlers for Global
    const handleGlobalChange = (field, value) => setGlobalSettings(prev => ({ ...prev, [field]: value }))
    const handleGlobalAddThreshold = () => setGlobalSettings(prev => ({ ...prev, surface_thresholds: [...prev.surface_thresholds, { id: Date.now().toString(), min_sqm: 0, max_sqm: 0, extra_charge: 0 }] }))
    const handleGlobalRemoveThreshold = (id) => setGlobalSettings(prev => ({ ...prev, surface_thresholds: prev.surface_thresholds.filter(t => t.id !== id) }))
    const handleGlobalUpdateThreshold = (id, field, value) => setGlobalSettings(prev => ({ ...prev, surface_thresholds: prev.surface_thresholds.map(t => t.id === id ? { ...t, [field]: value } : t) }))

    // Handlers for Client
    const handleClientChange = (field, value) => setClientSettings(prev => ({ ...prev, [field]: value }))
    const handleClientAddThreshold = () => setClientSettings(prev => ({ ...prev, surface_thresholds: [...prev.surface_thresholds, { id: Date.now().toString(), min_sqm: 0, max_sqm: 0, extra_charge: 0 }] }))
    const handleClientRemoveThreshold = (id) => setClientSettings(prev => ({ ...prev, surface_thresholds: prev.surface_thresholds.filter(t => t.id !== id) }))
    const handleClientUpdateThreshold = (id, field, value) => setClientSettings(prev => ({ ...prev, surface_thresholds: prev.surface_thresholds.map(t => t.id === id ? { ...t, [field]: value } : t) }))

    const customClientsList = clients.filter(c => customClientIds.includes(c.id))

    const clientColumns = [
        {
            key: 'name',
            label: t('clients.name', 'Nom du Client'),
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold shrink-0">
                        {row.name ? row.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 dark:text-white">
                            {row.name || row.company_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || t('quotes.unknown', 'Inconnu')}
                        </div>
                        <div className="text-xs text-slate-500">{row.email || row.phone}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'actions',
            label: '',
            render: (row) => (
                <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => openClientModal(row.id)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        title={t('common.edit', 'Éditer')}
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleResetClient(row.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        title={t('common.delete', 'Supprimer')}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ]

    if (loadingGlobal || loadingClients) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 w-full">
            {/* Global Pricing Section */}
            <div>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Settings className="w-6 h-6 text-blue-500" />
                            {t('pricing_settings.global_title', 'Tarifs Globaux')}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {t('pricing_settings.global_desc', 'Prix par défaut appliqués à tous les devis.')}
                        </p>
                    </div>
                    <button
                        onClick={handleSaveGlobal}
                        disabled={savingGlobal}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
                    >
                        {savingGlobal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t('common.save', 'Enregistrer')}
                    </button>
                </div>
                
                <PricingSettingsForm 
                    settings={globalSettings}
                    onSettingChange={handleGlobalChange}
                    onAddThreshold={handleGlobalAddThreshold}
                    onRemoveThreshold={handleGlobalRemoveThreshold}
                    onUpdateThreshold={handleGlobalUpdateThreshold}
                />
            </div>

            {/* Preferential Pricing Section */}
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Users className="w-5 h-5 text-indigo-500" />
                            {t('pricing_settings.preferential_title', 'Tarification Préférentielle')}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {t('pricing_settings.preferential_desc', 'Clients avec des prix personnalisés.')}
                        </p>
                    </div>
                    <button
                        onClick={() => openClientModal('')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-xl transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        {t('pricing_settings.add_client', 'Ajouter un Client')}
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <DataTable 
                        columns={clientColumns}
                        data={customClientsList}
                        defaultPageSize={10}
                        emptyText={t('pricing_settings.no_custom_clients', 'Aucun client avec tarification préférentielle.')}
                    />
                </div>
            </div>

            {/* Modal for Client Pricing */}
            {modalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 bg-indigo-600 dark:bg-slate-800 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-white" />
                                {t('pricing_settings.client_pricing_title', 'Tarification Client')}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="text-indigo-100 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto flex-1 min-h-[400px]">
                            <div className="mb-6 max-w-sm">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    {t('pricing_settings.select_client', 'Sélectionner le Client')} *
                                </label>
                                <SearchableSelect
                                    value={editingClientId}
                                    onChange={(val) => {
                                        setEditingClientId(val);
                                        loadClientSettings(val);
                                    }}
                                    options={[
                                        { value: '', label: t('common.select', 'Sélectionner...') },
                                        ...clients.map(c => ({
                                            value: c.id,
                                            label: c.name || c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || t('quotes.unknown', 'Inconnu'),
                                            subLabel: c.phone || c.email || c.address || c.company_address || ''
                                        }))
                                    ]}
                                    placeholder={t('pricing_settings.select_client', 'Sélectionner le Client')}
                                    buttonClassName="rounded-xl h-11 border-slate-200 bg-white dark:bg-slate-800"
                                />
                            </div>

                            {loadingClientSettings ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                </div>
                            ) : clientSettings ? (
                                <>
                                    {clientSettings.is_custom === false && (
                                        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-2 shadow-sm mb-6">
                                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                            <span className="text-sm font-medium">Ce client utilise actuellement les paramètres globaux. Modifiez les prix ci-dessous et enregistrez pour créer une tarification personnalisée.</span>
                                        </div>
                                    )}
                                    <PricingSettingsForm 
                                        settings={clientSettings}
                                        onSettingChange={handleClientChange}
                                        onAddThreshold={handleClientAddThreshold}
                                        onRemoveThreshold={handleClientRemoveThreshold}
                                        onUpdateThreshold={handleClientUpdateThreshold}
                                        isCustomClient={true}
                                    />
                                </>
                            ) : (
                                editingClientId && (
                                    <div className="text-center py-12 text-slate-500">
                                        Chargement des paramètres...
                                    </div>
                                )
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                            >
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button
                                onClick={handleSaveClient}
                                disabled={savingClient || !editingClientId || !clientSettings}
                                className="px-5 h-10 rounded-full text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {savingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {t('common.save', 'Enregistrer')}
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* Confirm Reset Modal */}
            {confirmResetClientId && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            {t('pricing_settings.confirm_reset_title', 'Réinitialiser la tarification')}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                            {t('pricing_settings.confirm_reset', 'Êtes-vous sûr de vouloir réinitialiser les prix pour ce client ? Il utilisera à nouveau les tarifs globaux.')}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmResetClientId(null)}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                            >
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button
                                onClick={confirmResetClient}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                            >
                                {t('common.delete', 'Supprimer')}
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}
        </div>
    )
}

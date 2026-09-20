import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { 
    X, User, Building2, Search, Loader2, ChevronRight, ChevronLeft, 
    Save, Plus, Check, Layers, Grid3x3, Wind, Thermometer, Trash2 
} from 'lucide-react';
import api from '../lib/api';
import SearchableSelect from './SearchableSelect';

export default function QuickAddWizard({ onClose, onSuccess, clients = [], showToast }) {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    
    const [clientMode, setClientMode] = useState('existing'); // 'existing' or 'new'
    const [form, setForm] = useState({
        client_id: '',
        approximate_date: new Date().toISOString().split('T')[0],
        work_type: 'new', // 'new' = 21%, 'repair' = 6%
        notes: '',
        estimated_price: ''
    });

    const [newClient, setNewClient] = useState({
        client_type: 'fizica',
        name: '',
        email: '',
        phone: '',
        cui: ''
    });

    const [sapa, setSapa] = useState({
        enabled: true,
        has_foil: false,
        has_mesh: false,
        has_fiber: false,
        has_duramint: true,
        surfaces: [
            { id: 's-1', surface: '', thickness: '5' }
        ]
    });

    const [isolation, setIsolation] = useState({
        enabled: false,
        items: [
            {
                id: 'iso-1',
                type: 'PUR',
                surface: '',
                thickness: '6',
                pur_aspiration: false,
                pur_niveller: false,
                pur_poncage: false,
                pur_protection: false
            }
        ]
    });

    // Helper to add/remove surfaces
    const addSurface = () => {
        setSapa(prev => ({
            ...prev,
            surfaces: [...prev.surfaces, { id: `s-${Date.now()}`, surface: '', thickness: '5' }]
        }));
    };

    const removeSurface = (id) => {
        setSapa(prev => ({
            ...prev,
            surfaces: prev.surfaces.filter(s => s.id !== id)
        }));
    };

    const updateSurface = (index, field, value) => {
        setSapa(prev => {
            const next = [...prev.surfaces];
            next[index] = { ...next[index], [field]: value };
            return { ...prev, surfaces: next };
        });
    };

    // Helper to add/remove isolations
    const addIsolation = () => {
        setIsolation(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    id: `iso-${Date.now()}`,
                    type: 'PUR',
                    surface: '',
                    thickness: '6',
                    pur_aspiration: false,
                    pur_niveller: false,
                    pur_poncage: false,
                    pur_protection: false
                }
            ]
        }));
    };

    const removeIsolation = (id) => {
        setIsolation(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id)
        }));
    };

    const updateIsolation = (index, field, value) => {
        setIsolation(prev => {
            const next = [...prev.items];
            next[index] = { ...next[index], [field]: value };
            return { ...prev, items: next };
        });
    };

    const isNextDisabled = () => {
        if (step === 1) {
            if (clientMode === 'existing' && !form.client_id) return true;
            if (clientMode === 'new' && !newClient.name.trim()) return true;
        }
        if (step === 2) {
            if (sapa.enabled && sapa.surfaces.some(s => !s.surface || parseFloat(s.surface) <= 0)) {
                return true;
            }
        }
        if (step === 3) {
            if (isolation.enabled && isolation.items.some(iso => !iso.surface || parseFloat(iso.surface) <= 0)) {
                return true;
            }
        }
        return false;
    };

    // Auto-calculate estimated price on step 4
    useEffect(() => {
        if (step === 4 && !form.estimated_price) {
            let totalNet = 0;
            if (sapa.enabled) {
                sapa.surfaces.forEach(s => {
                    const sArea = parseFloat(s.surface) || 0;
                    const thick = parseFloat(s.thickness) || 5;
                    if (sArea > 0) {
                        let base = 12.5;
                        if (thick > 5) base += (thick - 5) * 1.25;
                        if (sapa.has_foil) base += 1.2;
                        if (sapa.has_mesh) base += 2.5;
                        if (sapa.has_fiber || sapa.has_duramint) base += (sArea <= 200 ? 2.5 : 2.0);
                        totalNet += base * sArea;
                    }
                });
            }
            if (isolation.enabled) {
                isolation.items.forEach(iso => {
                    const iArea = parseFloat(iso.surface) || 0;
                    const thick = parseFloat(iso.thickness) || 3;
                    if (iArea > 0) {
                        if (iso.type === 'PUR') {
                            let base = 13.95;
                            if (thick > 3 && thick <= 10) base += (thick - 3) * 1.65;
                            else if (thick > 10) base += (7 * 1.65) + ((thick - 10) * 2.10);
                            if (iArea > 100) base += Math.floor((iArea - 100) / 100) * -0.50;
                            
                            if (iso.pur_aspiration) base += 2.00;
                            if (iso.pur_niveller) base += 4.25;
                            if (iso.pur_poncage) base += 1.50;
                            if (iso.pur_protection) base += 1.50;
                            totalNet += Math.max(0, base) * iArea;
                        } else if (iso.type === 'EPS') {
                            const vol = (iArea * thick) / 100;
                            let epsPrice = 150 * vol;
                            if (vol <= 10) epsPrice = 1495;
                            else if (vol <= 20) epsPrice = 160 * vol;
                            else if (vol <= 40) epsPrice = 155 * vol;
                            totalNet += epsPrice;
                        }
                    }
                });
            }
            const vatRate = form.work_type === 'repair' ? 1.06 : 1.21;
            const gross = totalNet * vatRate;
            if (gross > 0) {
                setForm(prev => ({ ...prev, estimated_price: gross.toFixed(2) }));
            }
        }
    }, [step, sapa, isolation, form.work_type]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let finalClientId = form.client_id;
            
            // 1. Save new client if needed
            if (clientMode === 'new') {
                const clientRes = await api.post('/admin/clients', {
                    name: newClient.name,
                    client_type: newClient.client_type,
                    first_name: newClient.client_type === 'fizica' ? newClient.name.split(' ')[0] : '',
                    last_name: newClient.client_type === 'fizica' ? newClient.name.split(' ').slice(1).join(' ') : '',
                    company_name: newClient.client_type === 'juridica' ? newClient.name : null,
                    cui: newClient.cui || null,
                    email: newClient.email || null,
                    phone: newClient.phone || null
                });
                finalClientId = clientRes.data.id;
            }

            // 2. Prepare Volumes from all surfaces and isolations
            const volumes = [];
            if (sapa.enabled) {
                sapa.surfaces.forEach((s, idx) => {
                    volumes.push({
                        label: sapa.surfaces.length > 1 ? `Chape ${idx + 1}` : 'Chape',
                        quantity: parseFloat(s.surface) || 0,
                        thickness: parseFloat(s.thickness) || 0,
                        unit: 'm²',
                        has_foil: sapa.has_foil,
                        has_mesh: sapa.has_mesh,
                        has_fiber: sapa.has_fiber,
                        has_duramint: sapa.has_duramint
                    });
                });
            }
            if (isolation.enabled) {
                isolation.items.forEach((iso, idx) => {
                    volumes.push({
                        label: isolation.items.length > 1 ? `Isolation ${iso.type} ${idx + 1}` : `Isolation ${iso.type}`,
                        quantity: parseFloat(iso.surface) || 0,
                        thickness: parseFloat(iso.thickness) || 0,
                        unit: 'm²',
                        pur_aspiration: iso.pur_aspiration,
                        pur_niveller: iso.pur_niveller,
                        pur_poncage: iso.pur_poncage,
                        pur_protection: iso.pur_protection
                    });
                });
            }

            // 3. Save Quote
            await api.post('/admin/work-orders', {
                title: volumes[0]?.label || 'Devis',
                client_id: finalClientId,
                approximate_date: form.approximate_date,
                work_type: form.work_type,
                estimated_price: form.estimated_price ? String(form.estimated_price) : null,
                notes: form.notes,
                status: 'pending',
                is_quote: true,
                volumes: volumes
            });

            onSuccess();
        } catch (err) {
            console.error('Error saving quote:', err);
            const errMsg = err.response?.data?.detail 
                ? (typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail))
                : t('quotes.err_create', 'Erreur lors de la création');
            if (showToast) {
                showToast(errMsg, 'error');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl relative animate-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                            <Plus className="w-5 h-5" />
                        </div>
                        {t('quotes.quick_add_title', 'Ajout Rapide Devis')}
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl p-2 transition-colors"
                        title={t('quotes.btn_cancel', 'Annuler')}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {t('quotes.step_counter', 'Étape {{step}} / 4', { step })}
                        </span>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                            {step === 1 ? t('quotes.step_client_details', 'Client & Détails') : 
                             step === 2 ? t('quotes.step_chape', 'Chape') : 
                             step === 3 ? t('quotes.step_isolation', 'Isolation') : 
                             t('quotes.step_summary', 'Résumé')}
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-xl overflow-hidden flex gap-1">
                        <div className={`h-full rounded-xl transition-all duration-300 flex-1 ${step >= 1 ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                        <div className={`h-full rounded-xl transition-all duration-300 flex-1 ${step >= 2 ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                        <div className={`h-full rounded-xl transition-all duration-300 flex-1 ${step >= 3 ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                        <div className={`h-full rounded-xl transition-all duration-300 flex-1 ${step >= 4 ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    
                    {/* STEP 1: CLIENT & DETAILS */}
                    {step === 1 && (
                        <div className="space-y-6 min-h-[360px]">
                            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-full max-w-sm mx-auto mb-6">
                                <button 
                                    type="button" 
                                    onClick={() => setClientMode('existing')}
                                    className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${clientMode === 'existing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    <Search className="w-4 h-4" /> {t('quotes.client_mode_existing', 'Client Existant')}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setClientMode('new')}
                                    className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${clientMode === 'new' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    <Plus className="w-4 h-4" /> {t('quotes.client_mode_new', 'Nouveau Client')}
                                </button>
                            </div>

                            {clientMode === 'existing' ? (
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {t('quotes.select_client', 'Sélectionner un Client *')}
                                    </label>
                                    <SearchableSelect
                                        value={form.client_id}
                                        onChange={val => setForm({...form, client_id: val})}
                                        options={clients.map(c => ({
                                            value: c.id,
                                            label: c.name || c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
                                            subLabel: c.phone || c.email
                                        }))}
                                        placeholder={t('quotes.search_client_placeholder', '- Chercher un client -')}
                                        buttonClassName="h-12 text-sm rounded-xl border-slate-200 bg-white"
                                    />
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                                    <div className="flex gap-2 bg-white p-1 rounded-xl max-w-xs border border-slate-200">
                                        <button 
                                            type="button" 
                                            onClick={() => setNewClient({ ...newClient, client_type: 'fizica' })}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${newClient.client_type === 'fizica' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            <User className="w-3.5 h-3.5" /> {t('quotes.client_particular', 'Particulier')}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setNewClient({ ...newClient, client_type: 'juridica' })}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${newClient.client_type === 'juridica' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            <Building2 className="w-3.5 h-3.5" /> {t('quotes.client_company', 'Entreprise')}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('quotes.client_name_company', 'Nom / Raison Sociale *')}</label>
                                            <input type="text" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
                                        </div>
                                        {newClient.client_type === 'juridica' && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('quotes.client_vat_optional', 'TVA (Optionnel)')}</label>
                                                <input type="text" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newClient.cui} onChange={e => setNewClient({...newClient, cui: e.target.value})} />
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('quotes.client_phone', 'Téléphone')}</label>
                                            <input type="text" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('quotes.client_email', 'Email')}</label>
                                            <input type="email" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* VAT & Date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        {t('quotes.vat_project_type', 'Type de Projet (TVA) *')}
                                    </label>
                                    <div className="flex gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => setForm({ ...form, work_type: 'new' })}
                                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all border ${form.work_type === 'new' ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                        >
                                            {t('quotes.type_new_vat', 'Neuf (21%)')}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setForm({ ...form, work_type: 'repair' })}
                                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all border ${form.work_type === 'repair' ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                        >
                                            {t('quotes.type_renovation_vat', 'Rénovation (6%)')}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        {t('quotes.approx_work_date', 'Date aprox. travaux')}
                                    </label>
                                    <input 
                                        type="date"
                                        className="w-full h-[46px] border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        value={form.approximate_date}
                                        onChange={e => setForm({...form, approximate_date: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CHAPE (MULTIPLE SURFACES) */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={sapa.enabled} 
                                    onChange={e => setSapa({...sapa, enabled: e.target.checked})} 
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                />
                                <div className="flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-blue-600" />
                                    <span className="font-extrabold text-slate-800 text-base">{t('quotes.include_chape', 'Inclure Chape')}</span>
                                </div>
                            </label>

                            {sapa.enabled && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    {/* Multiple Surface Rows */}
                                    <div className="space-y-3">
                                        {sapa.surfaces.map((s, idx) => (
                                            <div key={s.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl relative space-y-2">
                                                {sapa.surfaces.length > 1 && (
                                                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 mb-2">
                                                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-blue-800 bg-blue-100 px-2 py-0.5 rounded-lg">
                                                            {t('quotes.chape_n', 'Chape {{n}}', { n: idx + 1 })}
                                                        </span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeSurface(s.id)}
                                                            className="text-red-500 hover:text-white hover:bg-red-500 p-1 rounded-lg transition-colors"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                            {t('quotes.surface_m2', 'Surface (m²) *')}
                                                        </label>
                                                        <input 
                                                            type="number" 
                                                            min="1" 
                                                            className="w-full h-11 text-base font-bold bg-white border border-slate-200 rounded-xl px-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                                                            placeholder="ex: 120" 
                                                            value={s.surface} 
                                                            onChange={e => updateSurface(idx, 'surface', e.target.value)} 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                            {t('quotes.thickness_cm', 'Épaisseur (cm) *')}
                                                        </label>
                                                        <input 
                                                            type="number" 
                                                            step="0.5" 
                                                            min="3" 
                                                            className="w-full h-11 text-base font-bold bg-white border border-slate-200 rounded-xl px-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                                                            placeholder="ex: 5" 
                                                            value={s.thickness} 
                                                            onChange={e => updateSurface(idx, 'thickness', e.target.value)} 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button 
                                            type="button" 
                                            onClick={addSurface}
                                            className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-slate-600 hover:text-blue-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                                        >
                                            <Plus className="w-4 h-4" /> {t('quotes.add_surface', '+ Ajouter une autre surface')}
                                        </button>
                                    </div>

                                    {/* Global Options */}
                                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            {t('quotes.options_chape', 'Options supplémentaires')}
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${sapa.has_foil ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100/50'}`}>
                                                <div className="flex items-center gap-2.5">
                                                    <Layers className={`w-4 h-4 ${sapa.has_foil ? 'text-blue-600' : 'text-slate-400'}`} />
                                                    <span className="text-xs font-bold text-slate-800">{t('quotes.foil_polyane', 'Film Polyane')}</span>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    checked={sapa.has_foil} 
                                                    onChange={e => setSapa({...sapa, has_foil: e.target.checked})} 
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                                />
                                            </label>

                                            <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${sapa.has_mesh ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100/50'}`}>
                                                <div className="flex items-center gap-2.5">
                                                    <Grid3x3 className={`w-4 h-4 ${sapa.has_mesh ? 'text-blue-600' : 'text-slate-400'}`} />
                                                    <span className="text-xs font-bold text-slate-800">{t('quotes.wire_mesh', 'Treillis métallique')}</span>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    checked={sapa.has_mesh} 
                                                    onChange={e => setSapa({...sapa, has_mesh: e.target.checked})} 
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                                />
                                            </label>

                                            <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${sapa.has_fiber ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100/50'}`}>
                                                <div className="flex items-center gap-2.5">
                                                    <Layers className={`w-4 h-4 ${sapa.has_fiber ? 'text-blue-600' : 'text-slate-400'}`} />
                                                    <span className="text-xs font-bold text-slate-800">{t('quotes.fibers', 'Fibres')}</span>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    checked={sapa.has_fiber} 
                                                    onChange={e => setSapa({...sapa, has_fiber: e.target.checked})} 
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                                />
                                            </label>

                                            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/80 opacity-80 cursor-not-allowed">
                                                <div className="flex items-center gap-2.5">
                                                    <Layers className="w-4 h-4 text-blue-600" />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-800">Duramint</span>
                                                        <span className="text-[10px] text-blue-600 font-bold">{t('quotes.duramint_included', 'Inclus')}</span>
                                                    </div>
                                                </div>
                                                <input type="checkbox" checked={true} readOnly className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-not-allowed" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: ISOLATION (PUR / EPS) */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={isolation.enabled} 
                                    onChange={e => setIsolation({...isolation, enabled: e.target.checked})} 
                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                                />
                                <div className="flex items-center gap-2">
                                    <Wind className="w-5 h-5 text-indigo-600" />
                                    <span className="font-extrabold text-slate-800 text-base">{t('quotes.include_isolation', 'Inclure Isolation')}</span>
                                </div>
                            </label>

                            {isolation.enabled && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    {isolation.items.map((iso, idx) => (
                                        <div key={iso.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4 relative">
                                            {isolation.items.length > 1 && (
                                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                                                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-lg">
                                                        {t('quotes.isolation_n', 'Isolation {{n}}', { n: idx + 1 })}
                                                    </span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeIsolation(iso.id)}
                                                        className="text-red-500 hover:text-white hover:bg-red-500 p-1 rounded-lg transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Type Selector (PUR vs EPS) */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                    {t('quotes.isolation_type', "Type d'isolation *")}
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => updateIsolation(idx, 'type', 'PUR')}
                                                        className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2.5 font-bold text-sm ${iso.type === 'PUR' ? 'border-indigo-500 bg-indigo-50/80 text-indigo-900 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'}`}
                                                    >
                                                        <Wind className={`w-5 h-5 ${iso.type === 'PUR' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                        {t('quotes.isolation_pur', 'Isolation PUR')}
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => updateIsolation(idx, 'type', 'EPS')}
                                                        className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2.5 font-bold text-sm ${iso.type === 'EPS' ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200'}`}
                                                    >
                                                        <Thermometer className={`w-5 h-5 ${iso.type === 'EPS' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                        {t('quotes.isolation_eps', 'Isolation EPS')}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Surface & Thickness */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                        {t('quotes.surface_m2', 'Surface (m²) *')}
                                                    </label>
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                        className="w-full h-11 text-base font-bold bg-white border border-slate-200 rounded-xl px-3 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                                        placeholder={sapa.surfaces[0]?.surface || "120"} 
                                                        value={iso.surface} 
                                                        onChange={e => updateIsolation(idx, 'surface', e.target.value)} 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                        {t('quotes.thickness_cm', 'Épaisseur (cm) *')}
                                                    </label>
                                                    <input 
                                                        type="number" 
                                                        step="0.5" 
                                                        min="1" 
                                                        className="w-full h-11 text-base font-bold bg-white border border-slate-200 rounded-xl px-3 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                                        placeholder="ex: 6" 
                                                        value={iso.thickness} 
                                                        onChange={e => updateIsolation(idx, 'thickness', e.target.value)} 
                                                    />
                                                </div>
                                            </div>

                                            {/* PUR Specific Options */}
                                            {iso.type === 'PUR' && (
                                                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2.5">
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                        {t('quotes.options_pur', 'Options PUR')}
                                                    </label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                                                            <input type="checkbox" checked={iso.pur_aspiration} onChange={e => updateIsolation(idx, 'pur_aspiration', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                            {t('quotes.pur_aspiration', 'Aspiration')}
                                                        </label>
                                                        <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                                                            <input type="checkbox" checked={iso.pur_niveller} onChange={e => updateIsolation(idx, 'pur_niveller', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                            {t('quotes.pur_niveller', 'Niveller')}
                                                        </label>
                                                        <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                                                            <input type="checkbox" checked={iso.pur_poncage} onChange={e => updateIsolation(idx, 'pur_poncage', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                            {t('quotes.pur_poncage', 'Ponçage')}
                                                        </label>
                                                        <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                                                            <input type="checkbox" checked={iso.pur_protection} onChange={e => updateIsolation(idx, 'pur_protection', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                            {t('quotes.pur_protection', 'Protection')}
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <button 
                                        type="button" 
                                        onClick={addIsolation}
                                        className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-600 hover:text-indigo-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Plus className="w-4 h-4" /> {t('quotes.add_isolation', '+ Ajouter une isolation')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: SUMMARY */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 text-center space-y-1.5">
                                <h4 className="text-base font-black text-slate-800">
                                    {t('quotes.ready_to_save', 'Prêt à enregistrer')}
                                </h4>
                                <p className="text-slate-500 text-xs sm:text-sm">
                                    {t('quotes.ready_to_save_desc', "Ce devis sera ajouté dans la liste 'En attente' pour que vous puissiez lui générer un prix ou le planifier.")}
                                </p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                                    {t('quotes.summary_recap', 'Récapitulatif')}
                                </h4>
                                
                                <div className="space-y-3">
                                    {/* Chape recap */}
                                    {sapa.enabled && (
                                        <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                                            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800">
                                                <span className="flex items-center gap-2">
                                                    <Layers className="w-4 h-4 text-blue-600" />
                                                    {t('quotes.step_chape', 'Chape')}
                                                </span>
                                                <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-xs">
                                                    {sapa.surfaces.reduce((acc, s) => acc + (parseFloat(s.surface) || 0), 0)} m² total
                                                </span>
                                            </div>
                                            {sapa.surfaces.map((s, idx) => (
                                                <div key={s.id} className="text-xs text-slate-600 flex justify-between pl-6">
                                                    <span>{t('quotes.chape_n', 'Chape {{n}}', { n: idx + 1 })}</span>
                                                    <span className="font-mono font-medium">{s.surface} m² · {s.thickness} cm</span>
                                                </div>
                                            ))}
                                            <div className="flex flex-wrap gap-1.5 pt-1 pl-6">
                                                {sapa.has_foil && <span className="text-[10px] bg-blue-100/70 text-blue-700 px-2 py-0.5 rounded-lg font-bold">{t('quotes.foil_polyane', 'Film Polyane')}</span>}
                                                {sapa.has_mesh && <span className="text-[10px] bg-blue-100/70 text-blue-700 px-2 py-0.5 rounded-lg font-bold">{t('quotes.wire_mesh', 'Treillis métallique')}</span>}
                                                {sapa.has_fiber && <span className="text-[10px] bg-blue-100/70 text-blue-700 px-2 py-0.5 rounded-lg font-bold">{t('quotes.fibers', 'Fibres')}</span>}
                                                {sapa.has_duramint && <span className="text-[10px] bg-blue-100/70 text-blue-700 px-2 py-0.5 rounded-lg font-bold">Duramint</span>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Isolation recap */}
                                    {isolation.enabled && (
                                        <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                                            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800">
                                                <span className="flex items-center gap-2">
                                                    <Wind className="w-4 h-4 text-indigo-600" />
                                                    {t('quotes.step_isolation', 'Isolation')}
                                                </span>
                                                <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-xs">
                                                    {isolation.items.reduce((acc, i) => acc + (parseFloat(i.surface) || 0), 0)} m² total
                                                </span>
                                            </div>
                                            {isolation.items.map((iso, idx) => (
                                                <div key={iso.id} className="text-xs text-slate-600 flex justify-between pl-6">
                                                    <span>{iso.type} {isolation.items.length > 1 ? `#${idx + 1}` : ''}</span>
                                                    <span className="font-mono font-medium">{iso.surface} m² · {iso.thickness} cm</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* VAT Line */}
                                    <div className="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-slate-100">
                                        <span className="font-bold text-slate-700">{t('quotes.vat_applicable', 'TVA Applicable')}</span>
                                        <span className="text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg text-xs">
                                            {form.work_type === 'new' ? t('quotes.type_new_vat', 'Neuf (21%)') : t('quotes.type_renovation_vat', 'Rénovation (6%)')}
                                        </span>
                                    </div>

                                    {/* Estimated Price */}
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="font-black text-slate-800 text-sm uppercase tracking-tight">
                                            {t('quotes.estimated_price_ttc', 'Prix Estimé (TTC)')}
                                        </span>
                                        <div className="relative w-36">
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="w-full text-right font-black text-lg bg-blue-50/70 border border-blue-200 text-blue-700 rounded-xl py-2 pr-8 pl-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={form.estimated_price}
                                                onChange={e => setForm({...form, estimated_price: e.target.value})}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 font-bold">€</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic text-right">
                                        {t('quotes.truck_extra_notice', '⚠️ Si distance > 125 km → +250 € déplacement camion (auto)')}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    {t('quotes.internal_notes_opt', 'Notes Internes (Optionnel)')}
                                </label>
                                <textarea 
                                    className="w-full h-24 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white"
                                    placeholder={t('quotes.details_notes', 'Détails supplémentaires...')}
                                    value={form.notes}
                                    onChange={e => setForm({...form, notes: e.target.value})}
                                ></textarea>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between shrink-0">
                    {step > 1 ? (
                        <button 
                            type="button" 
                            onClick={() => setStep(step - 1)} 
                            className="h-11 px-5 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                            <ChevronLeft className="w-4 h-4" /> {t('quotes.btn_back', 'Retour')}
                        </button>
                    ) : (
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="h-11 px-5 text-sm font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                        >
                            {t('quotes.btn_cancel', 'Annuler')}
                        </button>
                    )}

                    {step < 4 ? (
                        <button 
                            type="button" 
                            onClick={() => setStep(step + 1)} 
                            disabled={isNextDisabled()}
                            className="h-11 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 ml-auto"
                        >
                            {t('quotes.btn_next', 'Suivant')} <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button 
                            type="button" 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="h-11 px-7 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 ml-auto"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {t('quotes.btn_create_quote', 'Créer le Devis')}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

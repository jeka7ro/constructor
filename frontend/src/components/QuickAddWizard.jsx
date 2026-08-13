import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, Building2, Search, Loader2, ChevronRight, ChevronLeft, Save, Plus, Check } from 'lucide-react';
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
        work_type: 'new', // 'new' <10, 'repair' >10
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
        surface: '',
        thickness: '',
        has_foil: false,
        has_mesh: false,
        has_fiber: false,
        has_duramint: false
    });

    const [isolation, setIsolation] = useState({
        enabled: false,
        type: 'PUR',
        surface: '',
        thickness: '',
        pur_aspiration: false,
        pur_niveller: false,
        pur_poncage: false,
        pur_protection: false
    });

    const isNextDisabled = () => {
        if (step === 1) {
            if (clientMode === 'existing' && !form.client_id) return true;
            if (clientMode === 'new' && !newClient.name) return true;
        }
        if (step === 2) {
            if (sapa.enabled && (!sapa.surface || parseFloat(sapa.surface) <= 0)) return true;
        }
        return false;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let finalClientId = form.client_id;
            
            // 1. Save new client if needed
            if (clientMode === 'new') {
                const clientRes = await api.post('/admin/clients', {
                    client_type: newClient.client_type,
                    first_name: newClient.client_type === 'fizica' ? newClient.name.split(' ')[0] : '',
                    last_name: newClient.client_type === 'fizica' ? newClient.name.split(' ').slice(1).join(' ') : '',
                    company_name: newClient.client_type === 'juridica' ? newClient.name : null,
                    company_vat: newClient.cui,
                    email: newClient.email,
                    phone: newClient.phone
                });
                finalClientId = clientRes.data.id;
            }

            // 2. Prepare Volumes
            const volumes = [];
            if (sapa.enabled) {
                volumes.push({
                    label: 'Chape / Șapă',
                    quantity: parseFloat(sapa.surface) || 0,
                    thickness: parseFloat(sapa.thickness) || 0,
                    unit: 'm²',
                    has_foil: sapa.has_foil,
                    has_mesh: sapa.has_mesh,
                    has_fiber: sapa.has_fiber,
                    has_duramint: sapa.has_duramint
                });
            }
            if (isolation.enabled) {
                volumes.push({
                    label: `Isolation ${isolation.type}`,
                    quantity: parseFloat(isolation.surface) || 0,
                    thickness: parseFloat(isolation.thickness) || 0,
                    unit: 'm²',
                    pur_aspiration: isolation.pur_aspiration,
                    pur_niveller: isolation.pur_niveller,
                    pur_poncage: isolation.pur_poncage,
                    pur_protection: isolation.pur_protection
                });
            }

            // 3. Save Quote (WorkOrder with status pending)
            await api.post('/admin/work-orders', {
                client_id: finalClientId,
                approximate_date: form.approximate_date,
                work_type: form.work_type,
                estimated_price: form.estimated_price ? parseFloat(form.estimated_price) : null,
                notes: form.notes,
                status: 'pending',
                volumes: volumes
            });

            onSuccess();
        } catch (err) {
            console.error('Error saving quote:', err);
            if (showToast) {
                showToast("Erreur lors de l'enregistrement", 'error');
            } else {
                alert("Erreur lors de l'enregistrement");
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl relative animate-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Plus className="w-5 h-5 text-blue-600" />
                        </div>
                        {t('quotes.quick_add', 'Ajout Rapide Devis')}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Étape {step} / 4</span>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                            {step === 1 ? 'Client & Détails' : step === 2 ? 'Chape (Șapă)' : step === 3 ? 'Isolation' : 'Résumé'}
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                        <div className={`h-full bg-blue-500 rounded-full transition-all duration-300 ${step >= 1 ? 'w-1/4' : 'w-0'}`}></div>
                        <div className={`h-full bg-blue-500 rounded-full transition-all duration-300 ${step >= 2 ? 'w-1/4' : 'w-0'}`}></div>
                        <div className={`h-full bg-blue-500 rounded-full transition-all duration-300 ${step >= 3 ? 'w-1/4' : 'w-0'}`}></div>
                        <div className={`h-full bg-blue-500 rounded-full transition-all duration-300 ${step >= 4 ? 'w-1/4' : 'w-0'}`}></div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {/* STEP 1: CLIENT & DETAILS */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-full max-w-sm mx-auto mb-6">
                                <button type="button" onClick={() => setClientMode('existing')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${clientMode === 'existing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <Search className="w-4 h-4" /> Client Existant
                                </button>
                                <button type="button" onClick={() => setClientMode('new')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${clientMode === 'new' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <Plus className="w-4 h-4" /> Nouveau
                                </button>
                            </div>

                            {clientMode === 'existing' ? (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sélectionner un Client *</label>
                                    <SearchableSelect
                                        value={form.client_id}
                                        onChange={val => setForm({...form, client_id: val})}
                                        options={clients.map(c => ({
                                            value: c.id,
                                            label: c.name || c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
                                            subLabel: c.phone || c.email
                                        }))}
                                        placeholder="- Chercher un client -"
                                        buttonClassName="h-12 text-base rounded-xl border-slate-200"
                                    />
                                </div>
                            ) : (
                                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4">
                                    <div className="flex gap-2 bg-white p-1 rounded-xl max-w-xs border border-slate-100">
                                        <button type="button" onClick={() => setNewClient({ ...newClient, client_type: 'fizica' })}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${newClient.client_type === 'fizica' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                                            <User className="w-3.5 h-3.5" /> Particulier
                                        </button>
                                        <button type="button" onClick={() => setNewClient({ ...newClient, client_type: 'juridica' })}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${newClient.client_type === 'juridica' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                                            <Building2 className="w-3.5 h-3.5" /> Entreprise
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Nom / Raison Sociale *</label>
                                            <input type="text" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
                                        </div>
                                        {newClient.client_type === 'juridica' && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">TVA (Optionnel)</label>
                                                <input type="text" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm" value={newClient.cui} onChange={e => setNewClient({...newClient, cui: e.target.value})} />
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Téléphone</label>
                                            <input type="text" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                                            <input type="email" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Âge du Bâtiment (Pour TVA) *</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setForm({ ...form, work_type: 'new' })}
                                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all border ${form.work_type === 'new' ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                            &lt; 10 ans (Nou)
                                        </button>
                                        <button type="button" onClick={() => setForm({ ...form, work_type: 'repair' })}
                                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all border ${form.work_type === 'repair' ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                            &gt; 10 ans (Renovare)
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date Aprox. Travaux</label>
                                    <input 
                                        type="date"
                                        className="w-full h-[46px] border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.approximate_date}
                                        onChange={e => setForm({...form, approximate_date: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: SAPA */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input type="checkbox" checked={sapa.enabled} onChange={e => setSapa({...sapa, enabled: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                <span className="font-black text-slate-800 text-lg">Inclure Chape (Șapă)</span>
                            </label>

                            {sapa.enabled && (
                                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Surface (m²) *</label>
                                            <input type="number" min="0" className="w-full h-12 text-lg font-bold border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ex: 150" value={sapa.surface} onChange={e => setSapa({...sapa, surface: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Épaisseur (cm) *</label>
                                            <input type="number" step="0.1" min="0" className="w-full h-12 text-lg font-bold border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ex: 5.5" value={sapa.thickness} onChange={e => setSapa({...sapa, thickness: e.target.value})} />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Options Supplémentaires</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                                <input type="checkbox" checked={sapa.has_foil} onChange={e => setSapa({...sapa, has_foil: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-sm font-semibold text-slate-700">Folie PVC</span>
                                            </label>
                                            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                                <input type="checkbox" checked={sapa.has_mesh} onChange={e => setSapa({...sapa, has_mesh: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-sm font-semibold text-slate-700">Plasă (Treillis)</span>
                                            </label>
                                            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                                <input type="checkbox" checked={sapa.has_fiber} onChange={e => setSapa({...sapa, has_fiber: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-sm font-semibold text-slate-700">Fibră (Fibres)</span>
                                            </label>
                                            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                                <input type="checkbox" checked={sapa.has_duramint} onChange={e => setSapa({...sapa, has_duramint: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-sm font-semibold text-slate-700">Duramint</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: ISOLATION */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input type="checkbox" checked={isolation.enabled} onChange={e => setIsolation({...isolation, enabled: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                <span className="font-black text-slate-800 text-lg">Inclure Isolation</span>
                            </label>

                            {isolation.enabled && (
                                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type d'Isolation *</label>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setIsolation({ ...isolation, type: 'PUR' })}
                                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all border ${isolation.type === 'PUR' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                                PUR
                                            </button>
                                            <button type="button" onClick={() => setIsolation({ ...isolation, type: 'EPS' })}
                                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all border ${isolation.type === 'EPS' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                                EPS
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Surface (m²)</label>
                                            <input type="number" min="0" className="w-full h-12 text-lg font-bold border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder={sapa.surface || "150"} value={isolation.surface} onChange={e => setIsolation({...isolation, surface: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Épaisseur (cm)</label>
                                            <input type="number" step="0.1" min="0" className="w-full h-12 text-lg font-bold border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="ex: 8" value={isolation.thickness} onChange={e => setIsolation({...isolation, thickness: e.target.value})} />
                                        </div>
                                    </div>
                                    
                                    {isolation.type === 'PUR' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Options PUR</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                                    <input type="checkbox" checked={isolation.pur_aspiration} onChange={e => setIsolation({...isolation, pur_aspiration: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                                    <span className="text-sm font-semibold text-slate-700">Aspiration</span>
                                                </label>
                                                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                                    <input type="checkbox" checked={isolation.pur_niveller} onChange={e => setIsolation({...isolation, pur_niveller: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                                    <span className="text-sm font-semibold text-slate-700">Niveller</span>
                                                </label>
                                                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                                    <input type="checkbox" checked={isolation.pur_poncage} onChange={e => setIsolation({...isolation, pur_poncage: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                                    <span className="text-sm font-semibold text-slate-700">Ponçage</span>
                                                </label>
                                                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                                    <input type="checkbox" checked={isolation.pur_protection} onChange={e => setIsolation({...isolation, pur_protection: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                                    <span className="text-sm font-semibold text-slate-700">Protection</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: SUMMARY */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 text-center space-y-2">
                                <h4 className="text-lg font-black text-slate-800">Prêt à enregistrer</h4>
                                <p className="text-slate-500 text-sm">Ce devis sera ajouté dans la liste 'En attente' pour que vous puissiez lui générer un prix ou le planifier.</p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Récapitulatif</h4>
                                <div className="space-y-3">
                                    {sapa.enabled && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-slate-700">Șapă</span>
                                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono">{sapa.surface}m² / {sapa.thickness}cm</span>
                                        </div>
                                    )}
                                    {isolation.enabled && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-slate-700">Isolation {isolation.type}</span>
                                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono">{isolation.surface || sapa.surface}m² / {isolation.thickness}cm</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-slate-700">TVA Applicable</span>
                                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">{form.work_type === 'new' ? '21% (Nou)' : '6% (Rénovation)'}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes Internes (Optionnel)</label>
                                <textarea 
                                    className="w-full h-24 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Détails supplémentaires..."
                                    value={form.notes}
                                    onChange={e => setForm({...form, notes: e.target.value})}
                                ></textarea>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex items-center justify-between shrink-0">
                    {step > 1 ? (
                        <button type="button" onClick={() => setStep(step - 1)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors flex items-center gap-2">
                            <ChevronLeft className="w-4 h-4" /> Retour
                        </button>
                    ) : (
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors">
                            Annuler
                        </button>
                    )}

                    {step < 4 ? (
                        <button 
                            type="button" 
                            onClick={() => setStep(step + 1)} 
                            disabled={isNextDisabled()}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 ml-auto"
                        >
                            Suivant <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button 
                            type="button" 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-xl transition-all flex items-center gap-2 ml-auto"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Créer le Devis
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

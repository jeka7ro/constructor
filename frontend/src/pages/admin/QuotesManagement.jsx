// v2 - with delete button
import { useState, useEffect } from 'react'
import { Plus, Search, Calendar as CalendarIcon, User, MapPin, FileText, CalendarDays, Loader2, X, RefreshCw, CheckCircle2, AlertCircle, Save, Link, Phone, Check, ChevronRight, Pencil, Trash2, Paperclip } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import AddressAutocomplete from '../../components/AddressAutocomplete'
import SearchableSelect from '../../components/SearchableSelect'
import ConfirmModal from '../../components/ConfirmModal'
import DocumentPreviewModal from '../../components/DocumentPreviewModal'
import api from '../../lib/api'

function haversine(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}


/**
 * Calcule le prix total du devis — LOGIQUE IDENTIQUE À DevisView.buildItems().
 * Priorité: proforma_data.items → fallback volumes → fallback estimated_price.
 */
function computeQuoteTotalFromRow(row) {
    const wo = row;
    const p = wo.prices || {};
    let items = [];

    // ── PRIORITÉ 1: proforma_data.items (prixes custom, identique au PDF) ──
    const pRaw = wo.proforma_data?.items;
    if (pRaw && pRaw.length > 0) {
        const d0 = String(pRaw[0].desc || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const isPlaceholder = pRaw.length === 1 &&
            (pRaw[0].id === 'default' ||
             d0.includes('conform deviz') ||
             d0.includes('manoper') ||
             d0 === 'chape' || d0 === 'sapa' ||
             /sapa|chape/i.test(d0));
        if (!isPlaceholder) {
            items = pRaw.map(i => ({ qty: parseFloat(i.qty || 1), price: parseFloat(i.price || 0) }));
        }
    }

    // ── PRIORITÉ 2: calcul depuis volumes (fallback identique à DevisView) ──
    if (items.length === 0 && wo.volumes?.length > 0) {
        wo.volumes.forEach(vol => {
            const isChape = /[sșş]ap[aăâ]/i.test(vol.label || '') || /chape/i.test(vol.label || '') ||
                            (vol.label || '').toLowerCase().includes('sapa');
            const surface = parseFloat(vol.quantity || 0);
            const thick   = parseFloat(vol.thickness || 0);

            if (surface > 0) {
                if (isChape) {
                    const stdThick  = parseFloat(p.standard_thickness || 5);
                    const extraThick = Math.max(0, thick - stdThick);
                    items.push({ qty: surface, price: parseFloat(p.base || 12.5) });
                    if (extraThick > 0)
                        items.push({ qty: surface, price: extraThick * parseFloat(p.extra_thickness_price_per_cm || p.extra || 1.25) });
                    if (vol.has_foil)  items.push({ qty: surface, price: parseFloat(p.foil  || 1.2) });
                    if (vol.has_mesh)  items.push({ qty: surface, price: parseFloat(p.mesh  || 2.5) });
                    if (vol.has_fiber || vol.has_duramint)
                        items.push({ qty: surface, price: parseFloat(p.fiber || (surface <= 200 ? 2.5 : 2.0)) });
                } else {
                    // Volume non-chape: price unitaire stocké ou estimated_price / surface
                    const unitPrice = parseFloat(vol.price || 0) || (parseFloat(wo.estimated_price || 0) / (surface || 1));
                    if (unitPrice > 0) items.push({ qty: surface, price: unitPrice });
                }
            }
        });
    }

    // ── Surface thresholds (forfait) ──
    if (p.surface_thresholds?.length) {
        const surfCheck = parseFloat(wo.volumes?.[0]?.quantity || wo.surface_m2 || 0);
        p.surface_thresholds.forEach(t => {
            if (surfCheck >= parseFloat(t.min_sqm || 0) && surfCheck <= parseFloat(t.max_sqm || 999999)) {
                const charge = parseFloat(t.extra_charge || 0);
                if (charge > 0) items.push({ qty: 1, price: charge });
            }
        });
    }

    // Rien à calculer → retourner null (fallback à estimated_price)
    if (items.length === 0) return null;

    const totalNet        = items.reduce((s, i) => s + i.qty * i.price, 0);
    const netAfterDiscount = totalNet - parseFloat(p.discount || 0);

    // TVA — identique à DevisView (vat_type est un pourcentage: 21, 6, 0)
    let vatRate = 0;
    if (p.useVat !== false) {
        if (p.vat_type !== undefined) {
            vatRate = parseFloat(p.vat_type);
        } else if (wo.client_type === 'pj' || wo.client_type === 'juridica') {
            vatRate = 0;
        } else {
            vatRate = wo.work_type === 'repair' ? 6 : 21;
        }
    }

    const totalGross = netAfterDiscount * (1 + vatRate / 100);
    return totalGross > 0 ? totalGross : null;
}

/** Affiche le prix calculé — identique au PDF. Source: backend computed_total. Clic pour saisie manuelle. */
const EditablePrice = ({ row, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [manualInput, setManualInput] = useState(row.estimated_price ?? '')
    const [isSaving, setIsSaving] = useState(false)

    // Source unique de vérité: computed_total calculé sur le backend (= même logique que le PDF)
    // Fallback: estimated_price (pour anciens devis sans volumes ni proforma_data)
    const displayValue = row.computed_total ?? (row.estimated_price ? parseFloat(row.estimated_price) : null)

    const handleBlur = async () => {
        setIsEditing(false)
        const newVal = manualInput === '' ? null : parseFloat(manualInput)
        if (newVal === (row.estimated_price ?? null)) return
        setIsSaving(true)
        try {
            await api.put(`/admin/work-orders/${row.id}`, { estimated_price: newVal })
            onUpdate()
        } catch (e) {
            console.error(e)
            setManualInput(row.estimated_price ?? '')
        } finally {
            setIsSaving(false)
        }
    }

    const fmt = (val) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

    if (isEditing) {
        return (
            <div className="relative flex items-center w-36">
                <input
                    type="number" step="any"
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    onBlur={handleBlur}
                    className="w-full text-right text-sm font-semibold text-slate-800 border border-blue-400 focus:border-blue-500 rounded-lg pl-2 pr-7 py-1 bg-white outline-none shadow-sm"
                    disabled={isSaving}
                    autoFocus
                />
                <span className="absolute right-2 text-slate-400 pointer-events-none text-xs font-bold">€</span>
            </div>
        )
    }

    return (
        <div
            onClick={() => { setManualInput(row.estimated_price ?? ''); setIsEditing(true); }}
            className="flex items-baseline gap-1 cursor-pointer group"
            title="Cliquer pour saisir un prix manuel"
        >
            {isSaving
                ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                : <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {displayValue != null ? fmt(displayValue) : '—'}
                  </span>
            }
            <span className="text-xs text-slate-500 font-semibold">€</span>
        </div>
    )
}

const EditableUnitPrice = ({ row, onUpdate }) => {
    const [price, setPrice] = useState(row.volumes?.[0]?.price ?? '')
    const [isSaving, setIsSaving] = useState(false)
    
    const handleBlur = async () => {
        if (price === (row.volumes?.[0]?.price ?? '')) return
        setIsSaving(true)
        try {
            const p = price === '' ? null : parseFloat(price);
            let est = row.estimated_price;
            const q = row.volumes?.[0]?.quantity;
            if (p !== null && q) {
                est = parseFloat((p * parseFloat(q)).toFixed(2));
            }
            const updatedVolumes = [...(row.volumes || [])];
            if (updatedVolumes.length > 0) {
                updatedVolumes[0] = { ...updatedVolumes[0], price: p };
            }
            await api.put(`/admin/work-orders/${row.id}`, { 
                estimated_price: est,
                volumes: updatedVolumes
            })
            onUpdate()
        } catch (e) {
            console.error(e)
            setPrice(row.volumes?.[0]?.price ?? '')
        } finally {
            setIsSaving(false)
        }
    }
    
    return (
        <div className="relative w-24">
            <input 
                type="number" step="any"
                value={price}
                onChange={e => setPrice(e.target.value)}
                onBlur={handleBlur}
                className="w-full text-sm border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-2 py-1 bg-transparent transition-colors outline-none"
                placeholder="Prix/m²..."
                disabled={isSaving}
            />
            {isSaving && <Loader2 className="w-3 h-3 animate-spin absolute right-2 top-2 text-slate-400" />}
        </div>
    )
}

export default function QuotesManagement() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [quotes, setQuotes] = useState([])
    const [clients, setClients] = useState([])
    const [activities, setActivities] = useState([])
    const [previewDocs, setPreviewDocs] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sentToPlanningIds, setSentToPlanningIds] = useState(new Set())
    const [teams, setTeams] = useState([])
    const [planningModal, setPlanningModal] = useState(null) // { quote } when open
    const [planningForm, setPlanningForm] = useState({ date: '', time: '07:00', teamId: '' })
    const [isSendingPlanning, setIsSendingPlanning] = useState(false)
    
    // Bulk Delete State
    const [selectedIds, setSelectedIds] = useState([])
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(quotes.map(q => q.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (e, id) => {
        if (e.target.checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(x => x !== id));
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        try {
            for (const id of selectedIds) {
                await api.delete(`/admin/work-orders/${id}`);
            }
            showToast(t('quotes.bulk_delete_success', 'Devizele au fost șterse cu succes.'), 'success');
            setSelectedIds([]);
            fetchQuotes();
        } catch (error) {
            console.error("Bulk delete error", error);
            showToast(t('quotes.bulk_delete_error', 'Erreur lors de la suppression des devis.'), 'error');
        } finally {
            setIsBulkDeleting(false);
            setShowBulkDeleteConfirm(false);
        }
    };

    // Quick Add Form
    const [quickAddStep, setQuickAddStep] = useState(1) // 1: Info, 'new-client': New Client Form
    const [showQuickAdd, setShowQuickAdd] = useState(false)
    const [isSearchingVies, setIsSearchingVies] = useState(false)
    const [pricingSettings, setPricingSettings] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState({
        client_id: '',
        approximate_date: new Date().toISOString().split('T')[0],
        address: '',
        latitude: '',
        longitude: '',
        notes: '',
        estimated_price: '',
        vat_enabled: false,
        vat_type: '21',
        volumes: [{ label: '', quantity: '', unit: 'm²', thickness: '', has_foil: false, has_mesh: false, has_fiber: false }],
        prices: { base: 12.5, extra: 1.25, foil: 1.2, mesh: 2.5, fiber: 2.0 }
    })
    
    const [newClient, setNewClient] = useState({
        name: '', phone: '', email: '', client_type: 'fizica', country: 'RO', cui: '', address: ''
    })

    const [toast, setToast] = useState(null)
    const showToast = (msg, type = 'error') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: 'danger', title: '', message: '', confirmText: '', action: null })

    const updateVolume = (index, key, value) => {
        setForm(prev => {
            const newVolumes = [...prev.volumes];
            newVolumes[index] = { ...newVolumes[index], [key]: value };
            return { ...prev, volumes: newVolumes };
        });
    };

    const addVolume = () => {
        setForm(prev => ({
            ...prev,
            volumes: [...prev.volumes, { label: activities.length > 0 ? activities[0].name : '', quantity: '', unit: 'm²', thickness: '', has_foil: false, has_mesh: false, has_fiber: false }]
        }));
    };

    const removeVolume = (index) => {
        setForm(prev => {
            if (prev.volumes.length <= 1) return prev;
            const newVolumes = [...prev.volumes];
            newVolumes.splice(index, 1);
            return { ...prev, volumes: newVolumes };
        });
    };


    useEffect(() => {
        const fetchClientPricing = async () => {
            if (!form.client_id) {
                try {
                    const res = await api.get('/admin/pricing-settings');
                    setPricingSettings(res.data);
                } catch (e) {}
                return;
            }
            try {
                const res = await api.get(`/admin/pricing-settings?client_id=${form.client_id}`);
                setPricingSettings(res.data);
            } catch (error) {
                console.error("Failed to fetch client pricing settings", error);
            }
        };
        fetchClientPricing();
    }, [form.client_id]);

    useEffect(() => {
        fetchQuotes()
        fetchClients()
        fetchActivities()
        fetchTeams()

        // Auto-refresh: poll every 30s pentru devize noi (fara F5)
        const interval = setInterval(() => {
            fetchQuotes()
        }, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchTeams = async () => {
        try {
            const res = await api.get('/admin/teams')
            const data = res.data
            setTeams(Array.isArray(data) ? data : (data?.teams || data?.items || []))
        } catch (e) { console.error('fetchTeams', e) }
    }

    const fetchQuotes = async () => {
        setLoading(true)
        try {
            const res = await api.get('/admin/work-orders?is_quote=true')
            setQuotes(res.data.filter(q => q.status !== 'cancelled'))
        } catch (e) {
            console.error('Failed to load quotes', e)
        } finally {
            setLoading(false)
        }
    }

    const handleViesSearch = async () => {
        if (!newClient.cui) return;
        setIsSearchingVies(true);
        try {
            const vatClean = newClient.cui.replace(/[^A-Za-z0-9]/g, '');
            let country = newClient.country || 'RO';
            let vatNum = vatClean;
            
            if (vatClean.length > 2 && isNaN(vatClean.charAt(0))) {
                country = vatClean.substring(0, 2).toUpperCase();
                vatNum = vatClean.substring(2);
            }

            const res = await api.get(`/admin/clients/vies/${country}/${vatNum}`);
            if (res.data && res.data.valid) {
                setNewClient(p => ({
                    ...p,
                    name: res.data.name || p.name,
                    address: res.data.address || p.address,
                    cui: country + vatNum,
                    country: country
                }));
            }
        } catch (error) {
            console.error('VIES Error:', error);
            showToast(t('clients.vies_error', "L'entreprise n'a pas été trouvée ou le service VIES est indisponible. Vérifiez le numéro de TVA."), 'error');
        } finally {
            setIsSearchingVies(false);
        }
    }

    const fetchClients = async () => {
        try {
            const res = await api.get('/admin/clients')
            setClients(Array.isArray(res.data) ? res.data : (res.data?.items || []))
        } catch (e) {}
    }

    const fetchActivities = async () => {
        try {
            const res = await api.get('/activities/?is_active=true')
            const acts = res.data?.activities || (Array.isArray(res.data) ? res.data.flatMap(c => c.activities || []) : [])
            setActivities(acts)
            
            // Set default volume label if activities exist, preferring 'sapa'
            if (acts.length > 0 && !editingId) {
                const sapaAct = acts.find(a => {
                    const n = (a.name ?? '').toLowerCase()
                    return n.includes('sapa') || n.includes('șapă') || n.includes('chape')
                })
                setForm(p => ({
                    ...p,
                    volumes: [{ ...p.volumes[0], label: sapaAct ? sapaAct.name : (acts[0].name ?? '') }]
                }))
            }
        } catch (e) {}
    }

    const handleCreateQuote = async () => {
        setIsSaving(true)
        try {
            let finalClientId = form.client_id
            let finalClientName = null

            // Daca cream client nou
            if (form.client_id === 'NEW' || quickAddStep === 'new-client') {
                const cRes = await api.post('/admin/clients', newClient)
                finalClientId = cRes.data.id
                finalClientName = cRes.data.name
                setClients(prev => [...prev, cRes.data])
            } else if (form.client_id) {
                const c = clients.find(x => x.id === form.client_id)
                if (c) finalClientName = c.name
            }

            const payload = {
                title: form.volumes[0].label,
                is_quote: true,
                approximate_date: form.approximate_date,
                site_address: form.address,
                site_latitude: form.latitude ? parseFloat(form.latitude) : null,
                site_longitude: form.longitude ? parseFloat(form.longitude) : null,
                client_id: finalClientId,
                client_name: finalClientName,
                volumes: form.volumes,
                prices: form.prices,
                estimated_price: form.estimated_price ? form.estimated_price.toString() : null,
                notes: form.notes ?? ''
            }

            if (editingId) {
                await api.put(`/admin/work-orders/${editingId}`, payload)
            } else {
                await api.post('/admin/work-orders', payload)
            }
            
            // Reset form
            setForm({ 
                client_id: '', approximate_date: new Date().toISOString().split('T')[0], address: '', latitude: '', longitude: '', notes: '', estimated_price: '',
                volumes: [{ label: activities.length > 0 ? activities[0].name : '', quantity: '', unit: 'm²', thickness: '', has_foil: false, has_mesh: false, has_fiber: false }],
                prices: { base: 12.5, extra: 1.25, foil: 1.2, mesh: 2.5, fiber: 2.0 }
            })
            setEditingId(null)
            setQuickAddStep(1)
            fetchQuotes()
            showToast(t('quotes.success_create', 'Le devis a été enregistré avec succès.'), 'success')
        } catch (e) {
            showToast(t('quotes.err_create', "Erreur lors de l'enregistrement du devis"), 'error')
            console.error(e)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setShowQuickAdd(false)
        setForm({ 
            client_id: '', approximate_date: new Date().toISOString().split('T')[0], address: '', latitude: '', longitude: '', notes: '', estimated_price: '',
            vat_enabled: false, vat_type: '21',
            volumes: [{ label: activities.length > 0 ? activities[0].name : '', quantity: '', unit: 'm²', thickness: '', has_foil: false, has_mesh: false, has_fiber: false }],
            prices: { base: 12.5, extra: 1.25, foil: 1.2, mesh: 2.5, fiber: 2.0 }
        })
        setQuickAddStep(1)
    }

    const columns = [
        {
            key: 'checkbox',
            label: (
                <input 
                    type="checkbox" 
                    checked={quotes.length > 0 && selectedIds.length === quotes.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
            ),
            sortable: false,
            render: (row) => (
                <input 
                    type="checkbox" 
                    checked={selectedIds.includes(row.id)}
                    onChange={(e) => handleSelectRow(e, row.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                />
            )
        },
        {
            key: 'created_at',
            label: t('quotes.quote_details', 'N° Devis / Date'),
            sortable: true,
            render: (row) => {
                let display = '-'
                if (row.created_at) {
                    try {
                        const d = new Date(row.created_at)
                        if (!isNaN(d.getTime())) {
                            display = d.toLocaleDateString('ro-RO')
                        } else {
                            display = row.created_at
                        }
                    } catch(e) {
                        display = row.created_at
                    }
                }
                const getStatusDot = (status) => {
                    const map = {
                        planning:  { color: 'bg-emerald-500 animate-pulse', label: t('status.planning', 'En planning'),  text: 'text-emerald-700' },
                        confirmed: { color: 'bg-green-500',                 label: t('status.confirmed', 'Signé'),       text: 'text-green-700'   },
                        completed: { color: 'bg-slate-400',                 label: t('status.completed', 'Terminé'),     text: 'text-slate-500'   },
                        cancelled: { color: 'bg-red-400',                   label: t('status.cancelled', 'Annulé'),      text: 'text-red-500'     },
                    }
                    const cfg = map[status] || { color: 'bg-amber-400', label: t('status.pending', 'En attente'), text: 'text-amber-600' }
                    return (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${cfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${cfg.color}`}></span>
                            {cfg.label}
                        </span>
                    )
                }
                const getSourceBadge = (src) => {
                    if (src === 'calculator_public') return (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-green-600 whitespace-nowrap">
                            <span>📊</span> Calculator
                        </span>
                    )
                    if (src === 'devis_online') return (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-blue-500 whitespace-nowrap">
                            <span>🔗</span> Devis en ligne
                        </span>
                    )
                    return null
                }
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm text-slate-700">
                            <span>
                                {row.quote_number || '-'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1 text-slate-500">
                                <CalendarDays className="w-4 h-4 text-slate-400" />
                                <span>{display}</span>
                            </div>
                        </div>
                        {getStatusDot(row.status)}
                        {getSourceBadge(row.source_system)}
                    </div>
                )
            }
        },
        {
            key: 'client_name',
            label: t('quotes.client_address', 'Client & Adresse'),
            sortable: true,
            render: (row) => {
                const addr = row.site_address;

                return (
                    <div className="flex flex-col gap-0.5 min-w-[300px]">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                            <User className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="whitespace-nowrap" title={row.client_name}>{row.client_name || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 pl-6 text-sm text-slate-500">
                            {addr ? (
                                <span className="whitespace-nowrap" title={addr}>{addr}</span>
                            ) : (
                                <span className="italic">—</span>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'surface_thickness',
            label: t('quotes.surface_thickness', 'Suprafață / Grosime'),
            sortable: true,
            render: (row) => {
                let displayDate = '';
                if (row.approximate_date) {
                    try {
                        const d = new Date(row.approximate_date)
                        if (!isNaN(d.getTime())) displayDate = d.toLocaleDateString('ro-RO')
                    } catch(e) {}
                }
                
                return (
                    <div className="flex flex-col gap-0.5 text-sm text-slate-700">
                        <div className="flex items-center gap-1.5">
                            <span>{row.volumes?.[0]?.quantity ? `${row.volumes[0].quantity} m²` : '-'}</span>
                            {row.route_distance_km > 0 && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-500">{Math.round(row.route_distance_km)} km</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <span className="uppercase">{row.volumes?.[0]?.thickness ? `${row.volumes[0].thickness} cm` : '-'}</span>
                            {displayDate && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    <span className="flex items-center gap-1">
                                        <CalendarDays className="w-4 h-4 text-slate-400" />
                                        {displayDate}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'estimated_price',
            label: t('quotes.price', 'Prix (€)'),
            sortable: true,
            render: (row) => (
                <EditablePrice row={row} onUpdate={fetchQuotes} />
            )
        },

        {
            key: 'actions',
            label: '',
            render: (row) => (
                <div className="flex justify-end gap-2 items-center">
                    {row.token && (
                        <button 
                            title={t('quotes.copy_link', 'Copier le lien client')}
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`${window.location.origin}/confirm/${row.token}`);
                                showToast(t('quotes.link_copied', 'Le lien du client a été copié dans le presse-papiers !'), 'success');
                            }}
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                        >
                            <Link className="w-4 h-4" />
                        </button>
                    )}

                    <button 
                        title="Voir Devis PDF"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/quotes/${row.id}/pdf`)
                        }}
                        className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                    </button>
                    <button 
                        title="Planifier — choisir date/heure/équipe"
                        onClick={(e) => {
                            e.stopPropagation();
                            const todayStr = new Date().toISOString().split('T')[0]
                            setPlanningForm({ date: row.approximate_date ? row.approximate_date.split('T')[0] : todayStr, time: '07:00', teamId: '' })
                            setPlanningModal(row)
                        }}
                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
                    >
                        <CalendarDays className="w-4 h-4" />
                    </button>
                    <button 
                        title={t('quotes.btn_edit', 'Modifier')}
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(row.id)
                            setShowQuickAdd(true)
                            setForm({
                                client_id: row.client_id ?? '',
                                approximate_date: row.approximate_date ? row.approximate_date.split('T')[0] : '',
                                address: row.site_address ?? '',
                                latitude: row.site_latitude ?? '',
                                longitude: row.site_longitude ?? '',
                                notes: row.notes ?? '',
                                estimated_price: row.estimated_price ?? '',
                                vat_enabled: row.vat_enabled || false,
                                vat_type: row.vat_type || '21',
                                volumes: row.volumes?.length > 0 ? row.volumes : [{ label: '', quantity: '', unit: 'm²', thickness: '', price: '', has_foil: false, has_mesh: false, has_fiber: false }],
                                prices: row.prices || { base: 12.5, extra: 1.25, foil: 1.2, mesh: 2.5, fiber: 2.0 }
                            })
                            setQuickAddStep(1)
                            // Scroll to top
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        title="Supprimer le devis"
                        onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({
                                isOpen: true,
                                title: 'Supprimer le devis',
                                message: 'Êtes-vous sûr de vouloir supprimer définitivement ce devis ? Cette action est irréversible.',
                                confirmText: 'Supprimer le devis',
                                type: 'danger',
                                action: async () => {
                                    try {
                                        await api.delete(`/admin/work-orders/${row.id}`);
                                        if (typeof fetchQuotes === 'function') fetchQuotes();
                                        else window.location.reload();
                                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                    } catch (err) {
                                        console.error(err);
                                        showToast(t('quotes.err_delete', 'Erreur lors de la suppression du devis.'), 'error');
                                    }
                                }
                            });
                        }}
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ]

    // Calculation variables for render
    let autoNet = 0;
    let autoBase = 0;
    let autoExtra = 0;
    let autoFoil = 0;
    let autoMesh = 0;
    let autoFiber = 0;
    let isAutoRender = false;
    let surfaceForAuto = 0;
    let extraThickForAuto = 0;

    let autoExtraCharge = 0;

    form.volumes.forEach(vol => {
        const surface = parseFloat(vol.quantity) || 0;
        const labelSafe = (vol.label ?? '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (labelSafe.includes('sapa') || labelSafe.includes('chape')) {
            surfaceForAuto += surface;
        }
    });

    form.volumes.forEach(vol => {
        const surface = parseFloat(vol.quantity) || 0;
        const thickness = parseFloat(vol.thickness) || 0;
        const labelSafe = (vol.label ?? '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (labelSafe.includes('sapa') || labelSafe.includes('chape')) {
            isAutoRender = true;
            const standardThick = pricingSettings?.standard_thickness_cm ?? 5;
            const extraThickness = Math.max(0, thickness - standardThick);
            extraThickForAuto += extraThickness;
            autoBase += (parseFloat(form.prices?.base || pricingSettings?.base_price_sqm || 12.5) * surface);
            autoExtra += extraThickness * parseFloat(form.prices?.extra || pricingSettings?.extra_thickness_price_per_cm || 1.25) * surface;
            autoFoil += vol.has_foil ? parseFloat(form.prices?.foil || pricingSettings?.plastic_foil_price_sqm || 1.2) * surface : 0;
            autoMesh += vol.has_mesh ? parseFloat(form.prices?.mesh || pricingSettings?.metal_mesh_price_sqm || 2.5) * surface : 0;
            
            const fiberPrice = parseFloat(form.prices?.fiber) || (surfaceForAuto <= (pricingSettings?.fiber_large_threshold_sqm ?? 200) ? (pricingSettings?.fiber_price_sqm ?? 2.5) : (pricingSettings?.fiber_price_sqm_large ?? 2.0));
            autoFiber += vol.has_fiber ? fiberPrice * surface : 0;
        }
    });

    if (pricingSettings?.surface_thresholds?.length && surfaceForAuto > 0) {
        const matching = pricingSettings.surface_thresholds.find(t => surfaceForAuto >= t.min_sqm && surfaceForAuto <= t.max_sqm);
        if (matching) {
            autoExtraCharge = parseFloat(matching.extra_charge) || 0;
        }
    }

    autoNet = autoBase + autoExtra + autoFoil + autoMesh + autoFiber + autoExtraCharge;
    const clientForRender = clients.find(c => c.id === form.client_id);
    // TVA = controlled by user toggle, NOT automatic
    const vatRate = form.vat_enabled ? (form.vat_type === '6' ? 0.06 : form.vat_type === '0' ? 0 : 0.21) : 0;
    let autoVat = autoNet * vatRate;
    let totalGross = autoNet + autoVat;

    useEffect(() => {
        if (isAutoRender && totalGross > 0) {
            setForm(p => p.estimated_price === totalGross.toFixed(2) ? p : { ...p, estimated_price: totalGross.toFixed(2) })
        }
    }, [totalGross, isAutoRender]);

    const handleSendToCalendar = async () => {
        if (!planningForm.date) return showToast('Sélectionnez une date !', 'error')
        setIsSendingPlanning(true)
        try {
            await api.put(`/admin/work-orders/${planningModal.id}`, {
                start_date: planningForm.date,
                start_time: planningForm.time || '07:00',
                assigned_team_id: planningForm.teamId || null,
                status: 'planning'
                // is_quote rămâne TRUE — devisul rămâne în lista devis cu badge EN PLANNING
            })
            // Updateaza row-ul in lista (rămâne vizibil, badge devine EN PLANNING)
            setQuotes(prev => prev.map(q => q.id === planningModal.id
                ? { ...q, status: 'planning', start_date: planningForm.date, start_time: planningForm.time }
                : q
            ))
            setPlanningModal(null)
            showToast('✅ Devis planifié dans le calendrier!', 'success')
        } catch (e) {
            console.error(e)
            showToast('Erreur lors de la planification.', 'error')
        } finally {
            setIsSendingPlanning(false)
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-64px)]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('quotes.title_main', 'Devis / Oferte')}</h2>
                    <p className="text-slate-500 text-sm">{t('quotes.subtitle', 'Gérer les demandes de devis avant la planification')}</p>
                </div>
                {!showQuickAdd && (
                    <button 
                        onClick={() => setShowQuickAdd(true)}
                        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('quotes.quick_add', 'Ajout Rapide Devis')}
                    </button>
                )}
            </div>

            {/* Quick Add Form */}
            {showQuickAdd && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 shrink-0 relative">
                    <button onClick={() => setShowQuickAdd(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
                        <X className="w-5 h-5" />
                    </button>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-emerald-600" />
                        {t('quotes.quick_add', 'Ajout Rapide Devis')}
                    </h3>

                {!editingId && (
                    <div className="space-y-4">
                        {quickAddStep === 'new-client' && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-blue-100 relative mb-2">
                                <button onClick={() => { setQuickAddStep(1); setForm({...form, client_id: ''}) }} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-1">
                                    <X className="w-4 h-4" />
                                </button>
                                <h4 className="text-sm font-bold text-blue-800 mb-3">{t('quotes.add_new_client', 'Ajouter un Nouveau Client')}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('dashboard.quick_create.client_type', 'Type de Client')}</label>
                                        <select className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm" value={newClient.client_type} onChange={e => setNewClient({...newClient, client_type: e.target.value})}>
                                            <option value="fizica">{t('dashboard.quick_create.individual', 'Particulier')}</option>
                                            <option value="juridica">{t('dashboard.quick_create.legal_entity', 'Entreprise')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('dashboard.quick_create.client_name', 'Nom / Raison Sociale *')}</label>
                                        <input type="text" className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{newClient.client_type === 'juridica' ? t('dashboard.quick_create.cui', 'TVA (Optionnel)') : t('dashboard.quick_create.cnp', 'Numéro National (Optionnel)')}</label>
                                        <div className="flex gap-1">
                                            <input type="text" className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm" value={newClient.cui} onChange={e => setNewClient({...newClient, cui: e.target.value})} />
                                            {newClient.client_type === 'juridica' && (
                                                <button type="button" onClick={handleViesSearch} disabled={isSearchingVies || !newClient.cui} className="h-9 px-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 hover:bg-blue-100 disabled:opacity-50 flex items-center justify-center shrink-0" title="Rechercher l'entreprise dans VIES">
                                                    {isSearchingVies ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('dashboard.quick_create.phone', 'Téléphone')}</label>
                                        <input type="text" className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('dashboard.quick_create.email', 'Email')}</label>
                                        <input type="email" className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            {/* Row 1 */}
                            {quickAddStep !== 'new-client' && (
                            <div className="md:col-span-3">
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('quotes.field_client', 'Client')}</label>
                                <SearchableSelect
                                    value={form.client_id}
                                    onChange={val => {
                                        if (val === 'NEW') setQuickAddStep('new-client')
                                        else setForm({...form, client_id: val})
                                    }}
                                    options={[
                                        { value: 'NEW', label: `+ ${t('quotes.new_client', 'Nouveau Client')}` },
                                        ...clients.map(c => ({
                                            value: c.id,
                                            label: c.name || c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || t('quotes.unknown', 'Inconnu'),
                                            subLabel: c.phone || c.email || c.address || c.company_address || ''
                                        }))
                                    ]}
                                    placeholder={t('common.select', '- Sélectionner -')}
                                    buttonClassName="rounded-xl h-9 border-slate-200 !text-sm bg-white"
                                />
                            </div>
                            )}

                            <div className={`md:col-span-2 ${quickAddStep === 'new-client' ? 'md:col-start-1' : ''}`}>
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('quotes.approx_date', 'Date Aprox.')}</label>
                                <input 
                                    type="date"
                                    className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={form.approximate_date}
                                    onChange={e => setForm({...form, approximate_date: e.target.value})}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('quotes.total_est', 'Total Est. (€)')}</label>
                                <input type="number" step="0.01" min="0" placeholder="0.00"
                                    className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={form.estimated_price ?? ''}
                                    onChange={e => setForm({...form, estimated_price: e.target.value})}
                                />
                            </div>

                            <div className={`md:col-span-${quickAddStep === 'new-client' ? '8' : '5'}`}>
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('quotes.details_notes', 'Détails / Observations')}</label>
                                <input type="text" placeholder="..."
                                    className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={form.notes ?? ''}
                                    onChange={e => setForm({...form, notes: e.target.value})}
                                />
                            </div>

                            <div className="md:col-span-12">
                                <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">{t('quotes.volumes', 'Travaux / Étages')}</label>
                                <div className="space-y-3">
                                    {form.volumes.map((vol, index) => {
                                        const isSapa = (vol.label ?? '').toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes('sapa') || (vol.label ?? '').toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes('chape');
                                        
                                        return (
                                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 bg-slate-50 rounded-xl border border-slate-100 relative group">
                                            <div className="md:col-span-4">
                                                <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('quotes.field_title', 'Type de Travail')}</label>
                                                <select 
                                                    className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                    value={vol.label}
                                                    onChange={e => updateVolume(index, 'label', e.target.value)}
                                                >
                                                    <option value="">- {t('common.activities', 'Activité')} -</option>
                                                    {activities.map(a => <option key={a.id || a.name} value={a.name}>{a.name}</option>)}
                                                </select>
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-[11px] font-medium text-slate-500 mb-1">M²</label>
                                                <input type="number" min="0" placeholder="150"
                                                    className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={vol.quantity}
                                                    onChange={e => updateVolume(index, 'quantity', e.target.value)}
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-[11px] font-medium text-slate-500 mb-1">Cm</label>
                                                <input type="number" step="any" min="0" placeholder="5.5"
                                                    className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={vol.thickness}
                                                    onChange={e => updateVolume(index, 'thickness', e.target.value)}
                                                />
                                            </div>

                                            {isSapa && (
                                                <div className="md:col-span-12 lg:col-span-4 flex flex-wrap gap-x-3 gap-y-1 items-end pb-2">
                                                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                                                        <input type="checkbox" checked={vol.has_foil} onChange={e => updateVolume(index, 'has_foil', e.target.checked)} className="rounded border-slate-300 w-3.5 h-3.5 text-blue-600 focus:ring-blue-500" />
                                                        {t('quotes.foil', 'Film PVC')}
                                                    </label>
                                                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                                                        <input type="checkbox" checked={vol.has_mesh} onChange={e => updateVolume(index, 'has_mesh', e.target.checked)} className="rounded border-slate-300 w-3.5 h-3.5 text-blue-600 focus:ring-blue-500" />
                                                        {t('quotes.mesh', 'Treillis')}
                                                    </label>
                                                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                                                        <input type="checkbox" checked={vol.has_fiber} onChange={e => updateVolume(index, 'has_fiber', e.target.checked)} className="rounded border-slate-300 w-3.5 h-3.5 text-blue-600 focus:ring-blue-500" />
                                                        {t('quotes.duramint', 'Fibre')}
                                                    </label>
                                                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                                                        <input type="checkbox" checked={vol.has_duramint} onChange={e => updateVolume(index, 'has_duramint', e.target.checked)} className="rounded border-slate-300 w-3.5 h-3.5 text-blue-600 focus:ring-blue-500" />
                                                        {t('quotes.duramint', 'Duramint')}
                                                    </label>
                                                </div>
                                            )}

                                            {index > 0 && (
                                                <button type="button" onClick={() => removeVolume(index)} className="absolute top-2 right-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )})}
                                    <div className="flex justify-end">
                                        <button type="button" onClick={addVolume} className="flex items-center justify-center gap-1 px-3 h-8 border border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50 rounded-xl text-[11px] font-bold transition-colors w-fit">
                                            <Plus className="w-3 h-3" /> {t('quotes.add_another', 'Ajouter un autre')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-12">
                                <label className="block text-[11px] font-medium text-slate-500 mb-1 flex items-center justify-between">
                                    <span>{t('quotes.field_address', 'Adresse')}</span>
                                    {form.latitude && form.longitude && (
                                        <span className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded text-[9px] font-bold">
                                            Aller: {(haversine(50.88243, 4.39343, parseFloat(form.latitude), parseFloat(form.longitude))).toFixed(1)}km | Retour: {(haversine(50.88243, 4.39343, parseFloat(form.latitude), parseFloat(form.longitude)) * 2).toFixed(1)}km
                                        </span>
                                    )}
                                </label>
                                <AddressAutocomplete 
                                    onSelect={({ address, lat, lon }) => setForm(f => ({...f, address: address ?? '', latitude: lat ?? '', longitude: lon ?? ''}))}
                                    value={form.address}
                                    className="h-9 rounded-xl"
                                />
                            </div>

                            {isAutoRender && (
                                <div className="md:col-span-12 bg-indigo-50/50 rounded-xl p-2.5 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-[11px] shadow-sm">
                                    <div className="flex items-center gap-4 border-r border-indigo-200 pr-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-indigo-800 font-black text-[10px] tracking-widest">{t('quotes.calc_label', 'CALCUL:')}</span>
                                            <span className="text-slate-500 font-bold text-[10px] uppercase">{t('quotes.base', 'BASE')}</span>
                                            <input type="number" step="0.1" value={form.prices?.base ?? ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, base: e.target.value}}))} className="w-14 h-7 px-1 border border-slate-200 rounded shadow-inner text-center font-black text-indigo-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        {extraThickForAuto > 0 && (
                                            <div className="flex items-center gap-1.5" title="Grosime suplimentară (>5cm)">
                                                <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.extra_cm', 'EXTRA CM')}</span>
                                                <input type="number" step="0.1" value={form.prices?.extra ?? ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, extra: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        )}
                                        {form.volumes.some(v => v.has_foil) && (
                                            <div className="flex items-center gap-1.5" title="Folie PVC">
                                                <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.foil', 'FOLIE')}</span>
                                                <input type="number" step="0.1" value={form.prices?.foil ?? ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, foil: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        )}
                                        {form.volumes.some(v => v.has_mesh) && (
                                            <div className="flex items-center gap-1.5" title="Treillis métallique">
                                                <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.mesh', 'PLASĂ')}</span>
                                                <input type="number" step="0.1" value={form.prices?.mesh ?? ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, mesh: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        )}
                                        {form.volumes.some(v => v.has_fiber || v.has_duramint) && (
                                            <div className="flex items-center gap-1.5" title="Duramint (Fibră)">
                                                <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.duramint', 'FIBRĂ')}</span>
                                                <input type="number" step="0.1" value={form.prices?.fiber ?? ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, fiber: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 border-l border-indigo-200 pl-3">
                                        {/* TVA Toggle */}
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setForm(f => ({ ...f, vat_enabled: !f.vat_enabled }))}
                                                    className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                                                        form.vat_enabled ? 'bg-amber-500' : 'bg-slate-300'
                                                    }`}
                                                >
                                                    <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
                                                        form.vat_enabled ? 'translate-x-4' : 'translate-x-0.5'
                                                    }`} />
                                                </button>
                                                <span className="text-[9px] font-bold text-amber-600 uppercase">TVA</span>
                                            </div>
                                            {form.vat_enabled && (
                                                <div className="flex gap-1.5 mt-0.5">
                                                    <label className="flex items-center gap-0.5 cursor-pointer">
                                                        <input type="radio" name="vatTypeForm" value="21"
                                                            checked={form.vat_type === '21'}
                                                            onChange={() => setForm(f => ({ ...f, vat_type: '21' }))}
                                                            className="w-3 h-3 text-amber-500"
                                                        />
                                                        <span className="text-[9px] text-amber-700 font-bold">21% Nou</span>
                                                    </label>
                                                    <label className="flex items-center gap-0.5 cursor-pointer">
                                                        <input type="radio" name="vatTypeForm" value="6"
                                                            checked={form.vat_type === '6'}
                                                            onChange={() => setForm(f => ({ ...f, vat_type: '6' }))}
                                                            className="w-3 h-3 text-amber-500"
                                                        />
                                                        <span className="text-[9px] text-amber-700 font-bold">6% Renov.</span>
                                                    </label>
                                                    {clientForRender?.client_type === 'juridica' && (
                                                        <label className="flex items-center gap-0.5 cursor-pointer">
                                                            <input type="radio" name="vatTypeForm" value="0"
                                                                checked={form.vat_type === '0'}
                                                                onChange={() => setForm(f => ({ ...f, vat_type: '0' }))}
                                                                className="w-3 h-3 text-amber-500"
                                                            />
                                                            <span className="text-[9px] text-amber-700 font-bold">0% BTW</span>
                                                        </label>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end leading-tight">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{t('quotes.net', 'Net')}</span>
                                            <span className="text-slate-600 font-bold">{autoNet.toFixed(2)}</span>
                                        </div>
                                        {form.vat_enabled && autoVat > 0 && (
                                            <div className="flex flex-col items-end leading-tight">
                                                <span className="text-[9px] font-bold text-amber-500 uppercase">TVA {form.vat_type}%</span>
                                                <span className="text-amber-600 font-bold">{autoVat.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 bg-indigo-600 text-white px-2 py-1 rounded shadow-sm ml-1">
                                            <span className="text-[10px] font-medium uppercase opacity-90">{t('quotes.total_est_short', 'Total Est.')}</span>
                                            <span className="text-sm font-black">{totalGross.toFixed(2)} €</span>
                                        </div>
                                    </div>
                                </div>
                            )}


                            <div className="md:col-span-3 flex justify-end gap-2">
                                <button 
                                    onClick={handleCreateQuote}
                                    disabled={isSaving || (quickAddStep === 'new-client' && (!newClient.name || !form.volumes[0]?.label))}
                                    className="flex-1 h-9 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    {quickAddStep === 'new-client' ? t('quotes.btn_save_with_client', 'Créer Client & Enregistrer Devis') : t('quotes.btn_save', 'Enregistrer le Devis')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* Table */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[300px]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <h2 className="font-bold text-slate-700">{t('quotes.list_title', 'Liste des Devis en Attente')}</h2>
                        <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                            {quotes.length} {t('quotes.total', 'total')}
                        </span>
                    </div>
                    {selectedIds.length > 0 && (
                        <button 
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border border-red-200"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('common.delete_selected', 'Șterge')} ({selectedIds.length})
                        </button>
                    )}
                </div>
                
                <DataTable 
                    columns={columns}
                    data={quotes}
                    loading={loading}
                    defaultPageSize={25}
                    storageKey="admin_quotes"
                    defaultSortKey="created_at"
                    defaultSortDir="desc"
                    searchable={true}
                    searchPlaceholder={t('quotes.search', 'Rechercher un devis...')}
                    emptyText={t('quotes.empty', 'Aucun devis en attente.')}
                    onRowClick={(row) => navigate(`/admin/work-orders/${row.id}`, { state: { from: '/admin/quotes' } })}
                    rowClassName={() => 'cursor-pointer hover:bg-blue-50/40 transition-colors'}
                />
            </div>

            {/* Edit Modal */}
            {editingId && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Pencil className="w-5 h-5 text-blue-600" />
                                Modifier le Devis
                            </h3>
                            <button onClick={handleCancelEdit} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                {/* Row 1 */}
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('quotes.field_client', 'Client')}</label>
                                    <SearchableSelect
                                        value={form.client_id}
                                        onChange={val => setForm({...form, client_id: val})}
                                        options={[
                                            ...clients.map(c => ({
                                                value: c.id,
                                                label: c.name || c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || t('quotes.unknown', 'Inconnu'),
                                                subLabel: c.phone || c.email || c.address || c.company_address || ''
                                            }))
                                        ]}
                                        placeholder={t('common.select', '- Sélectionner -')}
                                        buttonClassName="rounded-xl h-10 border-slate-200 text-sm bg-white"
                                    />
                                </div>

                                <div className="md:col-span-3">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('quotes.field_title', 'Type de Travail')}</label>
                                    <select 
                                        className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        value={form.volumes[0].label}
                                        onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], label: e.target.value }] }))}
                                    >
                                        <option value="">- {t('common.activities', 'Activité')} -</option>
                                        {activities.map(a => <option key={a.id || a.name} value={a.name}>{a.name}</option>)}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">M²</label>
                                    <input type="number" min="0" placeholder="150"
                                        className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.volumes[0].quantity}
                                        onChange={e => {
                                            const q = e.target.value;
                                            const p = form.volumes[0].price ?? '';
                                            let est = form.estimated_price;
                                            if (p && q) est = (parseFloat(p) * parseFloat(q)).toFixed(2);
                                            setForm(prev => ({ ...prev, estimated_price: est, volumes: [{ ...prev.volumes[0], quantity: q }] }));
                                        }}
                                    />
                                </div>

                                <div className="md:col-span-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Cm</label>
                                    <input type="number" step="any" min="0" placeholder="5.5"
                                        className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.volumes[0].thickness}
                                        onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], thickness: e.target.value }] }))}
                                    />
                                </div>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('quotes.approx_date', 'Date Aprox.')}</label>
                                    <input 
                                        type="date"
                                        className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.approximate_date}
                                        onChange={e => setForm({...form, approximate_date: e.target.value})}
                                    />
                                </div>


                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Total Est. (€)</label>
                                    <input type="number" step="any" min="0" placeholder="0.00"
                                        className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.estimated_price ?? ''}
                                        onChange={e => setForm({...form, estimated_price: e.target.value})}
                                    />
                                </div>

                                {/* Row 2 */}
                                <div className="md:col-span-5">
                                    <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center justify-between">
                                        <span>{t('quotes.field_address', 'Adresse')}</span>
                                        {form.latitude && form.longitude && (
                                            <span className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded text-[10px] font-bold">
                                                Aller: {(haversine(50.88243, 4.39343, parseFloat(form.latitude), parseFloat(form.longitude))).toFixed(1)}km | Retour: {(haversine(50.88243, 4.39343, parseFloat(form.latitude), parseFloat(form.longitude)) * 2).toFixed(1)}km
                                            </span>
                                        )}
                                    </label>
                                    <AddressAutocomplete 
                                        onSelect={({ address, lat, lon }) => setForm(f => ({...f, address: address ?? '', latitude: lat ?? '', longitude: lon ?? ''}))}
                                        value={form.address}
                                        className="h-10 rounded-xl"
                                    />
                                </div>



                                <div className="md:col-span-7">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('quotes.details_notes', 'Détails / Observations')}</label>
                                    <input type="text" placeholder="..."
                                        className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.notes ?? ''}
                                        onChange={e => setForm({...form, notes: e.target.value})}
                                    />
                                </div>

                                {/* Row 3 */}
                                <div className="md:col-span-12">
                                    {((form.volumes[0].label ?? '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('sapa') || (form.volumes[0].label ?? '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('chape')) && (
                                        <div className="flex flex-wrap gap-x-4 gap-y-2 items-center h-10 bg-slate-50 px-3 rounded-xl border border-slate-100">
                                            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                                                <input type="checkbox" checked={!!form.volumes[0].has_foil} onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], has_foil: e.target.checked }] }))} className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                Inclure Film plastique
                                            </label>
                                            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                                                <input type="checkbox" checked={!!form.volumes[0].has_mesh} onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], has_mesh: e.target.checked }] }))} className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                Inclure Treillis métallique
                                            </label>
                                            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                                                <input type="checkbox" checked={!!form.volumes[0].has_fiber} onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], has_fiber: e.target.checked }] }))} className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                Inclure Fibre
                                            </label>
                                            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                                                <input type="checkbox" checked={!!form.volumes[0].has_duramint} onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], has_duramint: e.target.checked }] }))} className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                Inclure Duramint
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {isAutoRender && (
                                    <div className="md:col-span-12 bg-indigo-50/50 rounded-lg p-2.5 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-[11px] shadow-sm">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <span className="font-extrabold text-indigo-700 uppercase tracking-tight">{t('quotes.calc_label', 'CALCUL:')}</span>
                                            <div className="flex items-center gap-1.5" title="Chape de base">
                                                <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.base', 'BASE')}</span>
                                                <input type="number" step="0.1" value={form.prices?.base ?? ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, base: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            {extraThickForAuto > 0 && (
                                                <div className="flex items-center gap-1.5" title={`Épaisseur extra ${extraThickForAuto}cm`}>
                                                    <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.extra_cm', 'EXTRA CM')}</span>
                                                    <input type="number" step="0.1" value={form.prices?.extra ?? ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, extra: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                                </div>
                                            )}
                                            {form.volumes.some(v => v.has_foil) && (
                                                <div className="flex items-center gap-1.5" title="Film plastique">
                                                    <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.foil', 'FOLIE')}</span>
                                                    <input type="number" step="0.1" value={form.prices?.foil ?? ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, foil: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                                </div>
                                            )}
                                            {form.volumes.some(v => v.has_mesh) && (
                                                <div className="flex items-center gap-1.5" title="Treillis métallique">
                                                    <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.mesh', 'TREILLIS')}</span>
                                                    <input type="number" step="0.1" value={form.prices?.mesh ?? ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, mesh: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                                </div>
                                            )}
                                            {form.volumes.some(v => v.has_fiber || v.has_duramint) && (
                                                <div className="flex items-center gap-1.5" title="Duramint (Fibră)">
                                                    <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.duramint', 'FIBRE')}</span>
                                                    <input type="number" step="0.1" value={form.prices?.fiber ?? ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, fiber: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 border-l border-indigo-200 pl-3">
                                            {/* TVA Toggle — edit modal */}
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setForm(f => ({ ...f, vat_enabled: !f.vat_enabled }))}
                                                        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                                                            form.vat_enabled ? 'bg-amber-500' : 'bg-slate-300'
                                                        }`}
                                                    >
                                                        <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
                                                            form.vat_enabled ? 'translate-x-4' : 'translate-x-0.5'
                                                        }`} />
                                                    </button>
                                                    <span className="text-[9px] font-bold text-amber-600 uppercase">TVA</span>
                                                </div>
                                                {form.vat_enabled && (
                                                    <div className="flex gap-1.5 mt-0.5">
                                                        <label className="flex items-center gap-0.5 cursor-pointer">
                                                            <input type="radio" name="vatTypeEdit" value="21"
                                                                checked={form.vat_type === '21'}
                                                                onChange={() => setForm(f => ({ ...f, vat_type: '21' }))}
                                                                className="w-3 h-3 text-amber-500"
                                                            />
                                                            <span className="text-[9px] text-amber-700 font-bold">21% Nou</span>
                                                        </label>
                                                        <label className="flex items-center gap-0.5 cursor-pointer">
                                                            <input type="radio" name="vatTypeEdit" value="6"
                                                                checked={form.vat_type === '6'}
                                                                onChange={() => setForm(f => ({ ...f, vat_type: '6' }))}
                                                                className="w-3 h-3 text-amber-500"
                                                            />
                                                            <span className="text-[9px] text-amber-700 font-bold">6% Renov.</span>
                                                        </label>
                                                        {clientForRender?.client_type === 'juridica' && (
                                                            <label className="flex items-center gap-0.5 cursor-pointer">
                                                                <input type="radio" name="vatTypeEdit" value="0"
                                                                    checked={form.vat_type === '0'}
                                                                    onChange={() => setForm(f => ({ ...f, vat_type: '0' }))}
                                                                    className="w-3 h-3 text-amber-500"
                                                                />
                                                                <span className="text-[9px] text-amber-700 font-bold">0% BTW</span>
                                                            </label>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end leading-tight">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Net</span>
                                                <span className="text-slate-600 font-bold">{autoNet.toFixed(2)}</span>
                                            </div>
                                            {form.vat_enabled && autoVat > 0 && (
                                                <div className="flex flex-col items-end leading-tight">
                                                    <span className="text-[9px] font-bold text-amber-500 uppercase">TVA {form.vat_type}%</span>
                                                    <span className="text-amber-600 font-bold">{autoVat.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 bg-indigo-600 text-white px-2 py-1 rounded shadow-sm ml-1">
                                                <span className="text-[10px] font-medium uppercase opacity-90">Total Est.</span>
                                                <span className="text-sm font-black">{totalGross.toFixed(2)} €</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                            <button 
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                className="h-10 px-6 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg shadow-sm transition-colors"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={handleCreateQuote}
                                disabled={isSaving}
                                className="h-10 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Enregistrer les modifications
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed top-20 right-4 z-[9999] animate-in slide-in-from-top-4">
                    <div className={`px-4 py-2 rounded-full shadow-lg text-[11px] font-bold uppercase tracking-wide border 
                        ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {toast.msg}
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.action}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                type={confirmModal.type}
            />

            {/* Planning Modal — date/time/team direct to calendar */}
            {planningModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-0.5">Planifier dans le calendrier</div>
                                <div className="font-bold text-slate-800 dark:text-white text-sm truncate max-w-[280px]">{planningModal.client_name || planningModal.title}</div>
                                <div className="text-xs text-slate-400 truncate">{planningModal.site_address}</div>
                            </div>
                            <button onClick={() => setPlanningModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Date *</label>
                                <input
                                    type="date"
                                    value={planningForm.date}
                                    onChange={e => setPlanningForm(p => ({ ...p, date: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Heure de début</label>
                                <input
                                    type="time"
                                    value={planningForm.time}
                                    onChange={e => setPlanningForm(p => ({ ...p, time: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Équipe (optionnel)</label>
                                <select
                                    value={planningForm.teamId}
                                    onChange={e => setPlanningForm(p => ({ ...p, teamId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="">— Sans équipe —</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setPlanningModal(null)}
                                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSendToCalendar}
                                disabled={isSendingPlanning || !planningForm.date}
                                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-colors"
                            >
                                {isSendingPlanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                                Planifier
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {previewDocs && (
                <DocumentPreviewModal 
                    documents={previewDocs} 
                    onClose={() => setPreviewDocs(null)} 
                />
            )}

            {/* Bulk Delete Confirm Modal */}
            <ConfirmModal
                isOpen={showBulkDeleteConfirm}
                onClose={() => setShowBulkDeleteConfirm(false)}
                onConfirm={handleBulkDelete}
                title={t('quotes.bulk_delete_title', 'Supprimer les Devis')}
                message={
                    <div>
                        <p className="mb-2 text-slate-600">{t('quotes.bulk_delete_warning', 'Êtes-vous sûr de vouloir supprimer les devis suivants ? Toutes les données associées seront définitivement supprimées.')}</p>
                        <ul className="list-disc pl-5 text-sm text-slate-700 font-bold max-h-40 overflow-y-auto">
                            {quotes.filter(q => selectedIds.includes(q.id)).map(q => (
                                <li key={q.id}>{q.external_id || q.quote_number || q.id} - {q.client_name}</li>
                            ))}
                        </ul>
                    </div>
                }
                confirmText={isBulkDeleting ? t('common.deleting', 'Suppression...') : t('common.delete', 'Supprimer')}
                cancelText={t('common.cancel', 'Annuler')}
                type="danger"
                disabled={isBulkDeleting}
            />
        </div>
    )
}

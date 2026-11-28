// v2 - with delete button
import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useAdminStore } from '../../store/adminStore'
import { createPortal } from 'react-dom'
import { Plus, Search, Calendar as CalendarIcon, User, MapPin, FileText, CalendarDays, Loader2, X, RefreshCw, CheckCircle2, AlertCircle, Save, Link, Phone, Check, ChevronRight, Pencil, Trash2, Paperclip, Eye, EyeOff, Route, Copy, ExternalLink, MessageSquare, Wind, Thermometer, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import AddressAutocomplete from '../../components/AddressAutocomplete'
import SearchableSelect from '../../components/SearchableSelect'
import ConfirmModal from '../../components/ConfirmModal'
import DocumentPreviewModal from '../../components/DocumentPreviewModal'
import QuickAddWizard from '../../components/QuickAddWizard'
import api from '../../lib/api'
import { buildQuoteItems } from '../../utils/priceCalculator'

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
 * Calcule le prix total du devis — utilise la source unique buildQuoteItems().
 * Priorité: proforma_data.items → fallback volumes → fallback estimated_price.
 */
function computeQuoteDataFromRow(row) {
    const wo = row;
    const p = wo.prices || {};
    
    // PRIORITÉ 1: proforma_data.items (prix custom sauvegardés)
    const pRaw = wo.proforma_data?.items;
    if (pRaw && pRaw.length > 0) {
        const d0 = (pRaw[0].desc || '').toLowerCase().trim();
        const isPlaceholder = pRaw.length === 1 &&
            (pRaw[0].id === 'default' ||
             d0.includes('conform deviz') ||
             d0.includes('manoper') ||
             d0 === 'chape' || d0 === 'sapa' ||
             /sapa|chape/i.test(d0));
        if (!isPlaceholder) {
            // Use saved proforma items directly
            const items = pRaw.map(i => ({ qty: parseFloat(i.qty || 1), price: parseFloat(i.price || 0), isChape: i.isChape }));
            const totalNet = items.reduce((s, i) => s + i.qty * i.price, 0);
            const chapeNet = items.filter(i => i.isChape).reduce((s, i) => s + i.qty * i.price, 0);
            const discountPct = parseFloat(p.discount_pct || 0);
            const discountAmount = (chapeNet * (discountPct / 100)) + parseFloat(p.discount || 0);
            const netAfterDiscount = totalNet - discountAmount;
            let vatRate = 0;
            if (p.useVat !== false) {
                if (p.vat_type !== undefined) vatRate = parseFloat(p.vat_type);
                else if (wo.client_type === 'pj' || wo.client_type === 'juridica') vatRate = 0;
                else vatRate = wo.work_type === 'repair' ? 6 : 21;
            }
            const totalGross = netAfterDiscount * (1 + vatRate / 100);
            const discounts = items.filter(i => i.price < 0);
            if (discountAmount > 0) discounts.push({ desc: `Remise Chape (${discountPct}%)`, price: -discountAmount });
            return { totalGross: totalGross > 0 ? totalGross : null, discounts };
        }
    }

    // PRIORITÉ 2: calcul din volumes — folosește buildQuoteItems (sursa unică)
    if (!wo.volumes?.length) return null;
    
    const result = buildQuoteItems(wo, null);
    if (!result || result.items.length === 0) return null;
    
    const discounts = result.items.filter(i => i.price < 0);
    if (result.discountAmount > 0) {
        discounts.push({ desc: `Remise Chape (${result.discountPct}%)`, price: -result.discountAmount });
    }
    
    return {
        totalGross: result.totalGross > 0 ? result.totalGross : null,
        discounts
    };
}

function computeQuoteTotalFromRow(row) {
    const data = computeQuoteDataFromRow(row);
    return data ? data.totalGross : null;
}

/** Affiche le prix calculé — identique au PDF. Source: backend computed_total. Clic pour saisie manuelle. */
const EditablePrice = ({ row, onUpdate }) => {
    const { admin } = useAdminStore()
    const [isEditing, setIsEditing] = useState(false)
    const [manualInput, setManualInput] = useState(row.estimated_price ?? '')
    const [isSaving, setIsSaving] = useState(false)

    // Source unique de vérité: computed_total calculé sur le backend (= même logique que le PDF)
    // Fallback: estimated_price (pour anciens devis sans volumes ni proforma_data)
    const displayValue = computeQuoteTotalFromRow(row) ?? (row.computed_total ?? (row.estimated_price ? parseFloat(row.estimated_price) : null))
    const isRead = row.read_by_admins?.map(String).includes(String(admin?.id))

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
            onClick={(e) => { e.stopPropagation(); setManualInput(row.estimated_price ?? ''); setIsEditing(true); }}
            className="inline-flex items-baseline gap-1 cursor-pointer group tabular-nums whitespace-nowrap"
            title="Cliquer pour saisir un prix manuel"
        >
            {isSaving
                ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                : <span className={`text-[15.5px] tracking-tight transition-colors ${!isRead ? 'font-black text-slate-950 dark:text-white' : 'font-extrabold text-slate-900 dark:text-slate-100'}`}>
                    {displayValue != null ? fmt(displayValue) : '—'}
                  </span>
            }
            <span className={`text-[13.5px] ${!isRead ? 'font-black text-slate-800 dark:text-slate-200' : 'font-bold text-slate-600'}`}>€</span>
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

const DateScheduleTooltip = ({ date, i18n, navigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [works, setWorks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const { t } = useTranslation();

    const handleOpen = () => {
        setIsOpen(true);
        if (!hasFetched && !loading) {
            setLoading(true);
            const dateStr = date.split('T')[0];
            api.get(`/admin/work-orders?start_date=${dateStr}&end_date=${dateStr}&slim=true&limit=50&ignore_quote_filter=true`)
                .then(res => {
                    const filtered = res.data.filter(w =>
                        w.status === 'planning' || w.status === 'confirmed' || w.status === 'in_progress'
                    );
                    setWorks(filtered);
                    setHasFetched(true);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    };

    const statusColors = {
        planning: 'bg-yellow-100 text-yellow-700',
        confirmed: 'bg-green-100 text-green-700',
        in_progress: 'bg-blue-100 text-blue-700',
    };

    const locale = i18n.language === 'fr' ? 'fr-BE' : i18n.language === 'nl' ? 'nl-BE' : i18n.language === 'ro' ? 'ro-RO' : 'en-GB';
    const formattedDate = new Date(date).toLocaleDateString(locale);

    return (
        <div 
            className="relative inline-flex items-center"
            onMouseEnter={handleOpen}
            onMouseLeave={() => setIsOpen(false)}
            onClick={(e) => { e.stopPropagation(); if(isOpen) { setIsOpen(false) } else { handleOpen() } }}
        >
            <span className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white text-[15px] font-bold shrink-0 whitespace-nowrap cursor-pointer transition-colors tabular-nums">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                {formattedDate}
            </span>

            {isOpen && (
                <div 
                    className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-[9999]"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="text-xs font-semibold text-slate-700 mb-2 border-b pb-1">
                        {t('quotes.scheduled_works', 'Lucrări planificate pe')} {formattedDate}
                    </div>
                    {loading ? (
                        <div className="text-xs text-slate-500 py-2 text-center flex items-center justify-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> {t('common.loading', 'Se încarcă...')}
                        </div>
                    ) : works.length > 0 ? (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                            {works.map(w => (
                                <div key={w.id} className="text-xs bg-slate-50 p-1.5 rounded border border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[w.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {w.status === 'planning' ? t('status.planning', 'Planificat') : w.status === 'confirmed' ? t('status.confirmed', 'Confirmat') : t('status.in_progress', 'În curs')}
                                        </span>
                                        <span className="font-medium text-slate-800 truncate">{w.client_name || '-'}</span>
                                    </div>
                                    <div className="text-slate-500 truncate mt-0.5 pl-0.5">{w.site_address || '—'}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500 py-2 text-center">{t('quotes.no_works_scheduled', 'Nicio lucrare planificată.')}</div>
                    )}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                        <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/planning?date=${date.split('T')[0]}`); }}
                            className="w-full text-center text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded py-1 transition-colors"
                        >
                            → {t('quotes.view_planning', 'Vezi planificarea')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

let _quotesMemoryCache = (typeof window !== 'undefined' && window.__adminQuotesCache) || null

export default function QuotesManagement() {
    const { admin } = useAdminStore()
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const [quotes, setQuotes] = useState(() => (typeof window !== 'undefined' && window.__adminQuotesCache) || _quotesMemoryCache || [])
    const [clients, setClients] = useState(() => (typeof window !== 'undefined' && window.__adminClientsCache) || [])
    const [activities, setActivities] = useState([])
    const [previewDocs, setPreviewDocs] = useState(null)
    const [loading, setLoading] = useState(() => !((typeof window !== 'undefined' && window.__adminQuotesCache) || _quotesMemoryCache))
    const [sentToPlanningIds, setSentToPlanningIds] = useState(new Set())
    const [teams, setTeams] = useState(() => (typeof window !== 'undefined' && window.__adminTeamsCache) || [])
    const [planningModal, setPlanningModal] = useState(null) // { quote } when open
    const [planningForm, setPlanningForm] = useState({ date: '', time: '07:00', teamId: '' })
    const [isSendingPlanning, setIsSendingPlanning] = useState(false)
    
    const [selectedIds, setSelectedIds] = useState([])
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)
    const [isBulkRecalculating, setIsBulkRecalculating] = useState(false)
    const [previewPdfId, setPreviewPdfId] = useState(null)
    const [viewMode, setViewMode] = useState('active') // 'active' | 'archived'
    const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'pending' | 'planning' | 'confirmed' | 'unread'
    const [sourceFilter, setSourceFilter] = useState('all') // 'all' | 'devis_online' | 'we-r' | 'partner' | 'manual'
    const [searchQuery, setSearchQuery] = useState('')
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
    const [lastUpdatedTime, setLastUpdatedTime] = useState(() => new Date())

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

    const handleBulkRecalculate = async () => {
        if (selectedIds.length === 0) return;
        setIsBulkRecalculating(true);
        try {
            const res = await api.post('/admin/work-orders/batch-recalculate-routes', { ids: selectedIds });
            const { success, failed } = res.data;
            showToast(t('quotes.bulk_recalc_success', `${success} devis recalculés avec succès${failed > 0 ? `, ${failed} échoués` : ''}.`), success > 0 ? 'success' : 'error');
            setSelectedIds([]);
            fetchQuotes(true);
        } catch (error) {
            console.error('Bulk recalculate error', error);
            showToast(t('quotes.bulk_recalc_error', 'Erreur lors du recalcul des distances.'), 'error');
        } finally {
            setIsBulkRecalculating(false);
        }
    };

    const handleBulkMarkStatus = async (isRead) => {
        if (selectedIds.length === 0) return;
        const previousQuotes = [...quotes];
        const newQuotes = quotes.map(q => selectedIds.includes(q.id) ? { ...q, is_read: isRead } : q);
        setQuotes(newQuotes);
        
        try {
            await Promise.all(selectedIds.map(id => api.post(`/admin/work-orders/${id}/mark-${isRead ? 'read' : 'unread'}`)));
            showToast(isRead ? t('quotes.bulk_mark_read_success', 'Marcate ca citite.') : t('quotes.bulk_mark_unread_success', 'Marcate ca necitite.'), 'success');
            setSelectedIds([]);
        } catch (err) {
            console.error('Bulk mark status error', err);
            setQuotes(previousQuotes);
            showToast(t('common.error', 'A apărut o eroare'), 'error');
        }
    };

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
                    const pSet = res.data;
                    setForm(prev => ({
                        ...prev,
                        prices: {
                            base: prev.prices?.base !== 12.5 ? prev.prices.base : pSet.base_price_sqm,
                            extra: prev.prices?.extra !== 1.25 ? prev.prices.extra : pSet.extra_thickness_price_per_cm,
                            foil: prev.prices?.foil !== 1.2 ? prev.prices.foil : pSet.plastic_foil_price_sqm,
                            mesh: prev.prices?.mesh !== 2.5 ? prev.prices.mesh : pSet.metal_mesh_price_sqm,
                            fiber: prev.prices?.fiber !== 2.0 ? prev.prices.fiber : pSet.fiber_price_sqm
                        }
                    }));
                } catch (e) {}
                return;
            }
            try {
                const res = await api.get(`/admin/pricing-settings?client_id=${form.client_id}`);
                setPricingSettings(res.data);
                const pSet = res.data;
                setForm(prev => ({
                    ...prev,
                    prices: {
                        base: prev.prices?.base !== 12.5 ? prev.prices.base : pSet.base_price_sqm,
                        extra: prev.prices?.extra !== 1.25 ? prev.prices.extra : pSet.extra_thickness_price_per_cm,
                        foil: prev.prices?.foil !== 1.2 ? prev.prices.foil : pSet.plastic_foil_price_sqm,
                        mesh: prev.prices?.mesh !== 2.5 ? prev.prices.mesh : pSet.metal_mesh_price_sqm,
                        fiber: prev.prices?.fiber !== 2.0 ? prev.prices.fiber : pSet.fiber_price_sqm
                    }
                }));
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
            fetchQuotes(true)
        }, 30000)
        return () => clearInterval(interval)
    }, [viewMode])

    const fetchTeams = async () => {
        try {
            const res = await api.get('/admin/teams')
            const data = res.data
            setTeams(Array.isArray(data) ? data : (data?.teams || data?.items || []))
        } catch (e) { console.error('fetchTeams', e) }
    }

    const fetchQuotes = async (silent = false) => {
        const hasCache = Boolean((typeof window !== 'undefined' && window.__adminQuotesCache) || _quotesMemoryCache)
        if (!silent && (!hasCache || viewMode === 'archived')) setLoading(true)
        try {
            const endpoint = viewMode === 'archived'
                ? '/admin/work-orders?is_quote=true&status=deleted&slim=true'
                : '/admin/work-orders?is_quote=true&slim=true';
            // Add timestamp cache buster to force fresh data from server
            const res = await api.get(`${endpoint}&_t=${Date.now()}`)
            const activeQuotes = res.data.filter(q => q.status !== 'cancelled');
            if (viewMode === 'active') {
                _quotesMemoryCache = activeQuotes
                if (typeof window !== 'undefined') window.__adminQuotesCache = activeQuotes
            }
            setQuotes(activeQuotes)
            setLastUpdatedTime(new Date())
            
            // Fix unread count by dispatching event, HeaderNotifications will handle localStorage
            window.dispatchEvent(new Event('quotesViewed'));
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
            className: 'w-[46px] max-w-[46px] !px-2',
            label: (
                <input 
                    type="checkbox" 
                    checked={quotes.length > 0 && selectedIds.length === quotes.length}
                    onChange={handleSelectAll}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
            ),
            sortable: false,
            render: (row) => (
                <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        checked={selectedIds.includes(row.id)}
                        onChange={(e) => handleSelectRow(e, row.id)}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )
        },
        {
            key: 'created_at',
            label: t('quotes.quote_details', 'Citat Nr. / Data'),
            sortable: true,
            className: 'w-[13%] min-w-[145px]',
            render: (row) => {
                let display = '-'
                let timeDisplay = ''
                if (row.created_at) {
                    try {
                        const dateStr = row.created_at.endsWith('Z') ? row.created_at : `${row.created_at}Z`
                        const d = new Date(dateStr)
                        if (!isNaN(d.getTime())) {
                            display = d.toLocaleDateString('ro-RO')
                            timeDisplay = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
                        } else {
                            display = row.created_at
                        }
                    } catch(e) {
                        display = row.created_at
                    }
                }
                const isRead = row.read_by_admins?.map(String).includes(String(admin?.id));
                return (
                    <div className="flex flex-col gap-0.5 tabular-nums whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                            {!isRead && (
                                <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--tenant-bg)] shrink-0" title={t('quotes.unread', 'Nou / Necitit')} />
                            )}
                            <span className={`text-[14.5px] tracking-tight whitespace-nowrap ${!isRead ? 'font-black text-slate-950 dark:text-white' : 'font-extrabold text-slate-900 dark:text-slate-100'}`}>
                                #{row.quote_number || '-'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            <span>{display}</span>
                            {timeDisplay && (
                                <span className="font-extrabold text-slate-800 dark:text-slate-200">{timeDisplay}</span>
                            )}
                        </div>
                    </div>
                )
            }
        },
        {
            key: 'status',
            label: t('quotes.status_source_col', 'Status & Sursă'),
            sortable: true,
            className: 'w-[14%] min-w-[160px]',
            render: (row) => {
                const statusMap = {
                    planning:  { dot: 'bg-sky-500',     pill: 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-300',         label: t('status.planning', 'În planificare') },
                    confirmed: { dot: 'bg-emerald-500', pill: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300', label: t('status.confirmed', 'Confirmat') },
                    completed: { dot: 'bg-slate-400',   pill: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300',     label: t('status.completed', 'Finalizat') },
                    cancelled: { dot: 'bg-rose-500',    pill: 'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-300',         label: t('status.cancelled', 'Anulat') },
                }
                const cfg = statusMap[row.status] || {
                    dot: 'bg-amber-500',
                    pill: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300',
                    label: t('status.pending', 'În așteptare')
                }
                const src = row.source_system;
                const sourceLabel = (src === 'calculator_public' || src === 'we-r')
                    ? t('source.we_r', 'WE-R')
                    : src === 'devis_online'
                        ? t('source.devis', 'Devis Online')
                        : src === 'robaws'
                            ? t('source.robaws', 'Robaws')
                            : src === 'partner'
                                ? t('source.partner', 'Partener')
                                : t('source.manual', 'Manual');

                return (
                    <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12.5px] font-extrabold border whitespace-nowrap ${cfg.pill}`}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                            {cfg.label}
                        </span>
                        <span className="text-[12.5px] font-bold text-slate-500 dark:text-slate-300 pl-1 whitespace-nowrap">
                            {sourceLabel}
                        </span>
                    </div>
                )
            }
        },
        {
            key: 'client_name',
            label: t('quotes.client_address', 'Client & Adresă'),
            sortable: true,
            className: 'w-[29%] min-w-[260px]',
            render: (row) => {
                const addr = row.site_address;
                const isRead = row.read_by_admins?.map(String).includes(String(admin?.id));
                const distance = row.route_distance_km ? parseFloat(row.route_distance_km) : (row.prices?.distance_km ? parseFloat(row.prices.distance_km) * 2 : 0);

                return (
                    <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[14.5px] min-w-0 flex-wrap">
                            <User className="w-4 h-4 text-slate-400 shrink-0" />
                            {row.client_id ? (
                                <RouterLink 
                                    to={`/admin/clients/${row.client_id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`truncate text-slate-950 dark:text-white ${!isRead ? 'font-black' : 'font-extrabold'} hover:text-[color:var(--tenant-bg)] dark:hover:text-sky-400 transition-colors cursor-pointer`}
                                    title={row.client_name}
                                >
                                    {row.client_name || '-'}
                                </RouterLink>
                            ) : (
                                <span 
                                    className={`truncate text-slate-950 dark:text-white ${!isRead ? 'font-black' : 'font-extrabold'}`} 
                                    title={row.client_name}
                                >
                                    {row.client_name || '-'}
                                </span>
                            )}
                            {(row.start_date || row.approximate_date) && (
                                <>
                                    <span className="text-slate-300 dark:text-slate-600 shrink-0">•</span>
                                    <DateScheduleTooltip date={row.start_date || row.approximate_date} i18n={i18n} navigate={navigate} />
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-slate-400 overflow-hidden font-semibold">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {distance > 0 && (
                                <>
                                    <span className="text-slate-700 dark:text-slate-300 font-extrabold shrink-0 tabular-nums whitespace-nowrap">{Math.round(distance)} km</span>
                                    <span className="text-slate-300 dark:text-slate-600 shrink-0">•</span>
                                </>
                            )}
                            <span className="truncate" title={addr}>{addr || '—'}</span>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'surface_thickness',
            label: t('quotes.surface_thickness', 'Suprafață / Grosime'),
            sortable: true,
            className: 'w-[17%] min-w-[195px]',
            render: (row) => {
                const isRead = row.read_by_admins?.map(String).includes(String(admin?.id));
                const isolationVol = row.volumes?.find(v => v.label?.toLowerCase().includes('isolation') || v.label?.toLowerCase().includes('pur') || v.type === 'isolation');
                
                return (
                    <div className="flex flex-col gap-1 tabular-nums whitespace-nowrap">
                        {/* Chape */}
                        <div className="flex items-center gap-1.5 text-[14px] whitespace-nowrap">
                            <span className="text-[12.5px] text-slate-500 font-bold w-[46px] shrink-0 whitespace-nowrap">Chape</span>
                            <span className={`whitespace-nowrap ${!isRead ? 'font-black text-slate-950 dark:text-white' : 'font-extrabold text-slate-900 dark:text-slate-100'}`}>
                                {row.volumes?.[0]?.quantity ? `${row.volumes[0].quantity} m²` : '-'}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-[13px] font-extrabold text-slate-600 dark:text-slate-400 uppercase whitespace-nowrap">
                                {row.volumes?.[0]?.thickness ? `${row.volumes[0].thickness} cm` : '-'}
                            </span>
                        </div>
                        
                        {/* Isolation */}
                        {isolationVol && (
                            <div className="flex items-center gap-1.5 text-[13.5px] whitespace-nowrap">
                                <div className="w-[46px] flex items-center gap-1 shrink-0 text-[12px] font-bold text-slate-500 whitespace-nowrap">
                                    {isolationVol.label.toLowerCase().includes('pur') ? (
                                        <>
                                            <Wind className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>PUR</span>
                                        </>
                                    ) : (
                                        <>
                                            <Thermometer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>Iso</span>
                                        </>
                                    )}
                                </div>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                    {isolationVol.quantity ? `${isolationVol.quantity} m²` : '-'}
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-[12.5px] font-bold text-slate-500 uppercase whitespace-nowrap">
                                    {isolationVol.thickness ? `${isolationVol.thickness} cm` : '-'}
                                </span>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'estimated_price',
            label: t('quotes.price', 'Preț (€)'),
            sortable: true,
            align: 'right',
            className: 'w-[11%] min-w-[130px]',
            render: (row) => {
                let discounts = [];
                if (row.proforma_data?.items) {
                    discounts = row.proforma_data.items.filter(i => i.price < 0 && (i.desc || '').toLowerCase().includes('remise'));
                } else {
                    const data = computeQuoteDataFromRow(row);
                    if (data && data.discounts) {
                        discounts = data.discounts;
                    }
                }
                
                return (
                    <div className="flex flex-col items-end gap-0.5 tabular-nums whitespace-nowrap">
                        <EditablePrice row={row} onUpdate={fetchQuotes} />
                        {discounts.length > 0 && (
                            <div className="flex flex-nowrap items-center justify-end gap-1">
                                {discounts.map((d, idx) => {
                                    const match = (d.desc || '').match(/\(([\d.]+%)\)/);
                                    const pct = match ? match[1] : '';
                                    return (
                                        <span key={idx} className="text-emerald-600 dark:text-emerald-400 text-[12px] font-extrabold whitespace-nowrap">
                                            -{new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(d.price))} € {pct ? `(${pct})` : ''}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )
            }
        },
        {
            label: t('common.actions', 'Acțiuni'),
            align: 'right',
            className: 'w-[14%] min-w-[225px]',
            render: (row) => {
                const isRead = row.read_by_admins?.map(String).includes(String(admin?.id));
                const btnBase = "w-8.5 h-8.5 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer shadow-2xs shrink-0";
                return (
                <div className="flex items-center justify-end gap-1">
                    {row.status === 'deleted' ? (
                        <button
                            title={t('quotes.btn_restore_short', 'Restaurer')}
                            onClick={(e) => {
                                e.stopPropagation();
                                setConfirmModal({
                                    isOpen: true,
                                    type: 'info',
                                    title: t('quotes.restore_title', 'Restaurer Devis'),
                                    message: t('quotes.restore_msg', 'Voulez-vous restaurer ce devis?'),
                                    confirmText: t('quotes.btn_restore', 'Restaurer'),
                                    action: async () => {
                                        try {
                                            await api.post(`/admin/work-orders/${row.id}/restore`);
                                            fetchQuotes();
                                            showToast(t('quotes.restore_success', 'Devizul a fost restaurat!'), "success");
                                        } catch (e) {
                                            console.error("Restore error:", e);
                                            showToast(t('quotes.restore_error', 'Eroare la restaurare'), "error");
                                        }
                                    }
                                });
                            }}
                            className={btnBase}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    ) : (
                        <>
                            <button
                                title={isRead ? t('quotes.mark_unread', 'Marquer comme non lu') : t('quotes.mark_read', 'Marquer comme lu')}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                        if (isRead) {
                                            await api.post(`/admin/work-orders/${row.id}/mark-unread`);
                                        } else {
                                            await api.post(`/admin/work-orders/${row.id}/mark-read`);
                                        }
                                        fetchQuotes();
                                    } catch (err) {
                                        console.error(err);
                                    }
                                }}
                                className={`${btnBase} ${isRead ? '' : '!text-[color:var(--tenant-bg)] !border-sky-500/35 !bg-sky-500/10'}`}
                            >
                                {isRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>

                            {row.token && (
                                <button 
                                    title={t('quotes.copy_link', 'Copier le lien client')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(`${window.location.origin}/confirm/${row.token}`);
                                        showToast(t('quotes.link_copied', 'Le lien du client a été copié dans le presse-papiers !'), 'success');
                                    }}
                                    className={btnBase}
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            )}
                            <button 
                                title={t('quotes.chat_client', 'Messages / Chat Client')}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/chats?wo_id=${row.id}`);
                                }}
                                className={btnBase}
                            >
                                <MessageSquare className="w-4 h-4" />
                            </button>
                            <button 
                                title="Télécharger Devis PDF"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewPdfId(row.id);
                                }}
                                className={btnBase}
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
                                className={btnBase}
                            >
                                <CalendarDays className="w-4 h-4" />
                            </button>
                            <button
                                title="Supprimer le devis"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmModal({
                                        isOpen: true,
                                        type: 'danger',
                                        title: 'Supprimer le devis',
                                        message: `Êtes-vous sûr de vouloir supprimer le devis pour "${row.client_name}"?`,
                                        confirmText: 'Oui, supprimer',
                                        action: async () => {
                                            try {
                                                await api.delete(`/admin/work-orders/${row.id}`)
                                                fetchQuotes()
                                                showToast('Devis supprimé avec succès', 'success')
                                            } catch (e) {
                                                showToast('Erreur lors de la suppression', 'error')
                                            }
                                        }
                                    })
                                }}
                                className={`${btnBase} hover:!text-rose-600 hover:!border-rose-200 hover:!bg-rose-50`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
                )
            }
        }
    ];

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
            let extraPrice;
            if (form.prices?.extra_large !== undefined && form.prices?.extra_threshold !== undefined) {
                extraPrice = surface > parseFloat(form.prices.extra_threshold) ? parseFloat(form.prices.extra_large) : parseFloat(form.prices?.extra || 1.25);
            } else {
                extraPrice = parseFloat(form.prices?.extra) || (surface <= (pricingSettings?.extra_thickness_large_threshold_sqm ?? 200) ? (pricingSettings?.extra_thickness_price_per_cm ?? 1.25) : (pricingSettings?.extra_thickness_price_per_cm_large ?? 1.25));
            }
            autoExtra += extraThickness * extraPrice * surface;
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
            showToast('Devis planifié dans le calendrier!', 'success')
        } catch (e) {
            console.error(e)
            showToast('Erreur lors de la planification.', 'error')
        } finally {
            setIsSendingPlanning(false)
        }
    }

    // ── Live KPIs, Status Counts, Source Counts & Filtered List (Apple HIG / Screen 2 style) ──
    const fmtEur = (val) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);
    const getRowPrice = (r) => computeQuoteTotalFromRow(r) ?? (r.computed_total ?? (r.estimated_price ? parseFloat(r.estimated_price) : 0)) ?? 0;
    const getRowSqm = (r) => {
        if (Array.isArray(r.volumes) && r.volumes.length > 0) {
            return parseFloat(r.volumes[0]?.quantity || 0) || 0;
        }
        return parseFloat(r.surface_m2 || 0) || 0;
    };
    const isRowRead = (r) => r.read_by_admins?.map(String).includes(String(admin?.id));

    const kpiStats = (() => {
        let totalValue = 0;
        let totalSqm = 0;
        let pendingCount = 0;
        let pendingValue = 0;
        let planningCount = 0;
        let planningSqm = 0;
        let confirmedCount = 0;
        let confirmedValue = 0;
        let unreadCount = 0;
        let srcDevisOnline = 0;
        let srcWeR = 0;
        let srcPartner = 0;
        let srcManual = 0;

        quotes.forEach(q => {
            const p = getRowPrice(q);
            const sqm = getRowSqm(q);
            totalValue += p;
            totalSqm += sqm;

            if (!isRowRead(q)) unreadCount++;

            if (q.status === 'planning') {
                planningCount++;
                planningSqm += sqm;
            } else if (q.status === 'confirmed') {
                confirmedCount++;
                confirmedValue += p;
            } else {
                pendingCount++;
                pendingValue += p;
            }

            if (q.source_system === 'devis_online') srcDevisOnline++;
            else if (q.source_system === 'we-r' || q.source_system === 'calculator_public') srcWeR++;
            else if (q.source_system === 'partner') srcPartner++;
            else srcManual++;
        });

        const avgPrice = quotes.length > 0 ? totalValue / quotes.length : 0;
        const avgSqm = quotes.length > 0 ? Math.round(totalSqm / quotes.length) : 0;

        return {
            totalValue,
            avgPrice,
            totalSqm: Math.round(totalSqm),
            avgSqm,
            pendingCount,
            pendingValue,
            planningCount,
            planningSqm: Math.round(planningSqm),
            confirmedCount,
            confirmedValue,
            unreadCount,
            srcDevisOnline,
            srcWeR,
            srcPartner,
            srcManual
        };
    })();

    const filteredQuotes = quotes.filter(q => {
        if (viewMode === 'active') {
            if (statusFilter === 'pending' && (q.status === 'planning' || q.status === 'confirmed' || q.status === 'completed')) return false;
            if (statusFilter === 'planning' && q.status !== 'planning') return false;
            if (statusFilter === 'confirmed' && q.status !== 'confirmed') return false;
            if (statusFilter === 'unread' && isRowRead(q)) return false;

            if (sourceFilter === 'devis_online' && q.source_system !== 'devis_online') return false;
            if (sourceFilter === 'we-r' && q.source_system !== 'we-r' && q.source_system !== 'calculator_public') return false;
            if (sourceFilter === 'partner' && q.source_system !== 'partner') return false;
            if (sourceFilter === 'manual' && q.source_system && !['manual', 'robaws'].includes(q.source_system)) return false;
        }
        if (searchQuery.trim()) {
            const term = searchQuery.toLowerCase().trim();
            const haystack = [
                q.quote_number,
                q.client_name,
                q.site_address,
                q.client_phone,
                q.client_email,
                q.notes
            ].filter(Boolean).join(' ').toLowerCase();
            if (!haystack.includes(term)) return false;
        }
        return true;
    });

    return (
        <div className="w-full flex flex-col min-h-[calc(100vh-100px)] space-y-1.5 sm:space-y-4">
            {/* ── Top Header Bar (Apple HIG / Dispatch Live style — uniform heights, compact on mobile) ───── */}
            <div className="flex flex-nowrap justify-between items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <h2 className="text-[17px] sm:text-[24px] font-black text-slate-900 dark:text-white tracking-tight truncate">
                                {t('quotes.title_main', 'Devize / Oferte')}
                            </h2>
                            <span className="inline-flex items-center gap-1.5 h-5.5 sm:h-7 px-2 sm:px-3 rounded-full text-[11px] sm:text-[13px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                            </span>
                        </div>
                        <p className="hidden sm:block text-slate-500 dark:text-slate-400 text-[13.5px] font-semibold mt-0.5">
                            {t('quotes.subtitle', 'Gérer les demandes de devis avant la planification')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-2.5 shrink-0">
                    <span className="text-[13px] font-semibold text-slate-400 dark:text-slate-400 tabular-nums hidden sm:inline mr-1">
                        {t('common.updated', 'Actualizat')}: {lastUpdatedTime.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    {/* Mobile Search Icon Toggle Button (< 640px) */}
                    <button
                        type="button"
                        onClick={() => setMobileSearchOpen(prev => !prev)}
                        aria-label={t('common.search', 'Caută')}
                        className={`sm:hidden w-9.5 h-9.5 rounded-full border inline-flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            mobileSearchOpen || searchQuery
                                ? 'bg-[color:var(--tenant-bg)] text-white border-transparent shadow-xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs'
                        }`}
                    >
                        <Search className="w-4 h-4" />
                    </button>
                    {/* Desktop-only Refresh Button (hidden on mobile per user request) */}
                    <button
                        type="button"
                        onClick={() => fetchQuotes(false)}
                        className="hidden sm:inline-flex h-10 px-4 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[13.5px] font-bold items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                    >
                        <RefreshCw className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin text-[color:var(--tenant-bg)]' : 'text-slate-600'}`} />
                        <span>{t('common.refresh', 'Reîncarcă')}</span>
                    </button>
                    {!showQuickAdd && (
                        <button 
                            type="button"
                            onClick={() => setShowQuickAdd(true)}
                            aria-label={t('quotes.quick_add', 'Ajout Rapide Devis')}
                            title={t('quotes.quick_add', 'Ajout Rapide Devis')}
                            className="w-9.5 h-9.5 sm:w-auto sm:h-10 px-0 sm:px-4 bg-[color:var(--tenant-bg)] hover:opacity-95 text-white font-bold rounded-full text-[12px] sm:text-[13.5px] shadow-xs inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0"
                        >
                            <Plus className="w-4.5 h-4.5 stroke-[2.5] shrink-0" />
                            <span className="hidden sm:inline">{t('quotes.quick_add', 'Ajout Rapide Devis')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Expandable Search Input (only shown when Search icon is tapped on mobile) */}
            {(mobileSearchOpen || searchQuery) && (
                <div className="sm:hidden relative w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('quotes.search', 'Caută deviz, client, adresă...')}
                        className="w-full h-9 pl-9 pr-8 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-full text-[13px] font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[color:var(--tenant-bg)] shadow-2xs"
                    />
                    <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setMobileSearchOpen(false); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center justify-center"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* ── Mobile Ultra-Compact KPI Strip (< 640px) — replaces 5 giant stacked cards on phones ── */}
            {viewMode === 'active' && (
                <div className="sm:hidden grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 px-1 py-1.5 shadow-2xs text-center tabular-nums">
                    <button
                        type="button"
                        onClick={() => { setStatusFilter('all'); setSourceFilter('all'); }}
                        className={`px-1 min-w-0 flex flex-col items-center ${statusFilter === 'all' ? 'opacity-100' : 'opacity-75'}`}
                    >
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase truncate">Total ({quotes.length})</span>
                        <span className="text-[12px] font-black text-slate-950 dark:text-white truncate mt-0.5">{Math.round(kpiStats.totalValue).toLocaleString('de-DE')} €</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
                        className={`px-1 min-w-0 flex flex-col items-center ${statusFilter === 'pending' ? 'text-amber-600' : ''}`}
                    >
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase truncate">{t('status.pending', 'Attente')}</span>
                        <span className="text-[12px] font-black text-amber-600 dark:text-amber-400 truncate mt-0.5">{kpiStats.pendingCount} dev.</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === 'planning' ? 'all' : 'planning')}
                        className={`px-1 min-w-0 flex flex-col items-center ${statusFilter === 'planning' ? 'text-sky-600' : ''}`}
                    >
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase truncate">Planning</span>
                        <span className="text-[12px] font-black text-sky-600 dark:text-sky-400 truncate mt-0.5">{kpiStats.planningCount} ({kpiStats.planningSqm}m²)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === 'confirmed' ? 'all' : 'confirmed')}
                        className={`px-1 min-w-0 flex flex-col items-center ${statusFilter === 'confirmed' ? 'text-emerald-600' : ''}`}
                    >
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase truncate">{t('status.confirmed', 'Confirmé')}</span>
                        <span className="text-[12px] font-black text-emerald-600 dark:text-emerald-400 truncate mt-0.5">{kpiStats.confirmedCount} ({kpiStats.totalSqm}m²)</span>
                    </button>
                </div>
            )}

            {/* ── Desktop Apple HIG KPI Summary Cards Row (5 Clean White Cards, p-5 rounded-[20px]) ── */}
            {viewMode === 'active' && (
                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    {/* Card 1: Total Value — Neutral border like all other cards */}
                    <div
                        onClick={() => { setStatusFilter('all'); setSourceFilter('all'); }}
                        className="rounded-[20px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 p-5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] transition-all cursor-pointer flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200">
                                    {t('quotes.kpi_total_value', 'Valoare Totală Devize')}
                                </span>
                                <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--tenant-bg)]" />
                            </div>
                            <div className="text-[25px] font-black tracking-tight text-slate-950 dark:text-white leading-tight tabular-nums whitespace-nowrap">
                                {fmtEur(kpiStats.totalValue)} €
                            </div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-extrabold bg-sky-500/12 text-[color:var(--tenant-bg)] dark:text-sky-300 tabular-nums">
                                {t('quotes.kpi_avg_quote', 'Medie')}: {fmtEur(kpiStats.avgPrice)} €
                            </span>
                            <span className="text-[12px] font-bold text-slate-400 tabular-nums">
                                {quotes.length} total
                            </span>
                        </div>
                    </div>

                    {/* Card 2: În Așteptare */}
                    <div
                        onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
                        className={`rounded-[20px] bg-white dark:bg-slate-900 border p-5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] transition-all cursor-pointer flex flex-col justify-between ${
                            statusFilter === 'pending'
                                ? 'border-amber-500/60 ring-1 ring-amber-500/20'
                                : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                        }`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200">
                                    {t('status.pending', 'În așteptare')}
                                </span>
                                <span className="text-[12.5px] font-bold text-slate-400 tabular-nums whitespace-nowrap">
                                    {fmtEur(kpiStats.pendingValue)} €
                                </span>
                            </div>
                            <div className="text-[26px] font-black tracking-tight text-slate-950 dark:text-white leading-tight tabular-nums">
                                {kpiStats.pendingCount} <span className="text-[14.5px] font-bold text-slate-500">devize</span>
                            </div>
                        </div>
                        <div className="mt-2.5">
                            {kpiStats.unreadCount > 0 ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-extrabold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25">
                                    {kpiStats.unreadCount} {t('quotes.kpi_unread_new', 'noi (necitite)')}
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {t('quotes.kpi_all_read', 'Toate verificate')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Card 3: În Planificare */}
                    <div
                        onClick={() => setStatusFilter(statusFilter === 'planning' ? 'all' : 'planning')}
                        className={`rounded-[20px] bg-white dark:bg-slate-900 border p-5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] transition-all cursor-pointer flex flex-col justify-between ${
                            statusFilter === 'planning'
                                ? 'border-sky-500/60 ring-1 ring-sky-500/20'
                                : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                        }`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200">
                                    {t('status.planning', 'În planificare')}
                                </span>
                                <span className="text-[12.5px] font-bold text-slate-400 tabular-nums whitespace-nowrap">
                                    {kpiStats.planningSqm} m²
                                </span>
                            </div>
                            <div className="text-[26px] font-black tracking-tight text-slate-950 dark:text-white leading-tight tabular-nums">
                                {kpiStats.planningCount} <span className="text-[14.5px] font-bold text-slate-500">în calendar</span>
                            </div>
                        </div>
                        <div className="mt-2.5">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-extrabold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                                {t('quotes.kpi_scheduled_badge', 'Programate în planning')}
                            </span>
                        </div>
                    </div>

                    {/* Card 4: Confirmate */}
                    <div
                        onClick={() => setStatusFilter(statusFilter === 'confirmed' ? 'all' : 'confirmed')}
                        className={`rounded-[20px] bg-white dark:bg-slate-900 border p-5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] transition-all cursor-pointer flex flex-col justify-between ${
                            statusFilter === 'confirmed'
                                ? 'border-emerald-500/60 ring-1 ring-emerald-500/20'
                                : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                        }`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200">
                                    {t('status.confirmed', 'Confirmat')}
                                </span>
                                <span className="text-[12.5px] font-bold text-slate-400 tabular-nums whitespace-nowrap">
                                    {fmtEur(kpiStats.confirmedValue)} €
                                </span>
                            </div>
                            <div className="text-[26px] font-black tracking-tight text-slate-950 dark:text-white leading-tight tabular-nums">
                                {kpiStats.confirmedCount} <span className="text-[14.5px] font-bold text-slate-500">acceptate</span>
                            </div>
                        </div>
                        <div className="mt-2.5">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                {t('quotes.kpi_confirmed_badge', 'Validat de client')}
                            </span>
                        </div>
                    </div>

                    {/* Card 5: Suprafață Totală */}
                    <div className="rounded-[20px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200">
                                    {t('quotes.kpi_total_surface', 'Suprafață Totală')}
                                </span>
                                <span className="text-[12.5px] font-bold text-slate-400">Chape</span>
                            </div>
                            <div className="text-[26px] font-black tracking-tight text-slate-950 dark:text-white leading-tight tabular-nums whitespace-nowrap">
                                {kpiStats.totalSqm.toLocaleString('ro-RO')} <span className="text-[14.5px] font-bold text-slate-500">m²</span>
                            </div>
                        </div>
                        <div className="mt-2.5">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums">
                                {t('quotes.kpi_avg_quote', 'Medie')}: {kpiStats.avgSqm} m² / deviz
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Add Form */}
            {showQuickAdd && (
                <QuickAddWizard 
                    onClose={() => setShowQuickAdd(false)} 
                    onSuccess={() => {
                        setShowQuickAdd(false);
                        fetchQuotes();
                        showToast(t('quotes.success_create', 'Le devis a été enregistré avec succès.'), 'success');
                    }}
                    showToast={showToast}
                    clients={clients} 
                />
            )}

            {/* ── Main Apple HIG Table Container (1:1 Dispatch Live Layout) ─────────────── */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[20px] shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col min-h-[300px]">
                {/* Desktop Row 1: Title + Count Pill on Left, Search Input + Bulk Actions on Right (hidden on mobile to save space) */}
                <div className="hidden sm:flex px-5 pt-4 pb-3 flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-[color:var(--tenant-bg)] dark:text-sky-400 shrink-0">
                            <FileText className="w-4 h-4" />
                        </div>
                        <h3 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight">
                            {viewMode === 'archived'
                                ? t('quotes.archived_table_title', 'Arhivă Devize Șterse')
                                : t('quotes.live_table_title', 'Tabel Operativ Devize')}
                        </h3>
                        <span className="inline-flex items-center h-7 px-3 rounded-full text-[12.5px] font-extrabold bg-sky-500/15 text-[color:var(--tenant-bg)] dark:text-sky-300 border border-sky-500/25 tabular-nums">
                            {filteredQuotes.length} {t('quotes.quotes_count_label', 'devize')}
                        </span>

                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-1.5 ml-2 pl-2.5 border-l border-slate-200 dark:border-slate-700">
                                <button 
                                    type="button"
                                    onClick={() => handleBulkMarkStatus(true)}
                                    className="h-9 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 rounded-lg text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors border border-slate-200/90 cursor-pointer"
                                    title={t('quotes.mark_read', 'Marchează ca citite')}
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleBulkMarkStatus(false)}
                                    className="h-9 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 rounded-lg text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors border border-slate-200/90 cursor-pointer"
                                    title={t('quotes.mark_unread', 'Marchează ca noi (necitite)')}
                                >
                                    <EyeOff className="w-4 h-4" />
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleBulkRecalculate}
                                    disabled={isBulkRecalculating}
                                    className="h-9 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 rounded-lg text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors border border-slate-200/90 disabled:opacity-50 cursor-pointer"
                                >
                                    {isBulkRecalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />}
                                    <span>{t('quotes.recalculate_distances', 'Recalculare distanțe')} ({selectedIds.length})</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setShowBulkDeleteConfirm(true)}
                                    className="h-9 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 px-3 rounded-lg text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors border border-rose-500/25 cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>{t('common.delete_selected', 'Supprimer')} ({selectedIds.length})</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right: Unified Apple HIG Pill Search Input (h-[42px]) */}
                    <div className="relative w-full lg:w-[380px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('quotes.search', 'Caută după număr deviz, client, adresă...')}
                            className="w-full h-[42px] pl-10 pr-9 bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-full text-[13.5px] font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[color:var(--tenant-bg)] transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Pills Bar — Single Unified Horizontal Row on Mobile (< 640px), Split Status/Source on Desktop */}
                <div className="px-2 sm:px-5 py-2 sm:pb-3.5 sm:pt-0.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-row sm:flex-wrap items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
                    {/* Left: Status Filter Pills (on mobile, also includes source pills inline on the same single row) */}
                    <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/80 dark:border-slate-700 flex-nowrap sm:flex-wrap shrink-0">
                        {[
                            { id: 'all',       label: t('common.all', 'Toate'),                 count: quotes.length,          icon: null },
                            { id: 'pending',   label: t('status.pending', 'În așteptare'),      count: kpiStats.pendingCount,  icon: Clock },
                            { id: 'planning',  label: t('status.planning', 'În planificare'),   count: kpiStats.planningCount, icon: CalendarDays },
                            { id: 'confirmed', label: t('status.confirmed', 'Confirmat'),       count: kpiStats.confirmedCount,icon: CheckCircle2 },
                            { id: 'unread',    label: t('quotes.unread_tab', 'Necitite'),       count: kpiStats.unreadCount,   icon: Eye },
                        ].map(tab => {
                            const isActive = viewMode === 'active' && statusFilter === tab.id;
                            const TabIcon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        if (viewMode !== 'active') setViewMode('active');
                                        setStatusFilter(tab.id);
                                    }}
                                    className={`h-7 sm:h-8 px-2.5 sm:px-3.5 rounded-full text-[11.5px] sm:text-[13px] font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                                        isActive
                                            ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                            : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {TabIcon && <TabIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />}
                                    <span>{tab.label}</span>
                                    <span className={`tabular-nums text-[11px] sm:text-[12.5px] ${isActive ? 'text-white/90 font-extrabold' : 'text-slate-400 font-semibold'}`}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            onClick={() => setViewMode(viewMode === 'archived' ? 'active' : 'archived')}
                            className={`h-7 sm:h-8 px-2.5 sm:px-3.5 rounded-full text-[11.5px] sm:text-[13px] font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                                viewMode === 'archived'
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                    : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                            }`}
                        >
                            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                            <span>{t('quotes.archived_tab', 'Arhivă')}</span>
                        </button>
                    </div>

                    {/* Right: Source Channel Pills (inline on the same single scrollable row on mobile, right-aligned on desktop) */}
                    {viewMode === 'active' && (
                        <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/80 dark:border-slate-700 flex-nowrap sm:flex-wrap shrink-0">
                            {[
                                { id: 'devis_online', label: t('source.devis', 'Devis Online'), count: kpiStats.srcDevisOnline },
                                { id: 'we-r',         label: t('source.we_r', 'WE-R'),          count: kpiStats.srcWeR },
                                { id: 'partner',      label: t('source.partner', 'Partener'),   count: kpiStats.srcPartner },
                                { id: 'manual',       label: t('source.manual', 'Manual'),      count: kpiStats.srcManual },
                            ].map(src => {
                                const isAct = sourceFilter === src.id;
                                return (
                                    <button
                                        key={src.id}
                                        type="button"
                                        onClick={() => setSourceFilter(isAct ? 'all' : src.id)}
                                        className={`h-7 sm:h-8 px-2.5 sm:px-3.5 rounded-full text-[11.5px] sm:text-[13px] font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                                            isAct
                                                ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <span>{src.label}</span>
                                        <span className={`tabular-nums text-[11px] sm:text-[12.5px] ${isAct ? 'text-white/90 font-extrabold' : 'text-slate-400 font-semibold'}`}>{src.count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <DataTable 
                    columns={columns}
                    data={filteredQuotes}
                    loading={loading}
                    defaultPageSize={25}
                    storageKey="admin_quotes"
                    defaultSortKey="created_at"
                    defaultSortDir="desc"
                    searchable={false}
                    emptyText={t('quotes.empty', 'Aucun devis en attente.')}
                    onRowClick={(row, filtered) => navigate(`/admin/work-orders/${row.id}`, { state: { from: '/admin/quotes', quoteIds: filtered?.map(q => q.id) || [] } })}
                    rowClassName={(row) => `cursor-pointer transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/60 ${!row.read_by_admins?.map(String).includes(String(admin?.id)) ? 'font-bold' : 'font-normal text-slate-700'}`}
                    mobileCard={(row) => {
                        const rowPrice = getRowPrice(row);
                        const isUnread = !isRowRead(row);
                        return (
                        <div className="bg-white dark:bg-slate-800/90 mx-2.5 my-1.5 px-3 py-2.5 rounded-2xl shadow-2xs border border-slate-200/85 dark:border-slate-700/80 flex flex-col gap-1.5 relative">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    {isUnread && <span className="w-2 h-2 rounded-full bg-[color:var(--tenant-bg)] shrink-0" />}
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10.5px] font-black text-slate-700 dark:text-slate-200 tabular-nums shrink-0">
                                        {row.quote_number || `DEV${String(row.id).padStart(4, '0')}`}
                                    </span>
                                    <h4 className={`text-[14px] text-slate-900 dark:text-white truncate ${isUnread ? 'font-black' : 'font-bold'}`}>
                                        {row.client_name || row.client?.name || 'Client Inconnu'}
                                    </h4>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                                    {rowPrice > 0 && (
                                        <span className="text-[13.5px] font-black text-slate-950 dark:text-white whitespace-nowrap">
                                            {fmtEur(rowPrice)} €
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wide ${row.status === 'planning' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300' : row.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}>
                                        {row.status === 'planning' ? 'Planning' : row.status === 'confirmed' ? 'Confirmé' : 'Attente'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1 text-[11.5px] text-slate-500 dark:text-slate-400">
                                    {(row.site_address || row.address) && (
                                        <span className="flex items-center gap-0.5 truncate max-w-[140px]">
                                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                            <span className="truncate">{row.site_address || row.address}</span>
                                        </span>
                                    )}
                                    {row.volumes && row.volumes.length > 0 && (
                                        <div className="flex items-center gap-1 shrink-0 tabular-nums">
                                            {row.volumes.slice(0, 2).map((v, i) => (
                                                <span key={i} className="bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded text-[10.5px] font-extrabold">
                                                    {v.quantity}m²{v.thickness ? `×${v.thickness}cm` : ''}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    {row.token && (
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/confirm/${row.token}`); showToast(t('quotes.link_copied', 'Lien copié!'), 'success'); }}
                                            className="w-7.5 h-7.5 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full transition-colors shrink-0"
                                            title="Copier le lien"
                                        >
                                            <Link className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setPreviewPdfId(row.id); }}
                                        className="h-7.5 px-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-full text-[11px] font-extrabold transition-colors inline-flex items-center gap-1"
                                    >
                                        <FileText className="w-3 h-3" /> PDF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            const todayStr = new Date().toISOString().split('T')[0];
                                            setPlanningForm({ date: row.approximate_date ? row.approximate_date.split('T')[0] : todayStr, time: '07:00', teamId: '' }); 
                                            setPlanningModal(row); 
                                        }}
                                        className="h-7.5 px-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 rounded-full text-[11px] font-extrabold transition-colors inline-flex items-center gap-1"
                                    >
                                        <CalendarDays className="w-3 h-3" /> Plan
                                    </button>
                                </div>
                            </div>
                        </div>
                        );
                    }}
                />
            </div>

            {/* Edit Modal — Apple HIG System Sheet */}
            {editingId && createPortal(
                <div className="fixed inset-0 bg-slate-950/45 z-[99999] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 backdrop-blur-3xl saturate-150 rounded-[24px] border-[1.5px] border-slate-300/95 dark:border-slate-600/85 ring-1 ring-slate-900/10 dark:ring-white/10 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200/85 flex items-center justify-between bg-[#F2F4F8] dark:bg-slate-800/80">
                            <h3 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-100/90 text-blue-600 border border-blue-200/80 flex items-center justify-center shadow-xs">
                                    <Pencil className="w-4 h-4" />
                                </div>
                                Modifier le Devis
                            </h3>
                            <button onClick={handleCancelEdit} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-300/80 flex items-center justify-center text-slate-500 transition-colors shadow-2xs">
                                <X className="w-4 h-4" />
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

                        <div className="px-6 py-4 border-t border-slate-200/85 bg-[#F2F4F8] dark:bg-slate-800/80 flex justify-end gap-3">
                            <button 
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                className="h-[42px] px-6 bg-white border border-slate-300/90 hover:bg-slate-50 text-slate-700 font-bold text-[14px] rounded-[13px] shadow-2xs transition-all active:scale-[0.98]"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={handleCreateQuote}
                                disabled={isSaving}
                                className="h-[42px] px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[14px] rounded-[13px] shadow-[0_8px_18px_-4px_rgba(16,185,129,0.45)] disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Enregistrer les modifications
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {toast && createPortal(
                <div className="fixed top-20 right-4 z-[100000] animate-in slide-in-from-top-4">
                    <div className={`px-4 py-2.5 rounded-full backdrop-blur-3xl saturate-150 shadow-[0_16px_36px_-8px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.9)] text-[12px] font-bold tracking-tight border-[1.5px] 
                        ${toast.type === 'success' ? 'bg-white/95 text-emerald-800 border-emerald-400/90' : 'bg-white/95 text-red-800 border-red-400/90'}`}>
                        {toast.msg}
                    </div>
                </div>,
                document.body
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
            {planningModal && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/45 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-slate-900 backdrop-blur-3xl saturate-150 rounded-[24px] shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] border-[1.5px] border-slate-300/95 dark:border-slate-600/85 ring-1 ring-slate-900/10 dark:ring-white/10 w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200/85 dark:border-slate-800 bg-[#F2F4F8] dark:bg-slate-800/80 flex items-center justify-between">
                            <div>
                                <div className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Planifier dans le calendrier</div>
                                <div className="font-black text-slate-900 dark:text-white text-[16px] tracking-tight truncate max-w-[280px]">{planningModal.client_name || planningModal.title}</div>
                                <div className="text-xs font-medium text-slate-500 truncate">{planningModal.site_address}</div>
                            </div>
                            <button onClick={() => setPlanningModal(null)} className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 hover:bg-slate-100 border border-slate-300/80 dark:border-slate-600 flex items-center justify-center text-slate-500 transition-colors shadow-2xs">
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
                                    className="w-full px-3.5 py-2.5 border border-slate-200/90 dark:border-slate-700 rounded-[13px] text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Heure de début</label>
                                <input
                                    type="time"
                                    value={planningForm.time}
                                    onChange={e => setPlanningForm(p => ({ ...p, time: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 border border-slate-200/90 dark:border-slate-700 rounded-[13px] text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Équipe (optionnel)</label>
                                <select
                                    value={planningForm.teamId}
                                    onChange={e => setPlanningForm(p => ({ ...p, teamId: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 border border-slate-200/90 dark:border-slate-700 rounded-[13px] text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="">— Sans équipe —</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-[#F2F4F8] dark:bg-slate-800/80 border-t border-slate-200/85 dark:border-slate-800 flex gap-3">
                            <button
                                onClick={() => setPlanningModal(null)}
                                className="flex-1 h-[42px] px-4 bg-white dark:bg-slate-800 border border-slate-300/90 dark:border-slate-700 rounded-[13px] text-[14px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-all active:scale-[0.98]"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSendToCalendar}
                                disabled={isSendingPlanning || !planningForm.date}
                                className="flex-1 h-[42px] px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-[13px] text-[14px] font-bold text-white shadow-[0_8px_18px_-4px_rgba(16,185,129,0.45)] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                {isSendingPlanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                                Planifier
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            {/* Inline PDF Preview Modal */}
            {previewPdfId && createPortal(
                <div className="fixed inset-0 bg-slate-950/60 z-[99999] flex items-center justify-center p-2.5 sm:p-6 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 backdrop-blur-3xl saturate-150 rounded-[20px] sm:rounded-[24px] border-[1.5px] border-slate-300/95 dark:border-slate-600/85 ring-1 ring-slate-900/10 w-full max-w-5xl h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] sm:h-[88dvh] sm:max-h-[88dvh] flex flex-col overflow-hidden relative shadow-[0_28px_64px_-12px_rgba(15,23,42,0.45)] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-5 sm:py-3.5 bg-[#F2F4F8] dark:bg-slate-800 border-b border-slate-200/85 dark:border-slate-700 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-purple-100 text-purple-600 border border-purple-200/80 flex items-center justify-center shadow-2xs shrink-0">
                                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-slate-200 text-[15px] sm:text-[16px] tracking-tight">Devis PDF</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={() => window.open(`/admin/quotes/${previewPdfId}/pdf`, '_blank')}
                                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-[11px] transition-colors hidden sm:flex items-center gap-2 text-xs font-bold shadow-2xs"
                                    title="Ouvrir dans un nouvel onglet"
                                >
                                    <Link className="w-3.5 h-3.5" /> Nouvel onglet
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setPreviewPdfId(null)}
                                    aria-label={t('common.close', 'Fermer')}
                                    className="w-9.5 h-9.5 rounded-full bg-white hover:bg-slate-100 border border-slate-300/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                                >
                                    <X className="w-4.5 h-4.5" />
                                </button>
                            </div>
                        </div>
                        {/* iframe */}
                        <div className="flex-1 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
                            {/* Fallback loader behind iframe */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                            </div>
                            <iframe 
                                src={`/admin/quotes/${previewPdfId}/pdf`}
                                allow="web-share; clipboard-write"
                                className="w-full h-full relative z-10"
                                frameBorder="0"
                                title="Previzualizare Deviz"
                            />
                        </div>
                    </div>
                </div>,
                document.body
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

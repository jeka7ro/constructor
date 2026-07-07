// v2 - with delete button
import { useState, useEffect } from 'react'
import { Plus, Search, Calendar as CalendarIcon, User, MapPin, FileText, CalendarDays, Loader2, X, RefreshCw, CheckCircle2, AlertCircle, Save, Link, Phone, Check, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import AddressAutocomplete from '../../components/AddressAutocomplete'
import SearchableSelect from '../../components/SearchableSelect'
import ConfirmModal from '../../components/ConfirmModal'
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

const EditablePrice = ({ row, onUpdate }) => {
    const [price, setPrice] = useState(row.estimated_price || '')
    const [isSaving, setIsSaving] = useState(false)
    
    const handleBlur = async () => {
        if (price === (row.estimated_price || '')) return
        setIsSaving(true)
        try {
            await api.put(`/admin/work-orders/${row.id}`, { estimated_price: price === '' ? null : parseFloat(price) })
            onUpdate()
        } catch (e) {
            console.error(e)
            setPrice(row.estimated_price || '')
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
                placeholder="Preț..."
                disabled={isSaving}
            />
            {isSaving && <Loader2 className="w-3 h-3 animate-spin absolute right-2 top-2 text-slate-400" />}
        </div>
    )
}

const EditableUnitPrice = ({ row, onUpdate }) => {
    const [price, setPrice] = useState(row.volumes?.[0]?.price || '')
    const [isSaving, setIsSaving] = useState(false)
    
    const handleBlur = async () => {
        if (price === (row.volumes?.[0]?.price || '')) return
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
            setPrice(row.volumes?.[0]?.price || '')
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
                placeholder="Preț/m²..."
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
    const [loading, setLoading] = useState(true)
    const [sentToPlanningIds, setSentToPlanningIds] = useState(new Set())
    const [teams, setTeams] = useState([])
    const [planningModal, setPlanningModal] = useState(null) // { quote } when open
    const [planningForm, setPlanningForm] = useState({ date: '', time: '07:00', teamId: '' })
    const [isSendingPlanning, setIsSendingPlanning] = useState(false)
    
    // Quick Add Form
    const [quickAddStep, setQuickAddStep] = useState(1) // 1: Info, 'new-client': New Client Form
    const [showQuickAdd, setShowQuickAdd] = useState(false)
    const [isSearchingVies, setIsSearchingVies] = useState(false)
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

    useEffect(() => {
        fetchQuotes()
        fetchClients()
        fetchActivities()
        fetchTeams()
    }, [])

    const fetchTeams = async () => {
        try {
            const res = await api.get('/admin/teams')
            setTeams(res.data || [])
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
            showToast(t('clients.vies_error', 'Firma nu a fost găsită sau serviciul VIES este indisponibil. Verificați codul TVA.'), 'error');
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
                    const n = (a.name || '').toLowerCase()
                    return n.includes('sapa') || n.includes('șapă') || n.includes('chape')
                })
                setForm(p => ({
                    ...p,
                    volumes: [{ ...p.volumes[0], label: sapaAct ? sapaAct.name : (acts[0].name || '') }]
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
                notes: form.notes || ''
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
            showToast(t('quotes.success_create', 'Devizul a fost salvat cu succes.'), 'success')
        } catch (e) {
            showToast(t('quotes.err_create', 'Eroare la salvarea ofertei'), 'error')
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
            key: 'approximate_date',
            label: t('quotes.approx_date', 'Dată Aprox.'),
            render: (row) => {
                let display = '-'
                if (row.approximate_date) {
                    try {
                        // Tratează atât formatul YYYY-MM-DD cât și string-uri libere
                        const d = new Date(row.approximate_date)
                        if (!isNaN(d.getTime())) {
                            display = d.toLocaleDateString('ro-RO')
                        } else {
                            display = row.approximate_date
                        }
                    } catch(e) {
                        display = row.approximate_date
                    }
                }
                return (
                    <div className="flex items-center gap-2 text-slate-600">
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                        <span>{display}</span>
                    </div>
                )
            }
        },
        {
            key: 'client_name',
            label: t('quotes.client', 'Client'),
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-800">{row.client_name || '-'}</span>
                </div>
            )
        },
        {
            key: 'surface_thickness',
            label: t('quotes.surface_thickness', 'Suprafață / Grosime'),
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-700">{row.volumes?.[0]?.quantity ? `${row.volumes[0].quantity} m²` : '-'}</span>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{row.volumes?.[0]?.thickness ? `${row.volumes[0].thickness} cm` : '-'}</span>
                </div>
            )
        },
        {
            key: 'site_address',
            label: t('quotes.address', 'Adresă'),
            render: (row) => {
                const addr = row.site_address;
                if (!addr) return <span className="text-slate-400 italic text-xs">—</span>;
                return (
                    <div className="flex items-center gap-1.5 max-w-[200px]" title={addr}>
                        <span className="text-xs text-slate-600 truncate">{addr}</span>
                    </div>
                );
            }
        },
        {
            key: 'estimated_price',
            label: t('quotes.price', 'Preț (€)'),
            render: (row) => (
                <EditablePrice row={row} onUpdate={fetchQuotes} />
            )
        },
        {
            key: 'status_badge',
            label: 'Statut',
            render: (row) => {
                if (row.status === 'planning') {
                    return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wide border border-emerald-200 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                            En Planning
                        </span>
                    )
                }
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wide border border-amber-200 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                        En attente
                    </span>
                )
            }
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
                                client_id: row.client_id || '',
                                approximate_date: row.approximate_date ? row.approximate_date.split('T')[0] : '',
                                address: row.site_address || '',
                                latitude: row.site_latitude || '',
                                longitude: row.site_longitude || '',
                                notes: row.notes || '',
                                estimated_price: row.estimated_price || '',
                                vat_enabled: row.vat_enabled || false,
                                vat_type: row.vat_type || '21',
                                volumes: row.volumes?.length > 0 ? row.volumes : [{ label: '', quantity: '', unit: 'm²', thickness: '', price: '', has_foil: false, has_mesh: false, has_fiber: false }],
                                prices: row.prices || { base: 12.5, extra: 1.25, foil: 1.2, mesh: 2.5, fiber: 2.0 }
                            })
                            setQuickAddStep(1)
                            // Scroll to top
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        title="Șterge devis"
                        onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({
                                isOpen: true,
                                title: 'Ștergere Deviz',
                                message: 'Ești sigur că vrei să ștergi definitiv acest devis? Acțiunea este ireversibilă.',
                                confirmText: 'Șterge Deviz',
                                type: 'danger',
                                action: async () => {
                                    try {
                                        await api.delete(`/admin/work-orders/${row.id}`);
                                        if (typeof fetchQuotes === 'function') fetchQuotes();
                                        else window.location.reload();
                                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                    } catch (err) {
                                        console.error(err);
                                        alert('Eroare la ștergerea devizului.');
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

    form.volumes.forEach(vol => {
        const surface = parseFloat(vol.quantity) || 0;
        const thickness = parseFloat(vol.thickness) || 0;
        const labelSafe = (vol.label || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (labelSafe.includes('sapa')) {
            isAutoRender = true;
            surfaceForAuto += surface;
            const extraThickness = Math.max(0, thickness - 5);
            extraThickForAuto = extraThickness;
            autoBase += (parseFloat(form.prices?.base || 12.5) * surface);
            autoExtra += extraThickness * parseFloat(form.prices?.extra || 1.25) * surface;
            autoFoil += vol.has_foil ? parseFloat(form.prices?.foil || 1.2) * surface : 0;
            autoMesh += vol.has_mesh ? parseFloat(form.prices?.mesh || 2.5) * surface : 0;
            autoFiber += vol.has_fiber ? parseFloat(form.prices?.fiber || (surface <= 200 ? 2.5 : 2.0)) * surface : 0;
        }
    });

    autoNet = autoBase + autoExtra + autoFoil + autoMesh + autoFiber;
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
        if (!planningForm.date) return showToast('Selectează o dată!', 'error')
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
        <div className="p-6 max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-64px)]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('quotes.title_main', 'Devis / Oferte')}</h2>
                    <p className="text-slate-500 text-sm">{t('quotes.subtitle', 'Gestionează cererile de oferte înainte de planificare')}</p>
                </div>
                {!showQuickAdd && (
                    <button 
                        onClick={() => setShowQuickAdd(true)}
                        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('quotes.quick_add', 'Adăugare Rapidă Devis')}
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
                        {t('quotes.quick_add', 'Adăugare Rapidă Devis')}
                    </h3>

                {quickAddStep === 1 && !editingId && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            {/* Row 1 */}
                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('quotes.field_client', 'Client')}</label>
                                <SearchableSelect
                                    value={form.client_id}
                                    onChange={val => {
                                        if (val === 'NEW') setQuickAddStep('new-client')
                                        else setForm({...form, client_id: val})
                                    }}
                                    options={[
                                        { value: 'NEW', label: `+ ${t('quotes.new_client', 'Client Nou')}` },
                                        ...clients.map(c => ({
                                            value: c.id,
                                            label: c.name || c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || t('quotes.unknown', 'Necunoscut'),
                                            subLabel: c.phone || c.email || c.address || c.company_address || ''
                                        }))
                                    ]}
                                    placeholder="- Selectează -"
                                    buttonClassName="rounded-xl h-9 border-slate-200 !text-sm bg-white"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('quotes.field_title', 'Tip Lucrare')}</label>
                                <select 
                                    className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={form.volumes[0].label}
                                    onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], label: e.target.value }] }))}
                                >
                                    <option value="">- {t('common.activities', 'Activitate')} -</option>
                                    {activities.map(a => <option key={a.id || a.name} value={a.name}>{a.name}</option>)}
                                </select>
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">M²</label>
                                <input type="number" min="0" placeholder="150"
                                    className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={form.volumes[0].quantity}
                                    onChange={e => {
                                        const q = e.target.value;
                                        const p = form.volumes[0].price || '';
                                        let est = form.estimated_price;
                                        if (p && q) est = (parseFloat(p) * parseFloat(q)).toFixed(2);
                                        setForm(prev => ({ ...prev, estimated_price: est, volumes: [{ ...prev.volumes[0], quantity: q }] }));
                                    }}
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">Cm</label>
                                <input type="number" step="any" min="0" placeholder="5.5"
                                    className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={form.volumes[0].thickness}
                                    onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], thickness: e.target.value }] }))}
                                />
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('quotes.approx_date', 'Dată Aprox.')}</label>
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
                                    value={form.estimated_price || ''}
                                    onChange={e => setForm({...form, estimated_price: e.target.value})}
                                />
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('quotes.details_notes', 'Detalii / Observații')}</label>
                                <input type="text" placeholder="..."
                                    className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={form.notes || ''}
                                    onChange={e => setForm({...form, notes: e.target.value})}
                                />
                            </div>

                            {/* Row 2 */}
                            <div className="md:col-span-5">
                                <label className="block text-[11px] font-medium text-slate-500 mb-1 flex items-center justify-between">
                                    <span>{t('quotes.field_address', 'Adresă')}</span>
                                    {form.latitude && form.longitude && (
                                        <span className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded text-[9px] font-bold">
                                            Dus: {(haversine(50.88243, 4.39343, parseFloat(form.latitude), parseFloat(form.longitude))).toFixed(1)}km | Întors: {(haversine(50.88243, 4.39343, parseFloat(form.latitude), parseFloat(form.longitude)) * 2).toFixed(1)}km
                                        </span>
                                    )}
                                </label>
                                <AddressAutocomplete 
                                    onSelect={({ address, lat, lon }) => setForm(f => ({...f, address: address || '', latitude: lat || '', longitude: lon || ''}))}
                                    value={form.address}
                                    className="h-9 rounded-xl"
                                />
                            </div>

                            <div className="md:col-span-4">
                                {(form.volumes[0].label || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('sapa') && (
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 items-center h-9">
                                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                                            <input type="checkbox" checked={form.volumes[0].has_foil} onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], has_foil: e.target.checked }] }))} className="rounded border-slate-300 w-3.5 h-3.5 text-blue-600 focus:ring-blue-500" />
                                            {t('quotes.foil', 'Folie')}
                                        </label>
                                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                                            <input type="checkbox" checked={form.volumes[0].has_mesh} onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], has_mesh: e.target.checked }] }))} className="rounded border-slate-300 w-3.5 h-3.5 text-blue-600 focus:ring-blue-500" />
                                            {t('quotes.mesh', 'Plasă')}
                                        </label>
                                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                                            <input type="checkbox" checked={form.volumes[0].has_fiber} onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], has_fiber: e.target.checked }] }))} className="rounded border-slate-300 w-3.5 h-3.5 text-blue-600 focus:ring-blue-500" />
                                            {t('quotes.duramint', 'Duramint')}
                                        </label>
                                    </div>
                                )}
                            </div>

                            {isAutoRender && (
                                <div className="md:col-span-12 bg-indigo-50/50 rounded-xl p-2.5 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-[11px] shadow-sm">
                                    <div className="flex items-center gap-4 border-r border-indigo-200 pr-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-indigo-800 font-black text-[10px] tracking-widest">{t('quotes.calc_label', 'CALCUL:')}</span>
                                            <span className="text-slate-500 font-bold text-[10px] uppercase">{t('quotes.base', 'BAZĂ')}</span>
                                            <input type="number" step="0.1" value={form.prices?.base || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, base: e.target.value}}))} className="w-14 h-7 px-1 border border-slate-200 rounded shadow-inner text-center font-black text-indigo-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        {extraThickForAuto > 0 && (
                                            <div className="flex items-center gap-1.5" title="Grosime suplimentară (>5cm)">
                                                <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.extra_cm', 'EXTRA CM')}</span>
                                                <input type="number" step="0.1" value={form.prices?.extra || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, extra: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        )}
                                        {form.volumes[0].has_foil && (
                                            <div className="flex items-center gap-1.5" title="Folie PVC">
                                                <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.foil', 'FOLIE')}</span>
                                                <input type="number" step="0.1" value={form.prices?.foil || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, foil: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        )}
                                        {form.volumes[0].has_mesh && (
                                            <div className="flex items-center gap-1.5" title="Plasă metalică">
                                                <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.mesh', 'PLASĂ')}</span>
                                                <input type="number" step="0.1" value={form.prices?.mesh || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, mesh: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        )}
                                        {form.volumes[0].has_fiber && (
                                            <div className="flex items-center gap-1.5" title="Duramint (Fibră)">
                                                <span className="text-slate-500 font-medium text-[10px] uppercase">{t('quotes.duramint', 'FIBRĂ')}</span>
                                                <input type="number" step="0.1" value={form.prices?.fiber || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, fiber: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
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
                                    disabled={isSaving}
                                    className="flex-1 h-9 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    {t('quotes.btn_save', 'Salvează Devis')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {quickAddStep === 'new-client' && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-blue-100 relative mt-4">
                        <button onClick={() => { setQuickAddStep(1); setForm({...form, client_id: ''}) }} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-1">
                            <X className="w-4 h-4" />
                        </button>
                        <h4 className="text-sm font-bold text-blue-800 mb-3">{t('quotes.add_new_client', 'Adaugă Client Nou')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('dashboard.quick_create.client_type', 'Tip Client')}</label>
                                <select className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm" value={newClient.client_type} onChange={e => setNewClient({...newClient, client_type: e.target.value})}>
                                    <option value="fizica">{t('dashboard.quick_create.individual', 'Persoană Fizică')}</option>
                                    <option value="juridica">{t('dashboard.quick_create.legal_entity', 'Companie')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('dashboard.quick_create.client_name', 'Nume / Denumire *')}</label>
                                <input type="text" className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{newClient.client_type === 'juridica' ? t('dashboard.quick_create.cui', 'CUI / TVA (Opțional)') : t('dashboard.quick_create.cnp', 'CNP (Opțional)')}</label>
                                <div className="flex gap-1">
                                    <input type="text" className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm" value={newClient.cui} onChange={e => setNewClient({...newClient, cui: e.target.value})} />
                                    {newClient.client_type === 'juridica' && (
                                        <button type="button" onClick={handleViesSearch} disabled={isSearchingVies || !newClient.cui} className="h-9 px-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 hover:bg-blue-100 disabled:opacity-50 flex items-center justify-center shrink-0" title="Caută firmă în VIES">
                                            {isSearchingVies ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('dashboard.quick_create.phone', 'Telefon')}</label>
                                <input type="text" className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('dashboard.quick_create.email', 'Email')}</label>
                                <input type="email" className="w-full h-9 border border-slate-200 rounded-xl px-2 text-sm" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-between items-center">
                            <button onClick={() => setQuickAddStep(1)} className="text-sm text-slate-500 hover:text-slate-700 font-medium">{t('quotes.back_to_simple', 'Înapoi la adăugare simplă')}</button>
                            <button onClick={handleCreateQuote} disabled={!newClient.name || !form.volumes[0]?.label} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {t('quotes.btn_save_with_client', 'Creează Client & Salvează Devis')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* Table */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[300px]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="font-bold text-slate-700">{t('quotes.list_title', 'Lista Devis-uri Așteptare')} - DEBUG</h2>
                    <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                        {quotes.length} {t('quotes.total', 'total')}
                    </span>
                </div>
                
                <DataTable 
                    columns={columns}
                    data={quotes}
                    loading={loading}
                    defaultPageSize={25}
                    searchable={true}
                    searchPlaceholder={t('quotes.search', 'Caută devis...')}
                    emptyText={t('quotes.empty', 'Nu există oferte în așteptare.')}
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
                                Editare Devis
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
                                                label: c.name || c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || t('quotes.unknown', 'Necunoscut'),
                                                subLabel: c.phone || c.email || c.address || c.company_address || ''
                                            }))
                                        ]}
                                        placeholder="- Selectează -"
                                        buttonClassName="rounded-xl h-10 border-slate-200 text-sm bg-white"
                                    />
                                </div>

                                <div className="md:col-span-3">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Tip Lucrare</label>
                                    <select 
                                        className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        value={form.volumes[0].label}
                                        onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], label: e.target.value }] }))}
                                    >
                                        <option value="">- Activitate -</option>
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
                                            const p = form.volumes[0].price || '';
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
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('quotes.approx_date', 'Dată Aprox.')}</label>
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
                                        value={form.estimated_price || ''}
                                        onChange={e => setForm({...form, estimated_price: e.target.value})}
                                    />
                                </div>

                                {/* Row 2 */}
                                <div className="md:col-span-5">
                                    <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center justify-between">
                                        <span>{t('quotes.field_address', 'Adresă')}</span>
                                        {form.latitude && form.longitude && (
                                            <span className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded text-[10px] font-bold">
                                                Dus: {(haversine(50.88243, 4.39343, parseFloat(form.latitude), parseFloat(form.longitude))).toFixed(1)}km | Întors: {(haversine(50.88243, 4.39343, parseFloat(form.latitude), parseFloat(form.longitude)) * 2).toFixed(1)}km
                                            </span>
                                        )}
                                    </label>
                                    <AddressAutocomplete 
                                        onSelect={({ address, lat, lon }) => setForm(f => ({...f, address: address || '', latitude: lat || '', longitude: lon || ''}))}
                                        value={form.address}
                                        className="h-10 rounded-xl"
                                    />
                                </div>



                                <div className="md:col-span-7">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Detalii / Observații</label>
                                    <input type="text" placeholder="..."
                                        className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.notes || ''}
                                        onChange={e => setForm({...form, notes: e.target.value})}
                                    />
                                </div>

                                {/* Row 3 */}
                                <div className="md:col-span-12">
                                    {(form.volumes[0].label || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('sapa') && (
                                        <div className="flex flex-wrap gap-x-4 gap-y-2 items-center h-10 bg-slate-50 px-3 rounded-xl border border-slate-100">
                                            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                                                <input type="checkbox" checked={form.volumes[0].has_foil} onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], has_foil: e.target.checked }] }))} className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                Include Folie plastic
                                            </label>
                                            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                                                <input type="checkbox" checked={form.volumes[0].has_mesh} onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], has_mesh: e.target.checked }] }))} className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                Include Plasă metalică
                                            </label>
                                            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                                                <input type="checkbox" checked={form.volumes[0].has_fiber} onChange={e => setForm(p => ({ ...p, volumes: [{ ...p.volumes[0], has_fiber: e.target.checked }] }))} className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                Include Duramint (Fibră)
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {isAutoRender && (
                                    <div className="md:col-span-12 bg-indigo-50/50 rounded-lg p-2.5 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-[11px] shadow-sm">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <span className="font-extrabold text-indigo-700 uppercase tracking-tight">Calcul:</span>
                                            <div className="flex items-center gap-1.5" title="Șapă de bază">
                                                <span className="text-slate-500 font-medium text-[10px] uppercase">Bază</span>
                                                <input type="number" step="0.1" value={form.prices?.base || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, base: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            {extraThickForAuto > 0 && (
                                                <div className="flex items-center gap-1.5" title={`Grosime extra ${extraThickForAuto}cm`}>
                                                    <span className="text-slate-500 font-medium text-[10px] uppercase">Gros.({extraThickForAuto})</span>
                                                    <input type="number" step="0.1" value={form.prices?.extra || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, extra: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                                </div>
                                            )}
                                            {form.volumes[0].has_foil && (
                                                <div className="flex items-center gap-1.5" title="Folie plastic">
                                                    <span className="text-slate-500 font-medium text-[10px] uppercase">Folie</span>
                                                    <input type="number" step="0.1" value={form.prices?.foil || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, foil: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                                </div>
                                            )}
                                            {form.volumes[0].has_mesh && (
                                                <div className="flex items-center gap-1.5" title="Plasă metalică">
                                                    <span className="text-slate-500 font-medium text-[10px] uppercase">Plasă</span>
                                                    <input type="number" step="0.1" value={form.prices?.mesh || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, mesh: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                                </div>
                                            )}
                                            {form.volumes[0].has_fiber && (
                                                <div className="flex items-center gap-1.5" title="Duramint (Fibră)">
                                                    <span className="text-slate-500 font-medium text-[10px] uppercase">Fibră</span>
                                                    <input type="number" step="0.1" value={form.prices?.fiber || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, fiber: e.target.value}}))} className="w-12 h-6 px-1 border border-slate-200 rounded shadow-inner text-center font-bold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
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
                                Anulează
                            </button>
                            <button 
                                onClick={handleCreateQuote}
                                disabled={isSaving}
                                className="h-10 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Salvează Modificările
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-4 right-4 z-[9999]">
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
        </div>
    )
}

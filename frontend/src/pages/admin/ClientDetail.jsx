import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Building, Phone, Mail, MapPin, Star, Image as ImageIcon, FileText, Briefcase, Loader2, Save, FileCheck, ChevronLeft, Eye, ChevronRight, Activity, TrendingUp, Calendar, Hash, Filter } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import DataTable from '../../components/DataTable'
import WorkOrderPdfModal from '../../components/WorkOrderPdfModal'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

const getStatusDot = (status, t, wo = null) => {
    let effectiveStatus = status;
    if (status === 'draft' && wo && !wo.is_quote && !wo.is_invoiced) {
        effectiveStatus = 'planning';
    }

    const map = {
        planning:  { color: 'bg-emerald-500 animate-pulse', label: t('status.planning', 'En planning'),  text: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        confirmed: { color: 'bg-green-500',                 label: t('status.confirmed', 'Signé'),       text: 'text-green-700 bg-green-50 border-green-200'   },
        completed: { color: 'bg-slate-400',                 label: t('status.completed', 'Terminé'),     text: 'text-slate-600 bg-slate-50 border-slate-200'   },
        cancelled: { color: 'bg-red-400',                   label: t('status.cancelled', 'Annulé'),      text: 'text-red-700 bg-red-50 border-red-200'     },
    }
    const cfg = map[effectiveStatus] || { color: 'bg-amber-400', label: t('status.pending', 'En attente'), text: 'text-amber-700 bg-amber-50 border-amber-200' }
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.color}`}></span>
            {cfg.label}
        </span>
    )
}

export default function ClientDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const showToast = useUIStore(state => state.showToast)
    
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState(null)
    const [activeTab, setActiveTab] = useState('quotes')
    
    const [rating, setRating] = useState(0)
    const [notes, setNotes] = useState('')
    const [savingRating, setSavingRating] = useState(false)
    
    // PDF Preview State
    const [previewDoc, setPreviewDoc] = useState(null)

    // Filters
    const [statusFilter, setStatusFilter] = useState('all')
    const [dateFilter, setDateFilter] = useState('all')
    const [customStartDate, setCustomStartDate] = useState('')
    const [customEndDate, setCustomEndDate] = useState('')

    useEffect(() => {
        fetchClientData()
    }, [id])

    const fetchClientData = async () => {
        try {
            setLoading(true)
            const res = await api.get(`/admin/clients/${id}/details`)
            setData(res.data)
            setRating(res.data.client.rating || 0)
            setNotes(res.data.client.internal_notes || '')
        } catch (error) {
            console.error('Error fetching client details:', error)
            showToast(t('common.error', 'Eroare la încărcare'), 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveRating = async () => {
        try {
            setSavingRating(true)
            await api.put(`/admin/clients/${id}/rating`, {
                rating: rating,
                internal_notes: notes
            })
            showToast(t('common.saved', 'Salvat cu succes'), 'success')
        } catch (error) {
            console.error('Error saving rating:', error)
            showToast(t('common.error', 'Eroare la salvare'), 'error')
        } finally {
            setSavingRating(false)
        }
    }

    const filteredWorkOrders = useMemo(() => {
        if (!data?.work_orders) return [];
        let list = [...data.work_orders];

        if (statusFilter !== 'all') {
            list = list.filter(wo => {
                let effectiveStatus = wo.status;
                if (effectiveStatus === 'draft' && !wo.is_quote && !wo.is_invoiced) {
                    effectiveStatus = 'planning';
                }
                return effectiveStatus === statusFilter;
            });
        }

        if (dateFilter !== 'all') {
            const now = new Date();
            const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            const startOfThisYear = new Date(now.getFullYear(), 0, 1);

            list = list.filter(wo => {
                if (!wo.created_at) return false;
                const d = new Date(wo.created_at);
                if (dateFilter === 'this_month') return d >= startOfThisMonth;
                if (dateFilter === 'last_month') return d >= startOfLastMonth && d <= endOfLastMonth;
                if (dateFilter === 'this_year') return d >= startOfThisYear;
                if (dateFilter === 'custom') {
                    if (customStartDate && d < new Date(customStartDate)) return false;
                    if (customEndDate) {
                        const endD = new Date(customEndDate);
                        endD.setHours(23, 59, 59, 999);
                        if (d > endD) return false;
                    }
                    return true;
                }
                return true;
            });
        }

        return list;
    }, [data, statusFilter, dateFilter, customStartDate, customEndDate]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-slate-500 font-medium">Se încarcă profilul...</p>
            </div>
        )
    }

    if (!data || !data.client) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <Hash className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-700">Clientul nu a fost găsit</h2>
                <button onClick={() => navigate(-1)} className="mt-4 px-6 h-10 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700">Înapoi</button>
            </div>
        )
    }

    const { client, stats } = data
    const photos = client?.photos || []

    const activeQuotes = filteredWorkOrders.filter(w => !w.is_invoiced)
    const activeInvoices = filteredWorkOrders.filter(w => w.is_invoiced)

    const columns = [
        { 
            key: 'type', 
            label: 'Tip Document',
            sortable: true,
            sortValue: (wo) => wo.is_invoiced ? '3_factura' : wo.is_quote ? '1_deviz' : '2_comanda',
            render: (wo) => (
                <div className="flex items-center">
                    {wo.is_invoiced ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <FileCheck className="w-3.5 h-3.5 mr-1.5" /> Factură
                        </span>
                    ) : wo.is_quote ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            <FileText className="w-3.5 h-3.5 mr-1.5" /> Deviz
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Briefcase className="w-3.5 h-3.5 mr-1.5" /> Comandă Manuală
                        </span>
                    )}
                </div>
            )
        },
        { 
            key: 'number', 
            label: 'Număr',
            sortable: true,
            sortValue: (wo) => wo.invoice_number || wo.quote_number || wo.id || '',
            render: (wo) => (
                <span className="font-bold text-slate-700 dark:text-slate-300">
                    {wo.invoice_number || wo.quote_number || (
                        <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {wo.id ? wo.id.substring(0, 8).toUpperCase() : 'MANUAL'}
                        </span>
                    )}
                </span>
            )
        },
        { 
            key: 'title', 
            label: 'Lucrare / Adresă',
            sortable: true,
            sortValue: (wo) => wo.title || '',
            render: (wo) => (
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{wo.title || '—'}</span>
                    {wo.site_address && <span className="text-xs text-slate-500 truncate max-w-[250px]">{wo.site_address}</span>}
                </div>
            )
        },
        { 
            key: 'created_at', 
            label: 'Dată',
            sortable: true,
            sortValue: (wo) => wo.created_at || '',
            render: (wo) => (
                <div className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-50" />
                    {new Date(wo.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
            )
        },
        { 
            key: 'price', 
            label: 'Valoare',
            sortable: true,
            sortValue: (wo) => wo.estimated_price || 0,
            render: (wo) => (
                <span className="font-bold text-slate-800 dark:text-slate-200">
                    {wo.estimated_price ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(wo.estimated_price) : '—'}
                </span>
            )
        },
        { 
            key: 'status', 
            label: 'Status',
            sortable: true,
            sortValue: (wo) => wo.status || '',
            render: (wo) => getStatusDot(wo.status, t, wo)
        },
        {
            key: 'actions',
            label: 'Acțiuni',
            sortable: false,
            className: 'text-right',
            render: (wo) => (
                <div className="flex justify-end items-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setPreviewDoc(wo); }}
                        className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                        title="Vizualizează PDF"
                    >
                        {wo.is_invoiced ? <FileCheck className="w-4 h-4 text-indigo-500" /> : <FileText className="w-4 h-4 text-blue-500" />}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/work-orders/${wo.id}`); }}
                        className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                        title="Deschide Pagina Deviz"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ]

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-slate-500 dark:text-slate-400">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Building className="w-6 h-6 text-blue-600" />
                            Profil Client: {client.name}
                        </h1>
                        <p className="text-sm text-slate-500">Toate documentele și istoricul centralizate</p>
                    </div>
                </div>
            </div>

            {/* Top Section - Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Devize</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-white leading-tight">{stats.total_quotes}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                        <FileCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Facturi</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-white leading-tight">{stats.total_invoices}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Valoare Est.</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-white leading-tight">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.total_value)}</p>
                    </div>
                </div>
            </div>

            {/* Middle Section - Contact and Rating */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                {/* Column 1: Contact details */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-col">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Informații Client</h2>
                    <div className="space-y-2 flex-grow">
                        <div className="flex gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <Building className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{client.name}</p>
                                <div className="flex gap-2 text-xs text-slate-500 mt-0.5">
                                    {client.cui && <span>CUI: {client.cui}</span>}
                                    {client.reg_com && <span>Reg: {client.reg_com}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-none">{client.address || '—'}</p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-none">{client.email || '—'}</p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-none">{client.phone || '—'}</p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">Persoană contact</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-none">{client.contact_person || '—'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Rating and Notes */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-col">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Rating Intern (Secret)</h2>
                    
                    <div className="flex items-center justify-center gap-2 mb-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className={`p-1 hover:scale-110 transition-transform ${
                                    star <= rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'
                                }`}
                            >
                                <Star className={`w-5 h-5 ${star <= rating ? 'fill-current' : ''}`} />
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col flex-grow">
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Notițe Despre Client</label>
                        <textarea
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none flex-grow h-[60px]"
                            placeholder="ex: Client dificil, întârzie plățile..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={handleSaveRating}
                        disabled={savingRating || (rating === client.rating && notes === client.internal_notes)}
                        className="mt-2 w-full h-9 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                    >
                        {savingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {savingRating ? 'Se salvează...' : 'Salvează Profil'}
                    </button>
                </div>
            </div>

            {/* Full Width Tabs */}
            <div className="col-span-full">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[700px]">
                    <div className="flex items-center gap-6 px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <button
                            onClick={() => setActiveTab('quotes')}
                            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${
                                activeTab === 'quotes'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <FileText className="w-4 h-4" /> Devize / Comenzi ({stats.total_quotes})
                        </button>
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${
                                activeTab === 'invoices'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <FileCheck className="w-4 h-4" /> Facturi ({stats.total_invoices})
                        </button>
                        <button
                            onClick={() => setActiveTab('photos')}
                            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${
                                activeTab === 'photos'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <ImageIcon className="w-4 h-4" /> Poze din Șantiere ({photos.length})
                        </button>
                    </div>

                    {/* Filters Bar (Only show on document tabs) */}
                    {(activeTab === 'quotes' || activeTab === 'invoices') && (
                        <div className="flex flex-wrap items-center gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filtre:</span>
                            </div>
                            
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="all">Toate Statusurile</option>
                                <option value="planning">În planificare</option>
                                <option value="confirmed">Confirmat</option>
                                <option value="completed">Finalizat</option>
                                <option value="cancelled">Anulat</option>
                                <option value="draft">Draft</option>
                            </select>

                            <select 
                                value={dateFilter} 
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="all">Orice perioadă</option>
                                <option value="this_month">Luna aceasta</option>
                                <option value="last_month">Luna trecută</option>
                                <option value="this_year">Anul curent</option>
                                <option value="custom">Perioadă custom...</option>
                            </select>

                            {dateFilter === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="date" 
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-slate-500">-</span>
                                    <input 
                                        type="date" 
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden flex flex-col p-6">
                        {activeTab === 'quotes' && (
                            <DataTable
                                columns={columns}
                                data={activeQuotes}
                                searchable={true}
                                searchPlaceholder="Caută devize, adrese..."
                                className="h-full border-none shadow-none"
                                onRowClick={(row) => navigate(`/admin/work-orders/${row.id}`)}
                            />
                        )}
                        {activeTab === 'invoices' && (
                            <DataTable
                                columns={columns}
                                data={activeInvoices}
                                searchable={true}
                                searchPlaceholder="Caută facturi, adrese..."
                                className="h-full border-none shadow-none"
                                onRowClick={(row) => navigate(`/admin/work-orders/${row.id}`)}
                            />
                        )}
                        {activeTab === 'photos' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
                                {photos.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-slate-400 font-medium">Nu există nicio poză asociată acestui client.</div>
                                ) : (
                                    photos.map(photo => (
                                        <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                            <img 
                                                src={photo.url?.startsWith('http') ? photo.url : (photo.url ? `${API_BASE}${photo.url}` : 'https://placehold.co/400x400?text=No+Image')} 
                                                alt="Photo" 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => { e.target.src = 'https://placehold.co/400x400?text=Error' }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                <div className="text-white">
                                                    <p className="text-xs font-bold line-clamp-1">{photo.work_order_title}</p>
                                                    <p className="text-[10px] opacity-80">{new Date(photo.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Document Preview Modal */}
            {previewDoc && (
                <WorkOrderPdfModal
                    workOrders={filteredWorkOrders}
                    initialIndex={filteredWorkOrders.findIndex(wo => wo.id === previewDoc.id)}
                    onClose={() => setPreviewDoc(null)}
                />
            )}
        </div>
    )
}

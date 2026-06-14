import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    ClipboardList, Plus, Send, Eye, Pencil, Trash2,
    CheckCircle2, Clock, CircleDot, XCircle, Copy,
    ExternalLink, ChevronDown, Filter, Pen, X, Timer, User, Package, Trash,
    FileText, CheckCircle, Play, Ban, MapPin, Mail, Truck, Activity
} from 'lucide-react'
import api from '../../lib/api'
import KPICard from '../../components/KPICard'
import DataTable from '../../components/DataTable'

const STATUS_CONFIG = {
    draft:       { label: 'Nouă',       color: 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', dot: 'bg-slate-400' },
    sent:        { label: 'Trimisă',     color: 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500' },
    confirmed:   { label: 'Confirmată',  color: 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500' },
    completed:   { label: 'Finalizată',  color: 'bg-violet-50 text-violet-600 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800', dot: 'bg-violet-500' },
    cancelled:   { label: 'Anulată',     color: 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', dot: 'bg-red-500' },
    isoflex:     { label: 'Isoflex',     color: 'bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800', dot: 'bg-indigo-500' },
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function WorkOrders() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [workOrders, setWorkOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('')
    const [filterTeam, setFilterTeam] = useState('')
    const [teams, setTeams] = useState([])
    const [filterPeriod, setFilterPeriod] = useState('current_month')
    const [copiedId, setCopiedId] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [sendingId, setSendingId] = useState(null)
    const [sendResult, setSendResult] = useState(null)
    const [sendModal, setSendModal] = useState(null)          // { wo: object }
    const [sigModal, setSigModal] = useState(null)           // { name, sig }
    const [sessionsModal, setSessionsModal] = useState(null)  // { woId, title, data }
    const [sessionsLoading, setSessionsLoading] = useState(false)
    const [matModal, setMatModal] = useState(null)            // { woId, title, rows }
    const [matSaving, setMatSaving] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [deleteModal, setDeleteModal] = useState(null)      // { wo: object }

    const getPeriodDates = (period) => {
        const now = new Date()
        let start, end
        
        // helper functions
        const getMonday = (d) => {
            const date = new Date(d)
            const day = date.getDay(), diff = date.getDate() - day + (day === 0 ? -6 : 1)
            return new Date(date.setDate(diff))
        }
        
        switch (period) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                end = new Date(start)
                break
            case 'current_week':
                start = getMonday(now)
                start.setHours(0,0,0,0)
                end = new Date(start)
                end.setDate(end.getDate() + 6)
                break
            case 'last_week':
                start = getMonday(now)
                start.setDate(start.getDate() - 7)
                start.setHours(0,0,0,0)
                end = new Date(start)
                end.setDate(end.getDate() + 6)
                break
            case 'current_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1)
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                break
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                end = new Date(now.getFullYear(), now.getMonth(), 0)
                break
            case 'current_year':
                start = new Date(now.getFullYear(), 0, 1)
                end = new Date(now.getFullYear(), 11, 31)
                break
            default:
                return { start_date: '', end_date: '' }
        }
        
        const pad = (n) => n.toString().padStart(2, '0')
        return {
            start_date: `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`,
            end_date: `${end.getFullYear()}-${pad(end.getMonth()+1)}-${pad(end.getDate())}`
        }
    }

    const fetchOrders = async () => {
        setLoading(true)
        try {
            let params = []
            if (filterStatus) params.push(`status=${filterStatus}`)
            if (filterPeriod !== 'all') {
                const dates = getPeriodDates(filterPeriod)
                if (dates.start_date) params.push(`start_date=${dates.start_date}`)
                if (dates.end_date) params.push(`end_date=${dates.end_date}`)
            }
            const q = params.length > 0 ? `?${params.join('&')}` : ''
            const res = await api.get(`/admin/work-orders${q}`)
            const data = Array.isArray(res.data) ? res.data : (res.data?.items || [])
            setWorkOrders(data)
        } catch (e) { alert('API Error: ' + (e.response?.data?.detail || e.message)) }
        finally { setLoading(false) }
    }

    useEffect(() => { 
        fetchOrders() 
    }, [filterStatus, filterPeriod])

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const res = await api.get('/admin/teams/')
                setTeams(res.data.teams || [])
            } catch (e) {
                console.error("Failed to fetch teams", e)
            }
        }
        fetchTeams()
    }, [])

    const handleSendClick = (wo, method) => {
        setSendModal({ wo, method })
    }

    const handleSendConfirm = async (lang) => {
        if (!sendModal) return
        const { wo, method } = sendModal
        setSendingId(wo.id)
        try {
            const res = await api.post(`/admin/work-orders/${wo.id}/send`)
            setWorkOrders(prev => prev.map(w => w.id === wo.id ? res.data : w))
            const url = `${res.data.confirm_url}?lang=${lang}`
            setSendResult({ id: wo.id, url })
            setSendModal(null)
            
            // Build text
            const msgs = {
                'ro': 'Salut! Accesează linkul pentru a vizualiza documentul:',
                'en': 'Hello! Please click the link to view the document:',
                'fr': 'Bonjour! Veuillez cliquer sur le lien pour voir le document:',
                'de': 'Hallo! Bitte klicken Sie auf den Link, um das Dokument anzuzeigen:',
                'nl': 'Hallo! Klik op de link om het document te bekijken:',
                'ru': 'Здравствуйте! Пожалуйста, перейдите по ссылке, чтобы просмотреть документ:'
            }
            const body = `${msgs[lang] || msgs['ro']}\n\n${url}`

            if (method === 'whatsapp') {
                window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank')
            } else if (method === 'email') {
                window.location.href = `mailto:${wo.client_email || ''}?subject=${encodeURIComponent('Ofertă / Proformă')}&body=${encodeURIComponent(body)}`
            }
        } catch (e) {
            alert(e.response?.data?.detail || 'Eroare la trimitere.')
        } finally {
            setSendingId(null)
        }
    }

    const handleDelete = async () => {
        if (!deleteModal) return;
        const { wo } = deleteModal;
        setDeletingId(wo.id)
        try {
            await api.delete(`/admin/work-orders/${wo.id}`)
            setWorkOrders(prev => prev.filter(w => w.id !== wo.id))
            setDeleteModal(null)
        } catch (e) {
            alert(e.response?.data?.detail || 'Eroare la ștergere.')
        } finally {
            setDeletingId(null)
        }
    }

    const copyLink = async (url, id) => {
        try {
            await navigator.clipboard.writeText(url)
            setCopiedId(id)
            setTimeout(() => setCopiedId(null), 2000)
        } catch(e) { alert('API Error: ' + (e.response?.data?.detail || e.message));}
    }

    const getLink = (wo) => {
        return `${window.location.origin}/confirm/${wo.token}`
    }

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

    const renderActions = (wo) => {
        const link = getLink(wo)
        return (
            <div className="flex flex-wrap items-center justify-end gap-1.5 min-w-[130px] max-w-[180px]">
                {wo.status !== 'draft' && (
                    <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        title="Deschide pagina client"
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors text-slate-500 hover:text-blue-600"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                )}
                {(wo.status === 'draft' || wo.status === 'completed') && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleSendClick(wo, 'whatsapp')}
                            disabled={sendingId === wo.id}
                            title={wo.status === 'draft' ? "Trimite Proformă pe WhatsApp" : "Trimite Confirmare pe WhatsApp"}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors text-slate-500 hover:text-emerald-600"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleSendClick(wo, 'email')}
                            disabled={sendingId === wo.id}
                            title={wo.status === 'draft' ? "Trimite Proformă pe Email" : "Trimite Confirmare pe Email"}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-slate-500 hover:text-blue-600"
                        >
                            <Mail className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {['confirmed', 'in_progress', 'completed'].includes(wo.status) && (
                    <button
                        onClick={async () => {
                            setSessionsLoading(true)
                            setSessionsModal({ woId: wo.id, title: wo.title, data: null })
                            try {
                                const res = await api.get(`/admin/work-orders/${wo.id}/sessions`)
                                setSessionsModal({ woId: wo.id, title: wo.title, data: res.data })
                            } catch(e) { alert('API Error: ' + (e.response?.data?.detail || e.message)); setSessionsModal({ woId: wo.id, title: wo.title, data: { error: true } }) }
                            finally { setSessionsLoading(false) }
                        }}
                        title="Ore lucrate pe comandă"
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-slate-500 hover:text-blue-600"
                    >
                        <Timer className="w-4 h-4" />
                    </button>
                )}
                {['confirmed', 'in_progress', 'completed'].includes(wo.status) && (
                    <button
                        onClick={() => setMatModal({
                            woId: wo.id,
                            title: wo.title,
                            rows: wo.materials_consumed?.length
                                ? wo.materials_consumed.map(m => ({ ...m }))
                                : [{ name: '', quantity: '', unit: '', note: '' }]
                        })}
                        title="Materiale consumate"
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors text-slate-500 hover:text-emerald-600"
                    >
                        <Package className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={() => navigate(`/admin/work-orders/${wo.id}/edit`)}
                    title="Editează"
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors text-slate-500 hover:text-blue-600"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setDeleteModal({ wo })}
                    disabled={deletingId === wo.id}
                    title="Șterge"
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-slate-500 hover:text-red-500"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        )
    }

    const columns = [
        {
            key: 'title', label: t('work_orders.col_title', 'Titlu'), sortable: true,
            render: (wo) => (
                <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {wo.title}
                    </div>
                    {wo.site_name && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">📍 {wo.site_name}</div>
                    )}
                    {wo.site_address && !wo.site_name && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[200px]" title={wo.site_address}>{wo.site_address}</span>
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'client_name', label: t('work_orders.col_client', 'Client'), sortable: true,
            render: (wo) => (
                <div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{wo.client_name || '—'}</div>
                    {wo.client_email && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{wo.client_email}</div>
                    )}
                </div>
            )
        },
        {
            key: 'start_date', label: t('work_orders.col_date', 'Date Lucrare'), sortable: true,
            render: (wo) => (
                <div>
                    {wo.start_date && (
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {formatDate(wo.start_date)}
                        </div>
                    )}
                    {!wo.start_date && <div className="text-sm text-slate-400">—</div>}
                </div>
            )
        },
        {
            key: 'summary', label: t('work_orders.col_summary', 'Sumar'), sortable: false,
            render: (wo) => {
                const surfaceVol = wo.volumes?.find(v => v.unit === 'm²' || v.label?.toLowerCase().includes('sapa'))
                const sandMat = wo.materials?.find(m => m.name?.toLowerCase().includes('nisip'))
                const thicknessReq = wo.requirements?.find(r => r.name?.toLowerCase().includes('grosime'))
                
                let surfaceText = surfaceVol?.quantity ? `${surfaceVol.quantity} m²` : null
                let thicknessText = thicknessReq?.value ? `Gros: ${thicknessReq.value} ${thicknessReq.unit || 'cm'}` : null
                
                let sandText = null
                if (sandMat?.quantity) {
                    const isKg = sandMat.unit?.toLowerCase() === 'kg'
                    const val = parseFloat(sandMat.quantity)
                    const tons = isKg ? (val / 1000).toFixed(1) : val
                    sandText = `Nisip: ${tons} t`
                }

                if (!surfaceText && !sandText && !thicknessText) {
                    return <span className="text-xs text-slate-400">—</span>
                }

                return (
                    <div className="flex flex-col gap-0.5 max-w-[200px]">
                        {(surfaceText || thicknessText) && (
                            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                                {surfaceText && <span>{surfaceText}</span>}
                                {surfaceText && thicknessText && <span className="text-slate-300 dark:text-slate-600">|</span>}
                                {thicknessText && <span className="text-xs text-slate-500">{thicknessText}</span>}
                            </div>
                        )}
                        {sandText && (
                            <div className="text-xs font-semibold text-slate-500 truncate">
                                {sandText}
                            </div>
                        )}
                    </div>
                )
            }
        },
        {
            key: 'status', label: t('work_orders.col_status', 'Status'), sortable: true,
            render: (wo) => {
                const cfg = STATUS_CONFIG[wo.status] || STATUS_CONFIG.draft
                return (
                    <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {t(`status.${wo.status}`, cfg.label)}
                        </span>
                        {wo.assigned_team_name && (
                            <span 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 whitespace-nowrap" 
                                style={{ 
                                    backgroundColor: `${wo.assigned_team_color}15`, 
                                    color: wo.assigned_team_color, 
                                    border: `1px solid ${wo.assigned_team_color}30` 
                                }}
                            >
                                <User className="w-2.5 h-2.5" />
                                {wo.assigned_team_name}
                            </span>
                        )}
                        {wo.is_invoiced ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block"></span>
                                {wo.invoice_number ? `✓ ${wo.invoice_number}` : t('work_order_detail.invoicing.invoiced', 'Facturat')}
                            </span>
                        ) : wo.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 uppercase tracking-wider whitespace-nowrap animate-pulse">
                                <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
                                {t('work_order_detail.invoicing.not_invoiced', 'Nefacturat')}
                            </span>
                        ) : null}
                    </div>
                )
            }
        },
        {
            key: 'actions', label: t('work_orders.col_actions', 'Acțiuni'), sortable: false,
            render: renderActions
        }
    ]

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
                        <ClipboardList className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">{t('work_orders.page_title', 'Comenzi de Lucru')}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('work_orders.page_subtitle', 'Gestionare comenzi B2B cu clienții')}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <select
                            value={filterPeriod}
                            onChange={(e) => setFilterPeriod(e.target.value)}
                            className="appearance-none pl-4 pr-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-blue-300 transition-colors"
                        >
                            <option value="today">{t('filters.today', 'Azi')}</option>
                            <option value="current_week">{t('filters.current_week', 'Săptămâna Curentă')}</option>
                            <option value="last_week">{t('filters.last_week', 'Săptămâna Trecută')}</option>
                            <option value="current_month">{t('filters.current_month', 'Luna Curentă')}</option>
                            <option value="last_month">{t('filters.last_month', 'Luna Trecută')}</option>
                            <option value="current_year">{t('filters.current_year', 'Anul Curent')}</option>
                            <option value="all">{t('filters.all', 'Toate Perioadele')}</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button
                        onClick={async () => {
                            setIsSyncing(true);
                            try {
                                await api.post('/admin/work-orders/sync-robaws');
                                await fetchOrders();
                            } catch (e) {
                                alert('Eroare sincronizare API: ' + (e.response?.data?.detail || e.message));
                            } finally {
                                setIsSyncing(false);
                            }
                        }}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-5 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-full shadow-md shadow-indigo-500/20 transition-all hover:scale-105"
                    >
                        {isSyncing ? <Activity className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        {isSyncing ? t('work_orders.syncing', 'Se importă...') : t('work_orders.sync', 'Importă API')}
                    </button>
                    <button
                        onClick={() => navigate('/admin/work-orders/new')}
                        className="flex items-center gap-2 px-5 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full shadow-md shadow-blue-500/20 transition-all hover:scale-105"
                    >
                        <Plus className="w-4 h-4" />
                        {t('work_orders.new_order', 'Comandă Nouă')}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const count = workOrders.filter(w => w.status === key).length
                    const kpiThemes = {
                        draft: 'slate', sent: 'orange', confirmed: 'green',
                        completed: 'purple', cancelled: 'slate', isoflex: 'indigo'
                    }
                    const kpiIcons = {
                        draft: FileText, sent: Send, confirmed: CheckCircle2,
                        completed: CheckCircle, cancelled: Ban, isoflex: Activity
                    }
                    return (
                        <KPICard
                            key={key}
                            label={t(`status.${key}`, cfg.label)}
                            value={count}
                            icon={kpiIcons[key] || CircleDot}
                            colorTheme={kpiThemes[key] || 'blue'}
                            onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
                            active={filterStatus === key}
                        />
                    )
                })}
            </div>

            {/* Send Result Banner */}
            {sendResult && (
                <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Comanda a fost marcată ca trimisă!</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-500 truncate">{sendResult.url}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => copyLink(sendResult.url, 'banner')} className="flex items-center gap-1.5 px-3 h-8 bg-emerald-600 text-white text-xs font-bold rounded-full hover:bg-emerald-700 transition-colors">
                            <Copy className="w-3 h-3" />
                            {copiedId === 'banner' ? 'Copiat!' : 'Copiază'}
                        </button>
                        <button onClick={() => setSendResult(null)} className="px-3 h-8 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">✕</button>
                    </div>
                </div>
            )}

            {/* Teams Filters */}
            {teams.filter(t => t.robaws_email).length > 0 && (
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                    <KPICard
                        label={t('work_orders.all_trucks', 'Toate Camioanele')}
                        value={workOrders.length}
                        icon={Package}
                        colorTheme="slate"
                        onClick={() => setFilterTeam('')}
                        active={!filterTeam}
                    />
                    {teams.filter(t => t.robaws_email).map(team => {
                        const count = workOrders.filter(w => w.assigned_team_id === team.id).length
                        return (
                            <KPICard
                                key={team.id}
                                label={team.name}
                                value={count}
                                icon={Truck}
                                colorTheme="blue"
                                onClick={() => setFilterTeam(filterTeam === team.id ? '' : team.id)}
                                active={filterTeam === team.id}
                            />
                        )
                    })}
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-blue-600 dark:bg-slate-800">
                    <h2 className="font-extrabold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-white" /> {t('work_orders.table_title', 'Tabel Comenzi de Lucru')}
                    </h2>
                </div>
                <DataTable
                    columns={columns}
                    data={workOrders.filter(w => filterTeam ? w.assigned_team_id === filterTeam : true)}
                    loading={loading}
                    searchable={true}
                    defaultSortKey="start_date"
                    defaultSortDir="desc"
                    searchPlaceholder={t('work_orders.search', 'Caută comandă...')}
                    emptyText={filterStatus ? t('work_orders.no_orders_status', `Nicio comandă cu acest status`) : t('work_orders.no_orders', 'Nicio comandă de lucru')}
                    rowStyle={(wo) => wo.assigned_team_color ? {
                        backgroundColor: `${wo.assigned_team_color}08`,
                        boxShadow: `inset 4px 0 0 ${wo.assigned_team_color}`
                    } : undefined}
                    onRowClick={(wo) => navigate(`/admin/work-orders/${wo.id}`)}
                    mobileCard={(wo) => {
                        const cfg = STATUS_CONFIG[wo.status] || STATUS_CONFIG.draft
                        const teamColor = wo.assigned_team_color
                        return (
                            <div className="p-4 flex flex-col gap-2.5" style={teamColor ? { backgroundColor: `${teamColor}15`, borderLeft: `4px solid ${teamColor}` } : undefined}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex flex-col min-w-0">
                                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                                            {wo.title}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                                            {wo.site_name ? <MapPin className="w-3 h-3" /> : null}
                                            {wo.client_name || wo.site_name || 'Fără locație / client'}
                                        </div>
                                    </div>
                                    <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.color}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                        {cfg.label}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-2 text-xs">
                                    <div className="col-span-2">
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                            Date Lucrare
                                        </div>
                                        {wo.start_date && (
                                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                {formatDate(wo.start_date)}
                                            </div>
                                        )}
                                        {!wo.start_date && (
                                            <div className="text-sm text-slate-400">—</div>
                                        )}
                                    </div>
                                    {wo.assigned_team_name && (
                                        <div className="flex items-center gap-1 font-bold" style={{ color: wo.assigned_team_color }}>
                                            <User className="w-3.5 h-3.5" />
                                            {wo.assigned_team_name}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end" onClick={e => e.stopPropagation()}>
                                    {renderActions(wo)}
                                </div>
                            </div>
                        )
                    }}
                />
            </div>

            {/* Delete Modal */}
            {deleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !deletingId && setDeleteModal(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">Ștergere comandă</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
                                Ești sigur că vrei să ștergi comanda <span className="font-bold text-slate-700 dark:text-slate-300">"{deleteModal.wo?.title}"</span>? Această acțiune este ireversibilă.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteModal(null)}
                                    disabled={deletingId}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Anulează
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deletingId}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors flex justify-center items-center gap-2"
                                >
                                    {deletingId ? <Activity className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    {deletingId ? 'Se șterge...' : 'Șterge definitiv'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Materials Consumed Modal */}
            {matModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setMatModal(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-emerald-500" />
                                    <h3 className="font-extrabold text-slate-900 dark:text-white">Materiale Consumate</h3>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">{matModal.title}</p>
                            </div>
                            <button onClick={() => setMatModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {/* Body */}
                        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Înregistrează materialele folosite efectiv pe această comandă. Salvarea înlocuiește lista existentă.</p>
                            {matModal.rows.map((row, i) => (
                                <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/40 rounded-xl p-2">
                                    <input
                                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-emerald-400 outline-none"
                                        placeholder="Denumire material *"
                                        value={row.name}
                                        onChange={e => {
                                            const rows = matModal.rows.map((r, j) => j === i ? { ...r, name: e.target.value } : r)
                                            setMatModal(m => ({ ...m, rows }))
                                        }}
                                    />
                                    <input
                                        className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-emerald-400 outline-none text-center"
                                        placeholder="Cant."
                                        value={row.quantity}
                                        onChange={e => {
                                            const rows = matModal.rows.map((r, j) => j === i ? { ...r, quantity: e.target.value } : r)
                                            setMatModal(m => ({ ...m, rows }))
                                        }}
                                    />
                                    <input
                                        className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-emerald-400 outline-none text-center"
                                        placeholder="UM"
                                        value={row.unit}
                                        onChange={e => {
                                            const rows = matModal.rows.map((r, j) => j === i ? { ...r, unit: e.target.value } : r)
                                            setMatModal(m => ({ ...m, rows }))
                                        }}
                                    />
                                    <input
                                        className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-emerald-400 outline-none"
                                        placeholder="Notă..."
                                        value={row.note}
                                        onChange={e => {
                                            const rows = matModal.rows.map((r, j) => j === i ? { ...r, note: e.target.value } : r)
                                            setMatModal(m => ({ ...m, rows }))
                                        }}
                                    />
                                    <button
                                        onClick={() => setMatModal(m => ({ ...m, rows: m.rows.filter((_, j) => j !== i) }))}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => setMatModal(m => ({ ...m, rows: [...m.rows, { name: '', quantity: '', unit: '', note: '' }] }))}
                                className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-500 hover:text-emerald-600 hover:border-emerald-400 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Adaugă rând
                            </button>
                        </div>
                        {/* Footer */}
                        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
                            <button onClick={() => setMatModal(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                Anulează
                            </button>
                            <button
                                disabled={matSaving}
                                onClick={async () => {
                                    setMatSaving(true)
                                    try {
                                        await api.patch(`/admin/work-orders/${matModal.woId}/materials-consumed`, { materials_consumed: matModal.rows })
                                        await fetchOrders()
                                        setMatModal(null)
                                    } catch(e) { alert('API Error: ' + (e.response?.data?.detail || e.message)); /* ignore */ }
                                    finally { setMatSaving(false) }
                                }}
                                className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md shadow-emerald-500/30 transition-all disabled:opacity-50"
                            >
                                {matSaving ? 'Se salvează...' : '✓ Salvează'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sessions Modal — Ore lucrate pe comandă */}
            {sessionsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSessionsModal(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-blue-500" />
                                    <h3 className="font-extrabold text-slate-900 dark:text-white">Pontaj pe Comandă</h3>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">{sessionsModal.title}</p>
                            </div>
                            <button onClick={() => setSessionsModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {/* Body */}
                        <div className="p-5 max-h-[60vh] overflow-y-auto">
                            {sessionsLoading || !sessionsModal.data ? (
                                <div className="flex items-center justify-center py-10 text-slate-400">
                                    <Clock className="w-6 h-6 animate-spin mr-2" /> Se încarcă...
                                </div>
                            ) : sessionsModal.data.error ? (
                                <div className="text-center py-8 text-red-500 text-sm">Eroare la încărcare.</div>
                            ) : (
                                <>
                                    {/* Total */}
                                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl p-4 mb-4 flex items-center justify-between shadow-lg">
                                        <div>
                                            <div className="text-xs opacity-80 font-medium">Total ore lucrate</div>
                                            <div className="text-3xl font-black">{sessionsModal.data.total_hours}h</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs opacity-80">Sesiuni</div>
                                            <div className="text-2xl font-bold">{sessionsModal.data.sessions_count}</div>
                                        </div>
                                    </div>

                                    {sessionsModal.data.sessions.length === 0 ? (
                                        <div className="text-center py-6 text-slate-400 text-sm">
                                            <Timer className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            Niciun angajat nu a pontajat pe această comandă încă.
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {sessionsModal.data.sessions.map((s, i) => (
                                                <div key={i} className="py-3 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                        <User className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-white">{s.user_name}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                            {s.date} · {s.check_in ? new Date(s.check_in).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                            {s.check_out ? ` → ${new Date(s.check_out).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}` : ' → activ'}
                                                        </div>
                                                    </div>
                                                    <div className={`text-sm font-bold ${s.active ? 'text-blue-500' : 'text-slate-700 dark:text-white'}`}>
                                                        {s.active ? '⏱ activ' : `${s.hours}h`}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Modal */}
            {sigModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSigModal(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="font-extrabold text-slate-900 dark:text-white">Semnătură Digitală</h3>
                                {sigModal.name && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Confirmată de: <strong>{sigModal.name}</strong></p>}
                            </div>
                            <button onClick={() => setSigModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-center">
                                <img src={sigModal.sig} alt="Semnătură" className="max-h-40 max-w-full object-contain" />
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs text-slate-500 dark:text-slate-400">Semnătură digitală autentică — stocată securizat</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Send Modal */}
            {sendModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSendModal(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="font-extrabold text-slate-900 dark:text-white">Trimite {sendModal.wo.status === 'draft' ? 'Proformă' : 'Confirmare'}</h3>
                                <p className="text-xs text-slate-500 mt-1">Selectează limba pentru client</p>
                            </div>
                            <button onClick={() => setSendModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-3">
                            {[
                                { id: 'ro', label: 'Română', flag: '🇷🇴' },
                                { id: 'en', label: 'Engleză', flag: '🇬🇧' },
                                { id: 'fr', label: 'Franceză', flag: '🇫🇷' },
                                { id: 'de', label: 'Germană', flag: '🇩🇪' },
                                { id: 'nl', label: 'Olandeză', flag: '🇳🇱' },
                                { id: 'ru', label: 'Rusă', flag: '🇷🇺' },
                            ].map(lang => {
                                const isPreferred = sendModal.wo.client_language === lang.id;
                                return (
                                <button key={lang.id} onClick={() => handleSendConfirm(lang.id)} disabled={sendingId === sendModal.wo.id}
                                    className={`relative flex items-center gap-2 p-3 rounded-xl border transition-all group disabled:opacity-50
                                        ${isPreferred ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'}
                                    `}>
                                    <span className="text-2xl">{lang.flag}</span>
                                    <span className={`text-sm font-bold ${isPreferred ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 group-hover:text-blue-600'}`}>{lang.label}</span>
                                    {isPreferred && <span className="absolute top-1 right-2 text-[10px] font-bold text-blue-600 dark:text-blue-400">Pref</span>}
                                </button>
                            )})}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

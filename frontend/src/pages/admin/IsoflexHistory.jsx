import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    RefreshCw, ExternalLink, ChevronLeft, ChevronRight,
    MapPin, User, Calendar, Package, Building2, Search, X,
    CheckCircle2, Clock, AlertCircle
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (d) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
}

const statusLabel = (s, t) => {
    const map = {
        open: t('isoflex.status_open', 'Deschisă'), closed: t('isoflex.status_closed', 'Închisă'), cancelled: t('isoflex.status_cancelled', 'Anulată'),
        planned: t('isoflex.status_planned', 'Planificată'), completed: t('isoflex.status_completed', 'Finalizată'), draft: t('isoflex.status_draft', 'Ciornă')
    }
    return map[s?.toLowerCase()] || s || '—'
}

const statusColor = (s) => {
    const sl = (s || '').toLowerCase()
    if (['closed', 'completed'].includes(sl)) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
    if (['open', 'planned'].includes(sl)) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
    if (['cancelled'].includes(sl)) return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
    return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────

function DetailModal({ item, onClose }) {
    const { t } = useTranslation();
    if (!item) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">#{item.ext_id}</span>
                            {item.in_db && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                                    <CheckCircle2 size={10} /> {t('isoflex.in_system', 'În sistem')}
                                </span>
                            )}
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-tight">{item.title || '—'}</h3>
                    </div>
                    <button onClick={onClose} className="ml-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <InfoRow icon={<Calendar size={14} />} label={t('isoflex.date', 'Dată')} value={fmt(item.date)} />
                        <InfoRow icon={<Building2 size={14} />} label={t('isoflex.client', 'Client')} value={item.client_name || '—'} />
                        <InfoRow icon={<User size={14} />} label={t('isoflex.team', 'Echipă')} value={item.team_name} />
                        <InfoRow icon={<Package size={14} />} label={t('isoflex.total_volume', 'Volum total')} value={item.total_volume > 0 ? `${item.total_volume} m²` : '—'} />
                    </div>

                    {item.address && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{item.address}</span>
                        </div>
                    )}

                    {item.materials_summary && (
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('isoflex.materials_works', 'Materiale / Lucrări')}</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{item.materials_summary}</p>
                        </div>
                    )}

                    {item.raw?.notes && (
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('isoflex.notes', 'Note')}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{item.raw.notes}</p>
                        </div>
                    )}

                    {/* Status */}
                    <div className="flex items-center justify-between pt-1">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor(item.status)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                            {statusLabel(item.status, t)}
                        </span>
                        <a
                            href={`https://app.robaws.com/#/work-orders/${item.ext_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            <ExternalLink size={12} /> {t('isoflex.open_robaws', 'Deschide în Robaws')}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}

function InfoRow({ icon, label, value }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">{icon} {label}</span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{value}</span>
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function IsoflexHistory() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [items, setItems] = useState([])
    const [teamsMeta, setTeamsMeta] = useState([])
    const [loading, setLoading] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(0)
    const [filterTeam, setFilterTeam] = useState('all')
    const [search, setSearch] = useState('')

    const [showOnlyNew, setShowOnlyNew] = useState(false)

    const LIMIT = 200

    // Citește din cache (instant)
    const load = useCallback(async (p = 0, teamId = 'all') => {
        setLoading(true)
        setError(null)
        try {
            const params = { page: p, limit: LIMIT }
            if (teamId !== 'all') params.team_id = teamId
            const res = await api.get('/admin/robaws-history', { params })
            setItems(res.data.items || [])
            setTeamsMeta(res.data.teams || [])
            setPage(p)
        } catch (e) {
            setError(e.response?.data?.detail || t('isoflex.load_error', 'Eroare la încărcare'))
        } finally {
            setLoading(false)
        }
    }, [])

    // Sync din Robaws API (mai lent, apoi reîncarcă)
    const syncFromRobaws = useCallback(async () => {
        setSyncing(true)
        setError(null)
        try {
            await api.post('/admin/sync-robaws')
            await load(0, filterTeam)
        } catch (e) {
            setError(e.response?.data?.detail || t('isoflex.sync_error', 'Eroare la sincronizare'))
        } finally {
            setSyncing(false)
        }
    }, [filterTeam, load])

    // Prima încărcare: citește din cache. Dacă e gol, sync automat.
    useEffect(() => {
        (async () => {
            setLoading(true)
            try {
                const res = await api.get('/admin/robaws-history', { params: { page: 0, limit: LIMIT } })
                const items = res.data.items || []
                setItems(items)
                setTeamsMeta(res.data.teams || [])
                // Cache gol → sync automat
                if (items.length === 0) {
                    setSyncing(true)
                    await api.post('/admin/sync-robaws')
                    const res2 = await api.get('/admin/robaws-history', { params: { page: 0, limit: LIMIT } })
                    setItems(res2.data.items || [])
                    setTeamsMeta(res2.data.teams || [])
                    setSyncing(false)
                }
            } catch (e) {
                setError(e.response?.data?.detail || t('isoflex.error', 'Eroare'))
            } finally {
                setLoading(false)
                setSyncing(false)
            }
        })()
    }, [])

    const handleTeamChange = (val) => {
        setFilterTeam(val)
        load(0, val)
    }

    // Filter local
    const filtered = items.filter(item => {
        if (showOnlyNew && item.in_db) return false
        if (!search) return true
        const s = search.toLowerCase()
        return (
            (item.title || '').toLowerCase().includes(s) ||
            (item.client_name || '').toLowerCase().includes(s) ||
            (item.address || '').toLowerCase().includes(s) ||
            (item.team_name || '').toLowerCase().includes(s) ||
            (item.ext_id || '').toLowerCase().includes(s)
        )
    })

    // Total din toate echipele
    const totalInRobaws = teamsMeta.reduce((s, t) => s + (t.total || 0), 0)
    const newCount = items.filter(i => !i.in_db).length

    const columns = [

        {
            key: 'date',
            label: t('isoflex.col_date', 'Dată'),
            sortable: true,
            render: (row) => (
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {fmt(row.date)}
                </span>
            )
        },
        {
            key: 'title',
            label: t('isoflex.col_title', 'Titlu'),
            sortable: true,
            render: (row) => (
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs">{row.title || '—'}</p>
                    {row.client_name && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{row.client_name}</p>
                    )}
                </div>
            )
        },
        {
            key: 'team_name',
            label: t('isoflex.col_team', 'Echipă'),
            sortable: true,
            render: (row) => (
                <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{row.team_name}</span>
            )
        },
        {
            key: 'address',
            label: t('isoflex.col_address', 'Adresă'),
            render: (row) => (
                <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[180px] truncate block">{row.address || '—'}</span>
            )
        },
        {
            key: 'total_volume',
            label: t('isoflex.col_volume', 'Volum'),
            sortable: true,
            render: (row) => (
                <span className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {row.total_volume > 0 ? `${row.total_volume} m²` : '—'}
                </span>
            )
        },
        {
            key: 'status',
            label: t('isoflex.col_status', 'Status Robaws'),
            render: (row) => (
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor(row.status)}`}>
                    {statusLabel(row.status, t)}
                </span>
            )
        },
        {
            key: 'in_db',
            label: t('isoflex.col_in_system', 'În sistem'),
            render: (row) => row.in_db
                ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={13} /> {t('isoflex.yes', 'Da')}</span>
                : <span className="inline-flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400"><Clock size={13} /> {t('isoflex.no', 'Nu')}</span>
        },
    ]

    return (
        <div className="p-4 md:p-6 space-y-4">
            {/* Single compact filter bar: teams + search + filters + refresh */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Team badge filters */}
                {teamsMeta.length > 0 && (
                    <>
                        <button
                            onClick={() => handleTeamChange('all')}
                            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${filterTeam === 'all'
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-400/30'
                                : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span className="font-medium">{t('isoflex.all', 'Toate')}</span>
                            <span className="text-slate-400 dark:text-slate-500">• {totalInRobaws}</span>
                        </button>
                        {teamsMeta.map(t => (
                            <button
                                key={t.team_id}
                                onClick={() => handleTeamChange(t.team_id)}
                                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${filterTeam === String(t.team_id)
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-400/30'
                                    : t.error
                                        ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                {t.error ? <AlertCircle size={11} /> : <CheckCircle2 size={11} className="text-emerald-500" />}
                                <span className="font-medium">{t.team_name}</span>
                                {!t.error && <span className="text-slate-400 dark:text-slate-500">• {t.total}</span>}
                            </button>
                        ))}
                    </>
                )}

                {/* Spacer */}
                <div className="flex-1 min-w-[8px]" />

                {/* Search */}
                <div className="relative min-w-[180px] max-w-[260px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('isoflex.search_placeholder', 'Rechercher titre, client, adresse...')}
                        className="w-full pl-8 pr-8 py-1.5 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Only new filter */}
                <button
                    onClick={() => setShowOnlyNew(v => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors ${showOnlyNew
                        ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                    <Clock size={13} />
                    {t('isoflex.not_imported', 'Neimportate')}
                </button>

                {/* Sync from Robaws */}
                <button
                    onClick={syncFromRobaws}
                    disabled={syncing || loading}
                    title={t('isoflex.sync_title', 'Sincronizează din Robaws')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? t('isoflex.syncing', 'Sync...') : ''}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    <AlertCircle size={15} />
                    {error}
                </div>
            )}

            {/* Table */}
            <DataTable
                columns={columns}
                data={filtered}
                loading={loading}
                defaultPageSize={25}
                defaultSortKey="date"
                defaultSortDir="desc"
                searchable={false}
                emptyText={loading ? t('isoflex.loading', 'Se încarcă...') : t('isoflex.no_results', 'Nu s-au găsit lucrări.')}
                onRowClick={(row) => {
                    if (row.local_id) {
                        navigate(`/admin/work-orders/${row.local_id}`)
                    } else {
                        window.open(`https://app.robaws.com/#/work-orders/${row.ext_id}`, '_blank')
                    }
                }}
                rowClassName={() => 'cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors'}
            />

            {/* Pagination between Robaws pages */}
            {teamsMeta.some(t => (t.total_pages || 1) > 1) && (
                <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                        onClick={() => load(page - 1, filterTeam)}
                        disabled={page === 0 || loading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={14} /> {t('isoflex.prev_page', 'Precedenta')}
                    </button>
                    <span className="text-sm text-slate-500 dark:text-slate-400 px-2">{t('isoflex.page', 'Pagina')} {page + 1}</span>
                    <button
                        onClick={() => load(page + 1, filterTeam)}
                        disabled={loading || teamsMeta.every(t => (page + 1) >= (t.total_pages || 1))}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('isoflex.next_page', 'Următoarea')} <ChevronRight size={14} />
                    </button>
                </div>
            )}


        </div>
    )
}

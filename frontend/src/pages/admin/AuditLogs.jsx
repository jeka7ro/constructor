import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'
import { History, Search, Filter, Calendar, User as UserIcon, Activity, MapPin } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'

export default function AuditLogs() {
    const { t } = useTranslation()
    const { showToast } = useUIStore()

    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    
    // Pagination
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(25)
    const [totalPages, setTotalPages] = useState(1)
    const [totalRecords, setTotalRecords] = useState(0)
    
    // Filters
    const [filterDateRange, setFilterDateRange] = useState('today')
    const [customDateFrom, setCustomDateFrom] = useState(new Date().toISOString().split('T')[0])
    const [customDateTo, setCustomDateTo] = useState(new Date().toISOString().split('T')[0])
    const [filterUserId, setFilterUserId] = useState('')
    const [filterAction, setFilterAction] = useState('')
    const [filterOptions, setFilterOptions] = useState({ actions: [], users: [] })

    useEffect(() => {
        api.get('/admin/audit-logs/filters').then(res => setFilterOptions(res.data)).catch(console.error)
    }, [])

    const fetchLogs = async () => {
        setLoading(true)
        
        let date_from = undefined;
        let date_to = undefined;
        const now = new Date();
        
        if (filterDateRange === 'today') {
            const d = new Date(now);
            d.setHours(0,0,0,0);
            date_from = d.toISOString();
            
            const end = new Date(now);
            end.setHours(23,59,59,999);
            date_to = end.toISOString();
        } else if (filterDateRange === 'week') {
            const d = new Date(now);
            const first = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
            d.setDate(first);
            d.setHours(0,0,0,0);
            date_from = d.toISOString();
        } else if (filterDateRange === 'month') {
            const d = new Date(now.getFullYear(), now.getMonth(), 1);
            d.setHours(0,0,0,0);
            date_from = d.toISOString();
        } else if (filterDateRange === 'year') {
            const d = new Date(now.getFullYear(), 0, 1);
            d.setHours(0,0,0,0);
            date_from = d.toISOString();
        } else if (filterDateRange === 'custom') {
            if (customDateFrom) {
                const d = new Date(customDateFrom);
                d.setHours(0,0,0,0);
                date_from = d.toISOString();
            }
            if (customDateTo) {
                const d = new Date(customDateTo);
                d.setHours(23,59,59,999);
                date_to = d.toISOString();
            }
        }
        try {
            const resp = await api.get('/admin/audit-logs/', {
                params: {
                    page,
                    limit,
                    search: searchQuery || undefined,
                    action: filterAction || undefined,
                    user_id: filterUserId || undefined,
                    date_from,
                    date_to
                }
            })
            setLogs(resp.data.data || [])
            setTotalPages(resp.data.total_pages || 1)
            setTotalRecords(resp.data.total_records || 0)
        } catch (err) {
            console.error('Failed to fetch audit logs:', err)
            showToast(t('common.error_loading', 'Eroare la încărcare.'), 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
        // eslint-disable-next-line
    }, [page, limit, searchQuery, filterDateRange, customDateFrom, customDateTo, filterUserId, filterAction])

    const columns = [
        {
            key: 'created_at',
            label: t('audit.date', 'Dată & Oră'),
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-900 dark:text-white">
                        {new Date(row.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-slate-500">
                        {new Date(row.created_at).toLocaleTimeString()}
                    </span>
                </div>
            )
        },
        {
            key: 'user',
            label: t('audit.actor', 'Utilizator/Admin'),
            render: (row) => (
                <div className="font-medium text-slate-900 dark:text-white">
                    {row.admin_name || row.user_name || '-'}
                </div>
            )
        },
        {
            key: 'action',
            label: t('audit.action', 'Acțiune'),
            render: (row) => (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {row.action}
                </span>
            )
        },
        {
            key: 'resource',
            label: t('audit.resource', 'Resursă'),
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium">{row.resource_type || '-'}</span>
                    {row.resource_id && <span className="text-[10px] text-slate-400 font-mono">{row.resource_id.slice(0,8)}...</span>}
                </div>
            )
        },
        {
            key: 'details',
            label: t('audit.details', 'Detalii'),
            render: (row) => {
                let text = row.details || '-';
                let fullText = typeof row.details === 'string' ? row.details : JSON.stringify(row.details || '');
                if (typeof row.details === 'string') {
                    try {
                        const parsed = JSON.parse(row.details);
                        if (parsed && parsed.message) {
                            text = parsed.message;
                            if (text === "Administrator logged in successfully") {
                                text = t('audit.msg_login_admin', 'Administrator autentificat cu succes');
                            } else if (text.startsWith("Deleted work order/quote")) {
                                text = text.replace("Deleted work order/quote", t('audit.msg_deleted_wo', 'Deviz/Comandă ștearsă'));
                            } else if (text.startsWith("Created work order/quote")) {
                                text = text.replace("Created work order/quote", t('audit.msg_created_wo', 'Deviz/Comandă creată'));
                            }
                        } else {
                            text = JSON.stringify(parsed, null, 2);
                        }
                    } catch (e) {}
                } else if (typeof row.details === 'object' && row.details !== null) {
                    text = row.details.message || JSON.stringify(row.details, null, 2);
                }
                
                return (
                    <div className="text-sm text-slate-600 dark:text-slate-400 min-w-[200px] break-words whitespace-pre-wrap" title={fullText}>
                        {text}
                    </div>
                )
            }
        },
        {
            key: 'device_type',
            label: 'Dispozitiv',
            render: (row) => {
                if (!row.device_type) return <span className="text-xs font-mono text-slate-500">-</span>;
                const isMobile = row.device_type.toLowerCase() === 'mobil';
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isMobile ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {isMobile ? '📱 ' : '💻 '}
                        {row.device_type}
                    </span>
                )
            }
        },
        {
            key: 'ip_address',
            label: 'IP',
            render: (row) => {
                if (!row.ip_address) return <span className="text-xs font-mono text-slate-500">-</span>;
                return (
                    <a 
                        href={`https://ipinfo.io/${row.ip_address}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-blue-500 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                        title={t('audit.view_ip_map', 'Vezi locația IP-ului pe hartă')}
                    >
                        {row.ip_address}
                        <MapPin className="w-3 h-3" />
                    </a>
                )
            }
        }
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <History className="w-6 h-6 text-blue-500" />
                        {t('audit.title', 'Jurnal Activitate')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {t('audit.subtitle', 'Monitorizează acțiunile efectuate de administratori și utilizatori.')}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('audit.search_placeholder', 'Caută acțiune sau detalii...')}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setPage(1)
                            }}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                    
                    {/* Filter Dropdowns */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Date Filter */}
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <select
                                value={filterDateRange}
                                onChange={(e) => { setFilterDateRange(e.target.value); setPage(1); }}
                                className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-0 cursor-pointer"
                            >
                                <option value="today">{t('audit.filter_today', 'Astăzi (Today)')}</option>
                                <option value="week">{t('audit.filter_week', 'Săptămâna curentă')}</option>
                                <option value="month">{t('audit.filter_month', 'Luna curentă')}</option>
                                <option value="year">{t('audit.filter_year', 'Anul curent')}</option>
                                <option value="all">{t('audit.filter_all', 'Tot')}</option>
                                <option value="custom">{t('audit.filter_custom', 'Perioadă personalizată')}</option>
                            </select>
                        </div>
                        
                        {/* User Filter */}
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                            <UserIcon className="w-4 h-4 text-slate-400" />
                            <select
                                value={filterUserId}
                                onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }}
                                className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-0 cursor-pointer max-w-[150px] truncate"
                            >
                                <option value="">{t('audit.filter_any_user', 'Orice Utilizator')}</option>
                                {filterOptions.users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Action Filter */}
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                            <Activity className="w-4 h-4 text-slate-400" />
                            <select
                                value={filterAction}
                                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                                className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-0 cursor-pointer max-w-[150px] truncate"
                            >
                                <option value="">{t('audit.filter_any_action', 'Orice Acțiune')}</option>
                                {filterOptions.actions.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                
                {/* Custom Date Pickers */}
                {filterDateRange === 'custom' && (
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('audit.from', 'De la:')}</label>
                            <input
                                type="date"
                                value={customDateFrom}
                                onChange={(e) => { setCustomDateFrom(e.target.value); setPage(1); }}
                                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 dark:text-white"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('audit.to', 'Până la:')}</label>
                            <input
                                type="date"
                                value={customDateTo}
                                onChange={(e) => { setCustomDateTo(e.target.value); setPage(1); }}
                                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 dark:text-white"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <DataTable
                    columns={columns}
                    data={logs}
                    loading={loading}
                    page={page}
                    limit={limit}
                    totalRecords={totalRecords}
                    onPageChange={setPage}
                    onLimitChange={setLimit}
                    emptyMessage={t('audit.no_logs', 'Nu există nicio înregistrare în jurnal.')}
                />
            </div>
        </div>
    )
}

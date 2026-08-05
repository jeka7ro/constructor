import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'
import { History, Search, Filter } from 'lucide-react'
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

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const resp = await api.get('/admin/audit-logs/', {
                params: {
                    page,
                    limit,
                    search: searchQuery || undefined
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
    }, [page, limit, searchQuery])

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
            render: (row) => (
                <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate" title={row.details || ''}>
                    {row.details || '-'}
                </div>
            )
        },
        {
            key: 'ip_address',
            label: 'IP',
            render: (row) => <span className="text-xs font-mono text-slate-500">{row.ip_address || '-'}</span>
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
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                <div className="relative flex-1 max-w-md">
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

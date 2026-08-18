import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart3, TrendingUp, Users, FileText, FileCheck, Briefcase, Calendar, ChevronLeft, Search, Filter, Building } from 'lucide-react'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'
import KPICard from '../../components/KPICard'

const getStatusDot = (status, t) => {
    const map = {
        planning:  { color: 'bg-emerald-500 animate-pulse', label: t('status.planning', 'En planning'),  text: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        confirmed: { color: 'bg-green-500',                 label: t('status.confirmed', 'Signé'),       text: 'text-green-700 bg-green-50 border-green-200'   },
        completed: { color: 'bg-slate-400',                 label: t('status.completed', 'Terminé'),     text: 'text-slate-600 bg-slate-50 border-slate-200'   },
        cancelled: { color: 'bg-red-400',                   label: t('status.cancelled', 'Annulé'),      text: 'text-red-700 bg-red-50 border-red-200'     },
    }
    const cfg = map[status] || { color: 'bg-amber-400', label: t('status.pending', 'En attente'), text: 'text-amber-700 bg-amber-50 border-amber-200' }
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.color}`}></span>
            {cfg.label}
        </span>
    )
}

export default function ClientAnalytics() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)

    const [filterType, setFilterType] = useState('all') // all, invoices, quotes, orders

    useEffect(() => {
        const fetchData = async () => {
            try {
                // ignore_quote_filter fetches BOTH quotes and normal work orders
                const res = await api.get('/admin/work-orders', {
                    params: { slim: true, ignore_quote_filter: true }
                })
                // Sort descending by created_at and filter out robaws
                const sorted = (res.data || [])
                    .filter(wo => wo.source_system !== 'robaws')
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                setData(sorted)
            } catch (error) {
                console.error("Failed to load analytics data", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Grouping logic
    const groupedClients = Object.values(data.reduce((acc, wo) => {
        const key = wo.client_id || wo.client_name || 'unknown';
        if (!acc[key]) {
            acc[key] = {
                id: wo.client_id || 'unknown',
                client_name: wo.client_name || 'Fără client',
                invoices_count: 0,
                quotes_count: 0,
                total_value: 0,
                invoices_value: 0,
                quotes_value: 0,
                latest_date: wo.created_at || '2000-01-01',
            }
        }
        if (wo.is_invoiced) {
            acc[key].invoices_count++;
            acc[key].invoices_value += (parseFloat(wo.estimated_price) || 0);
        } else {
            acc[key].quotes_count++;
            acc[key].quotes_value += (parseFloat(wo.estimated_price) || 0);
        }
        acc[key].total_value += (parseFloat(wo.estimated_price) || 0);
        
        if (new Date(wo.created_at) > new Date(acc[key].latest_date)) {
            acc[key].latest_date = wo.created_at;
        }
        return acc;
    }, {})).sort((a, b) => b.total_value - a.total_value);

    const filteredData = groupedClients.filter(c => {
        if (filterType === 'invoices') return c.invoices_count > 0;
        if (filterType === 'quotes') return c.quotes_count > 0;
        return true;
    });

    // Calculate KPIs
    const totalValue = data.reduce((sum, wo) => sum + (parseFloat(wo.estimated_price) || 0), 0);
    const totalInvoices = data.filter(wo => wo.is_invoiced).length;
    const totalQuotes = data.filter(wo => !wo.is_invoiced).length;

    const columns = [
        { 
            key: 'client', 
            label: 'Client',
            sortable: true,
            sortValue: (c) => c.client_name || '',
            render: (c) => (
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>{c.client_name}</span>
                </div>
            )
        },
        { 
            key: 'quotes', 
            label: 'Devize / Oferte',
            sortable: true,
            sortValue: (c) => c.quotes_count,
            render: (c) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{c.quotes_count} {c.quotes_count === 1 ? 'Deviz' : 'Devize'}</span>
                    <span className="text-xs text-amber-600 font-semibold">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(c.quotes_value)}</span>
                </div>
            )
        },
        { 
            key: 'invoices', 
            label: 'Facturi',
            sortable: true,
            sortValue: (c) => c.invoices_count,
            render: (c) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{c.invoices_count} {c.invoices_count === 1 ? 'Factură' : 'Facturi'}</span>
                    <span className="text-xs text-indigo-600 font-semibold">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(c.invoices_value)}</span>
                </div>
            )
        },
        { 
            key: 'total_value', 
            label: 'Total Generat',
            sortable: true,
            sortValue: (c) => c.total_value,
            render: (c) => (
                <span className="font-black text-blue-600 dark:text-blue-400 text-base">
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(c.total_value)}
                </span>
            )
        },
        { 
            key: 'latest_date', 
            label: 'Ultima Activitate',
            sortable: true,
            sortValue: (c) => c.latest_date,
            render: (c) => (
                <div className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-50" />
                    {c.latest_date !== '2000-01-01' ? new Date(c.latest_date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </div>
            )
        }
    ]

    return (
        <div className="space-y-6 pb-24 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                        {t('nav.client_analytics', 'Analyse Clients')}
                    </h1>
                    <p className="text-sm text-slate-500">{t('client_analytics.subtitle', 'Statistici și rapoarte despre clienți')}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <KPICard 
                    label="Total Valoare (Toate)" 
                    value={new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalValue)} 
                    icon={TrendingUp} 
                    colorTheme="blue" 
                />
                <KPICard 
                    label="Total Facturi" 
                    value={totalInvoices} 
                    icon={FileCheck} 
                    colorTheme="indigo"
                />
                <KPICard 
                    label="Total Devize" 
                    value={totalQuotes} 
                    icon={FileText} 
                    colorTheme="orange"
                />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                
                {/* Custom Filter Bar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Filtre Rapide:</span>
                        
                        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full p-1 gap-1">
                            {[
                                { id: 'all', label: 'Toate', count: groupedClients.length },
                                { id: 'invoices', label: 'Facturi', count: groupedClients.filter(c => c.invoices_count > 0).length },
                                { id: 'quotes', label: 'Devize', count: groupedClients.filter(c => c.quotes_count > 0).length },
                                { id: 'orders', label: 'Comenzi', count: groupedClients.filter(c => c.orders_count > 0).length },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterType(f.id)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors flex items-center gap-2 ${
                                        filterType === f.id 
                                            ? 'bg-blue-600 text-white shadow-sm' 
                                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {f.label}
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                        filterType === f.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}>
                                        {f.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-0">
                    <DataTable 
                        data={filteredData}
                        columns={columns}
                        loading={loading}
                        searchPlaceholder="Caută după client, număr..."
                        searchKeys={['client_name']}
                        onRowClick={(row) => {
                            if (row.id && row.id !== 'unknown') {
                                navigate(`/admin/clients/${row.id}`)
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    )
}

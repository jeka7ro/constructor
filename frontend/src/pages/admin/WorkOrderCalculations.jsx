import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Activity, Search, AlertCircle, FileText } from 'lucide-react'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'

export default function WorkOrderCalculations() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchOrders = async () => {
        setLoading(true)
        try {
            // Fetch all work orders and filter completed ones client-side (or could use status=completed query)
            const res = await api.get('/admin/work-orders?status=completed')
            const data = Array.isArray(res.data) ? res.data : (res.data?.items || [])
            
            // Filter only those that have actual_surface_m2 and actual_sand_quantity set
            const filtered = data.filter(wo => wo.actual_surface_m2 && wo.actual_sand_quantity)
            setOrders(filtered)
        } catch {
            // silently fail or show toast
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchOrders() }, [])

    const columns = [
        {
            key: 'title',
            label: 'Nume Lucrare',
            sortable: true,
            render: (row) => (
                <div 
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => navigate(`/admin/work-orders/${row.id}`)}
                >
                    <FileText className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
                    <span className="font-bold text-blue-600 group-hover:text-blue-800 transition-colors">
                        {row.title}
                    </span>
                </div>
            )
        },
        {
            key: 'team',
            label: 'Echipă',
            sortable: true,
            render: (row) => row.team?.name || '—'
        },
        {
            key: 'updated_at',
            label: 'Data Finalizării',
            sortable: true,
            render: (row) => row.updated_at 
                ? new Date(row.updated_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) 
                : '—'
        },
        {
            key: 'actual_surface_m2',
            label: 'Suprafață (m²)',
            sortable: true,
            render: (row) => <span className="font-bold text-slate-700">{row.actual_surface_m2}</span>
        },
        {
            key: 'actual_sand_quantity',
            label: 'Cant. Nisip',
            sortable: true,
            render: (row) => <span className="font-bold text-slate-700">{row.actual_sand_quantity}</span>
        },
        {
            key: 'grosime',
            label: 'Grosime Adevărată',
            render: (row) => {
                const surface = parseFloat(row.actual_surface_m2)
                const sand = parseFloat(row.actual_sand_quantity)
                if (!surface || !sand) return '—'
                
                const grosime = sand / surface / 16
                
                return (
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-black tracking-wide border border-emerald-200">
                            {grosime.toFixed(2)} cm
                        </span>
                    </div>
                )
            }
        }
    ]

    return (
        <div className="w-full space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3.5">
                        <h2 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight">
                            {t('analytics.screed_table_title', 'Tableau de Calcul (Chape)')}
                        </h2>
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[15px] font-extrabold bg-emerald-500/15 text-emerald-700 border border-emerald-500/25">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </span>
                    </div>
                    <p className="text-[15px] text-slate-500 font-semibold mt-0.5">
                        {t('analytics.screed_table_desc', 'Commandes terminées. Formule: Quantité de Sable / Surface / 16.')}
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-[color:var(--tenant-bg)] shrink-0">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="text-[21px] font-black text-slate-900 dark:text-white tracking-tight">
                            {t('analytics.screed_results', 'Résultats d\'Analyse Chape')}
                        </span>
                        <span className="px-3.5 py-1 rounded-full text-[14.5px] font-extrabold bg-sky-500/15 text-[color:var(--tenant-bg)] border border-sky-500/25 tabular-nums">
                            {orders.length}
                        </span>
                    </div>
                </div>
                <DataTable 
                    columns={columns}
                    data={orders}
                    loading={loading}
                    searchable={true}
                    searchPlaceholder={t("common.search_work", "Rechercher un ouvrage...")}
                    emptyText="Nu există lucrări finalizate cu măsurători declarate."
                />
            </div>
        </div>
    )
}

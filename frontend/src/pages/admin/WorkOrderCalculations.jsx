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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center">
                        <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                            {t('analytics.screed_table_title', 'Tableau de Calcul (Chape)')}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            {t('analytics.screed_table_desc', 'Commandes terminées. Formule: Quantité de Sable / Surface / 16.')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm uppercase">
                        <Activity className="w-4 h-4 text-white" /> {t('analytics.screed_results', 'Résultats d\'Analyse Chape')}
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

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import {
    Loader2, HardHat, Package, LayoutGrid, FileSpreadsheet,
    TrendingUp, Filter, BarChart3, Truck, Navigation, CalendarDays
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, LabelList
} from 'recharts'
import KPICard from '../../components/KPICard'
import DataTable from '../../components/DataTable'

const toLocalISO = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
}

export default function ScreedsReports() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [workOrders, setWorkOrders] = useState([])

    // Filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    useEffect(() => {
        setDefaultDates()
    }, [])

    useEffect(() => {
        if (dateFrom && dateTo) {
            fetchWorkOrders()
        }
    }, [dateFrom, dateTo])

    const setDefaultDates = () => {
        const today = new Date()
        const lastWeek = new Date(today)
        lastWeek.setDate(today.getDate() - 7)
        setDateFrom(toLocalISO(lastWeek))
        setDateTo(toLocalISO(today))
    }

    const setQuickFilter = (days) => {
        const today = new Date()
        const past = new Date(today)
        past.setDate(today.getDate() - days)
        setDateFrom(toLocalISO(past))
        setDateTo(toLocalISO(today))
    }

    const fetchWorkOrders = async () => {
        try {
            setLoading(true)
            // Fetch orders (triggers backend Auto-Archive for the range).
            // The backend returns all orders so we don't miss edge cases, we filter locally.
            const res = await api.get(`/admin/work-orders?start_date=${dateFrom}&end_date=${dateTo}`)
            
            const allWos = res.data || []
            const startStr = dateFrom.replace(/-/g, '')
            const endStr = dateTo.replace(/-/g, '')
            
            const filtered = allWos.filter(wo => {
                const dateStr = wo.start_date || wo.deadline_date
                if (!dateStr) return false
                const d = dateStr.split('T')[0].replace(/-/g, '')
                return d >= startStr && d <= endStr
            })
            
            setWorkOrders(filtered)
        } catch (e) {
            console.error("Eroare incarcare rapoarte:", e)
        } finally {
            setLoading(false)
        }
    }

    const computeMetrics = () => {
        let totalVolume = 0;
        let totalSand = 0; // Tone
        let totalKm = 0;
        let validWos = 0;

        const byDayMap = {};
        const teamMap = {};

        workOrders.forEach(wo => {
            validWos++;

            // Volume
            let woVol = 0;
            if (wo.volumes && wo.volumes.length > 0) {
                wo.volumes.forEach(v => {
                    woVol += parseFloat(v.quantity) || 0;
                })
            }
            totalVolume += woVol;

            // Materials consumed (Sand in T, convert to T if kg)
            if (wo.materials_consumed && wo.materials_consumed.length > 0) {
                wo.materials_consumed.forEach(m => {
                    const name = (m.name || '').toLowerCase();
                    let qty = parseFloat(m.quantity) || 0;
                    if (name.includes('nisip')) {
                        // Assume unit might be kg if > 1000, otherwise tons. But Usually user inputs kg.
                        // Let's check unit if available.
                        const unit = (m.unit || '').toLowerCase();
                        if (unit === 'kg' || qty > 200) qty = qty / 1000;
                        totalSand += qty;
                    }
                })
            }

            // Route KM (calculated by backend)
            const woKm = parseFloat(wo.route_distance_km) || 0;
            totalKm += woKm;

            // By Day (using start_date or deadline)
            const dateStr = wo.start_date || wo.deadline_date;
            if (dateStr) {
                const day = dateStr.split('T')[0];
                if (!byDayMap[day]) byDayMap[day] = { date: day, volume: 0, count: 0, km: 0 };
                byDayMap[day].volume += woVol;
                byDayMap[day].km += woKm;
                byDayMap[day].count++;
            }

            // Team ranking
            const team = wo.assigned_team_name || 'Echipă Necunoscută';
            if (!teamMap[team]) teamMap[team] = { name: team, volume: 0, count: 0, sand: 0, km: 0 };
            teamMap[team].volume += woVol;
            teamMap[team].count++;
            teamMap[team].km += woKm;
            
            if (wo.materials_consumed && wo.materials_consumed.length > 0) {
                wo.materials_consumed.forEach(m => {
                    const name = (m.name || '').toLowerCase();
                    let qty = parseFloat(m.quantity) || 0;
                    if (name.includes('nisip')) {
                        const unit = (m.unit || '').toLowerCase();
                        if (unit === 'kg' || qty > 200) qty = qty / 1000;
                        teamMap[team].sand += qty;
                    }
                })
            }
        });

        const byDay = Object.values(byDayMap).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
            ...d, 
            date: new Date(d.date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }),
            volume: Math.round(d.volume),
            km: Math.round(d.km)
        }));

        const byTeam = Object.values(teamMap).map(t => ({
            ...t,
            volume: Math.round(t.volume),
            sand: Math.round(t.sand * 10) / 10,
            km: Math.round(t.km * 10) / 10
        })).sort((a, b) => b.volume - a.volume);

        // Calculate averages
        const avgVolPerOrder = validWos > 0 ? totalVolume / validWos : 0;

        return {
            totalVolume: Math.round(totalVolume),
            totalSand: Math.round(totalSand * 10) / 10,
            totalKm: Math.round(totalKm * 10) / 10,
            validWos,
            byDay,
            byTeam,
            avgVolPerOrder: Math.round(avgVolPerOrder)
        }
    }

    const charts = computeMetrics();

    // Custom Tooltip for Timeline Chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-700">
                    <p className="font-bold mb-2 text-slate-300">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }} className="font-bold flex justify-between gap-4">
                            <span>{entry.name}:</span>
                            <span>{entry.value} {entry.name === 'Volum' ? 'm²' : 'km'}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const teamColumns = [
        { key: 'name', label: 'Echipă', sortable: true, render: r => <span className="font-extrabold text-slate-800 dark:text-white uppercase tracking-wide text-xs">{r.name}</span> },
        { key: 'count', label: 'Lucrări', sortable: true, render: r => <span className="text-slate-600 dark:text-slate-400 font-bold">{r.count}</span> },
        { key: 'volume', label: 'Volum (m²)', sortable: true, render: r => <span className="font-black text-blue-600 block">{r.volume}</span> },
        { key: 'sand', label: 'Nisip Consumat', sortable: true, render: r => <span className="font-black text-amber-600 block">{r.sand} T</span> },
        { key: 'km', label: 'Traseu Parcurs (KM)', sortable: true, render: r => <span className="font-black text-emerald-600 block">{r.km} km</span> },
    ]

    return (
        <div className="p-4 sm:p-8 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    {t('reports.company_analysis', 'Analyse de l\'Entreprise')}
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-1">{t('reports.company_analysis_desc', 'Synthèse complète des volumes, itinéraires et matériaux consommés par équipes')}</p>
            </div>

            {/* Filters Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-3 sm:p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1 shrink-0"><Filter className="w-3 h-3" /> {t('reports.filters', 'Filtres:')}</span>
                        {[
                            { label: t('reports.last_7_days', '7 Derniers Jours'), fn: () => setQuickFilter(7) },
                            { label: t('reports.last_30_days', '30 Derniers Jours'), fn: () => setQuickFilter(30) },
                            {
                                label: t('reports.current_month', 'Mois en Cours'), fn: () => {
                                    const t = new Date()
                                    setDateFrom(toLocalISO(new Date(t.getFullYear(), t.getMonth(), 1)))
                                    setDateTo(toLocalISO(t))
                                }
                            }
                        ].map(f => (
                            <button key={f.label} onClick={f.fn}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 border border-transparent dark:border-slate-700">
                                {f.label}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full sm:w-36 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                        <span className="text-slate-400 font-bold">-</span>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                            className="w-full sm:w-36 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Încărcare raport...</h3>
                    <p className="text-sm text-slate-500">Se verifică și se arhivează automat zilele din urmă...</p>
                </div>
            ) : charts.validWos === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <LayoutGrid className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
                    <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">Nu există lucrări finalizate în această perioadă.</h3>
                    <p className="text-sm text-slate-400">Alegeți altă perioadă de timp din filtrele de mai sus.</p>
                </div>
            ) : (
                <>
                    {/* KPI Summary */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <KPICard label="Comenzi Realizate" value={`${charts.validWos}`} sub={`Medie: ${charts.avgVolPerOrder} m²/comandă`} icon={HardHat} colorTheme="purple" />
                        <KPICard label="Volum Total" value={`${charts.totalVolume}`} sub="m² șapă turnați" icon={LayoutGrid} colorTheme="blue" />
                        <KPICard label="Nisip Consumat" value={`${charts.totalSand}`} sub="Tone extrase din calcule/aplicație" icon={Package} colorTheme="amber" />
                        <KPICard label="Trasee (Total)" value={`${charts.totalKm}`} sub="Kilometri parcurși cumulat" icon={Navigation} colorTheme="green" />
                    </div>

                    {/* Timeline Chart (Volume & KM) */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm mb-6">
                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wide">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            Axa Timpului: Volum turnat vs Kilometri parcurși
                        </h3>
                        <div className="w-full h-72 sm:h-80 overflow-hidden">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.byDay} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                                    <Bar dataKey="volume" name="Volum" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        <LabelList dataKey="volume" position="top" fill="#475569" fontSize={10} fontWeight="bold" />
                                    </Bar>
                                    <Bar dataKey="km" name="Kilometri" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        <LabelList dataKey="km" position="top" fill="#475569" fontSize={10} fontWeight="bold" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Team Details Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wide">
                                Raport Agregat pe Echipe
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">Compară performanța echipelor în funcție de kilometraj, consum și volumul realizat.</p>
                        </div>
                        <DataTable 
                            columns={teamColumns} 
                            data={charts.byTeam} 
                            emptyText="Nu există date."
                        />
                    </div>
                </>
            )}
        </div>
    )
}

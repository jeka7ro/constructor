import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import {
    Loader2, Calendar, HardHat, Package, Droplet, LayoutGrid, FileSpreadsheet,
    TrendingUp, Filter, BarChart3, Truck, Building2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LabelList
} from 'recharts'
import KPICard from '../../components/KPICard'
import DataTable from '../../components/DataTable'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

const toLocalISO = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
}

export default function ScreedsReports() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [workOrders, setWorkOrders] = useState([])
    const [activeTab, setActiveTab] = useState('summary')

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
            // Fetch all orders and filter locally by date (start_date or deadline_date)
            const res = await api.get('/admin/work-orders/')
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
            console.error("Eroare incarcare work orders:", e)
        } finally {
            setLoading(false)
        }
    }

    const computeMetrics = () => {
        let totalVolume = 0;
        let totalSand = 0; // Tone
        let totalCement = 0; // Saci sau Kg
        let validWos = 0;

        const byDayMap = {};
        const teamMap = {};

        workOrders.forEach(wo => {
            // Include only confirmed, completed, or in_progress that have actual data
            if (['draft', 'canceled'].includes(wo.status)) return;
            validWos++;

            // Volume
            let woVol = 0;
            if (wo.volumes && wo.volumes.length > 0) {
                wo.volumes.forEach(v => {
                    woVol += parseFloat(v.quantity) || 0;
                })
            }
            totalVolume += woVol;

            // Materials consumed
            if (wo.materials_consumed && wo.materials_consumed.length > 0) {
                wo.materials_consumed.forEach(m => {
                    const name = (m.name || '').toLowerCase();
                    const qty = parseFloat(m.quantity) || 0;
                    if (name.includes('nisip')) totalSand += qty;
                    if (name.includes('ciment')) totalCement += qty;
                })
            }

            // By Day (using start_date or deadline)
            const dateStr = wo.start_date || wo.deadline_date;
            if (dateStr) {
                const day = dateStr.split('T')[0];
                if (!byDayMap[day]) byDayMap[day] = { date: day, volume: 0, count: 0 };
                byDayMap[day].volume += woVol;
                byDayMap[day].count++;
            }

            // Team ranking
            const team = wo.assigned_team_name || 'Echipă Necunoscută';
            if (!teamMap[team]) teamMap[team] = { name: team, volume: 0, count: 0, sand: 0, cement: 0 };
            teamMap[team].volume += woVol;
            teamMap[team].count++;
            
            if (wo.materials_consumed && wo.materials_consumed.length > 0) {
                wo.materials_consumed.forEach(m => {
                    const name = (m.name || '').toLowerCase();
                    const qty = parseFloat(m.quantity) || 0;
                    if (name.includes('nisip')) teamMap[team].sand += qty;
                    if (name.includes('ciment')) teamMap[team].cement += qty;
                })
            }
        });

        const byDay = Object.values(byDayMap).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
            ...d, 
            date: new Date(d.date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }),
            volume: Math.round(d.volume)
        }));

        const byTeam = Object.values(teamMap).sort((a, b) => b.volume - a.volume);

        // Calculate averages
        const avgVolPerOrder = validWos > 0 ? totalVolume / validWos : 0;
        const avgSandPerOrder = validWos > 0 ? totalSand / validWos : 0;

        return {
            totalVolume: Math.round(totalVolume),
            totalSand: Math.round(totalSand * 10) / 10,
            totalCement: Math.round(totalCement),
            validWos,
            byDay,
            byTeam,
            avgVolPerOrder: Math.round(avgVolPerOrder),
            avgSandPerOrder: Math.round(avgSandPerOrder * 10) / 10
        }
    }

    const charts = computeMetrics();

    const teamColumns = [
        { key: 'name', label: 'Echipă', sortable: true, render: r => <span className="font-bold text-slate-800 dark:text-white">{r.name}</span> },
        { key: 'count', label: 'Lucrări', sortable: true, render: r => <span className="text-slate-600 dark:text-slate-400">{r.count}</span> },
        { key: 'volume', label: 'Volum Turnat (m²)', sortable: true, render: r => <span className="font-bold text-blue-600 block text-right">{r.volume}</span> },
        { key: 'sand', label: 'Nisip Consumat', sortable: true, render: r => <span className="font-bold text-amber-600 block text-right">{r.sand}T</span> },
        { key: 'cement', label: 'Ciment Consumat', sortable: true, render: r => <span className="font-bold text-slate-600 dark:text-slate-400 block text-right">{r.cement} saci</span> },
    ]

    return (
        <div className="p-4 sm:p-8 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    Rapoarte Șape
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Analiză volume, echipe și consum de materiale</p>
            </div>

            {/* Filters Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-3 sm:p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1 shrink-0"><Filter className="w-3 h-3" /> Filtre:</span>
                        {[
                            { label: 'Ultimele 7 Zile', fn: () => setQuickFilter(7) },
                            { label: 'Ultimele 30 Zile', fn: () => setQuickFilter(30) },
                            {
                                label: 'Luna Curentă', fn: () => {
                                    const t = new Date()
                                    setDateFrom(toLocalISO(new Date(t.getFullYear(), t.getMonth(), 1)))
                                    setDateTo(toLocalISO(t))
                                }
                            }
                        ].map(f => (
                            <button key={f.label} onClick={f.fn}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0">
                                {f.label}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
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
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Încărcare rapoarte...</h3>
                </div>
            ) : charts.validWos === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <LayoutGrid className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
                    <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">Nu există lucrări finalizate.</h3>
                    <p className="text-sm text-slate-400">Alegeți altă perioadă.</p>
                </div>
            ) : (
                <>
                    {/* KPI Summary (Mobile Optimized: grid-cols-2 or 3) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        <KPICard label="Volum Total" value={`${charts.totalVolume}`} sub="m² turnați" icon={LayoutGrid} colorTheme="blue" />
                        <KPICard label="Nisip Consumat" value={`${charts.totalSand}`} sub="tone estimate" icon={Package} colorTheme="amber" />
                        <KPICard label="Ciment" value={`${charts.totalCement}`} sub="saci/unități" icon={Truck} colorTheme="slate" />
                        <KPICard label="Lucrări" value={`${charts.validWos}`} sub={`Medie ${charts.avgVolPerOrder} m²/lucrare`} icon={HardHat} colorTheme="green" />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                        {/* Volume by Day */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                Evoluție Volum (m²)
                            </h3>
                            <div className="w-full h-56 sm:h-64 overflow-hidden">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={charts.byDay} barSize={24} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(val) => [`${val} m²`, 'Volum']}
                                        />
                                        <Bar dataKey="volume" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                                            <LabelList dataKey="volume" position="top" fill="#475569" fontSize={10} fontWeight="bold" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Teams */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <Users className="w-4 h-4 text-violet-500" />
                                Performanță Echipe (m²)
                            </h3>
                            <div className="space-y-4">
                                {charts.byTeam.slice(0, 5).map((team, i) => {
                                    const maxVol = charts.byTeam[0]?.volume || 1;
                                    const pct = Math.max((team.volume / maxVol) * 100, 2);
                                    return (
                                        <div key={team.name} className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between text-xs sm:text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                                                        {i + 1}
                                                    </span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{team.name}</span>
                                                </div>
                                                <span className="font-black text-blue-600">{team.volume}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                                                <span>{team.count} Lucrări</span>
                                                <span>{team.sand}T Nisip / {team.cement} Saci</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Team Details Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wide">
                                Raport Detaliat pe Echipe
                            </h3>
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

import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    Truck, Calendar, ChevronLeft, ChevronRight, BarChart3,
    Layers, Package, MapPin, ArrowUpDown, Download, Filter,
    CalendarDays, TrendingUp, Loader2, AlertCircle
} from 'lucide-react'
import api from '../../../lib/api'

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-BE', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
}) : '—'

const fmtShort = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
}) : '—'

const STATUS_COLORS = {
    draft:       'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    sent:        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    confirmed:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed:   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    cancelled:   'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

function getWeekRange() {
    const now = new Date()
    const day = now.getDay() || 7
    const mon = new Date(now); mon.setDate(now.getDate() - day + 1)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return [mon.toISOString().split('T')[0], sun.toISOString().split('T')[0]]
}

function getMonthRange() {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return [first.toISOString().split('T')[0], last.toISOString().split('T')[0]]
}

// ── TruckSVG ──────────────────────────────────────────────────────────────────
function TruckSVG({ color = '#2563eb', className = 'w-4 h-4' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <path d="M16 8h4l3 5v4h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function LogisticsReport() {
    const { t } = useTranslation()
    const [startDate, setStartDate] = useState(() => getWeekRange()[0])
    const [endDate,   setEndDate]   = useState(() => getWeekRange()[1])
    const [data, setData]           = useState(null)
    const [loading, setLoading]     = useState(false)
    const [error, setError]         = useState(null)
    const [groupBy, setGroupBy]     = useState('day') // 'day' | 'team' | 'none'
    const [filterTeam, setFilterTeam] = useState('all')
    const [sortCol, setSortCol]     = useState('date')
    const [sortDir, setSortDir]     = useState('asc')

    const fetchReport = async () => {
        if (!startDate || !endDate) return
        setLoading(true)
        setError(null)
        try {
            const res = await api.get(`/admin/logistics/period-report?start_date=${startDate}&end_date=${endDate}`)
            setData(res.data)
        } catch (e) {
            setError(e?.response?.data?.detail || 'Eroare la încărcarea raportului')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchReport() }, [startDate, endDate])

    // Teams for filter
    const teams = useMemo(() => {
        if (!data) return []
        const map = {}
        data.rows.forEach(r => { if (r.team_id) map[r.team_id] = { id: r.team_id, name: r.team_name, color: r.team_color } })
        return Object.values(map)
    }, [data])

    // Sorted + filtered rows
    const rows = useMemo(() => {
        if (!data) return []
        let r = [...data.rows]
        if (filterTeam !== 'all') r = r.filter(row => row.team_id === filterTeam)
        r.sort((a, b) => {
            let va = a[sortCol] ?? '', vb = b[sortCol] ?? ''
            if (typeof va === 'string') va = va.toLowerCase()
            if (typeof vb === 'string') vb = vb.toLowerCase()
            return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0)
        })
        return r
    }, [data, filterTeam, sortCol, sortDir])

    // Group by day
    const grouped = useMemo(() => {
        if (groupBy === 'none') return null
        const key = groupBy === 'day' ? 'date' : 'team_id'
        const map = {}
        rows.forEach(r => {
            const k = r[key] || 'unknown'
            if (!map[k]) map[k] = { label: groupBy === 'day' ? fmt(r.date) : r.team_name, color: groupBy === 'team' ? r.team_color : null, rows: [] }
            map[k].rows.push(r)
        })
        return map
    }, [rows, groupBy])

    const toggleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortCol(col); setSortDir('asc') }
    }

    const SortIcon = ({ col }) => (
        <ArrowUpDown className={`w-3 h-3 ml-1 inline-block ${sortCol === col ? 'text-blue-500' : 'text-slate-400'}`} />
    )

    // Totals for filtered rows
    const filteredTotals = useMemo(() => ({
        count: rows.length,
        surface_m2: rows.reduce((s, r) => s + (r.surface_m2 || 0), 0),
        sand_tons: rows.reduce((s, r) => s + (r.sand_tons || 0), 0),
        distance_km: rows.reduce((s, r) => s + (r.route_distance_km || 0), 0),
    }), [rows])

    const renderRows = (rowsToRender) => rowsToRender.map(row => (
        <tr
            key={row.id}
            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
        >
            <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap font-medium">
                {fmtShort(row.date)}
                {row.start_time && <span className="ml-1 text-slate-400 text-[10px]">{row.start_time.substring(0,5)}</span>}
            </td>
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                    <TruckSVG color={row.team_color || '#64748b'} className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[80px]">{row.team_name}</span>
                </div>
            </td>
            <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap hidden sm:table-cell">
                {row.vehicle_plate !== '—' ? (
                    <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">{row.vehicle_plate}</span>
                ) : '—'}
            </td>
            <td className="px-3 py-2.5 min-w-0">
                <Link to={`/admin/work-orders/${row.id}`} className="text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate block max-w-[160px]">
                    {row.title}
                </Link>
                {row.client_name !== '—' && <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{row.client_name}</div>}
            </td>
            <td className="px-3 py-2.5 text-xs text-right font-bold text-slate-800 dark:text-slate-200 hidden md:table-cell">
                {row.surface_m2 > 0 ? <>{row.surface_m2} <span className="font-normal text-slate-400">m²</span></> : '—'}
            </td>
            <td className="px-3 py-2.5 text-xs text-right font-bold text-slate-800 dark:text-slate-200 hidden md:table-cell">
                {row.avg_thickness_cm > 0 ? <>{row.avg_thickness_cm.toFixed(1)} <span className="font-normal text-slate-400">cm</span></> : '—'}
            </td>
            <td className="px-3 py-2.5 text-xs text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                {row.sand_tons > 0 ? <>{row.sand_tons.toFixed(2)} <span className="font-normal text-slate-400">t</span></> : '—'}
            </td>
            <td className="px-3 py-2.5 text-xs text-right font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                {row.route_distance_km > 0 ? <>{row.route_distance_km} <span className="font-normal text-slate-400">km</span></> : '—'}
            </td>
            <td className="px-3 py-2.5 text-center">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${STATUS_COLORS[row.status] || STATUS_COLORS.draft}`}>
                    {row.status}
                </span>
            </td>
        </tr>
    ))

    const TH = ({ col, label, className = '' }) => (
        <th
            onClick={() => col && toggleSort(col)}
            className={`px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none ${col ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''} ${className}`}
        >
            {label}{col && <SortIcon col={col} />}
        </th>
    )

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-7 h-7 text-blue-600" />
                        {t('logistics.report_title', 'Raport Logistică')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                        {t('logistics.report_subtitle', 'Trasee, volume și materiale pe perioadă')}
                    </p>
                </div>

                {/* Nav links */}
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                        <Link to="/admin/logistica" className="px-4 h-9 flex items-center gap-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">
                            <MapPin className="w-4 h-4" /> {t('logistics.map', 'Hartă')}
                        </Link>
                        <Link to="/admin/logistica/raport" className="px-4 h-9 flex items-center gap-2 rounded-full bg-white dark:bg-slate-700 text-sm font-bold text-blue-600 dark:text-blue-400 shadow-sm transition-colors">
                            <BarChart3 className="w-4 h-4" /> {t('logistics.report', 'Raport')}
                        </Link>
                        <Link to="/admin/logistica/bases" className="px-4 h-9 flex items-center gap-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">
                            <MapPin className="w-4 h-4" /> {t('logistics.bases', 'Baze')}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col md:flex-row flex-wrap gap-3 items-start md:items-center">
                {/* Period shortcuts */}
                <div className="flex gap-1.5 flex-wrap">
                    {[
                        { label: t('filters.current_week', 'Săptămâna'), fn: getWeekRange },
                        { label: t('filters.current_month', 'Luna'), fn: getMonthRange },
                    ].map(({ label, fn }) => (
                        <button
                            key={label}
                            onClick={() => { const [s, e] = fn(); setStartDate(s); setEndDate(e) }}
                            className="px-3 h-8 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                        >{label}</button>
                    ))}
                </div>

                <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />

                {/* Date pickers */}
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="text-sm font-bold bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white dark:[color-scheme:dark]" />
                    <span className="text-slate-400 text-sm">→</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="text-sm font-bold bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white dark:[color-scheme:dark]" />
                </div>

                <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />

                {/* Group by */}
                <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t('logistics.group_by', 'Grupare')}</span>
                    {['day', 'team', 'none'].map(g => (
                        <button key={g} onClick={() => setGroupBy(g)}
                            className={`px-2.5 h-7 rounded-full text-xs font-bold transition-colors ${groupBy === g ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                            {g === 'day' ? t('logistics.by_day', 'Zi') : g === 'team' ? t('logistics.by_team', 'Echipă') : t('logistics.no_group', 'Niciunul')}
                        </button>
                    ))}
                </div>

                {/* Team filter */}
                {teams.length > 1 && (
                    <>
                        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button onClick={() => setFilterTeam('all')}
                                className={`px-2.5 h-7 rounded-full text-xs font-bold transition-colors ${filterTeam === 'all' ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                {t('common.all', 'Toate')}
                            </button>
                            {teams.map(team => (
                                <button key={team.id} onClick={() => setFilterTeam(team.id)}
                                    className={`px-2.5 h-7 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${filterTeam === team.id ? 'text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                                    style={filterTeam === team.id ? { backgroundColor: team.color } : {}}>
                                    <TruckSVG color={filterTeam === team.id ? 'white' : team.color} className="w-3 h-3" />
                                    {team.name}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* KPI summary */}
            {data && !loading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: t('logistics.report_orders', 'Comenzi'), value: filteredTotals.count, icon: Package, color: 'blue' },
                        { label: t('logistics.report_surface', 'Suprafață'), value: `${filteredTotals.surface_m2.toFixed(1)} m²`, icon: Layers, color: 'green' },
                        { label: t('logistics.total_sand', 'Total Nisip'), value: `${filteredTotals.sand_tons.toFixed(2)} t`, icon: Package, color: 'amber' },
                        { label: t('logistics.est_distance', 'Distanță Est.'), value: `${filteredTotals.distance_km.toFixed(1)} km`, icon: TrendingUp, color: 'slate' },
                    ].map(({ label, value, icon: Icon, color }) => {
                        const grad = { blue: 'from-blue-500 to-blue-600', green: 'from-emerald-500 to-emerald-600', amber: 'from-amber-400 to-orange-500', slate: 'from-slate-500 to-slate-600' }
                        return (
                            <div key={label} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad[color]} flex items-center justify-center shadow-sm shrink-0`}>
                                    <Icon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{value}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <p className="text-sm font-semibold">{error}</p>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                        <BarChart3 className="w-10 h-10 opacity-30" />
                        <p className="text-sm font-semibold">{t('logistics.no_data_period', 'Nicio comandă în această perioadă')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <TH col="date" label={t('logistics.col_date', 'Data')} />
                                    <TH col="team_name" label={t('logistics.col_team', 'Echipă')} />
                                    <TH col="vehicle_plate" label={t('logistics.col_truck', 'Camion')} className="hidden sm:table-cell" />
                                    <TH col="title" label={t('logistics.col_work', 'Lucrare')} />
                                    <TH col="surface_m2" label={t('logistics.col_surface', 'Suprafață')} className="hidden md:table-cell text-right" />
                                    <TH col="avg_thickness_cm" label={t('logistics.col_thickness', 'Grosime')} className="hidden md:table-cell text-right" />
                                    <TH col="sand_tons" label={t('logistics.col_sand', 'Nisip')} className="text-right" />
                                    <TH col="route_distance_km" label={t('logistics.col_km', 'Km')} className="text-right" />
                                    <TH col={null} label={t('logistics.col_status', 'Status')} className="text-center" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {grouped ? (
                                    Object.entries(grouped).map(([key, group]) => {
                                        const gSurface = group.rows.reduce((s, r) => s + (r.surface_m2 || 0), 0)
                                        const gSand = group.rows.reduce((s, r) => s + (r.sand_tons || 0), 0)
                                        const gKm = group.rows.reduce((s, r) => s + (r.route_distance_km || 0), 0)
                                        return (
                                            <React.Fragment key={key}>
                                                {/* Group header */}
                                                <tr className="bg-slate-100/70 dark:bg-slate-700/40">
                                                    <td colSpan={9} className="px-3 py-1.5">
                                                        <div className="flex items-center gap-2">
                                                            {group.color
                                                                ? <TruckSVG color={group.color} className="w-3.5 h-3.5" />
                                                                : <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                                                            }
                                                            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{group.label}</span>
                                                            <span className="text-[10px] text-slate-400 ml-1">{group.rows.length} comenzi</span>
                                                            <div className="ml-auto flex items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                                {gSurface > 0 && <span>{gSurface.toFixed(1)} m²</span>}
                                                                {gSand > 0 && <span className="text-amber-600">{gSand.toFixed(2)} t nisip</span>}
                                                                {gKm > 0 && <span className="text-blue-600">{gKm.toFixed(1)} km</span>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {renderRows(group.rows)}
                                            </React.Fragment>
                                        )
                                    })
                                ) : renderRows(rows)}

                                {/* Totals row */}
                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-300 dark:border-slate-600">
                                    <td colSpan={4} className="px-3 py-2.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                        TOTAL — {filteredTotals.count} {t('logistics.report_orders', 'comenzi')}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-extrabold text-sm text-slate-800 dark:text-white hidden md:table-cell">
                                        {filteredTotals.surface_m2.toFixed(1)} <span className="text-slate-400 font-normal text-xs">m²</span>
                                    </td>
                                    <td className="hidden md:table-cell" />
                                    <td className="px-3 py-2.5 text-right font-extrabold text-sm text-amber-600 dark:text-amber-400">
                                        {filteredTotals.sand_tons.toFixed(2)} <span className="text-slate-400 font-normal text-xs">t</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-extrabold text-sm text-blue-600 dark:text-blue-400">
                                        {filteredTotals.distance_km.toFixed(1)} <span className="text-slate-400 font-normal text-xs">km</span>
                                    </td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

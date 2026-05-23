import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../lib/api'
import {
    Users, Building2, Clock, CheckCircle, TrendingUp, Calendar, BarChart3, Activity,
    Loader2, Coffee, MapPin, RefreshCw, Timer, Trophy, AlertTriangle, Zap,
    ArrowUpRight, ArrowDownRight, ChevronRight, Eye, ShieldAlert, WifiOff,
    X, Phone, Mail, FileText, ArrowLeft
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SiteMap from '../../components/SiteMap'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function AdminOverview() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [stats, setStats] = useState({ total_users: 0, total_sites: 0, pending: 0, total_hours_week: 0 })
    const [chartData, setChartData] = useState({ daily: [], hourly: [], activities: [], sites: [] })
    const [loading, setLoading] = useState(true)
    const [activeWorkers, setActiveWorkers] = useState([])
    const [fleetAlerts, setFleetAlerts] = useState([])
    const [workersLoading, setWorkersLoading] = useState(true)
    const [lastRefresh, setLastRefresh] = useState(null)
    const refreshTimer = useRef(null)

    // Worker detail drawer
    const [selectedWorker, setSelectedWorker] = useState(null)
    const [workerDetail, setWorkerDetail] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)

    // Live clock — use ref to avoid re-rendering charts every second
    const nowRef = useRef(Date.now())
    const [clockTick, setClockTick] = useState(0)

    // Dark mode detection for Recharts (which uses inline styles, not Tailwind)
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))
    useEffect(() => {
        const obs = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'))
        })
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])
    useEffect(() => {
        const t = setInterval(() => {
            nowRef.current = Date.now()
            setClockTick(c => c + 1)
        }, 10000) // update every 10s instead of 1s
        return () => clearInterval(t)
    }, [])

    const getLiveHours = (w) => {
        if (w.status === 'terminat' || !w.check_in_time) return w.worked_hours || 0
        if (w.gps_lost || w.status === 'gps_pierdut') return w.worked_hours || 0
        const checkin = new Date(w.check_in_time).getTime()
        let elapsed = (nowRef.current - checkin) / 3600000
        let breakH = w.break_hours || 0
        return Math.max(0, elapsed - breakH)
    }

    useEffect(() => {
        Promise.all([fetchStats(), fetchChartData(), fetchActiveWorkers(), fetchFleetAlerts()])
        refreshTimer.current = setInterval(() => {
            fetchStats(true)
            fetchActiveWorkers()
            fetchChartData()
            fetchFleetAlerts()
        }, 15000)
        return () => clearInterval(refreshTimer.current)
    }, [])

    const fetchStats = async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true)
            const res = await api.get('/admin/timesheets/stats')
            const tsStats = res.data || {}
            setStats({
                total_users: tsStats.total_users || 0,
                total_sites: tsStats.total_sites || 0,
                pending: tsStats.pending || 0,
                total_hours_week: tsStats.total_hours_week || 0,
            })
        } catch (e) { console.error(e) }
        finally { if (!isBackground) setLoading(false) }
    }

    const fetchChartData = async () => {
        try {
            const res = await api.get('/admin/dashboard-stats')
            setChartData(res.data)
        } catch (e) { console.error(e) }
    }

    const fetchFleetAlerts = async () => {
        try {
            const res = await api.get('/admin/vehicles/expiring-documents')
            setFleetAlerts(res.data)
        } catch (e) { console.error(e) }
    }

    const fetchActiveWorkers = async () => {
        try {
            setWorkersLoading(true)
            const res = await api.get('/admin/timesheets/active-workers')
            setActiveWorkers(res.data.active_workers || [])
            setLastRefresh(new Date())
        } catch (e) { console.error(e) }
        finally { setWorkersLoading(false) }
    }

    const openWorkerDetail = async (worker) => {
        setSelectedWorker(worker)
        setDetailLoading(true)
        try {
            const res = await api.get(`/admin/timesheets/worker/${worker.worker_id}/history`)
            setWorkerDetail(res.data)
        } catch (e) {
            console.error('Error fetching worker detail:', e)
            setWorkerDetail(null)
        } finally {
            setDetailLoading(false)
        }
    }

    const closeWorkerDetail = () => { setSelectedWorker(null); setWorkerDetail(null) }

    const formatTime = (hours) => {
        if (!hours || hours <= 0) return '0h 00m'
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        return `${h}h ${String(m).padStart(2, '0')}m`
    }

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

    const isWorking = (w) => w.status === 'activ' || w.status === 'gps_pierdut' || w.status === 'outside_geofence'
    const isOnBreak = (w) => w.status === 'pauză' || w.is_on_break
    const isDone = (w) => w.status === 'terminat'

    const activeCount = activeWorkers.filter(w => isWorking(w) && !isOnBreak(w)).length
    const breakCount = activeWorkers.filter(w => isOnBreak(w)).length
    const finishedCount = activeWorkers.filter(w => isDone(w)).length
    const totalHoursToday = activeWorkers.reduce((sum, w) => sum + getLiveHours(w), 0)

    // Compute top performers
    const topPerformers = [...activeWorkers]
        .map(w => ({ ...w, live_hours: getLiveHours(w) }))
        .sort((a, b) => b.live_hours - a.live_hours)
        .slice(0, 5)

    // Site distribution — live
    const siteDistribution = {}
    activeWorkers.forEach(w => {
        const site = w.site_name || 'Necunoscut'
        if (!siteDistribution[site]) siteDistribution[site] = { name: site, total: 0, active: 0, onBreak: 0, done: 0 }
        siteDistribution[site].total++
        if (isOnBreak(w)) siteDistribution[site].onBreak++
        else if (isWorking(w)) siteDistribution[site].active++
        else siteDistribution[site].done++
    })
    const siteList = Object.values(siteDistribution)

    // Weekly comparison
    const daily = chartData.daily || []
    const thisWeekHours = daily.slice(-7).reduce((s, d) => s + (d.hours || 0), 0)
    const lastWeekDaily = daily.slice(0, Math.max(0, daily.length - 7))
    const lastWeekHours = lastWeekDaily.reduce((s, d) => s + (d.hours || 0), 0)
    const weekChange = lastWeekHours > 0 ? ((thisWeekHours - lastWeekHours) / lastWeekHours * 100) : 0

    // Workers who checked in late (after 8:30 AM)
    const lateArrivals = activeWorkers.filter(w => {
        if (!w.check_in_time) return false
        const checkin = new Date(w.check_in_time)
        return checkin.getHours() > 8 || (checkin.getHours() === 8 && checkin.getMinutes() > 30)
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Se încarcă dashboard-ul...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {t('dashboard.title')}
                    </h1>
                    <p className="text-sm text-slate-500">
                        {new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        <span className="ml-2 text-slate-400">•</span>
                        <span className="ml-2 font-mono text-xs">{new Date(nowRef.current).toLocaleTimeString('ro-RO')}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {lastRefresh && (
                        <span className="text-xs text-slate-400">
                            {t('admin.updated_at')}: {lastRefresh.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={() => { fetchStats(true); fetchChartData(); fetchActiveWorkers() }}
                        className="p-2 hover:bg-white rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4 text-slate-600" />
                    </button>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <KPICard label={t('dashboard.employees')} value={stats.total_users} icon={Users} gradient="from-[#0f172a] to-[#1e3a5f]" onClick={() => navigate('/admin/users')} />
                <KPICard label={t('dashboard.sites')} value={stats.total_sites} icon={Building2} gradient="from-[#1e3a5f] to-[#1e40af]" onClick={() => navigate('/admin/sites')} />
                <KPICard label={t('dashboard.working_now')} value={activeCount} icon={Timer} gradient="from-[#0f172a] to-[#164e63]" pulse={activeCount > 0} onClick={() => document.getElementById('live-workers-table')?.scrollIntoView({ behavior: 'smooth' })} />
                <KPICard label={t('dashboard.on_break')} value={breakCount} icon={Coffee} gradient="from-[#1e3a5f] to-[#7c3aed]" onClick={() => document.getElementById('live-workers-table')?.scrollIntoView({ behavior: 'smooth' })} />
                <KPICard label={t('dashboard.hours_today')} value={formatTime(totalHoursToday)} icon={Clock} gradient="from-[#0f172a] to-[#1e40af]" isText pulse onClick={() => document.getElementById('live-workers-table')?.scrollIntoView({ behavior: 'smooth' })} />
                <KPICard label={t('dashboard.hours_week')} value={`${stats.total_hours_week}h`} icon={TrendingUp} gradient="from-[#1e3a5f] to-[#0f172a]" isText onClick={() => navigate('/admin/reports')} />
            </div>

            {/* Live Site Map — full width below KPIs */}
            <div className="mb-6">
                <SiteMap />
            </div>

            {/* Row 2: Weekly Comparison + Site Live Map */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
                {/* Weekly Hours Chart — takes 2 cols */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                            {t('dashboard.weekly_chart')}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold flex items-center gap-1 ${weekChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {weekChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(weekChange).toFixed(0)}% {t('dashboard.vs_last_week')}
                            </span>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <ComposedChart data={daily} barSize={36}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="h" />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="" hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#1e293b' }}
                                    formatter={(value, name) => [name === 'hours' ? `${value}h` : value, name === 'hours' ? 'Ore' : 'Muncitori']}
                                    labelFormatter={(label) => `Data: ${label}`}
                                />
                                <defs>
                                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                    </linearGradient>
                                </defs>
                                <Bar yAxisId="left" dataKey="hours" fill="url(#blueGrad)" radius={[6, 6, 0, 0]} />
                                <Line yAxisId="left" type="monotone" dataKey="workers" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} activeDot={{ r: 6 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-6 mt-2 px-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-500 to-indigo-600" /> {t('dashboard.hours_worked')}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <div className="w-3 h-0.5 bg-amber-500 rounded" style={{ width: 16 }} /> {t('dashboard.workers')}
                        </div>
                    </div>
                </div>

                {/* Live Site Map — same height as chart card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-5 flex flex-col" style={{height: '360px'}}>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2 shrink-0">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        {t('dashboard.live_sites')}
                    </h3>
                    {siteList.length === 0 ? (
                        <div className="flex items-center justify-center flex-1 text-slate-400 text-sm">
                            <div className="text-center">
                                <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p>{t('dashboard.no_workers_today')}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 overflow-y-auto flex-1 pr-0.5">
                            {siteList.sort((a, b) => b.total - a.total).map(site => (
                                <div key={site.name} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-slate-800 truncate flex-1">{site.name}</span>
                                        <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border">{site.total}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {site.active > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                                {site.active} activ{site.active > 1 ? 'i' : ''}
                                            </span>
                                        )}
                                        {site.onBreak > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                                                <Coffee className="w-3 h-3" /> {site.onBreak}
                                            </span>
                                        )}
                                        {site.done > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                                <CheckCircle className="w-3 h-3" /> {site.done}
                                            </span>
                                        )}
                                    </div>
                                    {/* Progress bar */}
                                    <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                                        {site.active > 0 && <div className="bg-green-500 h-full transition-all" style={{ width: `${(site.active / site.total) * 100}%` }} />}
                                        {site.onBreak > 0 && <div className="bg-orange-400 h-full transition-all" style={{ width: `${(site.onBreak / site.total) * 100}%` }} />}
                                        {site.done > 0 && <div className="bg-slate-400 h-full transition-all" style={{ width: `${(site.done / site.total) * 100}%` }} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Row 3: Hourly Chart + Top Performers + Late Arrivals/Production */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Hourly Activity */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-5 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2 shrink-0">
                        <Activity className="w-4 h-4 text-green-500" />
                        {t('dashboard.hourly_activity')}
                    </h3>
                    <div className="flex-1 min-h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.hourly || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#1e293b' }}
                                    formatter={(value) => [value, t('dashboard.workers')]}
                                />
                                <defs>
                                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="workers" stroke="#10b981" strokeWidth={2.5} fill="url(#greenGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-5 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2 shrink-0">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        {t('dashboard.top_performers_today')}
                    </h3>
                    {topPerformers.length === 0 ? (
                        <div className="flex items-center justify-center flex-1 text-slate-400 text-sm">
                            <p>{t('dashboard.no_workers_today')}</p>
                        </div>
                    ) : (
                        <div className="space-y-2 overflow-y-auto flex-1">
                            {topPerformers.map((w, idx) => (
                                <div key={w.worker_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                                        idx === 1 ? 'bg-slate-200 text-slate-600' :
                                        idx === 2 ? 'bg-orange-100 text-orange-600' :
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                        {`#${idx + 1}`}
                                    </div>
                                    <AvatarImg path={w.avatar_path} name={w.worker_name} size="w-8 h-8" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{w.worker_name}</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{w.site_name}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-blue-600">{formatTime(w.live_hours)}</span>
                                        {w.status !== 'terminat' && !w.gps_lost && w.status !== 'gps_pierdut' && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Alerts + Production — single card, two sections */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-5 flex flex-col gap-5 max-h-[500px] overflow-y-auto custom-scrollbar">
                    
                    {/* Fleet Expiry Alerts */}
                    {fleetAlerts.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Alerte Flotă (Documente)
                            </h3>
                            <div className="space-y-2">
                                {fleetAlerts.map((a, i) => (
                                    <div key={i} className={`flex flex-col gap-1 text-sm bg-${a.status === 'expired' ? 'red' : 'orange'}-50 dark:bg-slate-800 p-2.5 rounded-lg border border-${a.status === 'expired' ? 'red' : 'orange'}-200 dark:border-slate-700`}>
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-slate-800 dark:text-white truncate" title={a.document_name}>{a.document_name}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${a.status === 'expired' ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'}`}>
                                                {a.status === 'expired' ? 'Expirat' : `Expiră în ${a.days_left} zile`}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                            {a.vehicle_name} ({a.registration})
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {(lateArrivals.length > 0 || (chartData.activities || []).length > 0) && <div className="border-t border-slate-100 dark:border-slate-700 mt-4" />}
                        </div>
                    )}

                    {/* Late Arrivals */}
                    {lateArrivals.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                {t('dashboard.late_arrivals')} ({lateArrivals.length})
                            </h3>
                            <div className="space-y-2">
                                {lateArrivals.slice(0, 4).map(w => (
                                    <div key={w.worker_id} className="flex items-center gap-2 text-sm">
                                        <AvatarImg path={w.avatar_path} name={w.worker_name} size="w-6 h-6" textSize="text-[10px]" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{w.worker_name}</span>
                                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                            {new Date(w.check_in_time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {(chartData.activities || []).length > 0 && <div className="border-t border-slate-100 dark:border-slate-700 mt-4" />}
                        </div>
                    )}

                    {/* Today's Activities Summary */}
                    {(chartData.activities || []).length > 0 ? (
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-violet-500" />
                                {t('dashboard.production_today')}
                            </h3>
                            <div className="space-y-2 overflow-y-auto">
                                {(chartData.activities || []).slice(0, 8).map((act, i) => (
                                    <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-700">
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{act.name}</span>
                                        <span className="text-sm font-bold text-violet-600">
                                            {act.quantity} <span className="text-xs text-slate-400 font-normal">{act.unit_type}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : lateArrivals.length === 0 && fleetAlerts.length === 0 && (
                        <div className="flex items-center justify-center flex-1 text-center">
                            <div>
                                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.all_ok')}</p>
                                <p className="text-xs text-slate-400 mt-1">{t('dashboard.no_alerts')}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Site Distribution Pie + Workers per Day */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-5">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        {t('dashboard.site_distribution')}
                    </h3>
                    {(chartData.sites || []).length > 0 ? (
                        <div style={{ width: '100%', height: 220 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={chartData.sites || []}
                                        dataKey="workers"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={85}
                                        innerRadius={50}
                                        paddingAngle={3}
                                    >
                                        {(chartData.sites || []).map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                            <div className="text-center">
                                <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p>{t('dashboard.no_workers_today')}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-5">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-violet-500" />
                        {t('dashboard.workers_per_day')}
                    </h3>
                    <div style={{ width: '100%', height: 220 }}>
                        <ResponsiveContainer>
                            <BarChart data={daily} barSize={28}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#1e293b' }}
                                    formatter={(value) => [value, t('dashboard.workers')]}
                                />
                                <defs>
                                    <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" />
                                        <stop offset="100%" stopColor="#a78bfa" />
                                    </linearGradient>
                                </defs>
                                <Bar dataKey="workers" fill="url(#violetGrad)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Live Workers Table */}
            {(() => {
                const liveWorkers = activeWorkers.filter(w => w.status !== 'terminat')
                const doneWorkers = activeWorkers.filter(w => w.status === 'terminat')
                const tableHead = (
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('dashboard.worker')}</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('dashboard.site')}</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('dashboard.check_in')}</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('dashboard.hours_worked')}</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('common.status')}</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('dashboard.activities')}</th>
                        </tr>
                    </thead>
                )
                const renderWorkerRow = (worker) => (
                    <tr key={worker.worker_id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                                <AvatarImg path={worker.avatar_path} name={worker.worker_name} size="w-8 h-8" />
                                <div>
                                    <div className="text-sm font-semibold text-blue-700 hover:text-blue-900 cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); openWorkerDetail(worker) }}>{worker.worker_name}</div>
                                    <div className="text-xs text-slate-500">{worker.employee_code}</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5 text-sm text-slate-700">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {worker.site_name || '—'}
                            </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">
                            {worker.check_in_time ? new Date(worker.check_in_time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-5 py-3">
                            <span className={`text-sm font-bold ${worker.status === 'terminat' ? 'text-slate-600' : 'text-blue-600'}`}>
                                {formatTime(getLiveHours(worker))}
                            </span>
                            {worker.status !== 'terminat' && !worker.gps_lost && worker.status !== 'gps_pierdut' && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                            {worker.break_hours > 0 && <span className="text-xs text-orange-500 ml-2">({t('dashboard.break')}: {formatTime(worker.break_hours)})</span>}
                        </td>
                        <td className="px-5 py-3">
                            <StatusBadge status={worker.status} is_on_break={worker.is_on_break} is_outside_geofence={worker.is_outside_geofence} gps_lost={worker.gps_lost} />
                        </td>
                        <td className="px-5 py-3">
                            {worker.activities && worker.activities.length > 0 ? (
                                <div className="relative group inline-block">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 cursor-pointer hover:bg-violet-200 transition-colors">
                                        <Activity className="w-3 h-3" />
                                        {worker.activities.length} activit{worker.activities.length > 1 ? 'ăți' : 'ate'}
                                    </span>
                                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 w-80">
                                        <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl border border-slate-700">
                                            <div className="text-[11px] font-semibold text-slate-400 uppercase mb-2">{t('dashboard.reported_activities')}</div>
                                            <div className="space-y-2">
                                                {worker.activities.map((act, i) => (
                                                    <div key={i} className="flex items-start justify-between text-sm gap-2">
                                                        <span className="text-slate-200 flex-1 leading-tight">{act.name}</span>
                                                        <span className="text-violet-300 font-bold whitespace-nowrap">{act.quantity} {act.unit_type}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="absolute left-4 -bottom-1 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-slate-700" />
                                        </div>
                                    </div>
                                </div>
                            ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                    </tr>
                )
                return (
                    <>
                        {/* Active Workers */}
                        <div id="live-workers-table" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden mb-4 scroll-mt-6">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    {t('dashboard.live_workers_title')}
                                </h3>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400">{liveWorkers.length} {t('dashboard.workers').toLowerCase()}</span>
                                    <button onClick={() => navigate('/admin/timesheets')} className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
                                        <Eye className="w-3 h-3" /> {t('nav.timesheets')}
                                    </button>
                                    <button onClick={fetchActiveWorkers} disabled={workersLoading} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                        <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${workersLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            {liveWorkers.length === 0 ? (
                                <div className="px-5 py-8 text-center text-slate-400">
                                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="font-medium text-slate-500">{t('dashboard.no_active_workers')}</p>
                                    <p className="text-xs mt-1">{t('dashboard.will_appear_on_checkin')}</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    {tableHead}
                                    <tbody className="divide-y divide-slate-100">{liveWorkers.map(renderWorkerRow)}</tbody>
                                </table>
                            )}
                        </div>

                        {/* Finished Workers */}
                        {doneWorkers.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden mb-6">
                                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                    <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-slate-400" /> {t('dashboard.finished_today')}
                                    </h3>
                                    <span className="text-xs text-slate-400">{doneWorkers.length} {t('dashboard.workers').toLowerCase()}</span>
                                </div>
                                <table className="w-full">
                                    {tableHead}
                                    <tbody className="divide-y divide-slate-100">{doneWorkers.map(renderWorkerRow)}</tbody>
                                </table>
                            </div>
                        )}
                    </>
                )
            })()}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QuickAction icon={Clock} title={t('nav.timesheets')} desc={t('dashboard.view_timesheets')} color="bg-blue-500" onClick={() => navigate('/admin/timesheets')} />
                <QuickAction icon={BarChart3} title={t('nav.reports')} desc={t('dashboard.generate_report')} color="bg-indigo-500" onClick={() => navigate('/admin/reports')} />
                <QuickAction icon={Activity} title={t('nav.activities')} desc={t('dashboard.manage_catalog')} color="bg-violet-500" onClick={() => navigate('/admin/activities')} />
                <QuickAction icon={Users} title={t('nav.users')} desc={`${stats.total_users} ${t('users.total_label')}`} color="bg-slate-600" onClick={() => navigate('/admin/users')} />
            </div>

            {/* Worker Detail Drawer */}
            {selectedWorker && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/40" onClick={closeWorkerDetail} />
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto" style={{ animation: 'slideInRight 0.25s ease-out' }}>
                        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
                            <button onClick={closeWorkerDetail} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium">
                                <ArrowLeft className="w-4 h-4" /> {t('common.back')}
                            </button>
                            <button onClick={closeWorkerDetail} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>

                        {detailLoading ? (
                            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                        ) : workerDetail ? (
                            <div className="p-6 space-y-6">
                                {/* Worker Profile */}
                                <div className="flex items-center gap-4">
                                    <AvatarImg path={workerDetail.worker.avatar_path} name={workerDetail.worker.full_name} size="w-16 h-16" textSize="text-xl" />
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{workerDetail.worker.full_name}</h2>
                                        <p className="text-sm text-slate-500">{workerDetail.worker.employee_code} • {workerDetail.worker.role_name}</p>
                                        <StatusBadge status={selectedWorker.status} is_on_break={selectedWorker.is_on_break} is_outside_geofence={selectedWorker.is_outside_geofence} gps_lost={selectedWorker.gps_lost} />
                                    </div>
                                </div>

                                {/* Contact */}
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                                    {workerDetail.worker.phone && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                            <a href={`tel:${workerDetail.worker.phone}`} className="text-blue-600 hover:underline">{workerDetail.worker.phone}</a>
                                        </div>
                                    )}
                                    {workerDetail.worker.email && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Mail className="w-4 h-4 text-slate-400" />
                                            <span className="text-slate-700">{workerDetail.worker.email}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Today's Shift Summary */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('dashboard.todays_shift')}</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                                            <div className="text-lg font-bold text-blue-600">{formatTime(getLiveHours(selectedWorker))}</div>
                                            <div className="text-[10px] text-blue-500 mt-0.5">{t('dashboard.hours_worked')}</div>
                                        </div>
                                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                                            <div className="text-lg font-bold text-orange-600">{formatTime(selectedWorker.break_hours || 0)}</div>
                                            <div className="text-[10px] text-orange-500 mt-0.5">{t('dashboard.break')}</div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                                            <div className="text-lg font-bold text-slate-700">
                                                {selectedWorker.check_in_time ? new Date(selectedWorker.check_in_time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">Check-in</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Today's Activities */}
                                {selectedWorker.activities && selectedWorker.activities.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('dashboard.reported_activities_today')}</h3>
                                        <div className="space-y-2">
                                            {selectedWorker.activities.map((act, i) => (
                                                <div key={i} className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
                                                    <div>
                                                        <span className="text-sm font-medium text-slate-700">{act.name}</span>
                                                        {act.added_at && (
                                                            <span className="ml-2 text-[11px] text-slate-400">
                                                                {new Date(act.added_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-bold text-violet-600">{act.quantity} <span className="text-xs text-slate-400 font-normal">{act.unit_type}</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* History Summary */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-indigo-600">{workerDetail.summary.total_days}</div>
                                        <div className="text-xs text-indigo-500 mt-1">{t('dashboard.total_days_worked')}</div>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-emerald-600">{formatTime(workerDetail.summary.total_hours)}</div>
                                        <div className="text-xs text-emerald-500 mt-1">{t('reports.total_hours')}</div>
                                    </div>
                                </div>

                                {/* Recent History */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('dashboard.recent_timesheets')}</h3>
                                    <div className="space-y-2">
                                        {workerDetail.history.slice(0, 7).map((entry, i) => (
                                            <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        {new Date(entry.date).toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                    </span>
                                                    <span className="text-sm font-bold text-blue-600">{formatTime(entry.worked_hours)}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {entry.site_name}</span>
                                                    {entry.check_in && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(entry.check_in).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>}
                                                </div>
                                                {entry.activities.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {entry.activities.map((a, j) => (
                                                            <span key={j} className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                                                {a.name}: {a.quantity} {a.unit_type}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-20 text-slate-400"><p>Eroare la încărcarea datelor</p></div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>
        </div>
    )
}

/* ─── Helper Components ─── */

function AvatarImg({ path, name, size = 'w-8 h-8', textSize = 'text-xs' }) {
    const [showFallback, setShowFallback] = useState(false)
    const initial = name?.charAt(0) || '?'
    if (path && !showFallback) {
        const src = path.startsWith('http') ? path : `${API_BASE}${path}`
        return <img src={src} alt="" className={`${size} rounded-full object-cover object-top`} onError={() => setShowFallback(true)} />
    }
    return (
        <div className={`${size} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white ${textSize} font-bold`}>
            {initial}
        </div>
    )
}

function StatusBadge({ status, is_on_break, is_outside_geofence, gps_lost }) {
    const { t } = useTranslation()
    if (status === 'geofence' || is_outside_geofence) {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><ShieldAlert className="w-3 h-3" /> {t('dashboard.outside_zone')}</span>
    }
    if (status === 'gps_pierdut' || gps_lost) {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><WifiOff className="w-3 h-3" /> {t('dashboard.gps_lost')}</span>
    }
    if (status === 'pauză' || is_on_break) {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700"><Coffee className="w-3 h-3" /> {t('dashboard.on_break_status')}</span>
    }
    if (status === 'terminat') {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600"><CheckCircle className="w-3 h-3" /> {t('dashboard.done')}</span>
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> {t('dashboard.working')}</span>
}

function KPICard({ label, value, icon: Icon, gradient, onClick, pulse, isText }) {
    return (
        <div
            onClick={onClick}
            className={`bg-gradient-to-br ${gradient} text-white rounded-xl p-4 shadow-xl relative overflow-hidden ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
        >
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-1">
                    <Icon className="w-4 h-4 opacity-80" />
                    {pulse && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                </div>
                <div className={`${isText ? 'text-xl' : 'text-2xl'} font-bold`}>{value}</div>
                <div className="text-[11px] opacity-80 mt-0.5">{label}</div>
            </div>
            <div className="absolute -right-2 -bottom-2 opacity-10"><Icon className="w-16 h-16" /></div>
        </div>
    )
}

function QuickAction({ icon: Icon, title, desc, color, onClick }) {
    return (
        <div onClick={onClick} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all shadow-md">
            <div className="flex items-start gap-3">
                <div className={`p-2 ${color} rounded-lg`}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
                    <p className="text-xs text-slate-500 truncate">{desc}</p>
                </div>
            </div>
        </div>
    )
}

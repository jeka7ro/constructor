import { useState, useEffect } from 'react'
import { useAdminStore } from '../../store/adminStore'
import api from '../../lib/api'
import {
    FileDown, Calendar, Users, Building2, Loader2, Download, Eye,
    BarChart3, Clock, TrendingUp, Activity, Filter, PieChart as PieChartIcon, FileSpreadsheet
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function ReportsPage() {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState(null)
    const [employees, setEmployees] = useState([])
    const [sites, setSites] = useState([])
    const [activeTab, setActiveTab] = useState('timesheets')

    // Filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [selectedEmployee, setSelectedEmployee] = useState('')
    const [selectedSite, setSelectedSite] = useState('')

    useEffect(() => {
        fetchEmployees()
        fetchSites()
        setDefaultDates()
    }, [])

    // Auto-load report after dates are set
    useEffect(() => {
        if (dateFrom && dateTo) {
            handlePreview()
        }
    }, [dateFrom, dateTo])

    const setDefaultDates = () => {
        const today = new Date()
        const lastWeek = new Date(today)
        lastWeek.setDate(today.getDate() - 7)
        setDateFrom(lastWeek.toISOString().split('T')[0])
        setDateTo(today.toISOString().split('T')[0])
    }

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/admin/users/', { params: { page_size: 1000 } })
            setEmployees(res.data.users || [])
        } catch (e) { console.error(e) }
    }

    const fetchSites = async () => {
        try {
            const res = await api.get('/admin/sites/', { params: { page_size: 1000 } })
            setSites(res.data.sites || [])
        } catch (e) { console.error(e) }
    }

    const handlePreview = async () => {
        try {
            setLoading(true)
            const params = {}
            if (dateFrom) params.date_from = dateFrom
            if (dateTo) params.date_to = dateTo
            if (selectedEmployee) params.employee_id = selectedEmployee
            if (selectedSite) params.site_id = selectedSite

            const res = await api.get('/admin/reports/timesheets/preview', { params })
            setPreview(res.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const handleDownloadExcel = async () => {
        try {
            setLoading(true)
            const params = {}
            if (dateFrom) params.date_from = dateFrom
            if (dateTo) params.date_to = dateTo
            if (selectedEmployee) params.employee_id = selectedEmployee
            if (selectedSite) params.site_id = selectedSite

            const res = await api.get('/admin/reports/timesheets/excel', { params, responseType: 'blob' })
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `pontaje_${dateFrom}_${dateTo}.xlsx`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const setQuickFilter = (days) => {
        const today = new Date()
        const past = new Date(today)
        past.setDate(today.getDate() - days)
        setDateFrom(past.toISOString().split('T')[0])
        setDateTo(today.toISOString().split('T')[0])
    }

    // Compute chart data from preview
    const computeCharts = () => {
        if (!preview?.timesheets) return { byEmployee: [], bySite: [], byDay: [], summaryCards: {} }

        const ts = preview.timesheets

        // By employee
        const empMap = {}
        ts.forEach(t => {
            if (!empMap[t.employee_name]) empMap[t.employee_name] = { name: t.employee_name, hours: 0, days: 0 }
            empMap[t.employee_name].hours += t.hours_worked || 0
            empMap[t.employee_name].days++
        })
        const byEmployee = Object.values(empMap).sort((a, b) => b.hours - a.hours)

        // By site
        const siteMap = {}
        ts.forEach(tNode => {
            const name = tNode.site_name || t('reports.unknown')
            if (!siteMap[name]) siteMap[name] = { name, hours: 0, count: 0 }
            siteMap[name].hours += t.hours_worked || 0
            siteMap[name].count++
        })
        const bySite = Object.values(siteMap).sort((a, b) => b.hours - a.hours)

        // By day
        const dayMap = {}
        ts.forEach(t => {
            const day = t.date
            if (!dayMap[day]) dayMap[day] = { date: day, hours: 0, workers: 0 }
            dayMap[day].hours += t.hours_worked || 0
            dayMap[day].workers++
        })
        const byDay = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }), hours: Math.round(d.hours * 10) / 10 }))

        // Summary
        const totalHours = ts.reduce((s, t) => s + (t.hours_worked || 0), 0)
        const uniqueEmployees = new Set(ts.map(t => t.employee_name)).size
        const uniqueSites = new Set(ts.map(t => t.site_name)).size
        const uniqueDays = new Set(ts.map(t => t.date)).size
        const avgHoursPerEmployee = uniqueEmployees > 0 ? totalHours / uniqueEmployees : 0
        const avgHoursPerDay = uniqueDays > 0 ? totalHours / uniqueDays : 0

        return {
            byEmployee, bySite, byDay,
            summaryCards: { totalHours, uniqueEmployees, uniqueSites, uniqueDays, avgHoursPerEmployee, avgHoursPerDay, totalRecords: ts.length }
        }
    }

    const charts = preview ? computeCharts() : null

    return (
        <div className="p-8 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('reports.title')}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('reports.subtitle')}</p>
            </div>

            {/* Filters Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-blue-500" />
                    <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('reports.filters')}</h2>
                </div>

                {/* Quick Filters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full mb-5">
                    {[
                        { label: t('reports.last_7_days'), fn: () => setQuickFilter(7) },
                        { label: t('reports.last_30_days'), fn: () => setQuickFilter(30) },
                        {
                            label: t('timesheets.period.month'), fn: () => {
                                const t = new Date()
                                setDateFrom(new Date(t.getFullYear(), t.getMonth(), 1).toISOString().split('T')[0])
                                setDateTo(t.toISOString().split('T')[0])
                            }
                        },
                        {
                            label: t('reports.last_month'), fn: () => {
                                const t = new Date()
                                const first = new Date(t.getFullYear(), t.getMonth() - 1, 1)
                                const last = new Date(t.getFullYear(), t.getMonth(), 0)
                                setDateFrom(first.toISOString().split('T')[0])
                                setDateTo(last.toISOString().split('T')[0])
                            }
                        },
                    ].map(f => (
                        <button key={f.label} onClick={f.fn}
                            className="px-2 py-2 w-full text-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors">
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                            <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400 dark:text-slate-500" /> {t('reports.from_date')}
                        </label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                            <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400 dark:text-slate-500" /> {t('reports.to_date')}
                        </label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                            <Users className="w-3.5 h-3.5 inline mr-1 text-slate-400 dark:text-slate-500" /> {t('users.employee_col')}
                        </label>
                        <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all">
                            <option value="">{t('reports.all_employees')}</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                            <Building2 className="w-3.5 h-3.5 inline mr-1 text-slate-400 dark:text-slate-500" /> {t('common.site')}
                        </label>
                        <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)}
                            className="w-full px-3 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all">
                            <option value="">{t('reports.all_sites')}</option>
                            {sites.map(site => (
                                <option key={site.id} value={site.id}>{site.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-5 border-t border-slate-100 dark:border-slate-800 pt-5">
                    <button onClick={handlePreview} disabled={loading}
                        className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap disabled:opacity-50">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        {t('reports.generate')}
                    </button>
                    <button onClick={handleDownloadExcel} disabled={loading || !preview}
                        className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                        <FileSpreadsheet className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('reports.download_excel')}</span>
                    </button>
                </div>
            </div>

            {/* Report Results */}
            {loading && !preview ? (
                <div className="flex flex-col items-center justify-center py-24 rounded-xl mb-6">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('reports.loading')}</h3>
                    <p className="text-sm text-slate-500">{t('reports.loading_desc')}</p>
                </div>
            ) : !preview ? (
                <div className="flex flex-col items-center justify-center py-24 rounded-xl mb-6">
                    <BarChart3 className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">{t('reports.no_report')}</h3>
                    <p className="text-sm text-slate-400">{t('reports.no_report_desc')}</p>
                </div>
            ) : preview && charts ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
                        <SummaryCard label={t('reports.kpi.records')} value={charts.summaryCards.totalRecords} icon={BarChart3} color="text-blue-600 bg-blue-50 border-blue-100" />
                        <SummaryCard label={t('timesheets.kpi.hours_worked')} value={`${Math.round(charts.summaryCards.totalHours * 10) / 10}h`} icon={Clock} color="text-indigo-600 bg-indigo-50 border-indigo-100" />
                        <SummaryCard label={t('reports.kpi.employees')} value={charts.summaryCards.uniqueEmployees} icon={Users} color="text-emerald-600 bg-emerald-50 border-emerald-100" />
                        <SummaryCard label={t('reports.kpi.sites')} value={charts.summaryCards.uniqueSites} icon={Building2} color="text-orange-600 bg-orange-50 border-orange-100" />
                        <SummaryCard label={t('reports.kpi.days')} value={charts.summaryCards.uniqueDays} icon={Calendar} color="text-violet-600 bg-violet-50 border-violet-100" />
                        <SummaryCard label={t('reports.kpi.avg_employee')} value={`${Math.round(charts.summaryCards.avgHoursPerEmployee * 10) / 10}h`} icon={TrendingUp} color="text-sky-600 bg-sky-50 border-sky-100" />
                        <SummaryCard label={t('reports.kpi.avg_day')} value={`${Math.round(charts.summaryCards.avgHoursPerDay * 10) / 10}h`} icon={Activity} color="text-pink-600 bg-pink-50 border-pink-100" />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Hours by Employee */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                {t('reports.charts.hours_employee')}
                            </h3>
                            <div style={{ width: '100%', height: Math.max(200, charts.byEmployee.length * 36) }}>
                                <ResponsiveContainer>
                                    <BarChart data={charts.byEmployee.slice(0, 15)} layout="vertical" barSize={20}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                                        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="h" />
                                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#e2e8f0' }}
                                            formatter={(value) => [`${Math.round(value * 10) / 10}h`, t('reports.charts.hours_unit')]}
                                        />
                                        <defs>
                                            <linearGradient id="empGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#6366f1" />
                                            </linearGradient>
                                        </defs>
                                        <Bar dataKey="hours" fill="url(#empGrad)" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Hours by Day */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-emerald-500" />
                                {t('reports.charts.hours_day')}
                            </h3>
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={charts.byDay} barSize={28}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="h" />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#e2e8f0' }}
                                            formatter={(value, name) => [name === 'hours' ? `${value}h` : value, name === 'hours' ? t('reports.charts.hours') : t('reports.charts.workers')]}
                                        />
                                        <defs>
                                            <linearGradient id="dayGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" />
                                                <stop offset="100%" stopColor="#34d399" />
                                            </linearGradient>
                                        </defs>
                                        <Bar dataKey="hours" fill="url(#dayGrad)" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Site Distribution Pie */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <PieChartIcon className="w-4 h-4 text-orange-500" />
                                {t('reports.charts.site_distribution')}
                            </h3>
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={charts.bySite}
                                            dataKey="hours"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                            innerRadius={55}
                                            paddingAngle={3}
                                            label={({ name, hours }) => `${name}: ${Math.round(hours)}h`}
                                        >
                                            {charts.bySite.map((_, i) => (
                                                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${Math.round(value * 10) / 10}h`, 'Ore']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Employee Rankings */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-violet-500" />
                                {t('reports.charts.employee_ranking')}
                            </h3>
                            <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                {charts.byEmployee.map((emp, i) => {
                                    const maxH = charts.byEmployee[0]?.hours || 1
                                    return (
                                        <div key={emp.name} className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' :
                                                i === 1 ? 'bg-slate-200 text-slate-600' :
                                                    i === 2 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-slate-100 text-slate-500'
                                                }`}>{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-sm font-medium text-slate-700 truncate">{emp.name}</span>
                                                    <span className="text-sm font-bold text-blue-600 ml-2">{Math.round(emp.hours * 10) / 10}h</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                                                        style={{ width: `${(emp.hours / maxH) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Tabs: Timesheets / By Site */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                            {[
                                { key: 'timesheets', label: t('reports.tabs.timesheets'), icon: Clock },
                                { key: 'bySite', label: t('reports.tabs.by_site'), icon: Building2 },
                                { key: 'byEmployee', label: t('reports.tabs.by_employee'), icon: Users },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 ${
                                        activeTab === tab.key
                                        ? 'text-blue-600 border-blue-500 bg-white dark:bg-slate-900'
                                        : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                            <div className="flex-1" />
                            <div className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-semibold">{preview.total}</span> {t('reports.records')} •
                                <span className="font-semibold ml-1">{preview.total_hours}</span> {t('reports.charts.hours_unit')}
                            </div>
                        </div>

                        {activeTab === 'timesheets' && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-5 py-3 text-left">{t('users.date')}</th>
                                            <th className="px-5 py-3 text-left">{t('users.employee_col')}</th>
                                            <th className="px-5 py-3 text-left">{t('users.code')}</th>
                                            <th className="px-5 py-3 text-left">{t('users.role')}</th>
                                            <th className="px-5 py-3 text-left">{t('common.site')}</th>
                                            <th className="px-5 py-3 text-left">{t('reports.table.check_in')}</th>
                                            <th className="px-5 py-3 text-left">{t('reports.table.check_out')}</th>
                                            <th className="px-5 py-3 text-right">{t('reports.table.hours')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {preview.timesheets.map((ts) => (
                                            <tr key={ts.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-300">{new Date(ts.date).toLocaleDateString('ro-RO')}</td>
                                                <td className="px-5 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{ts.employee_name}</td>
                                                <td className="px-5 py-3 text-sm text-slate-500">{ts.employee_code}</td>
                                                <td className="px-5 py-3 text-sm text-slate-500">{ts.role}</td>
                                                <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{ts.site_name}</td>
                                                <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{ts.check_in}</td>
                                                <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{ts.check_out}</td>
                                                <td className="px-5 py-3 text-sm font-bold text-blue-600 text-right">{ts.hours_worked}h</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'bySite' && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-5 py-3 text-left">Șantier</th>
                                            <th className="px-5 py-3 text-right">{t('reports.table.timesheets')}</th>
                                            <th className="px-5 py-3 text-right">{t('reports.table.total_hours')}</th>
                                            <th className="px-5 py-3 text-right">{t('reports.table.avg_timesheet')}</th>
                                            <th className="px-5 py-3 text-left">{t('reports.table.chart')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {charts.bySite.map((site, i) => {
                                            const maxH = charts.bySite[0]?.hours || 1
                                            return (
                                                <tr key={site.name} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                            {site.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400 text-right">{site.count}</td>
                                                    <td className="px-5 py-3 text-sm font-bold text-blue-600 text-right">{Math.round(site.hours * 10) / 10}h</td>
                                                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400 text-right">{Math.round((site.hours / site.count) * 10) / 10}h</td>
                                                    <td className="px-5 py-3 w-48">
                                                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all" style={{ width: `${(site.hours / maxH) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'byEmployee' && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-5 py-3 text-left">#</th>
                                            <th className="px-5 py-3 text-left">Angajat</th>
                                            <th className="px-5 py-3 text-right">{t('timesheets.days_worked')}</th>
                                            <th className="px-5 py-3 text-right">Total Ore</th>
                                            <th className="px-5 py-3 text-right">{t('reports.table.avg_day')}</th>
                                            <th className="px-5 py-3 text-left">Grafic</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {charts.byEmployee.map((emp, i) => {
                                            const maxH = charts.byEmployee[0]?.hours || 1
                                            return (
                                                <tr key={emp.name} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                                            i === 0 ? 'bg-amber-100 text-amber-700' :
                                                            i === 1 ? 'bg-slate-200 text-slate-600' :
                                                            i === 2 ? 'bg-orange-100 text-orange-700' :
                                                            'bg-slate-100 text-slate-500'
                                                        }`}>{i + 1}</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.name}</td>
                                                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400 text-right">{emp.days}</td>
                                                    <td className="px-5 py-3 text-sm font-bold text-blue-600 text-right">{Math.round(emp.hours * 10) / 10}h</td>
                                                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400 text-right">{Math.round((emp.hours / emp.days) * 10) / 10}h</td>
                                                    <td className="px-5 py-3 w-48">
                                                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{ width: `${(emp.hours / maxH) * 100}%` }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : !loading && null}
        </div>
    )
}

function SummaryCard({ label, value, icon: Icon, color }) {
    return (
        <div className={`rounded-2xl p-4 border-2 shadow-md dark:bg-slate-900 dark:border-slate-700 ${color}`}>
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-lg font-bold">{value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
        </div>
    )
}

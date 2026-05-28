import { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Phone, Mail, Calendar, Clock, Package, Car, Loader2, Award, Home, Activity, ShieldAlert, Zap, Thermometer, Wrench, CheckCircle2, BarChart3, Flame } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts'
import api from '../lib/api'

export default function EmployeeDetailView({ user, onBack, onExport }) {
    const [activeTab, setActiveTab] = useState('analytics')
    const [analytics, setAnalytics] = useState(null)
    const [warehouseHistory, setWarehouseHistory] = useState([])
    const [materialRequests, setMaterialRequests] = useState([])
    const [fuelLogs, setFuelLogs] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        fetchData()
    }, [user])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [analyticsRes, warehouseRes, fuelRes, mrRes] = await Promise.all([
                api.get(`/admin/users/${user.id}/analytics`),
                api.get(`/warehouse/transactions/user/${user.id}`),
                api.get(`/admin/vehicles/equipment-logs/operator/${user.id}`).catch(() => ({ data: [] })),
                api.get(`/admin/material-requests/`).catch(() => ({ data: [] }))
            ])
            setAnalytics(analyticsRes.data)
            setWarehouseHistory(warehouseRes.data)
            setFuelLogs(fuelRes.data)
            // filtram doar cererile acestui angajat
            const allMr = Array.isArray(mrRes.data) ? mrRes.data : []
            setMaterialRequests(allMr.filter(mr => mr.user_id === user.id))
        } catch (error) {
            console.error('Failed to fetch user data', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 h-64">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!analytics) return null

    const realWarehouseHistory = warehouseHistory.filter(tx => tx.item_category !== 'COMBUSTIBIL')
    const warehouseFuelHistory = warehouseHistory.filter(tx => tx.item_category === 'COMBUSTIBIL')

    const TABS = [
        { id: 'analytics', label: 'Analize & Performanță', icon: BarChart3 },
        { id: 'warehouse', label: `Istoric Magazie (${realWarehouseHistory.length})`, icon: Package },
        { id: 'fuel', label: `Utilaje & Combustibil (${fuelLogs.length + warehouseFuelHistory.length})`, icon: Car },
    ]

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6']

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* ─── Profile Header + Tabs combined ─── */}
            <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                <button
                    onClick={onBack}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>

                {/* Avatar */}
                {user.avatar_path ? (
                    <img src={user.avatar_path} alt="Avatar" className="w-11 h-14 rounded-lg object-cover object-[center_20%] border-2 border-white dark:border-slate-800 shadow-md shrink-0 relative z-0 hover:z-50 transition-transform duration-200 hover:scale-[2.5] hover:shadow-2xl cursor-zoom-in" />
                ) : (
                    <div className="w-11 h-14 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm border-2 border-white dark:border-slate-800 shadow-md shrink-0">
                        {user.full_name?.charAt(0)}
                    </div>
                )}

                {/* Name + badge */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{user.full_name}</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500">{user.employee_code}</span>
                    {user.is_active
                        ? <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full font-bold">Activ</span>
                        : <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full font-bold">Inactiv</span>
                    }
                </div>

                {/* Divider */}
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />

                {/* Tabs inline */}
                <div className="flex overflow-x-auto gap-1.5 custom-scrollbar flex-1">
                    {TABS.map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* Phone */}
                {user.phone && (
                    <a href={`tel:${user.phone}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors shrink-0">
                        <Phone className="w-3.5 h-3.5" /> {user.phone}
                    </a>
                )}

                {onExport && (
                    <button
                        onClick={onExport}
                        className="ml-auto flex items-center gap-1.5 px-4 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap shrink-0"
                    >
                        <BarChart3 className="w-3.5 h-3.5" /> Export Excel
                    </button>
                )}
            </div>

            {/* ─── Content ─── */}
            <div className="p-6">

                {/* ══ ANALYTICS TAB ══ */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6">
                        
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-500" /> Ore luna aceasta</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-800 dark:text-white">{analytics.this_month?.user_hours}h</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">Media șantierului: {analytics.this_month?.site_avg_hours}h</p>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Ore Overtime (estimat)</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-800 dark:text-white">{Math.max(0, analytics.this_month?.user_hours - 160)}h</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">Calculat peste 160h standard</p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-500" /> Combustibil Luna Asta</p>
                                <div className="flex items-center gap-4">
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Dat</span>
                                        <span className="text-xl font-black text-slate-800 dark:text-white">{analytics.this_month?.user_fuel_received ?? 0} L</span>
                                    </div>
                                    <span className="text-slate-300 dark:text-slate-600 text-lg">—</span>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Consumat</span>
                                        <span className="text-xl font-black text-slate-800 dark:text-white">{analytics.this_month?.user_fuel ?? 0} L</span>
                                    </div>
                                    <span className="text-slate-300 dark:text-slate-600 text-lg">=</span>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Ramas</span>
                                        <span className="text-xl font-black text-slate-800 dark:text-white">{Math.max(0, (analytics.this_month?.user_fuel_received ?? 0) - (analytics.this_month?.user_fuel ?? 0))} L</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Home className="w-3.5 h-3.5 text-purple-500" /> Cazare curentă</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{analytics.accommodation?.name || 'Fără cazare alocată'}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1 truncate">{analytics.accommodation?.city || '—'}</p>
                            </div>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Performance Chart */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-5 border border-slate-100 dark:border-slate-700">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-500" />
                                    Performanță Istorică (Ore)
                                </h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.historical_chart} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                            <RechartsTooltip 
                                                cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                            <Bar dataKey="user_hours" name="Ore Angajat" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                                <LabelList dataKey="user_hours" position="top" style={{ fontSize: '11px', fontWeight: '800', fill: '#3b82f6' }} formatter={(v) => v > 0 ? `${v}h` : ''} />
                                            </Bar>
                                            <Bar dataKey="site_avg" name="Media Șantier" fill="#94a3b8" opacity={0.5} radius={[4, 4, 0, 0]} maxBarSize={40}>
                                                <LabelList dataKey="site_avg" position="top" style={{ fontSize: '10px', fontWeight: '600', fill: '#94a3b8' }} formatter={(v) => v > 0 ? `${v}h` : ''} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Activities Breakdown */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 flex flex-col">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                                    <Wrench className="w-4 h-4 text-emerald-500" />
                                    Top Activități (Luna aceasta)
                                </h3>
                                {analytics.activities_breakdown?.length > 0 ? (
                                    <div className="flex-1 flex flex-col md:flex-row items-center justify-center">
                                        <div className="w-48 h-48">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={analytics.activities_breakdown.slice(0, 5)} // Top 5
                                                        cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2}
                                                        dataKey="count" stroke="none"
                                                    >
                                                        {analytics.activities_breakdown.slice(0, 5).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip 
                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-2 mt-4 md:mt-0 w-full md:w-auto">
                                            {analytics.activities_breakdown.slice(0, 5).map((act, index) => (
                                                <div key={index} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                    <span className="truncate max-w-[150px] font-medium">{act.name}</span>
                                                    <span className="ml-auto font-bold opacity-70">x{act.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                        <Activity className="w-10 h-10 mb-2 opacity-20" />
                                        <p className="text-sm italic">Fără activități înregistrate.</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )}

                {/* ══ WAREHOUSE HISTORY TAB ══ */}
                {activeTab === 'warehouse' && (
                    <div className="space-y-6">

                        {/* ── Cereri de Materiale ── */}
                        <div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-2">Cereri de Materiale</h3>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">Data Cererii</th>
                                            <th className="px-4 py-3">Articole Cerute</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Rezolvat La</th>
                                            <th className="px-4 py-3">Șantier</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                        {materialRequests.length === 0 ? (
                                            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic text-sm">Nicio cerere de materiale.</td></tr>
                                        ) : materialRequests.map((mr, idx) => {
                                            const statusColors = {
                                                pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
                                                approved:  'bg-blue-100 text-blue-700 border-blue-200',
                                                delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                                completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                                rejected:  'bg-red-100 text-red-700 border-red-200',
                                                disputed:  'bg-orange-100 text-orange-700 border-orange-200',
                                            }
                                            const statusLabel = {
                                                pending:   'În așteptare',
                                                approved:  'Aprobat',
                                                delivered: 'Livrat',
                                                completed: 'Finalizat',
                                                rejected:  'Respins',
                                                disputed:  'Contestat',
                                            }
                                            return (
                                                <tr key={mr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{new Date(mr.created_at).toLocaleString('ro-RO')}</td>
                                                    <td className="px-4 py-3 text-slate-800 dark:text-white max-w-xs">{mr.items_text || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${statusColors[mr.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                            {statusLabel[mr.status] || mr.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{mr.responded_at ? new Date(mr.responded_at).toLocaleString('ro-RO') : '—'}</td>
                                                    <td className="px-4 py-3 text-xs text-slate-500">{mr.site_name || '—'}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── Tranzacții Magazie ── */}
                        <div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-2">Tranzacții Magazie (Preluat / Returnat / Consumat)</h3>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">Dată</th>
                                            <th className="px-4 py-3">Articol / Sculă</th>
                                            <th className="px-4 py-3">Operațiune</th>
                                            <th className="px-4 py-3">Cantitate</th>
                                            <th className="px-4 py-3">Notițe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                        {realWarehouseHistory.length === 0 ? (
                                            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic text-sm">Nicio tranzacție de magazie pentru acest angajat.</td></tr>
                                        ) : realWarehouseHistory.map((tx, idx) => (
                                            <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                                <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{new Date(tx.created_at || tx.date).toLocaleString('ro-RO')}</td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-slate-900 dark:text-white block">{tx.item_name}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">SKU: {tx.item_sku}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {tx.tx_type === 'out' ? (
                                                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">PRELUAT</span>
                                                    ) : tx.tx_type === 'consume' ? (
                                                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">CONSUMAT</span>
                                                    ) : (
                                                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">RETURNAT</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{tx.quantity}</td>
                                                <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={tx.notes}>{tx.notes || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}

                {/* ══ FUEL LOGS TAB ══ */}
                {activeTab === 'fuel' && (
                        <div className="mb-6">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-3">Jurnale Utilaje & Auto</h3>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">Dată Jurnal</th>
                                            <th className="px-4 py-3">Utilaj / Mașină</th>
                                            <th className="px-4 py-3">A Muncit cu ea?</th>
                                            <th className="px-4 py-3">A Alimentat?</th>
                                            <th className="px-4 py-3">Litri</th>
                                            <th className="px-4 py-3">Note</th>
                                        </tr>
                                    </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {fuelLogs.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic text-sm">Nu există jurnale auto înregistrate de acest angajat.</td></tr>
                                ) : fuelLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{new Date(log.date).toLocaleDateString('ro-RO')}</td>
                                        <td className="px-4 py-3">
                                            <span className="font-bold text-slate-900 dark:text-white block">{log.vehicle_name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{log.plate_number}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.is_used ? (
                                                <span className="text-emerald-500"><CheckCircle2 className="w-5 h-5" /></span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.refueled ? (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">DA</span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{log.refueled ? `${log.refuel_liters} L` : '—'}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={log.notes}>{log.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {warehouseFuelHistory.length > 0 && (
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                <Flame className="w-5 h-5 text-red-500" /> Alimentări din Magazie (Motorină / Combustibil)
                            </h3>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">Dată</th>
                                            <th className="px-4 py-3">Tip Combustibil</th>
                                            <th className="px-4 py-3">Operațiune</th>
                                            <th className="px-4 py-3">Cantitate</th>
                                            <th className="px-4 py-3">Notițe / Locație</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                        {warehouseFuelHistory.map(tx => (
                                            <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">
                                                    {new Date(tx.created_at || tx.date).toLocaleString('ro-RO')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-slate-900 dark:text-white block">{tx.item_name}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {tx.tx_type === 'out' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                                                            PRELUAT DIN MAGAZIE
                                                        </span>
                                                    ) : tx.tx_type === 'consume' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                                                            CONSUMAT
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                                                            RETURNAT ÎN MAGAZIE
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{tx.quantity} L</td>
                                                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={tx.notes}>{tx.notes || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                                                TOTAL CONSUMAT:
                                            </td>
                                            <td colSpan={2} className="px-4 py-3 text-red-600 dark:text-red-400">
                                                {warehouseFuelHistory.filter(tx => tx.tx_type === 'consume').reduce((acc, curr) => acc + curr.quantity, 0)} L
                                            </td>
                                        </tr>
                                        {warehouseFuelHistory.some(tx => tx.tx_type === 'out') && (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                                                    TOTAL PRELUAT DIN MAGAZIE (INVENTAR):
                                                </td>
                                                <td colSpan={2} className="px-4 py-3 text-amber-600 dark:text-amber-400">
                                                    {warehouseFuelHistory.filter(tx => tx.tx_type === 'out').reduce((acc, curr) => acc + curr.quantity, 0)} L
                                                </td>
                                            </tr>
                                        )}
                                        {warehouseFuelHistory.some(tx => tx.tx_type === 'in') && (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                                                    TOTAL RETURNAT:
                                                </td>
                                                <td colSpan={2} className="px-4 py-3 text-emerald-600 dark:text-emerald-400">
                                                    {warehouseFuelHistory.filter(tx => tx.tx_type === 'in').reduce((acc, curr) => acc + curr.quantity, 0)} L
                                                </td>
                                            </tr>
                                        )}
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
                )}

            </div>
        </div>
    )
}

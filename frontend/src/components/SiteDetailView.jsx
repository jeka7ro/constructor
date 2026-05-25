import { useState, useEffect } from 'react'
import { Calendar, Building2, Car, MapPin, Package, Users, Camera, ArrowLeft, Loader2, Search, X, Clock } from 'lucide-react'
import api from '../lib/api'

export default function SiteDetailView({ site, onBack }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('general')
    
    // Date Range
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        if (!site) return
        fetchDetails()
    }, [site, startDate, endDate])

    const fetchDetails = async () => {
        setLoading(true)
        try {
            const params = {}
            if (startDate) params.start_date = startDate
            if (endDate) params.end_date = endDate
            
            const res = await api.get(`/admin/sites/${site.id}/details`, { params })
            setData(res.data)
        } catch (error) {
            console.error("Failed to load site details", error)
        } finally {
            setLoading(false)
        }
    }

    if (!data && loading) {
        return (
            <div className="flex items-center justify-center p-12 h-64">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!data) return null

    const totalWorkers = (data.direct_users?.length || 0) + (data.teams?.reduce((acc, t) => acc + (t.members?.length || 0), 0) || 0)

    const TABS = [
        { id: 'general', label: 'Informații Generale', icon: Building2 },
        { id: 'teams', label: `Echipe/Angajați (${totalWorkers})`, icon: Users },
        { id: 'vehicles', label: `Utilaje (${data.vehicles?.length || 0})`, icon: Car },
        { id: 'warehouse', label: `Magazie (${data.warehouse_transactions?.length || 0})`, icon: Package },
        { id: 'attendance', label: `Activitate (${data.attendance?.length || 0})`, icon: Clock },
        { id: 'photos', label: `Fotografii (${data.photos?.length || 0})`, icon: Camera }
    ]

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onBack}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {data.site.name}
                                {data.site.status === 'active' && (
                                    <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full font-semibold">Activ</span>
                                )}
                            </h2>
                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                <MapPin className="w-4 h-4" />
                                {data.site.address || 'Fără adresă specificată'}
                            </p>
                        </div>
                    </div>
                    
                    {/* Date Picker for filtering */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                        <Calendar className="w-4 h-4 text-slate-400 ml-3" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 outline-none w-32"
                        />
                        <span className="text-slate-300">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 outline-none w-32 pr-3"
                        />
                        {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full mr-1">
                                <X className="w-3 h-3 text-slate-500" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto gap-2 mt-6 custom-scrollbar pb-1">
                    {TABS.map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap
                                    ${isActive 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 dark:border-slate-800 mt-5 -mx-6" />

                {/* Tab Content — inside the same card */}
                {loading && data ? (
                    <div className="flex justify-center p-8 opacity-50">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <div className="pt-5">
                    {/* GENERAL TAB */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            {/* Info cards row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Client & Sistem */}
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5">
                                    <h3 className="font-bold text-base text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-blue-500" />
                                        Informații Client & Sistem
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <p className="text-slate-400 text-xs mb-1">Client</p>
                                            <p className="font-semibold text-slate-800 dark:text-white">{data.site.client_name || '-'}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <p className="text-slate-400 text-xs mb-1">Putere Sistem</p>
                                            <p className="font-semibold text-amber-600">{data.site.system_power_kw || 0} kW</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <p className="text-slate-400 text-xs mb-1">Panouri</p>
                                            <p className="font-semibold text-slate-800 dark:text-white">{data.site.panel_count || 0} buc</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <p className="text-slate-400 text-xs mb-1">Tip Instalare</p>
                                            <p className="font-semibold text-slate-800 dark:text-white capitalize">{data.site.installation_type || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Program & Locatie */}
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5">
                                    <h3 className="font-bold text-base text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-500" />
                                        Program & Locație
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <p className="text-slate-400 text-xs mb-1">Program Lucru</p>
                                            <p className="font-semibold text-slate-800 dark:text-white">{data.site.work_start_time || '—'} - {data.site.work_end_time || '—'}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <p className="text-slate-400 text-xs mb-1">Pauză Masă</p>
                                            <p className="font-semibold text-slate-800 dark:text-white">{data.site.lunch_break_start || '—'} - {data.site.lunch_break_end || '—'}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 col-span-2">
                                            <p className="text-slate-400 text-xs mb-1">Data Creării</p>
                                            <p className="font-semibold text-slate-800 dark:text-white">{data.site.created_at ? new Date(data.site.created_at).toLocaleString('ro-RO') : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Map */}
                            {data.site.address && (
                                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
                                        <MapPin className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Locație pe hartă</span>
                                        <span className="text-xs text-slate-400 ml-1">— {data.site.address}</span>
                                    </div>
                                    <iframe
                                        title="Locatie santier"
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(data.site.address)}&output=embed&z=15`}
                                        width="100%"
                                        height="340"
                                        style={{ border: 0, display: 'block' }}
                                        allowFullScreen
                                        loading="lazy"
                                    />
                                </div>
                            )}
                        </div>
                    )}


                    {/* TEAMS TAB */}
                    {activeTab === 'teams' && (
                        <div>
                            <h3 className="font-bold text-lg mb-4 border-b pb-2">Echipe și Angajați Alocați</h3>
                            
                            <div className="space-y-6">
                                {data.teams?.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wider">Echipe Alocate</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {data.teams.map(team => (
                                                <div key={team.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                    <h5 className="font-bold text-blue-700 flex items-center gap-2 mb-2">
                                                        <Users className="w-4 h-4" />
                                                        {team.name}
                                                    </h5>
                                                    <ul className="space-y-1.5">
                                                        {team.members?.map(m => (
                                                            <li key={m.id} className="text-sm text-slate-600 flex justify-between items-center bg-white p-1.5 rounded border border-slate-100 shadow-sm">
                                                                <span>{m.name}</span>
                                                                <span className="text-[10px] uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{m.role}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {data.direct_users?.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wider">Angajați Individuali Alocați</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {data.direct_users.map(u => (
                                                <div key={u.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center shadow-sm">
                                                    <span className="text-sm font-medium text-slate-700">{u.name}</span>
                                                    <span className="text-[10px] uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">{u.role}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(!data.teams?.length && !data.direct_users?.length) && (
                                    <p className="text-slate-500 italic py-4">Nu există echipe sau angajați individuali alocați acestui șantier.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VEHICLES TAB */}
                    {activeTab === 'vehicles' && (
                        <div>
                            <h3 className="font-bold text-lg mb-4 border-b pb-2">Utilaje Alocate</h3>
                            {data.vehicles.length === 0 ? (
                                <p className="text-slate-500 italic py-4">Nu există utilaje alocate acestui șantier.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {data.vehicles.map(v => (
                                        <div key={v.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                                <Car className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{v.plate_number}</p>
                                                <p className="text-sm text-slate-500">{v.brand} {v.model}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* WAREHOUSE TAB */}
                    {activeTab === 'warehouse' && (
                        <div>
                            <h3 className="font-bold text-lg mb-4 border-b pb-2">Istoric Tranzacții Magazie / Materiale</h3>
                            {data.warehouse_transactions.length === 0 ? (
                                <p className="text-slate-500 italic py-4">Nu există tranzacții înregistrate în perioada selectată.</p>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4">Dată</th>
                                                <th className="px-6 py-4">Articol</th>
                                                <th className="px-6 py-4">Tip</th>
                                                <th className="px-6 py-4">Cantitate</th>
                                                <th className="px-6 py-4">Utilizator</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                            {data.warehouse_transactions.map(tx => (
                                                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-900 dark:text-white font-medium">
                                                        {new Date(tx.created_at).toLocaleString('ro-RO')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-blue-600 dark:text-blue-400">{tx.item_name}</span>
                                                        <br />
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">SKU: {tx.item_sku}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {tx.tx_type === 'out' 
                                                            ? <span className="px-2.5 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-xs font-bold">Ieșire</span>
                                                            : <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-xs font-bold">Intrare</span>
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{tx.quantity}</td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{tx.user_name}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ATTENDANCE TAB */}
                    {activeTab === 'attendance' && (
                        <div>
                            <h3 className="font-bold text-lg mb-4 border-b pb-2">Istoric Pontaj / Activitate</h3>
                            {data.attendance.length === 0 ? (
                                <p className="text-slate-500 italic py-4">Nu există activitate înregistrată în perioada selectată.</p>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4">Dată</th>
                                                <th className="px-6 py-4">Muncitor</th>
                                                <th className="px-6 py-4">Check In</th>
                                                <th className="px-6 py-4">Check Out</th>
                                                <th className="px-6 py-4">Activitate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                            {data.attendance.map(a => (
                                                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-900 dark:text-white font-medium">{new Date(a.date).toLocaleDateString('ro-RO')}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{a.user_name}</td>
                                                    <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-bold">
                                                        {a.check_in ? new Date(a.check_in).toLocaleTimeString('ro-RO', {hour: '2-digit', minute: '2-digit'}) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-red-600 dark:text-red-400 font-bold">
                                                        {a.check_out ? new Date(a.check_out).toLocaleTimeString('ro-RO', {hour: '2-digit', minute: '2-digit'}) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{a.activity_name}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PHOTOS TAB */}
                    {activeTab === 'photos' && (
                        <div>
                            <h3 className="font-bold text-lg mb-4 border-b pb-2">Galerie Foto</h3>
                            {data.photos.length === 0 ? (
                                <p className="text-slate-500 italic py-4">Nu există fotografii încărcate în perioada selectată.</p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {data.photos.map(p => (
                                        <div key={p.id} className="relative group rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                                            <img src={p.photo_path} alt="Site" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                                <p className="text-white text-xs font-medium">{new Date(p.created_at).toLocaleString('ro-RO')}</p>
                                                <p className="text-slate-200 text-xs truncate">de {p.uploader_name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
    )
}

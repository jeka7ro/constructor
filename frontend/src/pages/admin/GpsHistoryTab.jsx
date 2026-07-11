import React, { useState } from 'react'
import { Calendar, Truck, AlertTriangle, Download, Search, Loader2 } from 'lucide-react'
import axios from 'axios'

export default function GpsHistoryTab({ vehicles }) {
    const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
    const [selectedVehicle, setSelectedVehicle] = useState('all')
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState([])
    const [error, setError] = useState(null)

    const generateReport = async () => {
        try {
            setLoading(true)
            setError(null)
            setReportData([])

            const start = new Date(dateFrom)
            const end = new Date(dateTo)
            const diffTime = Math.abs(end - start)
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            if (diffDays > 7) {
                setError("Te rugăm să selectezi un interval de maxim 7 zile pentru a evita blocarea serverului.")
                setLoading(false)
                return
            }

            const datesToFetch = []
            let current = new Date(start)
            while (current <= end) {
                datesToFetch.push(current.toISOString().split('T')[0])
                current.setDate(current.getDate() + 1)
            }

            let allResults = []

            for (const d of datesToFetch) {
                const res = await axios.get(`/api/admin/gps-verification/daily?date=${d}&speed_limit=90`)
                const dayResults = res.data.results || []
                
                dayResults.forEach(r => {
                    if (selectedVehicle !== 'all' && r.vehicle_plate !== selectedVehicle && r.vehicle_name !== selectedVehicle) {
                        return
                    }

                    allResults.push({
                        date: d,
                        vehicle_name: r.vehicle_name,
                        vehicle_plate: r.vehicle_plate,
                        team_name: r.team_name,
                        team_color: r.team_color,
                        total_km: r.total_km,
                        max_speed: r.max_speed_kmh,
                        violations: r.speed_violations_count
                    })
                })
            }

            setReportData(allResults)
        } catch (err) {
            console.error("Error generating report", err)
            setError("Eroare la generarea raportului: " + (err.response?.data?.error || err.message))
        } finally {
            setLoading(false)
        }
    }

    const totalKm = reportData.reduce((acc, row) => acc + (row.total_km || 0), 0)
    const totalViolations = reportData.reduce((acc, row) => acc + (row.violations || 0), 0)

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row gap-4 items-end mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Data Început</label>
                    <input 
                        type="date" 
                        value={dateFrom} 
                        onChange={e => setDateFrom(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Data Sfârșit</label>
                    <input 
                        type="date" 
                        value={dateTo} 
                        onChange={e => setDateTo(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vehicul</label>
                    <select 
                        value={selectedVehicle}
                        onChange={e => setSelectedVehicle(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Toate vehiculele</option>
                        {vehicles.map(v => (
                            <option key={v.id} value={v.plate}>{v.name} ({v.plate})</option>
                        ))}
                    </select>
                </div>
                <div className="w-full md:w-auto">
                    <button 
                        onClick={generateReport}
                        disabled={loading}
                        className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Generează Raport
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {error}
                </div>
            )}

            {reportData.length > 0 && (
                <div className="mb-4 flex items-center gap-4 text-sm font-bold text-slate-600">
                    <span className="bg-slate-100 px-3 py-1 rounded-lg">Total Rânduri: {reportData.length}</span>
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">Total KM: {totalKm.toFixed(1)} km</span>
                    <span className="bg-red-50 text-red-700 px-3 py-1 rounded-lg">Total Încălcări: {totalViolations}</span>
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-4 py-3 font-bold border-b border-slate-200">Nr. Crt.</th>
                            <th className="px-4 py-3 font-bold border-b border-slate-200">Dată</th>
                            <th className="px-4 py-3 font-bold border-b border-slate-200">Vehicul</th>
                            <th className="px-4 py-3 font-bold border-b border-slate-200">Echipă</th>
                            <th className="px-4 py-3 font-bold border-b border-slate-200">Distanță (KM)</th>
                            <th className="px-4 py-3 font-bold border-b border-slate-200">Vit. Max</th>
                            <th className="px-4 py-3 font-bold border-b border-slate-200">Încălcări Viteză</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {reportData.length === 0 && !loading && (
                            <tr>
                                <td colSpan="7" className="px-4 py-8 text-center text-slate-400 font-medium">
                                    Niciun rezultat. Selectează intervalul și apasă pe "Generează Raport".
                                </td>
                            </tr>
                        )}
                        {loading && (
                            <tr>
                                <td colSpan="7" className="px-4 py-8 text-center text-blue-500 font-bold flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" /> Se extrag datele GPS...
                                </td>
                            </tr>
                        )}
                        {!loading && reportData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-500">{i + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-700">{row.date}</td>
                                <td className="px-4 py-3">
                                    <div className="font-bold text-slate-900">{row.vehicle_name}</div>
                                    <div className="text-xs text-slate-400">{row.vehicle_plate}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="inline-block px-2 py-1 rounded-md text-xs font-bold" style={{ backgroundColor: (row.team_color || '#ccc') + '30', color: row.team_color || '#666' }}>
                                        {row.team_name || 'Fără echipă'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-800">{row.total_km} km</td>
                                <td className="px-4 py-3 font-bold text-slate-800">
                                    <span className={row.max_speed > 90 ? 'text-red-600' : ''}>{row.max_speed} km/h</span>
                                </td>
                                <td className="px-4 py-3">
                                    {row.violations > 0 ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-md text-xs font-bold border border-red-100">
                                            <AlertTriangle className="w-3 h-3" /> {row.violations}
                                        </span>
                                    ) : (
                                        <span className="text-emerald-500 font-bold">0</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

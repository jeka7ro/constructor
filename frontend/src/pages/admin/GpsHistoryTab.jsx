import React, { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'

export default function GpsHistoryTab({ vehicles = [] }) {
    const today = new Date().toISOString().split('T')[0];
    const [dateFrom, setDateFrom] = useState(today)
    const [dateTo, setDateTo] = useState(today)
    const [selectedVehicle, setSelectedVehicle] = useState('all')
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState([])
    const [error, setError] = useState(null)

    const fetchReport = useCallback(async () => {
        const start = new Date(dateFrom)
        const end = new Date(dateTo)
        if (isNaN(start) || isNaN(end)) return;

        const diffTime = end - start
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            setError("Data de sfârșit trebuie să fie după data de început.")
            setReportData([])
            return
        }

        if (diffDays > 7) {
            setError("Te rugăm să selectezi un interval de maxim 7 zile pentru a evita blocarea serverului.")
            setReportData([])
            return
        }

        setLoading(true)
        setError(null)

        try {
            const datesToFetch = []
            let current = new Date(start)
            while (current <= end) {
                datesToFetch.push(current.toISOString().split('T')[0])
                current.setDate(current.getDate() + 1)
            }

            // Parallel fetch for up to 7 days
            const promises = datesToFetch.map(d => 
                api.get(`/admin/gps-verification/daily?date=${d}&speed_limit=90`, { validateStatus: () => true })
                   .catch(err => ({ data: { results: [], error: err.message }, status: 500 }))
            )

            const responses = await Promise.all(promises)
            
            let allResults = []
            
            responses.forEach((res, i) => {
                if (res.status === 401) {
                    throw new Error("Sesiune expirată sau token invalid.")
                }
                const dayResults = res.data?.results || []
                const date = datesToFetch[i]
                
                dayResults.forEach(r => {
                    if (selectedVehicle !== 'all' && r.vehicle_plate !== selectedVehicle && r.vehicle_name !== selectedVehicle) {
                        return
                    }

                    allResults.push({
                        date: date,
                        vehicle_name: r.vehicle_name,
                        vehicle_plate: r.vehicle_plate,
                        team_name: r.team_name,
                        team_color: r.team_color,
                        total_km: r.total_km,
                        max_speed: r.max_speed_kmh,
                        violations: r.speed_violations_count
                    })
                })
            })

            // Sort descending by date
            allResults.sort((a, b) => b.date.localeCompare(a.date))

            setReportData(allResults)
        } catch (err) {
            console.error("Error generating report", err)
            setError("Eroare la extragerea datelor: " + (err.response?.data?.error || err.message || "Eroare rețea"))
        } finally {
            setLoading(false)
        }
    }, [dateFrom, dateTo, selectedVehicle])

    // Auto-fetch at mount and whenever filters change
    useEffect(() => {
        fetchReport()
    }, [fetchReport])

    const totalKm = reportData.reduce((acc, row) => acc + (row.total_km || 0), 0)
    const totalViolations = reportData.reduce((acc, row) => acc + (row.violations || 0), 0)

    const columns = [
        {
            key: 'index',
            label: 'Nr. Crt.',
            render: (row, idx) => <span className="text-slate-500 font-medium">{idx + 1}</span>
        },
        {
            key: 'date',
            label: 'Dată',
            sortable: true,
            render: row => <span className="font-bold text-slate-700">{row.date}</span>
        },
        {
            key: 'vehicle',
            label: 'Vehicul',
            sortable: true,
            sortValue: row => row.vehicle_name,
            render: row => (
                <div>
                    <div className="font-bold text-slate-900">{row.vehicle_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{row.vehicle_plate}</div>
                </div>
            )
        },
        {
            key: 'team',
            label: 'Echipă',
            sortable: true,
            sortValue: row => row.team_name,
            render: row => (
                <span className="inline-block px-2 py-1 rounded-md text-xs font-bold" style={{ backgroundColor: (row.team_color || '#ccc') + '20', color: row.team_color || '#666' }}>
                    {row.team_name || 'Fără echipă'}
                </span>
            )
        },
        {
            key: 'total_km',
            label: 'Distanță (KM)',
            sortable: true,
            render: row => <span className="font-bold text-slate-800">{row.total_km} km</span>
        },
        {
            key: 'max_speed',
            label: 'Vit. Max',
            sortable: true,
            render: row => (
                <span className={`font-bold ${row.max_speed > 90 ? 'text-red-600' : 'text-slate-800'}`}>
                    {row.max_speed} km/h
                </span>
            )
        },
        {
            key: 'violations',
            label: 'Încălcări Viteză',
            sortable: true,
            render: row => (
                row.violations > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-md text-xs font-bold border border-red-100">
                        <AlertTriangle className="w-3 h-3" /> {row.violations}
                    </span>
                ) : (
                    <span className="text-emerald-500 font-bold">0</span>
                )
            )
        }
    ]

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 mt-6">
            {/* Filtre */}
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
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {error}
                </div>
            )}

            {/* Sumare rapide */}
            {reportData.length > 0 && !loading && (
                <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-bold text-slate-600">
                    <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        Total Rânduri: <span className="text-slate-800">{reportData.length}</span>
                    </span>
                    <span className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        Total KM: <span className="text-blue-700">{totalKm.toFixed(1)} km</span>
                    </span>
                    <span className="bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                        Total Încălcări: <span className="text-red-700">{totalViolations}</span>
                    </span>
                </div>
            )}

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white">
                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm font-bold">Se extrag datele GPS... poate dura câteva secunde.</p>
                    </div>
                ) : (
                    <DataTable 
                        columns={columns} 
                        data={reportData} 
                        defaultPageSize={25}
                        emptyText="Niciun rezultat găsit pentru filtrele selectate."
                        searchable={true}
                        searchPlaceholder="Caută după vehicul sau echipă..."
                    />
                )}
            </div>
        </div>
    )
}

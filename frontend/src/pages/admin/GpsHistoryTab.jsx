import React, { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'

export default function GpsHistoryTab({ vehicles = [] }) {
    const navigate = useNavigate()
    const { t } = useTranslation()
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
            setError(t('gps.error_end_date_before_start', "La date de fin doit être après la date de début."))
            setReportData([])
            return
        }

        if (diffDays > 7) {
            setError(t('gps.error_max_7_days', "Veuillez sélectionner un intervalle de maximum 7 jours pour éviter de bloquer le serveur."))
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
                    throw new Error(t('gps.error_session_expired', "Session expirée ou jeton invalide."))
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
            setError(t('gps.error_fetch_prefix', "Erreur lors de l'extraction des données : ") + (err.response?.data?.error || err.message || t('gps.error_network', "Erreur réseau")))
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
            key: 'date',
            label: t('gps.date', 'Date'),
            sortable: true,
            render: row => <span className="font-bold text-slate-700">{row.date}</span>
        },
        {
            key: 'vehicle',
            label: t('gps.vehicle', 'Véhicule'),
            sortable: true,
            sortValue: row => row.vehicle_name,
            render: row => (
                <div>
                    <div className="font-bold text-slate-900">{row.vehicle_name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{row.vehicle_plate}</div>
                </div>
            )
        },
        {
            key: 'team',
            label: t('gps.team', 'Équipe'),
            sortable: true,
            sortValue: row => row.team_name,
            render: row => (
                <span className="font-semibold text-slate-700">
                    {row.team_name || t('gps.no_team', 'Sans équipe')}
                </span>
            )
        },
        {
            key: 'total_km',
            label: t('gps.route_km', 'KM Trajet'),
            sortable: true,
            render: row => <span className="font-bold text-slate-800">{row.total_km} km</span>
        },
        {
            key: 'max_speed',
            label: t('gps.max_speed', 'Vit. Max'),
            sortable: true,
            render: row => (
                <span className={`font-bold ${row.max_speed > 90 ? 'text-red-600' : 'text-slate-800'}`}>
                    {row.max_speed} km/h
                </span>
            )
        },
        {
            key: 'violations',
            label: t('gps.speed_violations_count', 'Excès de Vitesse'),
            sortable: true,
            render: row => (
                row.violations > 0 ? (
                    <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                        <AlertTriangle className="w-3 h-3" /> {row.violations}
                    </span>
                ) : (
                    <span className="text-emerald-500 font-bold">0</span>
                )
            )
        }
    ]

    return (
        <div className="mt-6">
            {/* Filtre */}
            <div className="flex flex-col md:flex-row gap-4 items-end mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('gps.start_date', 'Date de Début')}</label>
                    <input 
                        type="date" 
                        value={dateFrom} 
                        onChange={e => setDateFrom(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                        style={{ appearance: 'none', WebkitAppearance: 'none' }}
                    />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('gps.end_date', 'Date de Fin')}</label>
                    <input 
                        type="date" 
                        value={dateTo} 
                        onChange={e => setDateTo(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                        style={{ appearance: 'none', WebkitAppearance: 'none' }}
                    />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('gps.vehicle', 'Véhicule')}</label>
                    <select 
                        value={selectedVehicle}
                        onChange={e => setSelectedVehicle(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                    >
                        <option value="all">{t('gps.all_vehicles', 'Tous les véhicules')}</option>
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
                        {t('gps.total_rows', 'Total Lignes')}: <span className="text-slate-800">{reportData.length}</span>
                    </span>
                    <span className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        {t('gps.total_km', 'Total KM')}: <span className="text-blue-700">{totalKm.toFixed(1)} km</span>
                    </span>
                    <span className="bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                        {t('gps.total_violations', 'Total Infractions')}: <span className="text-red-700">{totalViolations}</span>
                    </span>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white shadow-sm">
                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm font-bold">{t('gps.extracting_data', 'Extraction des données GPS... cela peut prendre quelques secondes.')}</p>
                    </div>
                ) : (
                    <DataTable 
                        columns={columns} 
                        data={reportData} 
                        defaultPageSize={25}
                        emptyText={t('gps.no_results', 'Aucun résultat trouvé pour les filtres sélectionnés.')}
                        searchable={true}
                        searchPlaceholder={t('gps.search_placeholder', 'Rechercher par véhicule ou équipe...')}
                        onRowClick={row => navigate(`/admin/logistica/gps-verification?date=${row.date}&vehicle=${row.vehicle_plate}`)}
                    />
                )}
            </div>
        </div>
    )
}

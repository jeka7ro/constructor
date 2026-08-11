import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import {
    Navigation, Truck, Clock, AlertTriangle,
    CheckCircle2, XCircle, MapPin, RefreshCw,
    Loader2, ChevronDown, ChevronUp, ArrowLeft,
    ChevronLeft, ChevronRight, Beaker, BarChart3
} from 'lucide-react'
import api from '../../../lib/api'
import DataTable from '../../../components/DataTable'
import MiniLiveTrackingMap from '../../../components/MiniLiveTrackingMap'

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Leaflet icon fix (guard: run only once even if LogisticsDashboard already did it)
if (L.Icon.Default.prototype._getIconUrl) {
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
        iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
        shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
    })
}

function MapFitter({ all }) {
    const map = useMap()
    useEffect(() => {
        if (all.length >= 2) {
            try {
                const bounds = L.latLngBounds(all)
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
            } catch (e) {
                // ignore invalid bounds
            }
        }
    }, [all, map])
    return null
}

function MapResizer({ isFullscreen }) {
    const map = useMap()
    useEffect(() => {
        const t = setTimeout(() => {
            map.invalidateSize()
        }, 100)
        return () => clearTimeout(t)
    }, [isFullscreen, map])
    return null
}

function speedColor(speed) {
    if (speed < 30) return '#22c55e'
    if (speed < 70) return '#3b82f6'
    if (speed < 90) return '#f59e0b'
    return '#ef4444'
}

function StatusBadge({ status, delay_min }) {
    const { t } = useTranslation()
    const configs = {
        on_time:      { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle2, label: delay_min <= 0 ? t('gps.on_time', "A l'heure") : `+${delay_min} min` },
        late:         { cls: 'bg-amber-100 text-amber-700 border-amber-200',       Icon: Clock,        label: `+${delay_min} min` },
        very_late:    { cls: 'bg-red-100 text-red-700 border-red-200',             Icon: AlertTriangle, label: `+${delay_min} min` },
        not_detected: { cls: 'bg-slate-100 text-slate-500 border-slate-200',       Icon: XCircle,      label: t('gps.not_detected', 'Non detecte') },
        arrived:      { cls: 'bg-blue-100 text-blue-700 border-blue-200',          Icon: CheckCircle2, label: t('gps.present', 'Present') },
        no_data:      { cls: 'bg-slate-100 text-slate-400 border-slate-200',       Icon: XCircle,      label: t('gps.no_data', 'Sans donnees') },
    }
    const cfg = configs[status] || configs.no_data
    const Icon = cfg.Icon
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    )
}

import VehicleCard from '../../../components/GpsVehicleCard'


export default function GpsVerificationPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const urlDate = searchParams.get('date')
    const urlVehicle = searchParams.get('vehicle')

    const today = new Date().toISOString().slice(0, 10)
    const [date, setDate] = useState(urlDate || today)
    const [speedLimit, setSpeedLimit] = useState(90)
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            let endpoint = `/admin/gps-verification/daily?date=${date}&speed_limit=${speedLimit}`;
            if (urlVehicle) endpoint += `&vehicle=${encodeURIComponent(urlVehicle)}`;
            
            const res = await api.get(endpoint, {
                validateStatus: () => true,   // previne interceptorul de redirect
                timeout: 90000,
            })
            if (res.status === 401) {
                setError('Session expiree. Reconnectez-vous.')
                return
            }
            if (res.status >= 400) {
                setError(res.data?.detail || `Erreur ${res.status}`)
                return
            }
            setData(res.data)
        } catch (e) {
            setError(e.message || 'Erreur reseau')
        } finally {
            setLoading(false)
        }
    }, [date, speedLimit, urlVehicle])

    useEffect(() => { load() }, [load])

    // Auto-refresh silent for today's data (Live view)
    useEffect(() => {
        if (date === today) {
            const intervalId = setInterval(() => {
                let endpoint = `/admin/gps-verification/daily?date=${date}&speed_limit=${speedLimit}`;
                if (urlVehicle) endpoint += `&vehicle=${encodeURIComponent(urlVehicle)}`;
                
                api.get(endpoint, {
                    validateStatus: () => true,
                    timeout: 20000,
                }).then(res => {
                    if (res.status === 200) setData(res.data)
                }).catch(() => {})
            }, 30000) // 30 seconds
            return () => clearInterval(intervalId)
        }
    }, [date, today, speedLimit, urlVehicle])

    const filteredResults = data?.results?.filter(r => urlVehicle ? r.vehicle_plate === urlVehicle : true) || []
    const totalViolations = filteredResults.reduce((s, r) => s + r.speed_violations_count, 0)
    const totalKm = filteredResults.reduce((s, r) => s + r.total_km, 0)
    const vehiclesWithData = filteredResults.filter(r => r.gps_points > 0).length

    return (
        <div className="p-4 md:p-8 min-h-screen">
            {/* Header with tab navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/admin/logistica')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        title="Retour Logistique"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    {/* Tab bar — same as LogisticsDashboard */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                        <Link
                            to="/admin/logistica/bases"
                            className="px-4 h-9 flex items-center gap-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
                        >
                            <MapPin className="w-4 h-4" /> {t('logistics.bases', 'Bases')}
                        </Link>
                        <Link
                            to="/admin/logistica/sand-stations"
                            className="px-4 h-9 flex items-center gap-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
                        >
                            <Beaker className="w-4 h-4" /> {t('logistics.sand_stations', 'Stations de Sable')}
                        </Link>
                        <Link
                            to="/admin/logistica/raport"
                            className="px-4 h-9 flex items-center gap-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
                        >
                            <BarChart3 className="w-4 h-4" /> {t('logistics.report', 'Rapport')}
                        </Link>
                        {/* Active tab — GPS Verification */}
                        <div className="px-4 h-9 flex items-center gap-2 rounded-full bg-white dark:bg-slate-700 shadow-sm text-sm font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                            <Navigation className="w-4 h-4" /> Vérif. GPS
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white px-3 h-10 rounded-xl border border-slate-200" title="Utilise quand la limite legale n'est pas trouvee">
                        <span className="text-xs text-slate-500 mr-2 font-medium">Defaut/Autoroute:</span>
                        <input
                            type="number"
                            value={speedLimit}
                            onChange={(e) => setSpeedLimit(Number(e.target.value))}
                            className="w-12 text-sm font-bold bg-transparent outline-none text-right"
                            min="30" max="150"
                        />
                        <span className="text-xs text-slate-500 ml-1">km/h</span>
                    </div>
                    <button
                        onClick={() => {
                            // Timezone-safe: manipulate ISO string directly
                            const [y, m, d] = date.split('-').map(Number);
                            const dt = new Date(y, m - 1, d - 1);
                            setDate(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`);
                        }}
                        className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                        title="Jour précédent"
                    >
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                    </button>
                    <input
                        type="date"
                        value={date}
                        max={today}
                        onChange={e => setDate(e.target.value)}
                        className="px-4 h-10 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                        onClick={() => {
                            const [y, m, d] = date.split('-').map(Number);
                            const dt = new Date(y, m - 1, d + 1);
                            const next = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                            if (next <= today) setDate(next);
                        }}
                        className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                        title="Jour suivant"
                    >
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPIs */}
            {data && !loading && (
                <div className="grid grid-cols-3 gap-5">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{t('gps.active_vehicles', 'Vehicules actifs')}</p>
                        <p className="text-2xl font-bold text-slate-700">{vehiclesWithData}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{t('gps.total_km', 'KM total')}</p>
                        <p className="text-2xl font-bold text-slate-700">{totalKm.toFixed(1)}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${totalViolations > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {t('gps.speed_excess', 'Exces vitesse')}
                        </p>
                        <p className={`text-2xl font-bold ${totalViolations > 0 ? 'text-red-600' : 'text-slate-700'}`}>{totalViolations}</p>
                    </div>
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">{t('gps.fetching', 'Récupération des données GPS en cours...')}</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {!loading && data?.results && (
                <div className="space-y-5 mt-6">
                    {/* Live Tracking Map ca primul card */}
                    {!urlVehicle && date === today && (
                        <div className="h-[400px] w-full rounded-2xl shadow-sm border border-slate-200 overflow-hidden bg-white mb-6">
                            <MiniLiveTrackingMap />
                        </div>
                    )}

                    {filteredResults.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>{t('gps.no_vehicles', 'Aucun vehicule avec IMEI configure ou correspondant au filtre.')}</p>
                        </div>
                    ) : (
                        filteredResults.map(result => (
                            <VehicleCard key={result.vehicle_id} result={result} speedLimit={speedLimit} />

                        ))
                    )}
                </div>
            )}
        </div>
    )
}

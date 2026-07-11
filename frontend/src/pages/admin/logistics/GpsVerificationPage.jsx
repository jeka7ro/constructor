import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import {
    Navigation, Truck, Clock, AlertTriangle,
    CheckCircle2, XCircle, MapPin, RefreshCw,
    Loader2, ChevronDown, ChevronUp
} from 'lucide-react'
import api from '../../../lib/api'

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

function VehicleCard({ result }) {
    const { t } = useTranslation()
    const [expanded, setExpanded] = useState(true)
    const [showMap, setShowMap] = useState(false)
    const [isMapFullscreen, setIsMapFullscreen] = useState(false)

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isMapFullscreen) {
                setIsMapFullscreen(false)
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [isMapFullscreen])

    // Calculate vehicle status (In Miscare vs Stationeaza)
    const lastPoint = result.track && result.track.length > 0 ? result.track[result.track.length - 1] : null;
    const isRecentlyUpdated = lastPoint ? (Date.now() / 1000 - lastPoint.ts) < 900 : false; // within 15 minutes
    const isMoving = isRecentlyUpdated && lastPoint.speed > 0;

    const trackPoints = result.track.map(p => [p.lat, p.lng])
    const sitePoints = result.work_orders.filter(wo => wo.site_lat && wo.site_lng)

    const segments = []
    for (let i = 0; i < result.track.length - 1; i++) {
        const p1 = result.track[i];
        const p2 = result.track[i + 1];
        // Break the line if there's a gap of more than 30 minutes (1800s)
        if (p2.ts - p1.ts < 1800) {
            segments.push({
                positions: [[p1.lat, p1.lng], [p2.lat, p2.lng]],
                color: speedColor(p1.speed),
            })
        }
    }

    const allMapPoints = [
        ...trackPoints,
        ...sitePoints.map(s => [s.site_lat, s.site_lng]),
    ]

    const dotIcon = (color) => L.divIcon({
        className: '',
        html: `<div style="width:24px;height:24px;background:${color || '#3b82f6'};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    })

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                style={{ borderLeft: `4px solid ${result.team_color || '#64748b'}` }}
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: (result.team_color || '#64748b') + '20' }}>
                        <Truck className="w-5 h-5" style={{ color: result.team_color || '#64748b' }} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">
                                {result.vehicle_name}
                                <span className="text-slate-400 font-normal text-xs ml-1">({result.vehicle_plate})</span>
                            </p>
                            {lastPoint && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isMoving ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {isMoving ? 'En mouvement' : 'En stationnement'}
                                </span>
                            )}
                        </div>
                        <p className="text-xs font-semibold" style={{ color: result.team_color || '#64748b' }}>{result.team_name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-700">{result.total_km} km</p>
                        <p className="text-xs text-slate-400">{result.gps_points} pts GPS</p>
                    </div>
                    {result.speed_violations_count > 0 && (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            {result.speed_violations_count} {t('gps.violations', 'exces')}
                        </span>
                    )}
                    <div className="text-slate-400">
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="p-4 space-y-4 border-t border-slate-100">
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-400 mb-1">{t('gps.distance', 'Distance')}</p>
                            <p className="text-lg font-bold text-slate-800">{result.total_km} <span className="text-xs font-normal">km</span></p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-400 mb-1">{t('gps.max_speed', 'Vit. max')}</p>
                            <p className={`text-lg font-bold ${result.max_speed_kmh > 90 ? 'text-red-600' : 'text-slate-800'}`}>
                                {result.max_speed_kmh} <span className="text-xs font-normal">km/h</span>
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-400 mb-1">Vitesse actuelle</p>
                            <p className={`text-lg font-bold ${isMoving ? 'text-blue-600' : 'text-slate-400'}`}>
                                {isMoving ? lastPoint.speed : 0} <span className="text-xs font-normal">km/h</span>
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-400 mb-1">{t('gps.speed_excess', 'Exces vitesse')}</p>
                            <p className={`text-lg font-bold ${result.speed_violations_count > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {result.speed_violations_count}
                            </p>
                        </div>
                    </div>

                    {/* Itinerar Chronologic */}
                    {result.itinerary && result.itinerary.length > 0 && (
                        <div className="mb-6">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                                {t('gps.chronological_itinerary', 'Itineraire Chronologique')}
                            </p>
                            <div className="relative border-l-2 border-slate-200 ml-3 space-y-5">
                                {result.itinerary.map((step, i) => (
                                    <div key={i} className="relative pl-5">
                                        <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white shadow-sm ${step.type === 'base' ? 'bg-indigo-500' : 'bg-blue-500'}`} />
                                        <div className="text-sm font-bold text-slate-800 flex flex-wrap items-center gap-2">
                                            <span>{step.name}</span>
                                            {step.type === 'base' && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Base</span>}
                                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                {step.arrived || '--:--'} {'->'} {step.departed || '--:--'}
                                                {step.duration_min > 0 && ` (${step.duration_min} min)`}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{step.address}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Chantiere planificate */}
                    {result.work_orders.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                                {t('gps.planned_vs_real', 'Chantiers planifies vs reel')}
                            </p>
                            <div className="space-y-2">
                                {result.work_orders.map(wo => (
                                    <div key={wo.id} className="bg-slate-50 rounded-xl p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">{wo.client_name}</p>
                                                <p className="text-xs text-slate-500 truncate">{wo.site_address}</p>
                                            </div>
                                            <StatusBadge status={wo.status} delay_min={wo.delay_min} />
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                <span className="text-slate-400">{t('gps.planned', 'Prevu')}:</span>
                                                <strong>{wo.planned_time || '—'}</strong>
                                            </span>
                                            {wo.arrived && (
                                                <span className="flex items-center gap-1">
                                                    <Navigation className="w-3 h-3 text-blue-400" />
                                                    <span className="text-slate-400">{t('gps.arrived', 'Arrive')}:</span>
                                                    <strong className="text-blue-700">{wo.arrived}</strong>
                                                </span>
                                            )}
                                            {wo.departed && (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-slate-400">{t('gps.departure', 'Depart')}:</span>
                                                    <strong>{wo.departed}</strong>
                                                </span>
                                            )}
                                            {wo.time_on_site_min != null && (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-slate-400">{t('gps.on_site', 'Sur place')}:</span>
                                                    <strong>{wo.time_on_site_min} min</strong>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Exces viteza */}
                    {result.speed_violations_count > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-red-500 mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {t('gps.speed_violations', 'Exces de vitesse (au-dela de la limite)')}
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {result.speed_violations.slice(0, 10).map((v, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-600">{v.time}</span>
                                        <span className="font-bold text-red-600">{v.speed} <span className="text-red-400 font-normal">/ {v.limit} km/h</span></span>
                                        <span className="text-red-400">+{v.excess} km/h</span>
                                    </div>
                                ))}
                                {result.speed_violations_count > 10 && (
                                    <p className="text-xs text-red-400 text-center pt-1">
                                        +{result.speed_violations_count - 10} {t('gps.more', 'autres')}...
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Buton harta */}
                    {trackPoints.length >= 2 && (
                        <div>
                            <button
                                onClick={() => setShowMap(m => !m)}
                                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl py-2 hover:bg-blue-100 transition-colors"
                            >
                                <MapPin className="w-3.5 h-3.5" />
                                {showMap ? t('gps.hide_map', 'Masquer la carte') : t('gps.show_map', 'Voir le trace GPS sur la carte')}
                            </button>

                            {showMap && (
                                (() => {
                                    const mapContent = (
                                        <div className={isMapFullscreen ? "fixed inset-0 z-[99999] bg-white flex flex-col" : "mt-3 rounded-xl overflow-hidden border border-slate-200 relative"}>
                                            {isMapFullscreen && (
                                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shadow-sm shrink-0">
                                                    <div className="font-bold text-slate-800 flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-blue-600" /> Trace GPS: {result.vehicle_name}
                                                    </div>
                                                    <button onClick={() => setIsMapFullscreen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">
                                                        Fermer
                                                    </button>
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                                                className={`absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors`}
                                                style={{ zIndex: 99999 }}
                                                title={isMapFullscreen ? "Reduire" : "Plein ecran"}
                                            >
                                                {isMapFullscreen ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                                                )}
                                            </button>
                                            <div style={{ height: isMapFullscreen ? '100vh' : 340 }} className="flex-1 w-full min-h-0">
                                                <MapContainer center={[sitePoints[0]?.site_lat || trackPoints[0]?.[0] || 50.85, sitePoints[0]?.site_lng || trackPoints[0]?.[1] || 4.35]} zoom={11} className={`w-full h-full ${!isMapFullscreen && 'rounded-b-xl'}`} scrollWheelZoom={isMapFullscreen}>
                                                    <MapResizer isFullscreen={isMapFullscreen} />
                                                    <TileLayer
                                                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                                attribution="&copy; Google Maps"
                                                maxZoom={20}
                                            />
                                            <MapFitter all={allMapPoints} />

                                            {segments.map((seg, i) => (
                                                <Polyline key={i} positions={seg.positions} color={seg.color} weight={4} opacity={0.85} />
                                            ))}

                                            {sitePoints.map(wo => (
                                                <Marker
                                                    key={wo.id}
                                                    position={[wo.site_lat, wo.site_lng]}
                                                    icon={dotIcon(result.team_color)}
                                                >
                                                    <Popup>
                                                        <div style={{ fontSize: 12 }}>
                                                            <strong>{wo.client_name}</strong><br />
                                                            <span style={{ color: '#64748b' }}>{wo.site_address}</span><br />
                                                            {t('gps.planned', 'Prevu')}: <strong>{wo.planned_time}</strong><br />
                                                            {wo.arrived && <>{t('gps.arrived', 'Arrive')}: <strong style={{ color: '#2563eb' }}>{wo.arrived}</strong><br /></>}
                                                            {wo.departed && <>{t('gps.departure', 'Depart')}: <strong>{wo.departed}</strong></>}
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            ))}

                                            {trackPoints.length > 0 && (
                                                <CircleMarker center={trackPoints[0]} radius={7} color="#22c55e" fillColor="#22c55e" fillOpacity={1}>
                                                    <Popup>
                                                        <div style={{ fontSize: 11, fontWeight: 'bold', color: '#16a34a' }}>
                                                            Depart: {result.track[0]?.time_local}<br/>
                                                            Vitesse: {result.track[0]?.speed} km/h
                                                        </div>
                                                    </Popup>
                                                </CircleMarker>
                                            )}
                                            {trackPoints.length > 1 && (
                                                <CircleMarker center={trackPoints[trackPoints.length - 1]} radius={7} color="#ef4444" fillColor="#ef4444" fillOpacity={1}>
                                                    <Popup>
                                                        <div style={{ fontSize: 11, fontWeight: 'bold', color: '#dc2626' }}>
                                                            Fin / Actuel: {result.track[result.track.length - 1]?.time_local}<br/>
                                                            Vitesse: {result.track[result.track.length - 1]?.speed} km/h
                                                        </div>
                                                    </Popup>
                                                </CircleMarker>
                                            )}
                                        </MapContainer>
                                    </div>
                                    <div className="flex items-center justify-center gap-4 py-2 bg-slate-50 text-[10px] font-semibold border-t border-slate-100">
                                        <span className="flex items-center gap-1.5"><span className="w-4 h-1.5 rounded-full bg-green-500 inline-block" /> &lt;30 km/h</span>
                                        <span className="flex items-center gap-1.5"><span className="w-4 h-1.5 rounded-full bg-blue-500 inline-block" /> 30-70</span>
                                        <span className="flex items-center gap-1.5"><span className="w-4 h-1.5 rounded-full bg-amber-500 inline-block" /> 70-90</span>
                                        <span className="flex items-center gap-1.5"><span className="w-4 h-1.5 rounded-full bg-red-500 inline-block" /> &gt;90 km/h</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {trackPoints.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-sm">
                            <Navigation className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>{t('gps.no_gps_data', 'Aucune donnee GPS pour cette date.')}</p>
                            <p className="text-xs mt-1">{t('gps.no_gps_hint', 'Le vehicule etait peut-etre gare ou hors reseau.')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function GpsVerificationPage() {
    const { t } = useTranslation()
    const today = new Date().toISOString().slice(0, 10)
    const [date, setDate] = useState(today)
    const [speedLimit, setSpeedLimit] = useState(90)
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await api.get(`/admin/gps-verification/daily?date=${date}&speed_limit=${speedLimit}`, {
                validateStatus: () => true,   // previne interceptorul de redirect
                timeout: 30000,
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
    }, [date, speedLimit])

    useEffect(() => { load() }, [load])

    // Auto-refresh silent for today's data (Live view)
    useEffect(() => {
        if (date === today) {
            const intervalId = setInterval(() => {
                api.get(`/admin/gps-verification/daily?date=${date}&speed_limit=${speedLimit}`, {
                    validateStatus: () => true,
                    timeout: 20000,
                }).then(res => {
                    if (res.status === 200) setData(res.data)
                }).catch(() => {})
            }, 30000) // 30 seconds
            return () => clearInterval(intervalId)
        }
    }, [date, today, speedLimit])

    const totalViolations = data?.results?.reduce((s, r) => s + r.speed_violations_count, 0) || 0
    const totalKm = data?.results?.reduce((s, r) => s + r.total_km, 0) || 0
    const vehiclesWithData = data?.results?.filter(r => r.gps_points > 0).length || 0

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-blue-600" />
                        {t('gps.verification_title', 'Verification GPS')}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {t('gps.verification_subtitle', 'Comparaison planning prevu vs trace GPS reel')}
                    </p>
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
                    <input
                        type="date"
                        value={date}
                        max={today}
                        onChange={e => setDate(e.target.value)}
                        className="px-4 h-10 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
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
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                        <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">{t('gps.active_vehicles', 'Vehicules actifs')}</p>
                        <p className="text-2xl font-bold text-blue-700">{vehiclesWithData}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{t('gps.total_km', 'KM total')}</p>
                        <p className="text-2xl font-bold text-slate-700">{totalKm.toFixed(1)}</p>
                    </div>
                    <div className={`border rounded-2xl p-4 text-center ${totalViolations > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${totalViolations > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {t('gps.speed_excess', 'Exces vitesse')}
                        </p>
                        <p className={`text-2xl font-bold ${totalViolations > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{totalViolations}</p>
                    </div>
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">{t('gps.fetching', 'Recuperation des donnees GPS Flespi...')}</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {!loading && data?.results && (
                <div className="space-y-4">
                    {data.results.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>{t('gps.no_vehicles', 'Aucun vehicule avec IMEI configure.')}</p>
                        </div>
                    ) : (
                        data.results.map(result => (
                            <VehicleCard key={result.vehicle_id} result={result} />
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

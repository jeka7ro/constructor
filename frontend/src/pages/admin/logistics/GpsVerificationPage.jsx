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

function VehicleCard({ result, speedLimit = 90 }) {
    const { t } = useTranslation()
    const [expanded, setExpanded] = useState(true)
    const [showMap, setShowMap] = useState(false)
    const [isMapFullscreen, setIsMapFullscreen] = useState(false)
    const [focusedTrip, setFocusedTrip] = useState(null)
    const [matchedPolyline, setMatchedPolyline] = useState(null)
    const [isMatchingRoute, setIsMatchingRoute] = useState(false)

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isMapFullscreen) {
                setIsMapFullscreen(false)
                setFocusedTrip(null)
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [isMapFullscreen])
    // OSRM Map Matching: snapare GPS pe drumuri reale
    useEffect(() => {
        const pointsToMatch = focusedTrip || result.track
        if (!showMap || !pointsToMatch || pointsToMatch.length < 2) {
            setMatchedPolyline(null)
            return
        }
        let cancelled = false
        setIsMatchingRoute(true)
        setMatchedPolyline(null)

        const fetchMatch = async () => {
            // OSRM max 100 puncte
            const sampled = pointsToMatch.length > 100
                ? pointsToMatch.filter((_, i) => i % Math.ceil(pointsToMatch.length / 100) === 0)
                : pointsToMatch
            const coords = sampled.map(p => `${p.lng},${p.lat}`).join(';')
            const radiuses = sampled.map(() => '50').join(';')
            try {
                const resp = await fetch(
                    `https://router.project-osrm.org/match/v1/driving/${coords}?overview=full&geometries=geojson&radiuses=${radiuses}`
                )
                if (!resp.ok || cancelled) return
                const data = await resp.json()
                if (cancelled) return
                if (data.matchings?.length > 0) {
                    const allCoords = data.matchings.flatMap(m =>
                        m.geometry.coordinates.map(([lng, lat]) => [lat, lng])
                    )
                    setMatchedPolyline(allCoords)
                }
            } catch (e) {
                if (!cancelled) console.warn('OSRM match failed, using raw GPS:', e)
            } finally {
                if (!cancelled) setIsMatchingRoute(false)
            }
        }
        fetchMatch()
        return () => { cancelled = true; setIsMatchingRoute(false) }
    }, [showMap, focusedTrip])

    const firstPoint = result.track && result.track.length > 0 ? result.track[0] : null;
    const lastPoint = result.track && result.track.length > 0 ? result.track[result.track.length - 1] : null;
    const isRecentlyUpdated = lastPoint ? (Date.now() / 1000 - lastPoint.ts) < 900 : false; // within 15 minutes
    const isMoving = isRecentlyUpdated && lastPoint.speed > 0;

    let durationStr = '--';
    if (firstPoint && lastPoint) {
        const diffMin = Math.round((lastPoint.ts - firstPoint.ts) / 60);
        const h = Math.floor(diffMin / 60);
        const m = diffMin % 60;
        durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    const trackPoints = result.track.map(p => [p.lat, p.lng])
    const sitePoints = result.work_orders.filter(wo => wo.site_lat && wo.site_lng)

    const trips = []
    if (result.track && result.track.length > 0) {
        let currentTrip = [result.track[0]]
        for (let i = 1; i < result.track.length; i++) {
            const p1 = result.track[i - 1]
            const p2 = result.track[i]
            if (p2.ts - p1.ts > 1800) { // 30 min gap
                trips.push(currentTrip)
                currentTrip = [p2]
            } else {
                currentTrip.push(p2)
            }
        }
        trips.push(currentTrip)
    }

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

    const handleTripClick = (trip, tripIndex) => {
        trip.index = tripIndex;
        setFocusedTrip(trip);
        setShowMap(true);
        setIsMapFullscreen(true);
    };

    // displaySegments: prefer matched OSRM polyline, fallback la raw GPS segments
    let displaySegments
    if (matchedPolyline && matchedPolyline.length > 1) {
        displaySegments = [{ positions: matchedPolyline, color: result.team_color || '#3b82f6' }]
    } else {
        displaySegments = segments
    }
    let displayPoints = allMapPoints;
    let displayStartPoint = trackPoints.length > 0 ? trackPoints[0] : null;
    let displayEndPoint = trackPoints.length > 1 ? trackPoints[trackPoints.length - 1] : null;
    let displayStartTime = result.track?.[0]?.time_local;
    let displayStartSpeed = result.track?.[0]?.speed;
    let displayEndTime = result.track?.[result.track.length - 1]?.time_local;
    let displayEndSpeed = result.track?.[result.track.length - 1]?.speed;
    let focusedTripDetails = null;

    if (focusedTrip) {
        displaySegments = [];
        let distKm = 0;
        let maxSpeed = 0;
        
        for (let i = 0; i < focusedTrip.length - 1; i++) {
            if (focusedTrip[i].speed > maxSpeed) maxSpeed = focusedTrip[i].speed;
            distKm += haversineKm(focusedTrip[i].lat, focusedTrip[i].lng, focusedTrip[i+1].lat, focusedTrip[i+1].lng);
            
            displaySegments.push({
                positions: [[focusedTrip[i].lat, focusedTrip[i].lng], [focusedTrip[i+1].lat, focusedTrip[i+1].lng]],
                color: speedColor(focusedTrip[i].speed),
            });
        }
        if (focusedTrip.length > 0 && focusedTrip[focusedTrip.length - 1].speed > maxSpeed) {
             maxSpeed = focusedTrip[focusedTrip.length - 1].speed;
        }

        const first = focusedTrip[0];
        const last = focusedTrip[focusedTrip.length - 1];
        const violations = focusedTrip.filter(pt => pt.speed > speedLimit).length
        
        let durationStr = '--';
        const diffMin = Math.round((last.ts - first.ts) / 60);
        const h = Math.floor(diffMin / 60);
        const m = diffMin % 60;
        durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

        focusedTripDetails = {
            maxSpeed: maxSpeed.toFixed(1),
            distance: distKm.toFixed(1),
            violations: violations,
            duration: durationStr
        };

        displayPoints = focusedTrip.map(p => [p.lat, p.lng]);
        displayStartPoint = [first.lat, first.lng];
        displayEndPoint = [last.lat, last.lng];
        displayStartTime = first.time_local;
        displayStartSpeed = first.speed;
        displayEndTime = last.time_local;
        displayEndSpeed = last.speed;
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 group">
            {/* Colored accent left bar + header */}
            <div
                className="flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors"
                style={{ borderLeft: `4px solid ${result.team_color || '#64748b'}` }}
                onClick={() => setExpanded(e => !e)}
            >
                {/* Left: icon + info — compact */}
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="w-14 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border"
                        style={{
                            background: (result.team_color || '#64748b') + '15',
                            borderColor: (result.team_color || '#64748b') + '40',
                        }}
                    >
                        <Truck className="w-7 h-5" style={{ color: result.team_color || '#64748b' }} />
                    </div>

                    <div className="min-w-0">
                        {/* Row 1: name + plate */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-900 text-sm leading-tight truncate">
                                {result.vehicle_name}
                            </p>
                            <span className="text-slate-400 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md flex-shrink-0">
                                {result.vehicle_plate}
                            </span>
                            {lastPoint && (
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider border flex-shrink-0 ${
                                    isMoving
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isMoving ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    {isMoving ? 'En mouvement' : 'Garé'}
                                </span>
                            )}
                        </div>
                        {/* Row 2: team */}
                        <p className="text-[11px] font-semibold mt-0.5 truncate" style={{ color: result.team_color || '#94a3b8' }}>
                            {result.team_name}
                        </p>
                    </div>
                </div>

                {/* Right: stats + violations + expand */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {/* KM stat pill */}
                    <div className="hidden sm:flex flex-col items-end">
                        <p className="text-sm font-black text-slate-800 leading-tight tabular-nums">
                            {result.total_km} <span className="text-[10px] font-semibold text-slate-400">km</span>
                        </p>
                        <p className="text-[10px] text-slate-400 leading-tight tabular-nums">{result.gps_points} GPS</p>
                    </div>

                    {result.speed_violations_count > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                            <AlertTriangle className="w-3 h-3" />
                            {result.speed_violations_count}
                        </span>
                    )}

                    <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-500 transition-colors">
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="p-4 space-y-4 border-t border-slate-100">
                    {/* Detalii Trasee */}
                    {trips.length > 0 && (() => {
                        const tableData = trips.map((trip, idx) => {
                            const first = trip[0]
                            const last = trip[trip.length - 1]

                            // Total elapsed time (door-to-door incl. stops)
                            const elapsedMin = Math.round((last.ts - first.ts) / 60)
                            const eh = Math.floor(elapsedMin / 60)
                            const em = elapsedMin % 60
                            const totalDurationStr = eh > 0 ? `${eh}h ${em}m` : `${em}m`

                            // Driving-only time: sum intervals where speed > 2 km/h
                            let drivingMin = 0
                            let distKm = 0
                            let maxSpeed = 0

                            for (let j = 0; j < trip.length; j++) {
                                if (trip[j].speed > maxSpeed) maxSpeed = trip[j].speed
                                if (j > 0) {
                                    const segDurationSec = trip[j].ts - trip[j - 1].ts
                                    const avgSpeed = (trip[j].speed + trip[j - 1].speed) / 2
                                    // Only count segment if vehicle was moving
                                    if (avgSpeed > 2) {
                                        drivingMin += segDurationSec / 60
                                        distKm += haversineKm(trip[j - 1].lat, trip[j - 1].lng, trip[j].lat, trip[j].lng)
                                    }
                                }
                            }

                            drivingMin = Math.round(drivingMin)
                            const dh = Math.floor(drivingMin / 60)
                            const dm = drivingMin % 60
                            const drivingDurationStr = dh > 0 ? `${dh}h ${dm}m` : `${dm}m`

                            const violations = trip.filter(pt => pt.speed > speedLimit).length
                            return {
                                id: idx + 1,
                                trip,
                                startTime: first.time_local.slice(0, 5),
                                endTime: last.time_local.slice(0, 5),
                                drivingDurationStr,
                                totalDurationStr,
                                distKm: distKm.toFixed(1),
                                maxSpeed: maxSpeed.toFixed(1),
                                violations
                            }
                        })

                        // Filtreaza traseele fantoma (distanta de condus < 0.3 km)
                        const filteredData = tableData.filter(row => parseFloat(row.distKm) > 0.3)

                        if (filteredData.length === 0) return null

                        return (
                            <div className="mb-6">
                                <DataTable
                                    data={filteredData}
                                    defaultPageSize={10}
                                    pageSizeOptions={[10, 15, 25, 50, 99999]}
                                    onRowClick={(row) => handleTripClick(row.trip, row.id)}
                                    columns={[
                                        {
                                            key: 'id',
                                            label: 'Nr. Crt.',
                                            render: (row) => (
                                                <span className="font-semibold text-slate-900 group-hover:text-blue-600 flex items-center gap-2">
                                                    <MapPin className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-500" />
                                                    {t('gps.route', 'Trajet')} {row.id}
                                                </span>
                                            )
                                        },
                                        {
                                            key: 'startTime',
                                            label: t('gps.start_time', 'Heure départ'),
                                        },
                                        {
                                            key: 'endTime',
                                            label: t('gps.end_time', 'Heure arrivée'),
                                        },
                                        {
                                            key: 'drivingDurationStr',
                                            label: t('gps.drive_time', 'Conduite'),
                                            render: (row) => (
                                                <span className="font-semibold text-slate-800">{row.drivingDurationStr}</span>
                                            )
                                        },
                                        {
                                            key: 'totalDurationStr',
                                            label: t('gps.total_duration', 'Durée totale'),
                                            render: (row) => (
                                                <span className="text-slate-400 text-xs">{row.totalDurationStr}</span>
                                            )
                                        },
                                        {
                                            key: 'distKm',
                                            label: t('gps.distance', 'Distance'),
                                            render: (row) => <span className="font-semibold text-slate-800">{row.distKm} km</span>
                                        },
                                        {
                                            key: 'maxSpeed',
                                            label: t('gps.max_speed', 'Vit. max'),
                                            render: (row) => <span className={`font-semibold ${parseFloat(row.maxSpeed) > 90 ? 'text-red-600' : ''}`}>{row.maxSpeed} km/h</span>
                                        },
                                        {
                                            key: 'violations',
                                            label: t('gps.violations', 'Infractions'),
                                            render: (row) => <span className={`font-semibold ${row.violations > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{row.violations}</span>
                                        }
                                    ]}
                                />
                            </div>
                        )
                    })()}

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

                    {/* Buton harta */}
                    {trackPoints.length >= 2 && (
                        <div>
                            <button
                                onClick={() => { setShowMap(m => !m); setFocusedTrip(null); setIsMapFullscreen(false); setMatchedPolyline(null); }}
                                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl py-2 hover:bg-blue-100 transition-colors"
                            >
                                <MapPin className="w-3.5 h-3.5" />
                                {isMatchingRoute && <span className="animate-pulse">Chargement route...</span>}
                                {!isMatchingRoute && (showMap && !focusedTrip ? t('gps.hide_map', 'Masquer la carte') : t('gps.show_map', 'Voir le trace GPS sur la carte'))}
                            </button>

                            {showMap && (
                                (() => {
                                    const mapContent = isMapFullscreen ? (
                                        <div className="fixed top-[76px] left-[272px] right-0 bottom-0 z-[9999] bg-slate-50 flex flex-col shadow-2xl border-l border-slate-200">
                                            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => { setIsMapFullscreen(false); setFocusedTrip(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                                    </button>
                                                    <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                        <MapPin className="w-5 h-5 text-blue-600" />
                                                        {focusedTrip ? `Trajet ${focusedTrip.index} - ${result.vehicle_name}` : `Trace GPS: ${result.vehicle_name}`}
                                                    </h1>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {focusedTrip && (
                                                        <button onClick={() => setFocusedTrip(null)} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-xl text-sm transition-colors">
                                                            Voir tout le parcours
                                                        </button>
                                                    )}
                                                    <button onClick={() => { setIsMapFullscreen(false); setFocusedTrip(null); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors">
                                                        Fermer
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex-1 flex overflow-hidden">
                                                {focusedTrip && focusedTripDetails && (
                                                    <div className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 overflow-y-auto">
                                                        <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-blue-50/50 to-white">
                                                            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">{t('gps.trip_details', 'Details du trajet')}</div>
                                                            <div className="text-2xl font-black text-slate-800">{focusedTripDetails.duration}</div>
                                                            <div className="text-sm font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
                                                                <Clock className="w-4 h-4 text-blue-500" />
                                                                {displayStartTime} &rarr; {displayEndTime}
                                                            </div>
                                                        </div>
                                                        <div className="p-6 space-y-4 flex-1">
                                                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                                                                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                                                                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Distance</span>
                                                                    <span className="font-bold text-slate-800 text-sm">{focusedTripDetails.distance} km</span>
                                                                </div>
                                                                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                                                                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Vitesse Max</span>
                                                                    <span className={`font-bold text-sm ${parseFloat(focusedTripDetails.maxSpeed) > 90 ? 'text-red-600' : 'text-slate-800'}`}>{focusedTripDetails.maxSpeed} km/h</span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Infractions</span>
                                                                    {focusedTripDetails.violations > 0 ? (
                                                                        <span className="inline-flex items-center gap-1 text-red-600 font-bold text-sm bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                                                                            <AlertTriangle className="w-3.5 h-3.5" /> {focusedTripDetails.violations}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">0</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex-1 relative bg-slate-100">
                                                    <MapContainer center={[displayStartPoint?.[0] || 50.85, displayStartPoint?.[1] || 4.35]} zoom={11} className="w-full h-full" scrollWheelZoom={true}>
                                                        <MapResizer isFullscreen={true} />
                                                        <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" maxZoom={20} />
                                                        <MapFitter all={displayPoints} />
                                                        {displaySegments.map((seg, i) => <Polyline key={i} positions={seg.positions} color={seg.color} weight={5} opacity={0.9} />)}
                                                        {displayStartPoint && (
                                                            <CircleMarker center={displayStartPoint} radius={8} color="#22c55e" fillColor="#22c55e" fillOpacity={1}>
                                                                <Popup><div style={{ fontSize: 12, fontWeight: 'bold', color: '#16a34a' }}>Depart: {displayStartTime}<br/>Vitesse: {displayStartSpeed} km/h</div></Popup>
                                                            </CircleMarker>
                                                        )}
                                                        {displayEndPoint && (
                                                            <CircleMarker center={displayEndPoint} radius={8} color="#ef4444" fillColor="#ef4444" fillOpacity={1}>
                                                                <Popup><div style={{ fontSize: 12, fontWeight: 'bold', color: '#dc2626' }}>Arrivee: {displayEndTime}<br/>Vitesse: {displayEndSpeed} km/h</div></Popup>
                                                            </CircleMarker>
                                                        )}
                                                    </MapContainer>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 relative bg-white">
                                            <button 
                                                onClick={() => setIsMapFullscreen(true)}
                                                className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-md shadow-sm border border-slate-200 text-slate-700 p-2.5 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                title="Plein ecran"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                                            </button>
                                            <div style={{ height: 340 }} className="w-full relative">
                                                <MapContainer center={[displayStartPoint?.[0] || 50.85, displayStartPoint?.[1] || 4.35]} zoom={11} className="w-full h-full" scrollWheelZoom={false}>
                                                    <MapResizer isFullscreen={false} />
                                                    <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" maxZoom={20} />
                                                    <MapFitter all={displayPoints} />
                                                    {displaySegments.map((seg, i) => <Polyline key={i} positions={seg.positions} color={seg.color} weight={4} opacity={0.85} />)}
                                                    {!focusedTrip && sitePoints.map(wo => <Marker key={wo.id} position={[wo.site_lat, wo.site_lng]} icon={dotIcon(result.team_color)}><Popup><strong>{wo.client_name}</strong><br/>{wo.site_address}</Popup></Marker>)}
                                                    {displayStartPoint && (
                                                        <CircleMarker center={displayStartPoint} radius={7} color="#22c55e" fillColor="#22c55e" fillOpacity={1}>
                                                            <Popup><div style={{ fontSize: 11, fontWeight: 'bold', color: '#16a34a' }}>Depart: {displayStartTime}<br/>Vitesse: {displayStartSpeed} km/h</div></Popup>
                                                        </CircleMarker>
                                                    )}
                                                    {displayEndPoint && (
                                                        <CircleMarker center={displayEndPoint} radius={7} color="#ef4444" fillColor="#ef4444" fillOpacity={1}>
                                                            <Popup><div style={{ fontSize: 11, fontWeight: 'bold', color: '#dc2626' }}>Arrivee: {displayEndTime}<br/>Vitesse: {displayEndSpeed} km/h</div></Popup>
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
                                    );
                                    return isMapFullscreen ? createPortal(mapContent, document.body) : mapContent;
                                })()
                            )}
                </div>
            )}

                    {trackPoints.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <Navigation className="w-7 h-7 text-slate-300" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-500">{t('gps.no_gps_data', 'Aucune donnée GPS pour cette date.')}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{t('gps.no_gps_hint', 'Le véhicule était peut-être garé ou hors réseau.')}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}


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

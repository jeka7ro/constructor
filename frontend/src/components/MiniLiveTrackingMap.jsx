import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import { useTenantStore } from '../store/tenantStore'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Clock, Gauge, RefreshCw, Radio, CloudRain, Wind, Box, Eye, ClipboardList, ExternalLink, X, Navigation, CloudSun, Layers } from 'lucide-react'
import { Expand, Shrink, Truck } from 'lucide-react'
import { LiveMapWeatherOverlay, WEATHER_STATIONS_24 } from '../utils/liveWeatherCanvas.jsx'
import EuroPlate from './EuroPlate'

function computeBearingDeg(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const phi1 = (parseFloat(lat1) * Math.PI) / 180;
    const phi2 = (parseFloat(lat2) * Math.PI) / 180;
    const dLon = ((parseFloat(lon2) - parseFloat(lon1)) * Math.PI) / 180;
    if (isNaN(phi1) || isNaN(phi2) || isNaN(dLon)) return null;
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return Math.round((brng + 360) % 360);
}

function formatCardinalDirection(deg) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const idx = Math.round((((Number(deg) || 0) % 360) + 360) % 360 / 45) % 8;
    return dirs[idx];
}

function getBelgiumDateTime() {
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Brussels',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(new Date());
        const map = {};
        parts.forEach(p => { map[p.type] = p.value; });
        return {
            todayStr: `${map.year}-${map.month}-${map.day}`,
            nowHm: `${map.hour}:${map.minute}`,
        };
    } catch (_) {
        const now = new Date();
        return {
            todayStr: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
            nowHm: now.toTimeString().slice(0, 5),
        };
    }
}

function haversineKm(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 999999;
    const la1 = parseFloat(lat1), lo1 = parseFloat(lon1), la2 = parseFloat(lat2), lo2 = parseFloat(lon2);
    if (isNaN(la1) || isNaN(lo1) || isNaN(la2) || isNaN(lo2)) return 999999;
    const R = 6371;
    const dLat = ((la2 - la1) * Math.PI) / 180;
    const dLon = ((lo2 - lo1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Prevent React 18 / Vite HMR "Map container is already initialized" crash
if (L?.Map?.prototype && !L.Map.prototype.__safeInitPatched) {
    const origInitContainer = L.Map.prototype._initContainer;
    L.Map.prototype._initContainer = function (id) {
        const container = typeof id === 'string' ? document.getElementById(id) : id;
        if (container && container._leaflet_id) {
            container._leaflet_id = null;
            container.innerHTML = '';
        }
        return origInitContainer.call(this, id);
    };
    L.Map.prototype.__safeInitPatched = true;
}

function FitBounds({ vehicles, isMapFull, focusedVehicleId }) {
    const map = useMap();
    const vehiclesRef = useRef(vehicles);
    vehiclesRef.current = vehicles;
    const focusedRef = useRef(focusedVehicleId);
    focusedRef.current = focusedVehicleId;

    const fitBelgiumView = useCallback((fullMode) => {
        const list = vehiclesRef.current || [];
        if (!map || list.length === 0 || focusedRef.current) return;
        try {
            map.invalidateSize({ animate: false });
            // Filter to vehicles inside Belgium operational area (with fallback to all vehicles)
            const beVehicles = list.filter(
                v => v.lat != null && v.lng != null && v.lat >= 49.4 && v.lat <= 51.6 && v.lng >= 2.5 && v.lng <= 6.5
            );
            const targetList = beVehicles.length > 0 ? beVehicles : list.filter(v => v.lat != null && v.lng != null);
            if (targetList.length === 0) return;

            const pts = targetList.map(v => [Number(v.lat), Number(v.lng)]);
            // Ensure minimum Belgian regional framing if all trucks are at the exact same spot
            if (pts.length === 1) {
                pts.push([pts[0][0] + 0.18, pts[0][1] + 0.25]);
                pts.push([pts[0][0] - 0.18, pts[0][1] - 0.25]);
            }
            const bounds = L.latLngBounds(pts);
            map.fitBounds(bounds, {
                paddingTopLeft: fullMode ? [370, 75] : [235, 24],
                paddingBottomRight: fullMode ? [430, 75] : [265, 24],
                maxZoom: fullMode ? 12 : 11,
                animate: false,
            });
        } catch (_) {}
    }, [map]);

    useEffect(() => {
        if (vehicles.length === 0) return;
        fitBelgiumView(isMapFull);
        const t1 = setTimeout(() => fitBelgiumView(isMapFull), 120);
        const t2 = setTimeout(() => fitBelgiumView(isMapFull), 340);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            try { map.stop(); } catch (_) { }
        };
    }, [vehicles.length, isMapFull, fitBelgiumView, map]);

    return null;
}

function secondsAgo(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return Math.floor((Date.now() - d.getTime()) / 1000);
}

function formatLastSeen(dateStr, t) {
    const secs = secondsAgo(dateStr);
    if (secs === null) return '—';
    if (secs < 60) return t ? t('live.ago_sec', 'il y a {{count}}s', { count: secs }) : `il y a ${secs}s`;
    if (secs < 3600) return t ? t('live.ago_min', 'il y a {{count}}min', { count: Math.floor(secs / 60) }) : `il y a ${Math.floor(secs / 60)}min`;
    return t ? t('live.ago_h', 'il y a {{count}}h', { count: Math.floor(secs / 3600) }) : `il y a ${Math.floor(secs / 3600)}h`;
}

function computeVehiclePixelOffsets(vehicles, zoom = 8, isMapFull = false) {
    const scale = (256 * Math.pow(2, zoom)) / 360;
    const cosLat = Math.cos((50.85 * Math.PI) / 180);
    const mult = isMapFull ? 1.28 : 1;
    const PILL_W = Math.round(116 * mult);
    const PILL_H = Math.round(30 * mult);
    const stepY = Math.round(31 * mult);
    const stepX = Math.round(118 * mult);
    const candidates = [
        [0, 0],
        [0, -stepY],
        [0, stepY],
        [0, -stepY * 2],
        [0, stepY * 2],
        [stepX, 0],
        [-stepX, 0],
        [stepX, -stepY],
        [-stepX, -stepY],
        [stepX, stepY],
        [-stepX, stepY],
        [0, -stepY * 3],
        [0, stepY * 3],
    ];
    const placed = [];
    const offsets = {};

    vehicles.forEach(v => {
        if (v.lat == null || v.lng == null) {
            offsets[v.id] = [0, 0];
            return;
        }
        const px = v.lng * scale;
        const py = (-v.lat / cosLat) * scale;

        let chosen = [0, 0];
        for (const [ox, oy] of candidates) {
            const box = {
                x1: px + ox - PILL_W / 2,
                y1: py + oy - PILL_H / 2,
                x2: px + ox + PILL_W / 2,
                y2: py + oy + PILL_H / 2,
            };
            const collides = placed.some(
                b => !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2)
            );
            if (!collides) {
                chosen = [ox, oy];
                placed.push(box);
                break;
            }
        }
        offsets[v.id] = chosen;
    });

    return offsets;
}

function createVehicleIcon(color, name, avatarUrl, vehicleType, speed, offset = [0, 0], isMapFull = false) {
    const cleanName = (name || 'Camion').replace(/\s*\([^)]*\)/g, '').trim();
    const shortName = cleanName.length > 14 ? cleanName.substring(0, 14) + '…' : cleanName;
    const apiBaseUrl = 'http://davidechape.localhost:5678';
    const fullAvatarUrl = avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : `${apiBaseUrl}${avatarUrl}`) : null;
    const themeColor = color || '#3b82f6';
    const spd = speed != null ? Math.round(Number(speed)) : 0;
    const [ox, oy] = offset;
    const scaleCss = isMapFull ? ' scale(1.26)' : '';

    const vType = (vehicleType || '').toLowerCase();

    const truckSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`;
    const chapeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><rect x="2" y="7" width="8" height="6" rx="2" fill="white" opacity="0.3"/></svg>`;
    const mixerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M2 13 l6 -7 l2 2 l-6 7 z" fill="white" opacity="0.4"/></svg>`;
    const camionGrueSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M10 13 L3 4 L5 3 L12 11" fill="white" opacity="0.8"/></svg>`;
    const craneSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M7 21v-4"/><path d="M17 21v-4"/><path d="M12 17V3l-7 4"/><path d="M12 10l5 3"/></svg>`;

    let selectedSvg = truckSvg;
    if (vType.includes('chape')) selectedSvg = chapeSvg;
    else if (vType.includes('beton') || vType.includes('toupie')) selectedSvg = mixerSvg;
    else if (vType.includes('grue') && vType.includes('camion')) selectedSvg = camionGrueSvg;
    else if (vType.includes('grue')) selectedSvg = craneSvg;

    const badgeVisual = fullAvatarUrl
        ? `<img src="${fullAvatarUrl}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;border:1.5px solid ${themeColor};flex-shrink:0;" />`
        : `<span style="width:22px;height:22px;border-radius:50%;background-color:${themeColor};border:1.5px solid rgba(255,255,255,0.85);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${selectedSvg}</span>`;

    const speedHtml = spd > 0
        ? `<span style="color:#38bdf8;font-weight:900;margin-left:2px;">${spd} km/h</span>`
        : `<span style="width:6px;height:6px;border-radius:50%;background:${themeColor};display:inline-block;margin-left:2px;"></span>`;

    const pillHtml = `<div class="tms-weather-hud-glass tabular-nums" style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 4px;border-radius:999px;background:linear-gradient(160deg,rgba(15,23,42,0.88) 0%,rgba(9,23,46,0.92) 100%);backdrop-filter:blur(14px) saturate(180%);-webkit-backdrop-filter:blur(14px) saturate(180%);border:1.5px solid rgba(255,255,255,0.28);color:#ffffff;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 6px 18px -4px rgba(2,6,23,0.55),inset 0 1px 0 rgba(255,255,255,0.22);transform:translate(calc(-50% + ${ox}px),calc(-50% + ${oy}px))${scaleCss};cursor:pointer;">
        ${badgeVisual}
        <span style="letter-spacing:-0.01em;">${shortName}</span>
        ${speedHtml}
    </div>`;

    return L.divIcon({
        html: pillHtml,
        className: '',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [ox, oy - 16],
    });
}

function ZoomTracker({ onZoomChange, onMapBackgroundClick }) {
    const map = useMap();
    const clickCbRef = useRef(onMapBackgroundClick);
    clickCbRef.current = onMapBackgroundClick;

    useEffect(() => {
        if (!map) return;
        const update = () => onZoomChange(map.getZoom());
        const handleMapClick = () => {
            if (clickCbRef.current) clickCbRef.current();
        };
        update();
        map.on('zoomend', update);
        map.on('click', handleMapClick);
        return () => {
            try {
                map.off('zoomend', update);
                map.off('click', handleMapClick);
            } catch (_) { }
        };
    }, [map, onZoomChange]);
    return null;
}

const POLL_INTERVAL = 15000;

function extractShortCity(address) {
    if (!address) return '';
    const parts = address.split(',').map(p => p.trim()).filter(Boolean);
    const zipPart = parts.find(p => /\b\d{4,6}\b/.test(p));
    if (zipPart) {
        return zipPart.replace(/\d+/g, '').replace(/\s+/g, ' ').trim() || zipPart;
    }
    const noDigitPart = parts.find(p => !/\d/.test(p) && !/^(belgique|belgie|belgië|belgium|belgia)$/i.test(p));
    const chosen = noDigitPart || parts[0];
    return chosen.replace(/\d+/g, '').replace(/\s+/g, ' ').trim() || chosen;
}

export default function MiniLiveTrackingMap({ workOrders = [], teams = [] }) {
    const { t } = useTranslation();
    const tenant = useTenantStore(s => s.tenant);
    const isDavideChape = !tenant || (tenant?.slug || '').toLowerCase().includes('davide') || (tenant?.name || '').toLowerCase().includes('davide');
    const [vehicles, setVehicles] = useState([]);
    const [mapZoom, setMapZoom] = useState(8);
    const [sandStations, setSandStations] = useState([]);
    const [showSandStations, setShowSandStations] = useState(() => {
        const saved = localStorage.getItem('minilivetracking_nisip_toggle');
        return saved ? JSON.parse(saved) : true;
    });
    const [showLegend, setShowLegend] = useState(() => {
        const saved = localStorage.getItem('minilivetracking_legend_toggle');
        return saved ? JSON.parse(saved) : true;
    });
    const [showWeatherCard, setShowWeatherCard] = useState(() => {
        const saved = localStorage.getItem('minilivetracking_weather_toggle');
        return saved ? JSON.parse(saved) : true;
    });
    const [showRadarFx, setShowRadarFx] = useState(() => {
        const saved = localStorage.getItem('minilivetracking_radar_toggle');
        return saved ? JSON.parse(saved) : true;
    });
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(true);
    const [isMapFull, setIsMapFull] = useState(false);
    const [isSatellite3D, setIsSatellite3D] = useState(() => {
        try {
            const saved = localStorage.getItem('minilivetracking_3d_toggle');
            return saved ? JSON.parse(saved) : false;
        } catch (_) {
            return false;
        }
    });
    const [streetViewVehicle, setStreetViewVehicle] = useState(null);
    const [focusedVehicleId, setFocusedVehicleId] = useState(null);
    const focusedVehicleIdRef = useRef(null);
    const previousViewRef = useRef(null);
    const lastToggleTsRef = useRef(0);
    const prevVehicleCoordsRef = useRef({});
    const mapRef = useRef(null);
    const markerRefs = useRef({});
    const containerRef = useRef(null);
    const intervalRef = useRef(null);

    const restorePreviousView = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        try { map.closePopup(); } catch (_) { }
        if (previousViewRef.current) {
            const { center: prevCenter, zoom: prevZoom } = previousViewRef.current;
            map.flyTo(prevCenter, prevZoom, { animate: true, duration: 1.1 });
        } else if (vehicles.length > 0) {
            const bounds = L.latLngBounds(vehicles.map(v => [v.lat, v.lng]));
            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14, animate: true });
        }
        previousViewRef.current = null;
        focusedVehicleIdRef.current = null;
        setFocusedVehicleId(null);
    }, [vehicles]);

    const handleVehicleToggleZoom = useCallback((v, markerInstance = null) => {
        const map = mapRef.current;
        if (!map || v?.lat == null || v?.lng == null) return;
        lastToggleTsRef.current = Date.now();

        if (String(focusedVehicleIdRef.current) === String(v.id)) {
            if (markerInstance?.closePopup) {
                setTimeout(() => { try { markerInstance.closePopup(); } catch (_) { } }, 10);
            }
            restorePreviousView();
            return;
        }

        if (!previousViewRef.current) {
            const c = map.getCenter();
            previousViewRef.current = {
                center: [c.lat, c.lng],
                zoom: map.getZoom(),
            };
        }
        focusedVehicleIdRef.current = v.id;
        setFocusedVehicleId(v.id);
        map.flyTo([v.lat, v.lng], 16, { animate: true, duration: 1.15 });
        const targetMarker = markerInstance || markerRefs.current?.[v.id];
        if (targetMarker?.openPopup) {
            setTimeout(() => {
                try { targetMarker.openPopup(); } catch (_) { }
            }, 150);
        }
    }, [restorePreviousView]);

    const handleMapBackgroundClick = useCallback(() => {
        if (Date.now() - lastToggleTsRef.current < 250) return;
        if (focusedVehicleIdRef.current !== null) {
            restorePreviousView();
        }
    }, [restorePreviousView]);

    // Live Follow Mode: Keep the selected driver centered on the map and in Street View as their GPS position and direction update
    useEffect(() => {
        setStreetViewVehicle(prev => {
            if (!prev) return null;
            const updated = vehicles.find(v => String(v.id) === String(prev.id));
            return updated || prev;
        });

        const map = mapRef.current;
        if (!map || !focusedVehicleId) return;
        const focusedVeh = vehicles.find(v => String(v.id) === String(focusedVehicleId));
        if (!focusedVeh || focusedVeh.lat == null || focusedVeh.lng == null) return;
        const nextLat = Number(focusedVeh.lat);
        const nextLng = Number(focusedVeh.lng);
        if (isNaN(nextLat) || isNaN(nextLng)) return;

        // Avoid interrupting the initial zoom-in animation right on click
        if (Date.now() - lastToggleTsRef.current > 1200) {
            map.panTo([nextLat, nextLng], { animate: true, duration: 0.85 });
        }
    }, [vehicles, focusedVehicleId]);

    const getNearestLocalityName = useCallback((lat, lng) => {
        if (lat == null || lng == null) return '';
        let bestName = '';
        let bestKm = 999999;

        // 1. Check today's work orders cities
        if (Array.isArray(workOrders)) {
            for (const wo of workOrders) {
                const wLat = wo.site_latitude || wo.site_lat;
                const wLng = wo.site_longitude || wo.site_lng;
                const d = haversineKm(lat, lng, wLat, wLng);
                if (d < bestKm) {
                    const c = extractShortCity(wo.site_address);
                    if (c) {
                        bestKm = d;
                        bestName = c;
                    }
                }
            }
        }
        // 2. Check sand stations
        if (Array.isArray(sandStations)) {
            for (const s of sandStations) {
                const d = haversineKm(lat, lng, s.latitude, s.longitude);
                if (d < bestKm) {
                    const c = extractShortCity(s.address) || s.name;
                    if (c) {
                        bestKm = d;
                        bestName = c;
                    }
                }
            }
        }
        // 3. Check 24 Belgian/European weather stations
        if (Array.isArray(WEATHER_STATIONS_24)) {
            for (const st of WEATHER_STATIONS_24) {
                const d = haversineKm(lat, lng, st.lat, st.lng);
                if (d < bestKm) {
                    bestKm = d;
                    bestName = st.name;
                }
            }
        }
        return bestKm < 60 ? bestName : '';
    }, [workOrders, sandStations]);

    const getSyncedPlanningJob = useCallback((v) => {
        const { todayStr, nowHm } = getBelgiumDateTime();

        // 1. Live frontend sync with Planning calendar state (Belgium Time + Truck GPS Position)
        if (Array.isArray(workOrders) && workOrders.length > 0) {
            const cleanVName = (v.name || '').replace(/^echipa\s*/i, '').trim().toLowerCase();
            const matchedTeam = Array.isArray(teams)
                ? teams.find(tm =>
                    (v.team_id && String(tm.id) === String(v.team_id)) ||
                    (tm.name || '').replace(/^echipa\s*/i, '').trim().toLowerCase() === cleanVName ||
                    (v.team_color && tm.color && tm.color.toLowerCase() === v.team_color.toLowerCase())
                )
                : null;
            const targetTeamId = matchedTeam?.id || v.team_id;
            const targetTeamColor = (matchedTeam?.color || v.team_color || '').toLowerCase();

            const allTodayOrders = workOrders.filter(wo => {
                const dStr = (wo.start_date || wo.deadline_date || '').split('T')[0];
                return dStr === todayStr && !['cancelled', 'pending'].includes(wo.status);
            });

            const todayTeamOrders = allTodayOrders
                .filter(wo => {
                    const woTeamId = wo.assigned_team_id || wo.team?.id;
                    const woTeamColor = (wo.team?.color || wo.assigned_team_color || '').toLowerCase();
                    const woTeamName = (wo.team?.name || wo.assigned_team_name || '').replace(/^echipa\s*/i, '').trim().toLowerCase();
                    if (targetTeamId && woTeamId && String(woTeamId) === String(targetTeamId)) return true;
                    if (cleanVName && woTeamName && woTeamName === cleanVName) return true;
                    if (targetTeamColor && woTeamColor && woTeamColor === targetTeamColor) return true;
                    return false;
                })
                .sort((a, b) => (a.start_time || '07:00').localeCompare(b.start_time || '07:00'));

            let chosen = null;

            if (todayTeamOrders.length > 0) {
                const activePool = todayTeamOrders.filter(w => w.status !== 'completed');
                const pool = activePool.length > 0 ? activePool : todayTeamOrders;

                // Priority A: Check live GPS proximity — if the truck is physically at/near one of its today's jobs (< 1.2 km), pick that exact job!
                let closestByGps = null;
                let closestKm = 999999;
                for (const cand of pool) {
                    const dKm = haversineKm(v.lat, v.lng, cand.site_latitude || cand.site_lat, cand.site_longitude || cand.site_lng);
                    if (dKm < closestKm) {
                        closestKm = dKm;
                        closestByGps = cand;
                    }
                }

                if (closestByGps && closestKm <= 1.2) {
                    chosen = closestByGps;
                } else {
                    // Priority B: Match by Belgium current time (Europe/Brussels, nowHm)
                    // Pick the order whose window is active right now, or if multiple have start_time <= nowHm, pick the one closest to the truck's GPS position or latest start_time <= nowHm
                    let startedOrders = pool.filter(cand => (cand.start_time || '07:00').slice(0, 5) <= nowHm);
                    if (startedOrders.length > 0) {
                        chosen = startedOrders[startedOrders.length - 1];
                    } else {
                        chosen = pool[0];
                    }
                }

                const vols = Array.isArray(chosen.volumes) ? chosen.volumes : [];
                const surf = vols.reduce((s, x) => s + (parseFloat(x.quantity) || 0), 0) || parseFloat(chosen.surface_area || chosen.surface || 0) || 0;
                const dToSite = haversineKm(v.lat, v.lng, chosen.site_latitude || chosen.site_lat, chosen.site_longitude || chosen.site_lng);
                return {
                    id: chosen.id,
                    client_name: (chosen.client_name && chosen.client_name !== 'None') ? chosen.client_name : chosen.title,
                    site_address: chosen.site_address || '',
                    start_time: (chosen.start_time || '07:00').slice(0, 5),
                    surface_m2: surf > 0 ? Math.round(surf) : null,
                    status: chosen.status,
                    total_today: todayTeamOrders.length,
                    truck_to_site_km: dToSite < 5000 ? Math.round(dToSite * 10) / 10 : null,
                    is_at_site: dToSite < 0.6,
                };
            }

            // Priority C: Even if a vehicle (e.g. Grue Ionel / Grue Alexei) has no team orders assigned in calendar today,
            // check if its live GPS position is physically at one of today's active work sites (< 0.6 km)!
            let physicalSite = null;
            let physicalSiteKm = 999999;
            for (const cand of allTodayOrders) {
                const dKm = haversineKm(v.lat, v.lng, cand.site_latitude || cand.site_lat, cand.site_longitude || cand.site_lng);
                if (dKm < physicalSiteKm) {
                    physicalSiteKm = dKm;
                    physicalSite = cand;
                }
            }
            if (physicalSite && physicalSiteKm < 0.6) {
                const vols = Array.isArray(physicalSite.volumes) ? physicalSite.volumes : [];
                const surf = vols.reduce((s, x) => s + (parseFloat(x.quantity) || 0), 0) || parseFloat(physicalSite.surface_area || physicalSite.surface || 0) || 0;
                return {
                    id: physicalSite.id,
                    client_name: (physicalSite.client_name && physicalSite.client_name !== 'None') ? physicalSite.client_name : physicalSite.title,
                    site_address: physicalSite.site_address || '',
                    start_time: (physicalSite.start_time || '07:00').slice(0, 5),
                    surface_m2: surf > 0 ? Math.round(surf) : null,
                    status: physicalSite.status,
                    total_today: 1,
                    truck_to_site_km: Math.round(physicalSiteKm * 10) / 10,
                    is_at_site: true,
                };
            }
        }
        // 2. Fallback to backend current_work_order from /admin/vehicles/live
        return v.current_work_order || null;
    }, [workOrders, teams]);

    useEffect(() => {
        localStorage.setItem('minilivetracking_nisip_toggle', JSON.stringify(showSandStations));
    }, [showSandStations]);

    useEffect(() => {
        localStorage.setItem('minilivetracking_legend_toggle', JSON.stringify(showLegend));
    }, [showLegend]);

    useEffect(() => {
        localStorage.setItem('minilivetracking_weather_toggle', JSON.stringify(showWeatherCard));
    }, [showWeatherCard]);

    useEffect(() => {
        localStorage.setItem('minilivetracking_radar_toggle', JSON.stringify(showRadarFx));
    }, [showRadarFx]);

    useEffect(() => {
        localStorage.setItem('minilivetracking_3d_toggle', JSON.stringify(isSatellite3D));
    }, [isSatellite3D]);

    useEffect(() => {
        if (!isDavideChape) return;
        api.get('/admin/logistics/sand-stations')
            .then(res => {
                if (res.data) setSandStations(res.data);
            })
            .catch(() => {});
    }, [isDavideChape]);

    const fetchLive = useCallback(async () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        try {
            const resVehicles = await api.get('/admin/vehicles/live');
            const rawList = resVehicles.data || [];
            const prevMap = prevVehicleCoordsRef.current;
            const enrichedList = rawList.map(v => {
                const prev = prevMap[v.id];
                let heading = v.heading != null ? Number(v.heading) : 0;
                if (prev && v.lat != null && v.lng != null) {
                    const distMovedKm = haversineKm(prev.lat, prev.lng, v.lat, v.lng);
                    if (distMovedKm >= 0.004) {
                        const calcBrng = computeBearingDeg(prev.lat, prev.lng, v.lat, v.lng);
                        if (calcBrng !== null && (!heading || distMovedKm >= 0.006)) {
                            heading = calcBrng;
                        }
                        prevMap[v.id] = { lat: v.lat, lng: v.lng, heading };
                    } else if (!heading && prev.heading != null) {
                        heading = prev.heading;
                    }
                } else if (v.lat != null && v.lng != null) {
                    prevMap[v.id] = { lat: v.lat, lng: v.lng, heading };
                }
                return { ...v, heading };
            });
            setVehicles(enrichedList);
            setConnected(true);
        } catch (e) {
            setConnected(false);
        } finally {
            setLoading(false);
        }
    }, []);

    const isActivelyTrackingDriver = Boolean(streetViewVehicle || focusedVehicleId);

    useEffect(() => {
        fetchLive();
        const activePollMs = isActivelyTrackingDriver ? 5000 : POLL_INTERVAL;
        intervalRef.current = setInterval(fetchLive, activePollMs);

        const handleFullscreenChange = () => {
            const activeFs = document.fullscreenElement || document.webkitFullscreenElement;
            const nextFull = Boolean(containerRef.current && activeFs === containerRef.current);
            focusedVehicleIdRef.current = null;
            setFocusedVehicleId(null);
            previousViewRef.current = null;
            setIsMapFull(nextFull);
            setTimeout(() => {
                if (mapRef.current) {
                    mapRef.current.invalidateSize({ animate: false });
                }
            }, 80);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            clearInterval(intervalRef.current);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [fetchLive, isActivelyTrackingDriver]);

    const center = [51.2, 4.4]; // Belgium default

    return (
        <div ref={containerRef} className={`flex flex-col bg-white dark:bg-slate-900 overflow-hidden shadow-sm ${isMapFull ? "tms-map-fullscreen fixed inset-0 z-[9999] rounded-none border-none w-screen h-screen" : "w-full h-full rounded-xl border border-slate-200 dark:border-slate-700"}`}>
            <div className={`flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-gradient-to-b from-white to-slate-50/90 dark:from-slate-900 dark:to-slate-900 ${isMapFull ? "px-6 py-3.5" : "px-4 py-2.5"}`}>
                <h3 className={`font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2.5 uppercase tracking-wide ${isMapFull ? "text-base" : "text-sm"}`}>
                    <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60">
                        <Radio className={`${isMapFull ? "w-4 h-4" : "w-3.5 h-3.5"} text-blue-600 dark:text-sky-400`} />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    </span>
                    <span>{t('dashboard.live_tracking', 'LIVE TRACKING')}</span>
                </h3>
                <div className={`flex items-center ${isMapFull ? "gap-3" : "gap-2"}`}>
                    {/* Apple HIG Segmented Control Center Tray for Map Layers — Monochrome / Single Accent, Uniform Button Borders */}
                    <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-100/95 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setIsSatellite3D(s => !s)}
                            title="3D / Satellite View"
                            aria-label="3D / Satellite View"
                            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                                isSatellite3D
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 border-slate-200/90 dark:border-slate-700 shadow-2xs'
                            }`}
                        >
                            <Box className="w-3.5 h-3.5 shrink-0" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowRadarFx(!showRadarFx)}
                            title="Radar Doppler & Vânt Live"
                            aria-label="Radar Doppler & Vânt Live"
                            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                                showRadarFx
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 border-slate-200/90 dark:border-slate-700 shadow-2xs'
                            }`}
                        >
                            <Wind className="w-3.5 h-3.5 shrink-0" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowWeatherCard(!showWeatherCard)}
                            title={t('live.weather', 'Météo')}
                            aria-label={t('live.weather', 'Météo')}
                            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                                showWeatherCard
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 border-slate-200/90 dark:border-slate-700 shadow-2xs'
                            }`}
                        >
                            <CloudSun className="w-3.5 h-3.5 shrink-0" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowLegend(!showLegend)}
                            title={t('logistics.legend', 'Légende')}
                            aria-label={t('logistics.legend', 'Légende')}
                            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                                showLegend
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 border-slate-200/90 dark:border-slate-700 shadow-2xs'
                            }`}
                        >
                            <Truck className="w-3.5 h-3.5 shrink-0" />
                        </button>
                        {isDavideChape && (
                            <button
                                type="button"
                                onClick={() => setShowSandStations(!showSandStations)}
                                title={t('live.sand', 'Sable')}
                                aria-label={t('live.sand', 'Sable')}
                                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                                    showSandStations
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 border-slate-200/90 dark:border-slate-700 shadow-2xs'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5 shrink-0" />
                            </button>
                        )}
                    </div>
                    <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full tabular-nums flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {vehicles.length} {vehicles.length === 1 ? t("live.active_single", "actif") : t("live.active_plural", "actifs")}
                    </span>
                    <button onClick={() => {
                        if (!document.fullscreenElement) {
                            containerRef.current?.requestFullscreen().catch(err => {
                                console.error(`Error attempting to enable fullscreen: ${err.message}`);
                            });
                        } else {
                            document.exitFullscreen();
                        }
                    }} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors border border-slate-200/80 dark:border-slate-700">
                        {isMapFull ? <Shrink className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={fetchLive} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors border border-slate-200/80 dark:border-slate-700">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div className="flex-1 relative">
                {loading && (
                    <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
                        <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                )}
                {/* Floating Legend right aligned — Apple Liquid Glass functional layer, scales up in Full Screen for 4K/5K readability */}
                {showLegend && (
                    <div
                        className="apple-liquid-glass apple-scroll-container absolute z-[1000] w-68 p-2.5 rounded-2xl pointer-events-auto flex flex-col gap-1 transition-transform duration-150 overflow-y-auto"
                        style={
                            isMapFull
                                ? {
                                      top: '18px',
                                      right: '18px',
                                      transform: 'scale(1.48)',
                                      transformOrigin: 'top right',
                                      maxHeight: 'calc((100vh - 96px) / 1.48)',
                                  }
                                : {
                                      top: '12px',
                                      right: '12px',
                                  }
                        }
                    >
                        <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-900 dark:text-white flex items-center justify-between gap-1.5 pb-0.5">
                            <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" /> {t('logistics.legend', 'Légende')} ({vehicles.length})
                            </div>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            {vehicles.map(v => {
                                const isMoving = v.speed > 0;
                                const isFocused = String(focusedVehicleId) === String(v.id);
                                const syncedJob = getSyncedPlanningJob(v);
                                const jobCity = syncedJob ? extractShortCity(syncedJob.site_address) : '';
                                const currentGpsCity = getNearestLocalityName(v.lat, v.lng);
                                const isAtBase = (v.location_text || '').toLowerCase().startsWith('la baz');
                                const statusLabel = isMoving
                                    ? `${Math.round(v.speed)} km/h${currentGpsCity ? ` · ${currentGpsCity}` : ''}`
                                    : isAtBase
                                        ? v.location_text
                                        : syncedJob?.is_at_site
                                            ? `${t('live.stopped', "À l'arrêt")} · ${jobCity || currentGpsCity}`
                                            : `${t('live.stopped', "À l'arrêt")}${currentGpsCity ? ` · ${currentGpsCity}` : ''}`;

                                return (
                                    <div key={v.id} className={`flex flex-col gap-0.5 border-t border-slate-100 dark:border-slate-800/80 py-1 px-1.5 -mx-1 first:border-0 first:pt-0.5 cursor-pointer transition-colors rounded-lg ${isFocused ? 'bg-blue-50/95 dark:bg-sky-950/60 ring-1 ring-blue-400/60 dark:ring-sky-500/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`} onClick={() => {
                                        handleVehicleToggleZoom(v);
                                    }}>
                                        <div className="flex items-center justify-between gap-1.5 min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                <div className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0 border border-white/60" style={{ backgroundColor: v.team_color }}></div>
                                                <span className="text-[11px] font-extrabold text-slate-900 dark:text-white shrink-0" title={v.name}>{v.name}</span>
                                                {v.plate_number && v.plate_number !== 'NN' && (
                                                    <EuroPlate number={v.plate_number} country="B" size="xs" />
                                                )}
                                                <span className="text-slate-300 dark:text-slate-600 text-[10px] shrink-0">·</span>
                                                <span className={`text-[10px] font-semibold truncate ${isMoving ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400 italic'}`}>
                                                    {statusLabel}
                                                </span>
                                            </div>
                                            {v.distance_today != null && (
                                                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded tabular-nums shrink-0">
                                                    {v.distance_today}km
                                                </span>
                                            )}
                                        </div>
                                        {syncedJob && (
                                            <div
                                                className="flex items-center justify-between gap-1.5 bg-blue-50/80 dark:bg-slate-800/90 border border-blue-200/60 dark:border-slate-700 px-1.5 py-0.5 rounded-md text-[9.5px] leading-tight ml-4"
                                                title={`${syncedJob.start_time} · ${syncedJob.client_name}${syncedJob.site_address ? ` — ${syncedJob.site_address}` : ''}${syncedJob.surface_m2 ? ` (${syncedJob.surface_m2}m²)` : ''}`}
                                            >
                                                <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
                                                    <span className="font-black text-blue-700 dark:text-sky-400 shrink-0 tabular-nums">{syncedJob.start_time}</span>
                                                    <span className="text-slate-400 shrink-0">·</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                                                        {syncedJob.client_name}{jobCity ? ` · ${jobCity}` : ''}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {syncedJob.surface_m2 && (
                                                        <span className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{syncedJob.surface_m2}m²</span>
                                                    )}
                                                    {syncedJob.total_today > 1 && (
                                                        <span className="px-1 rounded bg-blue-600/15 dark:bg-sky-400/20 text-blue-700 dark:text-sky-300 font-black text-[8.5px] tabular-nums">
                                                            +{syncedJob.total_today - 1}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {isFocused && (
                                            <div className="flex items-center gap-1.5 ml-4 mt-0.5">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const next3D = !isSatellite3D;
                                                        setIsSatellite3D(next3D);
                                                        if (next3D && mapRef.current) {
                                                            mapRef.current.flyTo([v.lat, v.lng], 18, { animate: true, duration: 0.9 });
                                                        }
                                                    }}
                                                    className={`flex-1 h-6 px-2 rounded-md text-[10px] font-extrabold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                                                        isSatellite3D
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                                            : 'bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-200 hover:text-blue-700 border-slate-200 dark:border-slate-700'
                                                    }`}
                                                    title="3D / Satellite View"
                                                >
                                                    <Box className="w-3 h-3 shrink-0" />
                                                    <span>3D</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        focusedVehicleIdRef.current = v.id;
                                                        setFocusedVehicleId(v.id);
                                                        setStreetViewVehicle(v);
                                                    }}
                                                    className="flex-1 h-6 px-2 rounded-md text-[10px] font-extrabold flex items-center justify-center gap-1 bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-200 hover:text-blue-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer whitespace-nowrap"
                                                    title="Street View 360°"
                                                >
                                                    <Eye className="w-3 h-3 shrink-0" />
                                                    <span>Street View</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
                <MapContainer ref={mapRef}
                    center={center}
                    zoom={8}
                    className="w-full h-full"
                    style={{ background: '#f8fafc' }}
                    zoomControl={true}
                    scrollWheelZoom={isMapFull}
                >
                    <TileLayer
                        key={isSatellite3D ? 'sat-3d' : 'road-2d'}
                        url={
                            isSatellite3D
                                ? "https://mt1.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}"
                                : "https://mt1.google.com/vt/lyrs=m&hl=fr&x={x}&y={y}&z={z}"
                        }
                        attribution="&copy; Google Maps"
                        maxZoom={20}
                    />
                    <LiveMapWeatherOverlay showCard={showWeatherCard} onToggleCard={setShowWeatherCard} showRadarFx={showRadarFx} workOrders={workOrders} isMapFull={isMapFull} />
                    <ZoomTracker onZoomChange={setMapZoom} onMapBackgroundClick={handleMapBackgroundClick} />
                    {vehicles.length > 0 && <FitBounds vehicles={vehicles} isMapFull={isMapFull} focusedVehicleId={focusedVehicleId} />}

                    {/* Sand Stations Markers */}
                    {isDavideChape && showSandStations && (() => {
                        const validPrices = sandStations
                            .map(s => parseFloat(s.price_per_ton))
                            .filter(p => !isNaN(p))
                            .sort((a, b) => a - b);

                        const getPriceColor = (priceStr) => {
                            if (priceStr == null || priceStr === '') return '#64748b'; // slate-500
                            const price = parseFloat(priceStr);
                            if (isNaN(price) || validPrices.length === 0) return '#64748b';
                            if (validPrices[0] === validPrices[validPrices.length - 1]) return '#10b981'; // green

                            const lessCount = validPrices.filter(p => p < price).length;
                            const ratio = lessCount / Math.max(1, validPrices.length - 1);
                            if (ratio < 0.34) return '#10b981'; // emerald-500
                            if (ratio < 0.67) return '#f59e0b'; // amber-500
                            return '#ef4444'; // red-500
                        };

                        return sandStations.filter(s => s.latitude && s.longitude).map((s) => (
                            <Marker
                                key={`sand-${s.id}`}
                                position={[s.latitude, s.longitude]}
                                icon={L.divIcon({
                                    html: `<div style="background-color: ${getPriceColor(s.price_per_ton)}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">S</div>`,
                                    className: '',
                                    iconSize: [24, 24],
                                    iconAnchor: [12, 12],
                                    popupAnchor: [0, -12]
                                })}
                            >
                                <Popup className="tracking-popup">
                                    <div className="font-bold text-sm text-slate-900">{s.name}</div>
                                    <div className="text-xs text-slate-500 mt-1">{s.address}</div>
                                    {s.price_per_ton != null && s.price_per_ton !== '' && (
                                        <div className="text-xs font-bold text-slate-700 mt-2 bg-slate-50 p-2 border border-slate-100 rounded-lg flex items-center justify-between">
                                            <span>Preț:</span>
                                            <span className="text-emerald-600 text-sm">{s.price_per_ton} € / tonă</span>
                                        </div>
                                    )}
                                </Popup>
                            </Marker>
                        ));
                    })()}

                    {(() => {
                        const vehicleOffsets = computeVehiclePixelOffsets(vehicles, mapZoom, isMapFull);
                        return vehicles.map(v => {
                            const syncedJob = getSyncedPlanningJob(v);
                            const jobCity = syncedJob ? extractShortCity(syncedJob.site_address) : '';
                            return (
                                <Marker
                                    key={v.id}
                                    ref={(el) => {
                                        if (el) markerRefs.current[v.id] = el;
                                    }}
                                    position={[v.lat, v.lng]}
                                    icon={createVehicleIcon(v.team_color, v.name, v.avatar_url, v.vehicle_type, v.speed, vehicleOffsets[v.id] || [0, 0], isMapFull)}
                                    eventHandlers={{
                                        click: (e) => {
                                            handleVehicleToggleZoom(v, e.target);
                                        }
                                    }}
                                >
                                    <Popup className="tracking-popup">
                                        <div className="flex items-center gap-2.5 mb-1.5">
                                            {v.avatar_url && (
                                                <img
                                                    src={v.avatar_url.startsWith('http') ? v.avatar_url : `http://davidechape.localhost:5678${v.avatar_url}`}
                                                    alt="avatar"
                                                    className="w-8 h-8 rounded-full object-cover border-2 shrink-0"
                                                    style={{ borderColor: v.team_color }}
                                                />
                                            )}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-sm font-extrabold text-slate-900">{v.name}</span>
                                                    {v.plate_number && v.plate_number !== 'NN' && (
                                                        <EuroPlate number={v.plate_number} country="B" size="xs" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs mt-1 text-slate-500">{t('live.last_seen', 'Vu')}: {formatLastSeen(v.last_seen, t)}</div>
                                        {v.location_text && (
                                            <div className="text-xs mt-1 text-blue-600 font-bold">{v.location_text}</div>
                                        )}
                                        {v.speed != null && (
                                            <div className="text-xs text-slate-500">{t('live.speed', 'Vitesse')}: {Math.round(v.speed)} km/h</div>
                                        )}
                                        {syncedJob && (
                                            <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
                                                <div className="font-bold text-blue-700 flex items-center justify-between gap-2">
                                                    <span className="flex items-center gap-1 min-w-0 truncate">
                                                        <ClipboardList className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                                                        <span className="truncate">{syncedJob.start_time} · {syncedJob.client_name}</span>
                                                    </span>
                                                    {syncedJob.surface_m2 && (
                                                        <span className="text-emerald-600 font-extrabold tabular-nums shrink-0">{syncedJob.surface_m2}m²</span>
                                                    )}
                                                </div>
                                                {jobCity && (
                                                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">{syncedJob.site_address}</div>
                                                )}
                                            </div>
                                        )}
                                        {/* Stylized Vector Action Buttons: 3D Satellite & Street View (Zero Emojis) */}
                                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const next3D = !isSatellite3D;
                                                    setIsSatellite3D(next3D);
                                                    if (next3D && mapRef.current) {
                                                        mapRef.current.flyTo([v.lat, v.lng], 18, { animate: true, duration: 0.9 });
                                                    }
                                                }}
                                                className={`flex-1 h-7 px-2.5 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                                                    isSatellite3D
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200/90 hover:border-blue-300'
                                                }`}
                                                title="3D / Satellite View"
                                            >
                                                <Box className="w-3.5 h-3.5 shrink-0" />
                                                <span>3D</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    focusedVehicleIdRef.current = v.id;
                                                    setFocusedVehicleId(v.id);
                                                    setStreetViewVehicle(v);
                                                }}
                                                className="flex-1 h-7 px-2.5 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/90 hover:border-blue-300 transition-all cursor-pointer whitespace-nowrap"
                                                title="Street View 360°"
                                            >
                                                <Eye className="w-3.5 h-3.5 shrink-0" />
                                                <span>Street View</span>
                                            </button>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        });
                    })()}
                </MapContainer>

                {/* In-App Street View 360° Overlay Panel — Live Movement & Compass Direction Tracking */}
                {streetViewVehicle && (() => {
                    const svHeading = Math.round(Number(streetViewVehicle.heading) || 0) % 360;
                    const svCardinal = formatCardinalDirection(svHeading);
                    const svCity = getNearestLocalityName(streetViewVehicle.lat, streetViewVehicle.lng);
                    // Re-anchor panorama when the vehicle moves ~10m or turns >= 10 degrees
                    const svKey = `sv-${streetViewVehicle.id}-${Number(streetViewVehicle.lat).toFixed(4)}-${Number(streetViewVehicle.lng).toFixed(4)}-${Math.round(svHeading / 10) * 10}`;
                    return (
                        <div
                            className="absolute inset-3 z-[1200] bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-sky-400 shrink-0">
                                        <Eye className="w-4 h-4" />
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                                        <span className="text-xs font-extrabold text-white truncate">{streetViewVehicle.name}</span>
                                        {streetViewVehicle.plate_number && streetViewVehicle.plate_number !== 'NN' && (
                                            <EuroPlate number={streetViewVehicle.plate_number} country="B" size="xs" />
                                        )}
                                        {streetViewVehicle.speed != null && (
                                            <span className="text-[11px] font-bold text-sky-400 tabular-nums">
                                                · {Math.round(streetViewVehicle.speed)} km/h
                                            </span>
                                        )}
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10.5px] font-extrabold text-emerald-400 tabular-nums"
                                            title="Direcția de deplasare GPS"
                                        >
                                            <Navigation
                                                className="w-3 h-3 text-emerald-400 shrink-0 transition-transform duration-300"
                                                style={{ transform: `rotate(${svHeading}deg)` }}
                                            />
                                            <span>{svCardinal} · {svHeading}°</span>
                                        </span>
                                        {svCity && (
                                            <span className="text-[11px] font-semibold text-slate-300 truncate">
                                                · {svCity}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <a
                                        href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${streetViewVehicle.lat},${streetViewVehicle.lng}&heading=${svHeading}&pitch=0`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                                        title="Google Street View"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                        <span>Google Maps</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => setStreetViewVehicle(null)}
                                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                                        title={t('common.close', 'Fermer')}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 relative bg-slate-950">
                                <iframe
                                    key={svKey}
                                    title={`Street View - ${streetViewVehicle.name}`}
                                    src={`https://maps.google.com/maps?q=&layer=c&cbll=${streetViewVehicle.lat},${streetViewVehicle.lng}&cbp=11,${svHeading},0,0,0&output=svembed`}
                                    className="w-full h-full border-0"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    )
}

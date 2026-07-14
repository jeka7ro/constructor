import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Truck, MapPin, Map, Navigation, Beaker, Calendar, Loader2, Filter, Layers, ChevronLeft, ChevronRight, Save, CheckCircle2, BarChart3, RefreshCw, X, ExternalLink, Package, Ruler, Maximize2, Minimize2, CloudRain } from 'lucide-react'
import api from '../../../lib/api'
import { useTenantStore } from '../../../store/tenantStore'

// ── Iconițe vehicule realiste bazate pe tip ──────────────────────────────
// Camion de șapă: cabină + corp lung cu braț pompă
const SCREED_TRUCK_SVG = (strokeColor = 'white') => `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="16" viewBox="0 0 52 32" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <!-- Cabina -->
  <rect x="1" y="10" width="14" height="16" rx="2"/>
  <rect x="3" y="12" width="10" height="7" rx="1" fill="${strokeColor}" fill-opacity="0.25"/>
  <!-- Corp lung (buncăr șapă) -->
  <rect x="15" y="12" width="26" height="14" rx="1"/>
  <!-- Braț pompă -->
  <line x1="28" y1="12" x2="28" y2="4"/>
  <line x1="28" y1="4" x2="42" y2="4"/>
  <line x1="42" y1="4" x2="44" y2="12"/>
  <!-- Roți -->
  <circle cx="7" cy="28" r="3.5"/>
  <circle cx="19" cy="28" r="3.5"/>
  <circle cx="33" cy="28" r="3.5"/>
  <circle cx="44" cy="28" r="3.5"/>
</svg>`

// Grue: cabină + corp scurt + macara verticală cu braț
const CRANE_TRUCK_SVG = (strokeColor = 'white') => `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 52 40" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <!-- Cabina -->
  <rect x="1" y="18" width="14" height="16" rx="2"/>
  <rect x="3" y="20" width="10" height="7" rx="1" fill="${strokeColor}" fill-opacity="0.25"/>
  <!-- Corp camion -->
  <rect x="15" y="20" width="22" height="14" rx="1"/>
  <!-- Mast vertical macara -->
  <line x1="28" y1="20" x2="28" y2="2"/>
  <!-- Braț orizontal macara -->
  <line x1="28" y1="2" x2="48" y2="2"/>
  <!-- Cablu de macara -->
  <line x1="45" y1="2" x2="45" y2="14" stroke-dasharray="2,1.5"/>
  <!-- Contragreutate stânga -->
  <rect x="20" y="0" width="8" height="4" rx="1"/>
  <!-- Cârlig -->
  <path d="M43 14 Q45 17 47 14" fill="none"/>
  <!-- Roți -->
  <circle cx="7" cy="36" r="3.5"/>
  <circle cx="19" cy="36" r="3.5"/>
  <circle cx="31" cy="36" r="3.5"/>
</svg>`

// Generic truck (fallback)
const GENERIC_TRUCK_SVG = (strokeColor = 'white') => `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="1" y="3" width="15" height="13" rx="1"/>
  <path d="M16 8h4l3 5v4h-7V8z"/>
  <circle cx="5.5" cy="18.5" r="2.5"/>
  <circle cx="18.5" cy="18.5" r="2.5"/>
</svg>`

// Returnează SVG-ul potrivit pe baza numelui tipului de vehicul
function getVehicleIconSvg(vehicleType, strokeColor = 'white') {
    const t = (vehicleType || '').toLowerCase()
    if (/grue|crane|macara/i.test(t)) return CRANE_TRUCK_SVG(strokeColor)
    if (/chap|sap|screed|beton|pump|pompe/i.test(t)) return SCREED_TRUCK_SVG(strokeColor)
    return GENERIC_TRUCK_SVG(strokeColor)
}

// Componentă React pentru UI (carduri, panouri laterale)
function TruckSVG({ color = '#2563eb', vehicleType = '', className = 'w-4 h-4' }) {
    const t = (vehicleType || '').toLowerCase()
    let paths
    if (/grue|crane|macara/i.test(t)) {
        // Crane icon
        paths = (
            <>
                <rect x="1" y="10" width="10" height="11" rx="1.5" />
                <rect x="11" y="12" width="12" height="9" rx="1" />
                <line x1="17" y1="12" x2="17" y2="2" />
                <line x1="17" y1="2" x2="24" y2="2" />
                <line x1="23" y1="2" x2="23" y2="8" strokeDasharray="2,1" />
                <circle cx="5" cy="22" r="2" />
                <circle cx="17" cy="22" r="2" />
            </>
        )
    } else if (/chap|sap|screed|beton|pump/i.test(t)) {
        // Screed truck icon
        paths = (
            <>
                <rect x="1" y="8" width="9" height="11" rx="1.5" />
                <rect x="10" y="9" width="14" height="10" rx="1" />
                <line x1="16" y1="9" x2="16" y2="3" />
                <line x1="16" y1="3" x2="24" y2="3" />
                <circle cx="5" cy="21" r="2" />
                <circle cx="13" cy="21" r="2" />
                <circle cx="21" cy="21" r="2" />
            </>
        )
    } else {
        paths = (
            <>
                <rect x="1" y="3" width="15" height="13" rx="1" />
                <path d="M16 8h4l3 5v4h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
            </>
        )
    }
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {paths}
        </svg>
    )
}
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

// Componentă pentru resize la fullscreen
function MapResizer({ isMapFull }) {
    const map = useMap();
    useEffect(() => {
        // Oferim un mic delay pentru ca DOM-ul să se randeze și să aibă noile dimensiuni fullscreen
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 200);
        return () => clearTimeout(timer);
    }, [map, isMapFull]);
    return null;
}

function MapBoundsFitter({ data, activeTeams }) {
    const map = useMap();
    useEffect(() => {
        if (!data || !data.routes || data.routes.length === 0) return;
        
        let hasPoints = false;
        const bounds = L.latLngBounds();
        
        data.routes.forEach(route => {
            if (activeTeams.includes(route.team_id)) {
                route.waypoints.forEach(wp => {
                    if (wp.lat && wp.lng) {
                        bounds.extend([wp.lat, wp.lng]);
                        hasPoints = true;
                    }
                })
            }
        });
        
        if (hasPoints) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
    }, [map, data, activeTeams]);
    return null;
}

function RoutingMachine({ positions, color, weight, opacity }) {
    const [routePositions, setRoutePositions] = React.useState(null)
    const [isFallback, setIsFallback] = React.useState(false)

    React.useEffect(() => {
        if (!positions || positions.length < 2) return
        setRoutePositions(null)
        setIsFallback(false)

        // Cache key bazat pe coordonate (4 zecimale = ~11m precizie)
        const cacheKey = 'osrm_route_' + positions.map(p => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join('|')

        // Verifica cache localStorage
        try {
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
                setRoutePositions(JSON.parse(cached))
                return
            }
        } catch {}

        // Apel OSRM Route API
        let cancelled = false
        const coords = positions.map(([lat, lng]) => `${lng},${lat}`).join(';')
        fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
            .then(r => r.json())
            .then(data => {
                if (cancelled) return
                if (data.routes?.[0]) {
                    const pts = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
                    try { localStorage.setItem(cacheKey, JSON.stringify(pts)) } catch {}
                    setRoutePositions(pts)
                } else {
                    setIsFallback(true)
                }
            })
            .catch(() => {
                if (!cancelled) setIsFallback(true)
            })

        return () => { cancelled = true }
    }, [positions?.map(p => p?.join(',')).join('|')])

    if (!positions || positions.length < 2) return null
    const pts = routePositions || positions
    // Traseul VIRTUAL (simulat) e mereu dashed — se diferențiază clar față de GPS-ul real (solid, 100%)
    return <Polyline positions={pts} pathOptions={{ color: color, weight: weight || 3, opacity: opacity || 0.5, dashArray: "8, 8" }} />
}

const createCustomIcon = (text, isBase, teamColor, vehicleType = '') => {
    if (isBase) {
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:#1e293b;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:11px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);">B</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        })
    }
    const color = teamColor || '#3b82f6'
    const iconSvg = getVehicleIconSvg(vehicleType)
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="position:relative;width:40px;height:40px;">
            <div style="position:absolute;top:4px;left:4px;background-color:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);">${iconSvg}</div>
            <div style="position:absolute;top:0;right:0;background-color:${color};filter:brightness(0.75);border:2.5px solid white;border-radius:999px;min-width:18px;height:18px;display:flex;align-items:center;justify-content:center;padding:0 4px;box-shadow:0 1px 5px rgba(0,0,0,0.45);">
                <span style="color:white;font-size:10px;font-weight:900;font-family:sans-serif;line-height:1;letter-spacing:-0.5px;">${text}</span>
            </div>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    })
}



function createVehicleIcon(color, name, avatarUrl) {
    const apiBaseUrl = 'http://davidechape.localhost:5678';
    const fullAvatarUrl = avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : `${apiBaseUrl}${avatarUrl}`) : null;
    const themeColor = color || '#3b82f6';
    
    const innerHtml = fullAvatarUrl 
      ? `<img src="${fullAvatarUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid white;" />`
      : `<div style="width:32px;height:32px;border-radius:50%;background-color:${themeColor};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h4.3c.6 0 1.1.4 1.3.9l.8 2.1c.2.5.7.9 1.3.9h6.3c.6 0 1 .4 1 1v7c0 .6-.4 1-1 1h-2"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle></svg></div>`;
  
    return L.divIcon({
      html: innerHtml,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
}

// type: 'ours' = roșu (exclusiv noi) | 'common' = mov (ambii) | 'theirs' = verde (ei au, noi nu)
const SAND_STATIONS = [
    // ── COMUNE (mov) ─────────────────────────────────────────────────────────
    { type: 'common', name: 'Charleroi – EURO-SERVICES SA',        lat: 50.4170193, lng: 4.5534199, address: 'Rue du Port 20, 6250 Aiseau-Presles',           phone: '071 40 23 92' },
    { type: 'common', name: 'Izegem – NHM Izegem',                 lat: 50.9272618, lng: 3.2018133, address: 'Noordkaai 10/2, 8870 Izegem',                    phone: '' },
    { type: 'common', name: 'Brugge – NHM Brugge',                 lat: 51.2665246, lng: 3.2088231, address: 'Pathoekeweg 340, 8000 Brugge',                   phone: '' },
    { type: 'common', name: 'Nieuwpoort – NHM Nieuwpoort',         lat: 51.1354136, lng: 2.7516455, address: 'Noorderhavenoever, 8620 Nieuwpoort',              phone: '' },
    { type: 'common', name: 'Oostende – NHM Oostende',             lat: 51.2275026, lng: 2.9398425, address: 'Vismijnlaan 1, 8400 Oostende',                   phone: '' },
    { type: 'common', name: 'Lummen – Minera',                     lat: 51.0104855, lng: 5.2371281, address: 'Industriestraat 16, 3560 Lummen',                phone: '' },
    { type: 'common', name: 'Namur – Joassin',                     lat: 50.456251,  lng: 4.803254,  address: 'Rue Fernand Marchand 1, 5020 Flawinne (Namur)', phone: '' },
    { type: 'common', name: 'Liège – Sable et Granulats',          lat: 50.6771771, lng: 5.6454791, address: 'Rue du Rivage 35, 4040 Herstal (Liège)',         phone: '' },
    // ── EXCLUSIVE NOUĂ (roșu) ──────────────────────────────────────────────
    { type: 'ours',   name: 'Sint-Niklaas – Beernaerts Recycling', lat: 51.1852172, lng: 4.1951661, address: 'Anthonis De Jonghestraat 78, 9100 Sint-Niklaas', phone: '0497 80 15 55' },
    { type: 'ours',   name: 'Ninove – Baza Ninove',                lat: 50.8348922, lng: 4.0198178, address: 'Kaardeloodstraat 97, 9400 Ninove',               phone: '' },
    { type: 'ours',   name: 'Dour – Rougraff',                     lat: 50.4089517, lng: 3.7661104, address: 'Rue de Belle Vue 46, 7370 Dour',                 phone: '065 65 22 05' },
    { type: 'ours',   name: 'Ath – Stock Ath',                     lat: 50.6284713, lng: 3.7475372, address: 'Chaussée de Tournai 196, 7801 Ath',              phone: '068 26 98 00' },
    { type: 'ours',   name: 'Antwerpen – Dranaco NV',              lat: 51.2277072, lng: 4.4072291, address: 'Godefriduskaai 28, 2000 Antwerpen',              phone: '+32 3 231 08 54' },
    { type: 'ours',   name: 'Halle – Denayer Bouwmaterialen',      lat: 50.7286189, lng: 4.2324534, address: 'Suikerkaai 38, 1500 Halle',                     phone: '02 361 11 20' },
    { type: 'ours',   name: 'Tournai – SODEMAF',                   lat: 50.5873153, lng: 3.4316494, address: 'Rue du Canon 14, 7536 Vaulx (Tournai)',          phone: '' },
    { type: 'ours',   name: 'Erpe-Mere – Baza Erpe-Mere',          lat: 50.9400588, lng: 3.9886644, address: 'Oudenaardsesteenweg, 9420 Erpe-Mere',            phone: '' },
    { type: 'ours',   name: 'Roeselare – NHM Roeselare',           lat: 50.9272618, lng: 3.2018133, address: 'Noordkaai 10/2, 8870 Izegem',                    phone: '' },
    { type: 'ours',   name: 'Gent – Ghent Aggregates',             lat: 51.0872589, lng: 3.7469089, address: 'Singel 27 – Haven 0945A, 9000 Gent-Zeehaven',   phone: '+32 9 224 40 04' },
    // ── EI AU, NOI NU (verde) ─────────────────────────────────────────────────
    { type: 'theirs', name: 'Vermat Brussel',                       lat: 50.8833919, lng: 4.380019,  address: 'Leon Monnoyerkaai 11, 1000 Brussel',             phone: '' },
    { type: 'theirs', name: 'H&H Resources Brussels',               lat: 50.8730,    lng: 4.3560,    address: 'Vilvoordsealaan 294, 1000 Brussel',              phone: '' },
    { type: 'theirs', name: 'Delahaye-Lauwers Beringen',            lat: 51.0492507, lng: 5.2135924, address: 'Terbekstraat 40, 3580 Beringen',                  phone: '' },
    { type: 'theirs', name: 'Delahaye-Lauwers Boom',                lat: 51.0899953, lng: 4.3567157, address: 'Broekweg, 2850 Boom',                             phone: '' },
    { type: 'theirs', name: 'Van Pelt Wijnegem',                    lat: 51.2348132, lng: 4.5097425, address: 'Oud Sluisstraat 9, 2110 Wijnegem',                phone: '' },
    { type: 'theirs', name: 'Dranaco nv Grobbendonk',               lat: 51.1791592, lng: 4.73283,   address: 'Industrieweg 14, 2280 Grobbendonk',              phone: '' },
    { type: 'theirs', name: 'Van Pelt Schoten',                     lat: 51.2393448, lng: 4.4897778, address: 'Kanaaldijk 25, 2900 Schoten',                     phone: '' },
    { type: 'theirs', name: 'Mako-Beton Grobbendonk',               lat: 51.1810317, lng: 4.7430558, address: 'Oude Steenweg 35, 2280 Grobbendonk',              phone: '' },
    { type: 'theirs', name: 'Delahaye-Lauwers Gent',                lat: 51.0777196, lng: 3.7419082, address: 'Zuiddokweg 50, 9000 Gent',                        phone: '' },
    { type: 'theirs', name: 'Bert Containers Ronse',                lat: 50.751019,  lng: 3.6487897, address: 'Klein Frankrijkstraat 21, 9600 Ronse',             phone: '' },
    { type: 'theirs', name: 'Van Nieuwpoort Viola Gent',            lat: 51.0720,    lng: 3.7350,    address: 'Hubdonk 1, 9000 Gent',                            phone: '' },
    { type: 'theirs', name: 'Zandhandel Roeselare',                 lat: 50.9442993, lng: 3.1563553, address: 'Graankaai 4, 8800 Roeselare',                     phone: '' },
    { type: 'theirs', name: 'NHM Wielsbeke',                        lat: 50.9048,    lng: 3.3648,    address: 'Hooimeersstraat 3, 8710 Wielsbeke',                phone: '' },
    { type: 'theirs', name: 'Gobert Stréphy',                       lat: 50.4901717, lng: 4.1218161, address: 'Route du Grand Peuplier 4c, 7110 Stréphy',       phone: '' },
    { type: 'theirs', name: 'Gobert Soignies',                      lat: 50.5886417, lng: 4.0736223, address: 'Chemin de la Guelenne 29, 7060 Soignies',          phone: '' },
    { type: 'theirs', name: 'Gobert Tubize',                        lat: 50.6966616, lng: 4.2124112, address: 'Rue de La Déportation 218, 1480 Tubize',           phone: '' },
    { type: 'theirs', name: 'Nivelles Beton',                       lat: 50.5925732, lng: 4.3635333, address: 'Rue du Progrès 12, 1400 Nivelles',                 phone: '' },
    { type: 'theirs', name: 'Holcim Carrière de Leffe',             lat: 50.2697519, lng: 4.9089846, address: 'Charreau de Leffe, 5500 Dinant',                  phone: '' },
    { type: 'theirs', name: 'SGL Monsin Luik',                      lat: 50.6541521, lng: 5.6247559, address: 'Rue de l’île Monsin 2, 4020 Liège',               phone: '' },
    { type: 'theirs', name: 'SGL Hermalle',                         lat: 50.5583793, lng: 5.355951,  address: 'Rue des Tuiliers 14, 4480 Hermalle',               phone: '' },
    { type: 'theirs', name: 'GNB Beton Arlon',                      lat: 49.6866747, lng: 5.7700251, address: 'Rte de Bouillon 222, 6700 Arlon',                  phone: '' },
    { type: 'theirs', name: 'Famenne Betons',                       lat: 50.2232529, lng: 5.3331213, address: 'Rue du Parc Industriel 40, 6900 Marche-en-Famenne', phone: '' },
]

export default function LogisticsDashboard() {
    const { t } = useTranslation()
    const tenant = useTenantStore(s => s.tenant)
    const isDavideChape = !tenant || (tenant?.slug || '').toLowerCase().includes('davide') || (tenant?.name || '').toLowerCase().includes('davide')
    const [targetDate, setTargetDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    })
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTeams, setActiveTeams] = useState([])
    const [selectedWork, setSelectedWork] = useState(null)
    const [isMapFull, setIsMapFull] = useState(false)
    // gpsData removed — GPS comes from route.gps_trace (TripLog snapshot) only
    const [showSandStations, setShowSandStations] = useState(() => {
        try { return JSON.parse(localStorage.getItem('nisip_toggle') || 'false') } catch { return false }
    })
    const [focusedTeamId, setFocusedTeamId] = useState(null)
    const navigate = useNavigate()

    // Resetează focusul când se schimbă data sau echipele active din lista principală
    useEffect(() => {
        setFocusedTeamId(null)
    }, [targetDate, activeTeams])

    // Sincronizare cu API-ul nativ de fullscreen și ESC
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsMapFull(isFull);
            // Declanșăm un eveniment de resize global pentru ca Leaflet să își recalculeze sigur dimensiunile
            setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        };
        
        const handler = (e) => { if (e.key === 'Escape') setIsMapFull(false) }
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('keydown', handler)
        
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('keydown', handler)
        }
    }, [])

    useEffect(() => {
        localStorage.setItem('nisip_toggle', JSON.stringify(showSandStations))
    }, [showSandStations])

    const fetchRoutes = async () => {
        try {
            setLoading(true)
            // GPS trace comes from route.gps_trace (TripLog) in the snapshot — no secondary Flespi fetch needed
            const res = await api.get(`/admin/logistics/daily-routes?target_date=${targetDate}`)
            setData(res.data)
            setActiveTeams(res.data.routes.map(r => r.team_id))
        } catch (error) {
            console.error("Error fetching daily routes:", error)
        } finally {
            setLoading(false)
        }
    }

    const recalculate = async () => {
        try {
            setLoading(true)
            await api.post('/admin/logistics/archive-day', { target_date: targetDate })
            await fetchRoutes()
        } catch (error) {
            console.error("Recalculate error:", error)
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRoutes()
    }, [targetDate])

    const toggleTeam = (teamId) => {
        setActiveTeams(prev => 
            prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
        )
    }

    // Calculăm o șansă de ploaie fictivă (0-70%) dar constantă pentru o anumită dată
    const rainChance = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < targetDate.length; i++) hash = targetDate.charCodeAt(i) + ((hash << 5) - hash);
        return Math.abs(hash) % 70;
    }, [targetDate]);

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 min-h-[calc(100vh-64px)] flex flex-col">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="w-7 h-7 text-blue-600" /> {t('logistics.title', 'Logistică')}
                    </h1>
                    <p className="text-slate-500 text-sm">{t('logistics.subtitle', 'Organizare zilnică, trasee și necesar de materiale.')}</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                        <Link to="/admin/logistica/bases" className="px-4 h-9 flex items-center gap-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">
                            <MapPin className="w-4 h-4" /> {t('logistics.bases', 'Baze')}
                        </Link>
                        {isDavideChape && (
                            <Link to="/admin/logistica/sand-stations" className="px-4 h-9 flex items-center gap-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">
                                <Beaker className="w-4 h-4" /> {t('logistics.sand_stations', 'Stații Nisip')}
                            </Link>
                        )}
                        <Link to="/admin/logistica/raport" className="px-4 h-9 flex items-center gap-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">
                            <BarChart3 className="w-4 h-4" /> {t('logistics.report', 'Raport')}
                        </Link>
                        <Link to="/admin/logistica/gps-verification" className="px-4 h-9 flex items-center gap-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">
                            <Navigation className="w-4 h-4" /> Vérif. GPS
                        </Link>
                    </div>
                    
                    <div className="flex items-center bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-11 shrink-0">
                        <button 
                            onClick={() => {
                                const d = new Date(targetDate);
                                d.setDate(d.getDate() - 1);
                                setTargetDate(d.toISOString().split('T')[0]);
                            }}
                            className="px-3 hover:bg-slate-50 dark:hover:bg-slate-700 h-full flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors border-r border-slate-100 dark:border-slate-700"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="relative flex-1 min-w-[130px]">
                            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input 
                                type="date" 
                                value={targetDate}
                                onChange={e => setTargetDate(e.target.value)}
                                className="pl-9 pr-2 h-full text-sm font-bold bg-transparent outline-none w-full text-slate-800 dark:text-white dark:[color-scheme:dark]"
                            />
                        </div>
                        <button 
                            onClick={() => {
                                const d = new Date(targetDate);
                                d.setDate(d.getDate() + 1);
                                setTargetDate(d.toISOString().split('T')[0]);
                            }}
                            className="px-3 hover:bg-slate-50 dark:hover:bg-slate-700 h-full flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors border-l border-slate-100 dark:border-slate-700"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    {/* Archive Badge + Recalculează */}
                    {(data?.is_archived || data?.archive_pending || (data && targetDate < new Date().toISOString().split('T')[0])) && (
                        <div className="flex items-center gap-2 shrink-0">
                            {data?.is_archived && (
                                <div className="flex items-center gap-1.5 px-3 h-11 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm rounded-full border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 className="w-4 h-4" /> {t('logistics.archived', 'Archivé')}
                                </div>
                            )}
                            {data?.archive_pending && (
                                <div className="flex items-center gap-1.5 px-3 h-11 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold text-sm rounded-full border border-orange-200 dark:border-orange-800">
                                    <RefreshCw className="w-4 h-4" /> {t('logistics.incomplete_coords', 'Coordonnées manquantes')}
                                </div>
                            )}
                            <button
                                onClick={recalculate}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-3 h-11 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-sm rounded-full border border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                                title={t('logistics.recalculate_tooltip', 'Recalculer les itinéraires pour cette journée')}
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {t('logistics.recalculate', 'Recalculer')}
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                </div>
            ) : !data ? (
                <div className="flex-1 flex items-center justify-center text-slate-500">Nu s-au putut încărca datele.</div>
            ) : (
                <div className="flex-1 flex flex-col gap-6">
                     {/* Top Area: Interactive Map */}
                    <div id="logistics-map-container" className={isMapFull
                        ? 'fixed inset-0 z-[9999] bg-black w-screen h-screen'
                        : 'w-full h-[500px] lg:h-[700px] bg-slate-100 rounded-2xl shadow-inner border border-slate-200 overflow-hidden relative shrink-0'
                    } style={{ isolation: 'isolate' }}>
                        {(() => {
                            const tenant = useTenantStore.getState().tenant;
                            let defaultCenter = [50.8503, 4.3517]; // BE
                            if (tenant?.country === 'RO') defaultCenter = [45.9432, 24.9668];
                            else if (tenant?.country === 'NL') defaultCenter = [52.3676, 4.9041];
                            else if (tenant?.country === 'FR') defaultCenter = [46.2276, 2.2137];
                            else if (tenant?.country === 'DE') defaultCenter = [51.1657, 10.4515];
                            
                            return (
                                <MapContainer
                                    center={defaultCenter} 
                                    zoom={7} 
                                    scrollWheelZoom={false}
                                    style={{ width: '100%', height: '100%' }}
                                >
                            <TileLayer
                                attribution='&copy; Google Maps'
                                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                maxZoom={20}
                            />
                            <MapBoundsFitter data={data} activeTeams={focusedTeamId ? [focusedTeamId] : activeTeams} />
                            <MapResizer isMapFull={isMapFull} />

                            
                            {data.routes.filter(r => activeTeams.includes(r.team_id) && (!focusedTeamId || r.team_id === focusedTeamId)).map(route => {
                                const validWps = route.waypoints.filter(wp => wp.lat && wp.lng)

                                // Dacă nu există niciun waypoint cu GPS → cauta baza si pune un marker special
                                if (validWps.length === 0) {
                                    // Fara GPS deloc — nu putem afisa nimic
                                    return null
                                }

                                const positions = validWps.map(wp => [wp.lat, wp.lng])

                                // Echipe cu GPS doar pe baza (fara locatii santiere) — afisam bazele cu marker de echipa
                                const workWps = validWps.filter(wp => !wp.type?.includes('base'))
                                const hasOnlyBase = workWps.length === 0

                                return (
                                    <React.Fragment key={`map-route-${route.team_id}`}>
                                        {/* Linia de traseu Virtual (simulat) — 50% opacitate, dashed */}
                                        {positions.length > 1 && !hasOnlyBase && (
                                            <RoutingMachine
                                                positions={positions}
                                                color={route.team_color}
                                                weight={4}
                                                opacity={0.5}
                                            />
                                        )}

                                        {/* Traseul GPS real (din TripLog/Flespi) — acum vine direct din route.gps_trace */}
                                        {route.gps_trace && route.gps_trace.length > 1 && (
                                            (() => {
                                                const gpsPositions = route.gps_trace.map(p => [p.lat, p.lng]);
                                                const lastPos = route.gps_trace[route.gps_trace.length - 1];
                                                return (
                                                    <React.Fragment key={`gps-frag-${route.team_id}`}>
                                                        <Polyline
                                                            key={`gps-poly-${route.team_id}`}
                                                            positions={gpsPositions}
                                                            pathOptions={{ color: route.team_color, weight: 5, opacity: 1.0 }}
                                                        />
                                                        <Marker 
                                                            position={[lastPos.lat, lastPos.lng]}
                                                            icon={createCustomIcon('★', false, route.team_color, route.vehicle_type)}
                                                        >
                                                            <Popup>
                                                                <div>
                                                                    <strong className="text-sm">{route.team_name}</strong>
                                                                    <br/><span className="text-xs text-slate-500">Dernière position GPS</span>
                                                                    {lastPos.speed > 0 && (
                                                                        <><br/><span className="text-xs text-blue-600">{lastPos.speed} km/h</span></>
                                                                    )}
                                                                </div>
                                                            </Popup>
                                                        </Marker>
                                                    </React.Fragment>
                                                );
                                            })()
                                        )}

                                        {/* Fallback Flespi removed — GPS comes only from route.gps_trace (TripLog) */}


                                        {validWps.map((wp, idx) => {
                                            // Daca echipa nu are GPS pe santiere, afisam baza cu camion normal
                                            if (hasOnlyBase && wp.type?.includes('base')) {
                                                return (
                                                    <Marker key={`wp-nomap-${idx}`} position={[wp.lat, wp.lng]}
                                                        icon={createCustomIcon('!', false, route.team_color, route.vehicle_type)}>
                                                        <Popup>
                                                            <strong>{route.team_name}</strong>
                                                            <br /><span style={{color:'#f59e0b', fontSize:'11px'}}>⚠️ Comenzile nu au coordonate GPS</span>
                                                            <br /><span style={{fontSize:'11px', color:'#64748b'}}>{wp.name}</span>
                                                        </Popup>
                                                    </Marker>
                                                )
                                            }

                                            return (
                                                <Marker
                                                    key={`wp-${idx}`}
                                                    position={[wp.lat, wp.lng]}
                                                    icon={createCustomIcon(wp.type?.includes('base') ? 'B' : idx, wp.type?.includes('base'), route.team_color, route.vehicle_type)}
                                                >
                                                    <Popup>
                                                        <strong className="text-sm">{wp.name}</strong>
                                                    </Popup>
                                                </Marker>
                                            )
                                        })}

                                    </React.Fragment>
                                )
                            })}


                            {/* Sand Stations Rendering */}
                            {isDavideChape && showSandStations && SAND_STATIONS.map((station, idx) => {
                                const _letter = station.type === 'theirs' ? 'I' : 'D'
                                const _bg = '#ef4444'
                                const bgColor = '#ef4444'
                                const borderColor = '#dc2626'
                                return (
                                    <Marker
                                        key={`sand-${idx}`}
                                        position={[station.lat, station.lng]}
                                        icon={L.divIcon({
                                            className: '',
                                            html: `<div style="width:26px;height:26px;border-radius:50%;background:${_bg};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);position:relative;"><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-weight:900;font-size:12px;font-family:Arial,sans-serif;line-height:1;">${_letter}</span></div>`,
                                            iconSize: [26, 26],
                                            iconAnchor: [13, 13]
                                        })}
                                    >
                                        <Popup>
                                            <strong className="text-sm">{station.name}</strong><br/>
                                            <span className="text-xs text-slate-500">{station.address}</span>
                                            {station.phone && <><br/><span className="text-xs font-semibold">{station.phone}</span></>}
                                            <br/>
                                            <div className="mt-1">
                                                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background: bgColor, border: `2px solid ${borderColor}`, color:'white'}}>
                                                    {station.type === 'common' ? '● Noi + Ei (Comună)' : station.type === 'theirs' ? '● Doar Ei (Concurență)' : '● Doar Noi (Exclusivă)'}
                                                </span>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )
                            })}
                            {/* Sand Stations + Fullscreen — top controls row */}
                            <div className="absolute top-4 left-14 z-[1000] flex items-center gap-2 pointer-events-auto">
                                {/* Fullscreen button */}
                                <button
                                    onClick={() => {
                                        const elem = document.getElementById('logistics-map-container');
                                        if (!document.fullscreenElement && elem?.requestFullscreen) {
                                            elem.requestFullscreen().catch(() => setIsMapFull(f => !f));
                                        } else if (document.fullscreenElement && document.exitFullscreen) {
                                            document.exitFullscreen();
                                        } else {
                                            // Fallback for browsers that don't support it well
                                            setIsMapFull(f => !f);
                                        }
                                    }}
                                    className="bg-white dark:bg-slate-800 px-2.5 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center"
                                    title={isMapFull ? 'Ieși fullscreen (ESC)' : 'Fullscreen hartă'}
                                >
                                    {isMapFull
                                        ? <Minimize2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                                        : <Maximize2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                                    }
                                </button>
                                {/* Sand Stations toggle */}
                                {isDavideChape && (
                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                        <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 ${showSandStations ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={showSandStations}
                                                onChange={(e) => setShowSandStations(e.target.checked)}
                                            />
                                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${showSandStations ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('logistics.sand_stations', 'Staţii Nisip')}</span>
                                    </label>
                                )}
                            </div>
                        </MapContainer>
                        );
                    })()}

                        {/* Map Overlay Stats & Teams */}
                        <div className="absolute top-4 right-4 z-[400] pointer-events-none flex flex-col gap-3 max-h-[calc(100%-2rem)] overflow-y-auto no-scrollbar pb-4">
                            
                            {/* Date Selector - Vizibil doar in Fullscreen pentru a evita dublarea */}
                            {isMapFull && (
                                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden h-11 shrink-0 w-64 flex items-center pointer-events-auto">
                                    <button 
                                        onClick={() => {
                                            const d = new Date(targetDate);
                                            d.setDate(d.getDate() - 1);
                                            setTargetDate(d.toISOString().split('T')[0]);
                                        }}
                                        className="px-3 hover:bg-slate-50 dark:hover:bg-slate-700 h-full flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors border-r border-slate-100 dark:border-slate-700"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div className="relative flex-1 min-w-0">
                                        <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                        <input 
                                            type="date" 
                                            value={targetDate}
                                            onChange={e => setTargetDate(e.target.value)}
                                            className="pl-9 pr-2 h-full text-sm font-bold bg-transparent outline-none w-full text-slate-800 dark:text-white dark:[color-scheme:dark]"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const d = new Date(targetDate);
                                            d.setDate(d.getDate() + 1);
                                            setTargetDate(d.toISOString().split('T')[0]);
                                        }}
                                        className="px-3 hover:bg-slate-50 dark:hover:bg-slate-700 h-full flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors border-l border-slate-100 dark:border-slate-700"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {/* Legend */}
                            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 pointer-events-auto shrink-0 w-64">
                                <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-900 dark:text-white mb-2 flex items-center gap-1.5"><Layers className="w-3 h-3" /> {t('logistics.map_legend', 'Legenda Hartă')}</div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                        <div className="w-3 h-3 rounded-full bg-slate-800 dark:bg-slate-600 border-2 border-white dark:border-slate-700 shadow-sm"></div> {t('logistics.base_start', 'Bază / Start')}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                        <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-700 shadow-sm"></div> {t('logistics.site_job', 'Șantier / Lucrare')}
                                    </div>
                                    {isDavideChape && showSandStations && (
                                        <>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm flex items-center justify-center text-[9px] text-white font-black">D</div> Stații Nisip – Noi
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm flex items-center justify-center text-[9px] text-white font-black">I</div> Stații Nisip – Concurență
                                        </div>
                                        </>
                                    )}
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                        <div className="w-5 h-1 border-b-2 border-dashed border-slate-400 dark:border-slate-500"></div> {t('logistics.car_route', 'Traseu auto')}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Active Teams Panel */}
                            {data?.routes?.length > 0 && activeTeams.length > 0 && (
                                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 pointer-events-auto shrink-0 w-64 flex flex-col gap-3">
                                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-900 dark:text-white flex items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1.5"><Truck className="w-3 h-3" /> {t('logistics.teams_on_route', 'Équipes en Route')} ({activeTeams.length})</div>
                                        <div className="flex items-center gap-1 text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full" title="Șanse estimative de precipitații">
                                            <CloudRain className="w-3 h-3" /> {rainChance}%
                                        </div>
                                    </div>
                                    {data.routes.filter(r => activeTeams.includes(r.team_id)).map(route => {
                                        const workWps = route.waypoints.filter(wp => wp.type === 'work');
                                        const totalTons = (route.total_sand_kg || 0) / 1000;
                                        const isFocused = focusedTeamId === route.team_id;
                                        const isDimmed = focusedTeamId && !isFocused;
                                        
                                        return (
                                            <div 
                                                key={route.team_id} 
                                                onClick={() => setFocusedTeamId(prev => prev === route.team_id ? null : route.team_id)}
                                                className={`flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-700/50 pt-2 first:border-0 first:pt-0 cursor-pointer transition-opacity duration-200 hover:opacity-100 ${isDimmed ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className="w-3 h-3 rounded-full shadow-sm shrink-0 border border-white/50" style={{ backgroundColor: route.team_color }}></div>
                                                        <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate" title={route.team_name}>{route.team_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[10px] font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                                            {Math.round(route.total_distance_km || 0)}km
                                                        </span>
                                                        {totalTons > 0 && (
                                                            <span className="text-[10px] font-bold text-slate-900 dark:text-white shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                                                {totalTons.toFixed(1)}t
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {workWps.length > 0 ? (
                                                    <div className="flex flex-col gap-1 pl-5">
                                                        {workWps.map((wp, i) => {
                                                            const wpTons = (wp.sand_kg || 0) / 1000;
                                                            return (
                                                                <div key={i} className="flex justify-between items-center gap-2">
                                                                    <div className="text-[10px] font-medium text-slate-900 dark:text-white truncate flex items-center gap-1.5" title={wp.name}>
                                                                        <div className="w-1 h-1 rounded-full bg-slate-900 dark:bg-white shrink-0"></div>
                                                                        <span className="truncate">{wp.name}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        {wp.distance_from_prev_km > 0 && (
                                                                            <span className="text-[9px] font-bold text-slate-900 dark:text-white shrink-0 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                                                                +{Math.round(wp.distance_from_prev_km)}km
                                                                            </span>
                                                                        )}
                                                                        {wpTons > 0 && (
                                                                            <span className="text-[9px] font-bold text-slate-900 dark:text-white shrink-0 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                                                                {wpTons.toFixed(1)}t
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 italic pl-5">Fără comenzi.</div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Area: Stats & Teams */}
                    <div className="w-full flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('logistics.total_sand', 'Total Nisip')}</span>
                                <div className="text-2xl font-black text-amber-600 dark:text-amber-500">{(data.grand_total_sand_kg / 1000).toFixed(1)} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{t('logistics.tons', 'tone')}</span></div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('logistics.est_distance', 'Distanță Est.')}</span>
                                <div className="text-2xl font-black text-blue-600 dark:text-blue-500">{Math.round(data.grand_total_distance_km)} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">km</span></div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <Filter className="w-4 h-4 text-slate-500" /> {t('logistics.team_routes', 'Trasee Echipe')}
                                </h3>
                                <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-full">{data.routes.length} {t('common.teams_lowercase', 'équipes')}</span>
                            </div>
                            <div className="p-3 space-y-3">
                                {data.routes.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500 text-sm">{t('logistics.no_planned_works', 'Aucun travail planifié.')}</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {data.routes.map(route => {
                                        const isActive = activeTeams.includes(route.team_id)
                                        return (
                                            <div 
                                                key={route.team_id} 
                                                onClick={() => toggleTeam(route.team_id)}
                                                className={`rounded-xl border transition-all cursor-pointer flex flex-col h-full bg-white dark:bg-slate-800 overflow-hidden ${isActive ? 'border-slate-300 dark:border-slate-600 shadow-lg' : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'}`}
                                            >
                                                <div className="px-4 py-2.5 flex items-center justify-between shadow-sm" style={{ backgroundColor: route.team_color }}>
                                                    <span className="font-bold text-white tracking-wide" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}>{route.team_name}</span>
                                                </div>
                                                <div className="p-4 flex flex-col flex-1">

                                                <div className="grid grid-cols-2 gap-2 mb-4">
                                                    <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                                        <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{t('logistics.sand_needed', 'Necesar Nisip')}</div>
                                                        <div className="font-bold text-slate-900 dark:text-white">{(route.total_sand_kg / 1000).toFixed(1)} t</div>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800 relative">
                                                        <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                            <TruckSVG color={route.team_color || '#64748b'} vehicleType={route.vehicle_type} className="w-3.5 h-3.5" />
                                                            {t('logistics.distance', 'Distanţă')}
                                                        </div>
                                                        <div className="font-bold text-slate-900 dark:text-white">{Math.round(route.total_distance_km)} km</div>
                                                        
                                                        {(() => {
                                                            // GPS deviation badge — uses gps_trace from route (TripLog snapshot)
                                                            const gpsTrace = route.gps_trace;
                                                            if (!gpsTrace || gpsTrace.length === 0) return null;
                                                            // Calculate approximate GPS distance from trace points
                                                            let gpsTotalKm = 0;
                                                            for (let i = 1; i < gpsTrace.length; i++) {
                                                                const dx = (gpsTrace[i].lng - gpsTrace[i-1].lng) * Math.cos((gpsTrace[i].lat + gpsTrace[i-1].lat) * Math.PI / 360) * 111.32;
                                                                const dy = (gpsTrace[i].lat - gpsTrace[i-1].lat) * 111.32;
                                                                gpsTotalKm += Math.sqrt(dx*dx + dy*dy);
                                                            }
                                                            const devKm = gpsTotalKm - route.total_distance_km;
                                                            if (devKm > 5) {
                                                                return (
                                                                    <div className="absolute top-2 right-2 flex flex-col items-end">
                                                                        <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800 animate-pulse" title="Écart de trajet GPS">
                                                                            +{Math.round(devKm)} km
                                                                        </span>
                                                                        <span className="text-[9px] text-red-500 mt-0.5 font-semibold">Écart GPS</span>
                                                                    </div>
                                                                )
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                </div>
                                                
                                                {isActive && route.waypoints.length > 0 && (
                                                    <div className="space-y-2 relative before:absolute before:inset-y-2 before:left-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                                                        {route.waypoints.map((wp, idx) => {
                                                            const isBase = wp.type === 'base' || wp.type === 'base_return';
                                                            const isReturn = wp.type === 'base_return';
                                                            return (
                                                            <div
                                                                key={idx}
                                                                className={`flex gap-3 relative z-10 text-xs ${!isBase ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg px-1 -mx-1 transition-colors' : ''}`}
                                                                onClick={e => {
                                                                    e.stopPropagation()
                                                                    if (!isBase) setSelectedWork({ wp, route })
                                                                }}
                                                            >
                                                                <div 
                                                                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-[9px] shadow-sm ${isBase ? 'bg-slate-800 dark:bg-slate-600' : ''}`}
                                                                    style={isBase ? {} : { backgroundColor: route.team_color }}
                                                                >
                                                                    {isReturn ? '↩' : isBase ? 'B' : idx}
                                                                </div>
                                                                <div className="flex-1 pt-0.5">
                                                                    <div className={`font-bold leading-tight ${isReturn ? 'text-slate-500 dark:text-slate-400 italic text-[10px]' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                        {isReturn ? t('logistics.return_base', 'Retour à la base') : wp.name}
                                                                        {wp.distance_from_prev_km > 0 && (
                                                                            <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-bold whitespace-nowrap">
                                                                                (+{Math.round(wp.distance_from_prev_km)} km)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {wp.sand_kg > 0 && <div className="text-slate-600 dark:text-slate-400 font-semibold mt-0.5">{t('logistics.sand', 'Nisip')}: {(wp.sand_kg/1000).toFixed(1)} t</div>}
                                                                </div>
                                                            </div>
                                                        )})}
                                                    </div>
                                                )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Work Order Info Drawer */}
            {selectedWork && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                        onClick={() => setSelectedWork(null)}
                    />
                    {/* Drawer */}
                    <div className="fixed bottom-0 left-0 right-0 z-50 md:left-auto md:right-6 md:bottom-6 md:w-96 bg-white dark:bg-slate-800 rounded-t-2xl md:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                        {/* Header in team color */}
                        <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: selectedWork.route.team_color }}>
                            <div className="flex items-center gap-2">
                                <TruckSVG color={selectedWork.route.team_color} vehicleType={selectedWork.route.vehicle_type} className="w-5 h-5 opacity-80" />
                                <span className="font-bold text-white text-sm tracking-wide">{selectedWork.route.team_name}</span>
                            </div>
                            <button onClick={() => setSelectedWork(null)} className="text-white/80 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{selectedWork.wp.name}</h3>
                                {selectedWork.wp.address && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        {selectedWork.wp.address}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {selectedWork.wp.sand_kg > 0 && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-100 dark:border-amber-800">
                                        <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Nisip</div>
                                        <div className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
                                            {(selectedWork.wp.sand_kg / 1000).toFixed(2)} <span className="text-sm font-normal text-amber-500">t</span>
                                        </div>
                                    </div>
                                )}
                                {selectedWork.wp.distance_from_prev_km > 0 && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
                                        <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Distanță</div>
                                        <div className="text-lg font-black text-blue-700 dark:text-blue-300 mt-0.5">
                                            +{Math.round(selectedWork.wp.distance_from_prev_km)} <span className="text-sm font-normal text-blue-500">km</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => { setSelectedWork(null); navigate(`/admin/work-orders/${selectedWork.wp.id}`) }}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110 active:scale-95"
                                style={{ backgroundColor: selectedWork.route.team_color }}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Detalii comandă
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

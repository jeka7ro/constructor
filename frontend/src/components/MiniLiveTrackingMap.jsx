import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import { useTenantStore } from '../store/tenantStore'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Clock, Gauge, RefreshCw, Radio } from 'lucide-react'
import { Expand, Shrink, Truck } from 'lucide-react'

function FitBounds({ vehicles }) {
  const map = useMap();
  useEffect(() => {
    if (vehicles.length === 0) return;
    const bounds = L.latLngBounds(vehicles.map(v => [v.lat, v.lng]));
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
  }, [vehicles.length]);
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

function createVehicleIcon(color, name, avatarUrl, vehicleType) {
  const shortName = name ? name.substring(0, 15) : '?';
  const initials = shortName[0].toUpperCase();
  const apiBaseUrl = 'http://davidechape.localhost:5678';
  const fullAvatarUrl = avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : `${apiBaseUrl}${avatarUrl}`) : null;
  const themeColor = color || '#3b82f6';
  
  const vType = (vehicleType || '').toLowerCase();
  
  const truckSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`;
  const chapeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><rect x="2" y="7" width="8" height="6" rx="2" fill="white" opacity="0.3"/></svg>`;
  const mixerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M2 13 l6 -7 l2 2 l-6 7 z" fill="white" opacity="0.4"/></svg>`;
  const camionGrueSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M10 13 L3 4 L5 3 L12 11" fill="white" opacity="0.8"/></svg>`;
  const craneSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M7 21v-4"/><path d="M17 21v-4"/><path d="M12 17V3l-7 4"/><path d="M12 10l5 3"/></svg>`;

  let selectedSvg = truckSvg;
  if (vType.includes('chape')) selectedSvg = chapeSvg;
  else if (vType.includes('beton') || vType.includes('toupie')) selectedSvg = mixerSvg;
  else if (vType.includes('grue') && vType.includes('camion')) selectedSvg = camionGrueSvg;
  else if (vType.includes('grue')) selectedSvg = craneSvg;

  const avatarHtml = fullAvatarUrl 
    ? `<img src="${fullAvatarUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid white;" />`
    : `<div style="width:32px;height:32px;border-radius:50%;background-color:${themeColor};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,0.3);">${selectedSvg}</div>`;

  return L.divIcon({
    html: avatarHtml,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

const POLL_INTERVAL = 15000;

export default function MiniLiveTrackingMap() {
  const { t } = useTranslation();
  const tenant = useTenantStore(s => s.tenant);
  const isDavideChape = !tenant || (tenant?.slug || '').toLowerCase().includes('davide') || (tenant?.name || '').toLowerCase().includes('davide');
  const [vehicles, setVehicles] = useState([]);
  const [sandStations, setSandStations] = useState([]);
  const [showSandStations, setShowSandStations] = useState(() => {
      const saved = localStorage.getItem('minilivetracking_nisip_toggle');
      return saved ? JSON.parse(saved) : true;
  });
  const [showLegend, setShowLegend] = useState(() => {
      const saved = localStorage.getItem('minilivetracking_legend_toggle');
      return saved ? JSON.parse(saved) : true;
  });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [isMapFull, setIsMapFull] = useState(false);
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
      localStorage.setItem('minilivetracking_nisip_toggle', JSON.stringify(showSandStations));
  }, [showSandStations]);

  useEffect(() => {
      localStorage.setItem('minilivetracking_legend_toggle', JSON.stringify(showLegend));
  }, [showLegend]);

  const fetchLive = useCallback(async () => {
    try {
      const [resVehicles, resStations] = await Promise.all([
          api.get('/admin/vehicles/live'),
          isDavideChape ? api.get('/admin/logistics/sand-stations').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);
      setVehicles(resVehicles.data || []);
      if (isDavideChape && resStations.data) {
          setSandStations(resStations.data);
      }
      setConnected(true);
    } catch (e) {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    intervalRef.current = setInterval(fetchLive, POLL_INTERVAL);
    
    const handleFullscreenChange = () => {
        setIsMapFull(!!document.fullscreenElement);
        // Force Leaflet to recalculate its size after a small delay
        setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        }, 100);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
        clearInterval(intervalRef.current);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [fetchLive]);

  const center = [51.2, 4.4]; // Belgium default

  return (
    <div ref={containerRef} className={`flex flex-col bg-white dark:bg-slate-900 overflow-hidden shadow-sm ${isMapFull ? "fixed inset-0 z-[9999] rounded-none border-none w-screen h-screen" : "w-full h-full rounded-xl border border-slate-200 dark:border-slate-700"}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
        <h3 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wide text-sm">
          <Radio className="w-4 h-4 text-blue-500" />
          {t('dashboard.live_tracking', 'LIVE TRACKING')}
        </h3>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('logistics.legend', 'Légende')}</span>
                <div className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showLegend ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    onClick={() => setShowLegend(!showLegend)}
                >
                    <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${showLegend ? 'translate-x-3' : 'translate-x-0'}`} />
                </div>
            </div>
            {isDavideChape && (
                <div className="flex items-center gap-2 mr-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('live.sand', 'Sable')}</span>
                    <div className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showSandStations ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        onClick={() => setShowSandStations(!showSandStations)}
                    >
                        <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${showSandStations ? 'translate-x-3' : 'translate-x-0'}`} />
                    </div>
                </div>
            )}
            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 rounded-full">{vehicles.length} {t("live.active", "actif")}{vehicles.length !== 1 ? 's' : ''}</span>
            <button onClick={() => {
                if (!document.fullscreenElement) {
                    containerRef.current?.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable fullscreen: ${err.message}`);
                    });
                } else {
                    document.exitFullscreen();
                }
            }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mr-2">
                {isMapFull ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
            </button>
            <button onClick={fetchLive} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
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
        {/* Floating Legend right aligned */}
        {showLegend && (
        <div className="absolute top-4 right-4 z-[1000] w-64 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 pointer-events-auto flex flex-col gap-3 max-h-[calc(100%-2rem)] overflow-y-auto">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-900 dark:text-white flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                    <Truck className="w-3 h-3" /> {t('logistics.legend', 'Légende')} ({vehicles.length})
                </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
                {vehicles.map(v => {
                    const isMoving = v.speed > 0;
                    return (
                        <div key={v.id} className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-700/50 pt-2 first:border-0 first:pt-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-lg p-1 -mx-1" onClick={() => {
                            if (mapRef.current) {
                                mapRef.current.flyTo([v.lat, v.lng], 16, { animate: true, duration: 1.5 });
                            }
                        }}>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="relative shrink-0">
                                        <div className="w-3 h-3 rounded-full shadow-sm shrink-0 border border-white/50" style={{ backgroundColor: v.team_color }}></div>
                                    </div>
                                    <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate" title={v.name}>{v.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {v.distance_today != null && (
                                        <span className="text-[10px] font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                            {v.distance_today}km
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 pl-5">
                                <div className="flex justify-between items-center gap-2">
                                    <div className="text-[10px] font-medium text-slate-900 dark:text-white truncate flex items-center gap-1.5 text-slate-500 italic">
                                        {isMoving ? `${Math.round(v.speed)} km/h` : (v.location_text || t('live.stopped', "À l'arrêt"))}
                                    </div>
                                </div>
                            </div>
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
                url="https://mt1.google.com/vt/lyrs=m&hl=fr&x={x}&y={y}&z={z}"
                attribution="&copy; Google Maps"
                maxZoom={20}
            />
            {vehicles.length > 0 && <FitBounds vehicles={vehicles} />}
            
            {/* Sand Stations Markers */}
            {isDavideChape && showSandStations && sandStations.filter(s => s.latitude && s.longitude).map((s) => (
                <Marker 
                    key={`sand-${s.id}`} 
                    position={[s.latitude, s.longitude]} 
                    icon={L.divIcon({
                        html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">S</div>`,
                        className: '',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                        popupAnchor: [0, -12]
                    })}
                >
                    <Popup className="tracking-popup">
                        <div className="font-bold text-sm text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500 mt-1">{s.address}</div>
                    </Popup>
                </Marker>
            ))}

            {vehicles.map(v => (
                <Marker
                key={v.id}
                position={[v.lat, v.lng]}
                icon={createVehicleIcon(v.team_color, v.name, v.avatar_url, v.vehicle_type)}
                >
                <Popup className="tracking-popup">
                    <div className="flex items-center gap-3 mb-2">
                    {v.avatar_url && (
                        <img 
                        src={v.avatar_url.startsWith('http') ? v.avatar_url : `http://davidechape.localhost:5678${v.avatar_url}`} 
                        alt="avatar" 
                        className="w-8 h-8 rounded-full object-cover border-2" 
                        style={{ borderColor: v.team_color }}
                        />
                    )}
                    <div>
                        <div className="text-sm font-bold">{v.name}</div>
                    </div>
                    </div>
                    <div className="text-xs mt-1 text-slate-500">{t('live.last_seen', 'Vu')}: {formatLastSeen(v.last_seen, t)}</div>
                    {v.location_text && (
                      <div className="text-xs mt-1 text-blue-600 font-bold">{v.location_text}</div>
                    )}
                    {v.speed != null && (
                    <div className="text-xs text-slate-500">{t('live.speed', 'Vitesse')}: {Math.round(v.speed)} km/h</div>
                    )}
                </Popup>
                </Marker>
            ))}
            </MapContainer>
      </div>
    </div>
  )
}

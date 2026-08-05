import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { Radio, Users, Clock, Gauge, RefreshCw, Wifi, WifiOff, ChevronDown, ChevronUp, Navigation, Truck } from 'lucide-react';
import api from '../../lib/api';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useTenantStore } from '../../store/tenantStore';
import useViewPreferencesStore from '../../store/viewPreferencesStore';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const POLL_INTERVAL = 30000; // 30s

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

function FitBounds({ vehicles }) {
  const map = useMap();
  const hasFitted = useRef(false);
  useEffect(() => {
    if (hasFitted.current) return;
    if (vehicles.length === 0) return;
    const bounds = L.latLngBounds(vehicles.map(v => [v.lat, v.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    hasFitted.current = true;
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

function MapResizer({ isMapFull }) {
  const map = useMap();
  useEffect(() => {
      const timer = setTimeout(() => {
          map.invalidateSize();
      }, 300);
      return () => clearTimeout(timer);
  }, [map, isMapFull]);
  return null;
}

export default function LiveTracking() {
  const { t } = useTranslation();
  const tenant = useTenantStore((state) => state.tenant);
  const isDavideChape = !tenant || (tenant?.slug || '').toLowerCase().includes('davide') || (tenant?.name || '').toLowerCase().includes('davide');
  const [vehicles, setVehicles] = useState([]);
  const [sandStations, setSandStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connected, setConnected] = useState(true);
  const [isMapFull, setIsMapFull] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const mapRef = useRef(null);
  const globalTheme = useViewPreferencesStore(state => state.globalTheme);
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

  const handleCardClick = (v) => {
    if (mapRef.current) {
      mapRef.current.setView([v.lat - 0.004, v.lng], 15, { animate: true });
    }
  };
  const [showSandStations, setShowSandStations] = useState(() => {
      const saved = localStorage.getItem('livetracking_nisip_toggle');
      return saved ? JSON.parse(saved) : true;
  });
  const intervalRef = useRef(null);

  useEffect(() => {
      localStorage.setItem('livetracking_nisip_toggle', JSON.stringify(showSandStations));
  }, [showSandStations]);

  useEffect(() => {
      const handleFullscreenChange = () => {
          const isFull = !!document.fullscreenElement;
          setIsMapFull(isFull);
      };
      
      const handler = (e) => { if (e.key === 'Escape') setIsMapFull(false) }
      document.addEventListener('keydown', handler);
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      
      return () => {
          document.removeEventListener('keydown', handler);
          document.removeEventListener('fullscreenchange', handleFullscreenChange);
      }
  }, []);

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
      setLastUpdate(new Date());
      setConnected(true);
    } catch (e) {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [isDavideChape]);

  useEffect(() => {
    fetchLive();
    intervalRef.current = setInterval(fetchLive, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchLive]);

  const center = vehicles.length > 0
    ? [vehicles[0].lat, vehicles[0].lng]
    : [50.85045, 4.34878]; // Brussels default

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] bg-slate-50 text-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio className="w-5 h-5 text-emerald-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide uppercase text-slate-800">Live Tracking</h1>
            <p className="text-[10px] text-slate-500">
              {lastUpdate ? `Mise à jour à ${lastUpdate.toLocaleTimeString('fr-FR')}` : 'Chargement...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status */}
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            connected ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? t("tracking.online", "Online") : t("tracking.offline", "Offline")}
          </div>
          {/* Vehicle count */}
          <div className="flex items-center gap-1.5 text-xs font-medium bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 text-slate-700">
            <Users className="w-3 h-3 text-blue-500" />
            <span>{vehicles.length} {t("live.active", "actif")}{vehicles.length !== 1 ? 's' : ''}</span>
          </div>
          {/* Manual refresh */}
          <button
            onClick={fetchLive}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 transition-colors shadow-sm"
            title="Actualiser"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className={`flex flex-1 overflow-hidden`}>
        {/* Sidebar */}
        {!isMapFull && (
        <div className="hidden md:flex md:flex-col w-72 shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-slate-100 bg-slate-50">
            {t("live.active_vehicles", "Véhicules actifs")}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          )}

          {!loading && vehicles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
              <Radio className="w-8 h-8 text-slate-300" />
              <p className="text-slate-500 text-sm">{t("tracking.no_active", "Aucun véhicule actif")}</p>
              <p className="text-slate-400 text-xs">{t("tracking.no_active_hint", "Assurez-vous que les appareils GPS sont allumés.")}</p>
            </div>
          )}

          {vehicles.map(v => {
            const secs = secondsAgo(v.last_seen);
            const isStale = secs !== null && secs > 120;
            return (
              <div
                key={v.id}
                className="px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {/* Color dot */}
                  <div
                    className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: v.team_color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{v.name}</div>
                    {v.team_name && (
                      <div className="text-[10px] text-slate-500 truncate">{v.team_name}</div>
                    )}
                  </div>
                  {/* Stale indicator */}
                  <div className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${isStale ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'}`} />
                </div>

                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatLastSeen(v.last_seen, t)}
                  </span>
                  {v.speed != null && (
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3" />
                      {Math.round(v.speed)} km/h
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Map */}
        <div className="flex-1 relative" id="livetracking-map-container">
          {/* Controls overlay */}
          <div className="absolute top-3 right-3 z-[1001] flex items-center gap-2 pointer-events-none md:top-4 md:left-14 md:right-auto">
              {/* Fullscreen button */}
              <button 
                  onClick={() => setIsMapFull(f => !f)}
                  title={isMapFull ? 'Quitter plein écran' : 'Plein écran'}
                  className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700 w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 pointer-events-auto transition-all"
              >
                  {isMapFull 
                      ? <Minimize2 className="w-5 h-5" /> 
                      : <Maximize2 className="w-5 h-5" />
                  }
              </button>

              {/* Sand stations toggle */}
              {isDavideChape && (
                  <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 pointer-events-auto flex items-center gap-3">
                      <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 ${showSandStations ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                          onClick={() => setShowSandStations(!showSandStations)}
                      >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${showSandStations ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Stations de Sable</span>
                  </div>
              )}
          </div>

          {!loading && (
            <MapContainer
              center={center}
              zoom={10}
              className="w-full h-full"
              style={{ background: '#f8fafc' }}
              scrollWheelZoom={false}
              ref={mapRef}
            >
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&hl=fr&x={x}&y={y}&z={z}"
                attribution="&copy; Google Maps"
                maxZoom={20}
              />

              {vehicles.map(v => (
                <Marker
                  key={v.id}
                  position={[v.lat, v.lng]}
                  icon={createVehicleIcon(v.team_color, v.name, v.avatar_url)}
                >
                  <Popup className="tracking-popup">
                    <div className="flex items-center gap-3 mb-2">
                      {v.avatar_url && (
                        <img 
                          src={v.avatar_url.startsWith('http') ? v.avatar_url : `http://davidechape.localhost:5678${v.avatar_url}`} 
                          alt="avatar" 
                          className="w-10 h-10 rounded-full object-cover border-2" 
                          style={{ borderColor: v.team_color }}
                        />
                      )}
                      <div>
                        <div className="text-sm font-bold">{v.name}</div>
                        {v.team_name && <div className="text-xs text-slate-500">{v.team_name}</div>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">GPS Flespi</div>
                    <div className="text-xs mt-1 text-slate-400">{t('live.last_seen', 'Vu')}: {formatLastSeen(v.last_seen, t)}</div>
                    {v.speed != null && (
                      <div className="text-xs text-slate-400">{t('live.speed', 'Vitesse')}: {Math.round(v.speed)} km/h</div>
                    )}
                  </Popup>
                </Marker>
              ))}

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
                      <Popup>
                          <div className="font-bold text-sm text-slate-900">{s.name}</div>
                          <div className="text-xs text-slate-500 mt-1">{s.address}</div>
                      </Popup>
                  </Marker>
              ))}

              {vehicles.length > 0 && <FitBounds vehicles={vehicles} />}
              <MapResizer isMapFull={isMapFull} />
            </MapContainer>
          )}

          {/* Compact Vertical List in a Single Panel — normal (non-fullscreen) */}
          {!loading && vehicles.length > 0 && !isMapFull && (
            <div className={`absolute bottom-28 md:hidden left-4 right-4 z-[1000] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out overflow-hidden transform-gpu isolate ${isPanelOpen ? 'max-h-[45vh]' : 'max-h-12'}`}>
              <div 
                className="px-4 py-3 flex items-center justify-between cursor-pointer border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky top-0 z-10"
                onClick={() => setIsPanelOpen(!isPanelOpen)}
              >
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                   <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('admin_overview.trucks_teams', 'Équipes')}</span>
                   <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {vehicles.length}
                   </span>
                 </div>
                 <button className="text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                   {isPanelOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                 </button>
              </div>
              
              {isPanelOpen && (
                <div className="flex-1 overflow-y-auto overscroll-contain pb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 p-2 gap-2">
                  {vehicles.map(v => (
                      <div 
                        key={v.id} 
                        onClick={() => handleCardClick(v)}
                        className="flex flex-col gap-2 p-2.5 rounded-2xl border-2 shadow-sm transition-transform cursor-pointer relative active:scale-95 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                        style={{ 
                          borderColor: v.team_color || (globalTheme === 'dark' ? '#334155' : '#e2e8f0')
                        }}
                      >
                      <div className="flex items-center gap-2 pr-7">
                        <div 
                          className="w-8 h-8 rounded-full flex-shrink-0 border shadow-sm flex items-center justify-center bg-slate-100 dark:bg-slate-800 overflow-hidden"
                          style={{ borderColor: v.team_color || (globalTheme === 'dark' ? '#475569' : '#3b82f6') }}
                        >
                          {v.avatar_url ? (
                            <img src={v.avatar_url.startsWith('http') ? v.avatar_url : `${API_BASE}${v.avatar_url}`} className="w-full h-full object-cover" />
                          ) : (
                            v.vehicle_type === 'Grue' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-500 dark:text-slate-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M7 21v-4"/><path d="M17 21v-4"/><path d="M12 17V3l-7 4"/><path d="M12 10l5 3"/></svg>
                            ) : (
                              <Truck className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            )
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate leading-tight">{v.name}</span>
                            {v.distance != null ? (
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1 rounded-sm border border-emerald-100/50 dark:border-emerald-500/20 whitespace-nowrap">
                                {v.distance.toFixed(1)} km
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-1 rounded-sm border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                -- km
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-0.5 mt-0.5">
                            <Clock className={`w-2.5 h-2.5 ${globalTheme === 'dark' ? 'opacity-80' : ''}`} />
                            {formatLastSeen(v.last_seen, t)}
                          </div>
                        </div>
                      </div>
                      
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-2 right-2 w-7 h-7 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-500/20 active:bg-blue-200 dark:active:bg-blue-500/30 transition-colors shadow-sm"
                      >
                        <Navigation className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>
          )}

          {/* ===== MOBILE FULLSCREEN PORTAL ===== */}
          {isMapFull && createPortal(
            <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-950 flex flex-col">
              {/* Fullscreen Map */}
              <div className="flex-1 relative">
                {!loading && (
                  <MapContainer
                    center={center}
                    zoom={10}
                    className="w-full h-full"
                    style={{ background: '#f8fafc' }}
                    scrollWheelZoom={true}
                    zoomControl={false}
                    ref={(ref) => { if (ref) { mapRef.current = ref; setTimeout(() => ref.invalidateSize(), 100); } }}
                  >
                    <TileLayer
                      url="https://mt1.google.com/vt/lyrs=m&hl=fr&x={x}&y={y}&z={z}"
                      attribution="&copy; Google Maps"
                      maxZoom={20}
                    />
                    {vehicles.map(v => (
                      <Marker key={v.id} position={[v.lat, v.lng]} icon={createVehicleIcon(v.team_color, v.name, v.avatar_url)}>
                        <Popup className="tracking-popup">
                          <div className="font-bold text-sm">{v.name}</div>
                          {v.team_name && <div className="text-xs text-slate-500">{v.team_name}</div>}
                          <div className="text-xs mt-1 text-slate-400">{formatLastSeen(v.last_seen, t)}</div>
                          {v.speed != null && <div className="text-xs text-slate-400">{Math.round(v.speed)} km/h</div>}
                        </Popup>
                      </Marker>
                    ))}
                    {isDavideChape && showSandStations && sandStations.filter(s => s.latitude && s.longitude).map((s) => (
                      <Marker key={`sand-fs-${s.id}`} position={[s.latitude, s.longitude]} icon={L.divIcon({
                        html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">S</div>`,
                        className: '', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12]
                      })}>
                        <Popup>
                          <div className="font-bold text-sm text-slate-900">{s.name}</div>
                          <div className="text-xs text-slate-500 mt-1">{s.address}</div>
                        </Popup>
                      </Marker>
                    ))}
                    {vehicles.length > 0 && <FitBounds vehicles={vehicles} />}
                  </MapContainer>
                )}

                {/* Exit fullscreen button */}
                <button
                  onClick={() => setIsMapFull(false)}
                  className="absolute top-4 right-4 z-[500] bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-xl border border-slate-200 dark:border-slate-700 w-11 h-11 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-all"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>

                {/* Zoom controls */}
                <div className="absolute top-4 left-4 z-[500] flex flex-col gap-1">
                  <button
                    onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 10) + 1)}
                    className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700 w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 text-lg font-bold active:scale-90 transition-all"
                  >+</button>
                  <button
                    onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 10) - 1)}
                    className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700 w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 text-lg font-bold active:scale-90 transition-all"
                  >−</button>
                </div>

                {/* Sand toggle in fullscreen */}
                {isDavideChape && (
                  <div className="absolute top-4 left-16 z-[500] bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${showSandStations ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                      onClick={() => setShowSandStations(!showSandStations)}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition ${showSandStations ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Sable</span>
                  </div>
                )}
              </div>

              {/* Bottom vehicle cards in fullscreen */}
              {vehicles.length > 0 && (
                <div className={`bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-all duration-300 ${isPanelOpen ? 'max-h-[35vh]' : 'max-h-11'} overflow-hidden`}>
                  <div
                    className="px-4 py-2.5 flex items-center justify-between cursor-pointer bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800"
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('admin_overview.trucks_teams', 'Équipes')}</span>
                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">{vehicles.length}</span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 transition-colors">
                      {isPanelOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                  </div>
                  {isPanelOpen && (
                    <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(35vh - 44px)' }}>
                      <div className="grid grid-cols-2 p-2 gap-2">
                        {vehicles.map(v => (
                          <div
                            key={v.id}
                            onClick={() => handleCardClick(v)}
                            className="flex items-center gap-2 p-2 rounded-xl border-2 shadow-sm cursor-pointer relative active:scale-95 bg-white dark:bg-slate-800"
                            style={{ borderColor: v.team_color || '#e2e8f0' }}
                          >
                            <div className="w-7 h-7 rounded-full flex-shrink-0 border shadow-sm flex items-center justify-center bg-slate-100 dark:bg-slate-800 overflow-hidden"
                              style={{ borderColor: v.team_color || '#3b82f6' }}
                            >
                              {v.avatar_url ? (
                                <img src={v.avatar_url.startsWith('http') ? v.avatar_url : `${API_BASE}${v.avatar_url}`} className="w-full h-full object-cover" />
                              ) : (
                                <Truck className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-[10px] text-slate-800 dark:text-slate-100 truncate">{v.name}</div>
                              <div className="text-[9px] text-slate-500 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {formatLastSeen(v.last_seen, t)}
                              </div>
                            </div>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`}
                              target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0"
                            >
                              <Navigation className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>,
            document.body
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-[1000]">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-slate-600 font-medium text-sm">{t("tracking.loading", "Chargement...")}</p>
              </div>
            </div>
          )}

          {/* Refresh countdown */}
          <div className="absolute bottom-4 right-4 bg-white/90 shadow-lg backdrop-blur border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 font-medium hidden md:flex items-center gap-2 z-[1000]">
            <RefreshCw className="w-3 h-3 text-slate-400" />
            Auto-refresh à 30s
          </div>
        </div>
      </div>
    </div>
  );
}

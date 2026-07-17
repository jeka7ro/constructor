import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Navigation, Clock, Gauge, RefreshCw, Car, Truck, MapPin, ChevronLeft, ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import useViewPreferencesStore from '../../store/viewPreferencesStore';
import EmployeeHeader from '../../components/layout/EmployeeHeader';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const POLL_INTERVAL = 30000; // 30s

function createVehicleIcon(color, name, avatarUrl, vehicleType) {
  const fullAvatarUrl = avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : `${API_BASE}${avatarUrl}`) : null;
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

  const innerHtml = fullAvatarUrl 
    ? `<img src="${fullAvatarUrl}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.3);" />`
    : `<div style="width:36px;height:36px;border-radius:50%;background-color:${themeColor};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 6px rgba(0,0,0,0.3);">${selectedSvg}</div>`;

  return L.divIcon({
    html: innerHtml,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function createUserIcon() {
  return L.divIcon({
    html: `<div style="width:24px;height:24px;border-radius:50%;background-color:#ef4444;border:3px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.4);"></div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function haversineDist(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function getRoadDistances(userLoc, vehicles) {
  try {
    if (vehicles.length === 0) return {};
    
    // OSRM Table API expects coordinates in lon,lat format
    const coords = [
      `${userLoc.lng},${userLoc.lat}`,
      ...vehicles.map(v => `${v.lng},${v.lat}`)
    ].join(';');
    
    // sources=0 means we only want distances FROM the user (index 0) TO all other points
    const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.code === 'Ok' && data.distances && data.distances[0]) {
      const dists = {};
      // data.distances[0] is an array of distances from user to [user, v1, v2, ...]
      vehicles.forEach((v, idx) => {
        const d = data.distances[0][idx + 1]; // +1 because index 0 is user-to-user
        if (d != null) {
          dists[v.id] = d / 1000; // convert meters to km
        }
      });
      return dists;
    }
  } catch (e) {
    console.warn('OSRM distance fetch failed, falling back to haversine', e);
  }
  return null;
}

function FitBounds({ vehicles, userLoc }) {
  const map = useMap();
  useEffect(() => {
    if (vehicles.length === 0 && !userLoc) return;
    const points = vehicles.map(v => [v.lat, v.lng]);
    if (userLoc) points.push([userLoc.lat, userLoc.lng]);
    
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [vehicles.length, userLoc]);
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
  if (secs < 60) return t('live.ago_sec', 'il y a {{count}}s', { count: secs });
  if (secs < 3600) return t('live.ago_min', 'il y a {{count}}min', { count: Math.floor(secs / 60) });
  return t('live.ago_h', 'il y a {{count}}h', { count: Math.floor(secs / 3600) });
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

export default function EmployeeFleetMap() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const tenant = useTenantStore((state) => state.tenant);
  const isDavideChape = !tenant || (tenant?.slug || '').toLowerCase().includes('davide') || (tenant?.name || '').toLowerCase().includes('davide');
  const globalTheme = useViewPreferencesStore(state => state.globalTheme);
  const [vehicles, setVehicles] = useState([]);
  const [sandStations, setSandStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isMapFull, setIsMapFull] = useState(false);
  const [showSandStations, setShowSandStations] = useState(() => {
      const saved = localStorage.getItem('employeemap_nisip_toggle');
      return saved ? JSON.parse(saved) : true;
  });
  const intervalRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
      localStorage.setItem('employeemap_nisip_toggle', JSON.stringify(showSandStations));
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

  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const fetchLive = useCallback(async () => {
    try {
      const [resVehicles, resStations] = await Promise.all([
          api.get('/admin/vehicles/live'),
          isDavideChape ? api.get('/worker/orders/sand-stations').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);
      let data = resVehicles.data || [];
      if (isDavideChape && resStations.data) {
          setSandStations(resStations.data);
      }
      if (userLoc) {
        const roadDists = await getRoadDistances(userLoc, data);
        data = data.map(v => ({
          ...v,
          distance: roadDists && roadDists[v.id] != null 
            ? roadDists[v.id] 
            : haversineDist(userLoc.lat, userLoc.lng, v.lat, v.lng)
        })).sort((a, b) => a.distance - b.distance);
      }
      setVehicles(data);
    } catch (e) {
      console.error("Error fetching fleet telemetry:", e);
    } finally {
      setLoading(false);
    }
  }, [userLoc]);

  useEffect(() => {
    fetchLive();
    intervalRef.current = setInterval(fetchLive, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchLive]);

  const center = vehicles.length > 0
    ? [vehicles[0].lat, vehicles[0].lng]
    : (userLoc ? [userLoc.lat, userLoc.lng] : [50.85045, 4.34878]);

  const handleCardClick = (v) => {
    if (mapRef.current) {
      mapRef.current.setView([v.lat, v.lng], 15, { animate: true });
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden z-10">
        {!isMapFull && (
          <EmployeeHeader 
            title={t('live.title_live', 'FLOTTE EN DIRECT')} 
            showBack={true} 
            badge={<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>} 
          />
        )}

      <div className={`flex flex-1 relative z-0 ${isMapFull ? 'fixed inset-0 z-[9999] bg-slate-50' : ''}`}>
        {!loading && (
          <MapContainer
            center={center}
            zoom={10}
            className={`w-full h-full ${!isMapFull ? 'pb-[150px]' : ''}`}
            style={{ background: '#f8fafc' }}
            zoomControl={false}
            ref={mapRef}
          >
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=m&hl=fr&x={x}&y={y}&z={z}"
              attribution="&copy; Google Maps"
              maxZoom={20}
            />
            <ZoomControl position="topleft" />

            {/* Controls overlay left */}
            <div className="absolute top-4 left-[52px] z-[400] flex flex-row items-start gap-2 pointer-events-none">
                {!isMapFull && (
                <button 
                    onClick={() => {
                        const elem = document.documentElement; // For mobile full screen, document.documentElement works best
                        if (!document.fullscreenElement && elem?.requestFullscreen) {
                            elem.requestFullscreen().catch(() => setIsMapFull(f => !f));
                        } else if (document.fullscreenElement && document.exitFullscreen) {
                            document.exitFullscreen();
                        } else {
                            setIsMapFull(f => !f);
                        }
                    }}
                    className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-sm border-2 border-slate-200/50 dark:border-slate-700 w-[34px] h-[34px] rounded-[4px] flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 pointer-events-auto transition-colors"
                >
                    <Maximize2 className="w-[18px] h-[18px]" />
                </button>
                )}
            </div>

            {isMapFull && (
                <button
                    onClick={() => {
                        if (document.fullscreenElement && document.exitFullscreen) {
                            document.exitFullscreen();
                        }
                        setIsMapFull(false)
                    }}
                    className="absolute top-4 right-4 z-[99999] bg-slate-800 text-white px-4 py-2 rounded-full font-bold shadow-2xl border-2 border-slate-600 flex items-center gap-2 pointer-events-auto"
                >
                    <Minimize2 className="w-5 h-5" /> Închide
                </button>
            )}

            {/* Controls overlay right */}
            {isDavideChape && (
                <div className="absolute top-4 right-4 z-[400] flex flex-row items-start gap-2 pointer-events-none">
                    {/* Sand stations toggle */}
                    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 h-[34px] rounded-[4px] shadow-sm border-2 border-slate-200/50 dark:border-slate-700 pointer-events-auto flex items-center gap-2 w-max">
                        <div className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showSandStations ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            onClick={() => setShowSandStations(!showSandStations)}
                        >
                            <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${showSandStations ? 'translate-x-3' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Stations de Sable</span>
                    </div>
                </div>
            )}

            {userLoc && (
              <Marker position={[userLoc.lat, userLoc.lng]} icon={createUserIcon()}>
                <Popup className="tracking-popup">{t('live.your_location', 'Votre position')}</Popup>
              </Marker>
            )}

            {vehicles.map(v => (
              <Marker
                key={v.id}
                position={[v.lat, v.lng]}
                icon={createVehicleIcon(v.team_color, v.name, v.avatar_url, v.vehicle_type)}
              >
                <Popup className="tracking-popup min-w-[200px]" closeButton={false}>
                  <div className="flex flex-col gap-3 p-1">
                    <div className="flex items-center gap-3">
                      {v.avatar_url && (
                        <img 
                          src={v.avatar_url.startsWith('http') ? v.avatar_url : `${API_BASE}${v.avatar_url}`} 
                          alt="avatar" 
                          className="w-12 h-12 rounded-full object-cover border-2 shadow-sm" 
                          style={{ borderColor: v.team_color || '#3b82f6' }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-base font-black text-slate-800 leading-tight">{v.name}</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatLastSeen(v.last_seen, t)}
                        </div>
                        {v.speed != null && (
                          <div className="flex items-center gap-1.5">
                            <Gauge className="w-3.5 h-3.5 text-slate-400" />
                            {Math.round(v.speed)} km/h
                          </div>
                        )}
                      </div>
                      {v.distance != null && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                          {v.distance.toFixed(1)} km {t('live.distance_away', 'de vous')}
                        </div>
                      )}
                    </div>

                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"
                    >
                      <Navigation className="w-4 h-4" />
                      {t('live.navigate', 'Naviguer vers eux')}
                    </a>
                  </div>
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
                    <Popup className="tracking-popup">
                        <div className="font-bold text-sm text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500 mt-1">{s.address}</div>
                        <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl py-2 px-3 flex items-center justify-center gap-2 font-bold transition-colors shadow-sm text-xs"
                        >
                            <Navigation className="w-3.5 h-3.5" />
                            Naviguer
                        </a>
                    </Popup>
                </Marker>
            ))}

            {vehicles.length > 0 && <FitBounds vehicles={vehicles} userLoc={userLoc} />}
            <MapResizer isMapFull={isMapFull} />
          </MapContainer>
        )}

        {/* Compact Vertical List in a Single Panel */}
        {!loading && vehicles.length > 0 && !isMapFull && (
          <div className={`absolute bottom-24 md:bottom-8 left-4 right-4 z-[1000] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out overflow-hidden ${isPanelOpen ? 'max-h-[35vh]' : 'max-h-12'}`}>
            <div 
              className="px-4 py-3 flex items-center justify-between cursor-pointer border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10"
              onClick={() => setIsPanelOpen(!isPanelOpen)}
            >
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                 <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('live.teams', 'Équipes')}</span>
                 <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {vehicles.filter(v => {
                        if (v.assigned_user_id && user?.id) {
                            return v.assigned_user_id !== user.id;
                        }
                        if (v.type === 'user' && user?.id) {
                            return v.id !== user.id;
                        }
                        const uName = (user?.full_name || '').toLowerCase();
                        const vName = (v.name || '').toLowerCase();
                        const vDriver = (v.driver_name || '').toLowerCase();
                        if (!uName) return true;
                        const isOwn = vName.includes(uName) || vDriver.includes(uName) || uName.includes(vName) || (vDriver && uName.includes(vDriver));
                        return !isOwn;
                    }).length}
                 </span>
               </div>
               <button className="text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                 {isPanelOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
               </button>
            </div>
            
            {isPanelOpen && (
              <div className="flex-1 overflow-y-auto overscroll-contain pb-6">
                <div className="grid grid-cols-2 p-2 gap-2">
                {vehicles.filter(v => {
                      if (v.assigned_user_id && user?.id) {
                          return v.assigned_user_id !== user.id;
                      }
                      if (v.type === 'user' && user?.id) {
                          return v.id !== user.id;
                      }
                      const uName = (user?.full_name || '').toLowerCase();
                      const vName = (v.name || '').toLowerCase();
                      const vDriver = (v.driver_name || '').toLowerCase();
                      if (!uName) return true;
                      return !(vName.includes(uName) || vDriver.includes(uName) || uName.includes(vName) || (vDriver && uName.includes(vDriver)));
                }).map(v => (
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

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-[1000]">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-slate-600 font-bold text-sm">{t('live.searching', 'Recherche des positions...')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

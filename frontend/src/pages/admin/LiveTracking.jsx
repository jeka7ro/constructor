import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { Radio, Users, Clock, Gauge, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import api from '../../lib/api';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const POLL_INTERVAL = 30000; // 30s

function createVehicleIcon(color, name, avatarUrl) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  const apiBaseUrl = 'http://davidechape.localhost:5678'; // Since this is a hardcoded app URL locally, or we could use relative if hosted same origin. But typically we prepend the backend URL if it's not relative. Let's assume avatarUrl is relative e.g., /uploads/...
  const fullAvatarUrl = avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : `${apiBaseUrl}${avatarUrl}`) : null;
  
  const innerContent = fullAvatarUrl 
    ? `<clipPath id="circleView"><circle cx="20" cy="19" r="13" /></clipPath>
       <image href="${fullAvatarUrl}" x="7" y="6" width="26" height="26" clip-path="url(#circleView)" preserveAspectRatio="xMidYMid slice" />`
    : `<circle cx="20" cy="19" r="13" fill="white" opacity="0.25"/>
       <text x="20" y="24" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="bold" fill="white">${initials}</text>`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>
      <ellipse cx="20" cy="46" rx="8" ry="3" fill="rgba(0,0,0,0.2)"/>
      <path d="M20 0 C9 0 0 9 0 20 C0 32 20 48 20 48 C20 48 40 32 40 20 C40 9 31 0 20 0Z" 
            fill="${color}" filter="url(#shadow)"/>
      ${innerContent}
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -50],
  });
}

function FitBounds({ vehicles }) {
  const map = useMap();
  useEffect(() => {
    if (vehicles.length === 0) return;
    const bounds = L.latLngBounds(vehicles.map(v => [v.lat, v.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
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

export default function LiveTracking() {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connected, setConnected] = useState(true);
  const intervalRef = useRef(null);

  const fetchLive = useCallback(async () => {
    try {
      const res = await api.get('/admin/vehicles/live');
      setVehicles(res.data || []);
      setLastUpdate(new Date());
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
    return () => clearInterval(intervalRef.current);
  }, [fetchLive]);

  const center = vehicles.length > 0
    ? [vehicles[0].lat, vehicles[0].lng]
    : [50.85045, 4.34878]; // Brussels default

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 text-slate-800 overflow-hidden">
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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
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

        {/* Map */}
        <div className="flex-1 relative">
          {!loading && (
            <MapContainer
              center={center}
              zoom={10}
              className="w-full h-full"
              style={{ background: '#f8fafc' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
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

              {vehicles.length > 0 && <FitBounds vehicles={vehicles} />}
            </MapContainer>
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
          <div className="absolute bottom-4 right-4 bg-white/90 shadow-lg backdrop-blur border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 font-medium flex items-center gap-2 z-[1000]">
            <RefreshCw className="w-3 h-3 text-slate-400" />
            Auto-refresh à 30s
          </div>
        </div>
      </div>
    </div>
  );
}

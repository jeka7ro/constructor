import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Clock, Gauge, RefreshCw, Radio } from 'lucide-react'

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

function createVehicleIcon(color, name, avatarUrl) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  const apiBaseUrl = 'http://davidechape.localhost:5678';
  const fullAvatarUrl = avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : `${apiBaseUrl}${avatarUrl}`) : null;
  
  const innerContent = fullAvatarUrl 
    ? `<clipPath id="circleView-${initials}"><circle cx="20" cy="19" r="13" /></clipPath>
       <image href="${fullAvatarUrl}" x="7" y="6" width="26" height="26" clip-path="url(#circleView-${initials})" preserveAspectRatio="xMidYMid slice" />`
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

const POLL_INTERVAL = 15000;

export default function MiniLiveTrackingMap() {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const intervalRef = useRef(null);

  const fetchLive = useCallback(async () => {
    try {
      const res = await api.get('/admin/vehicles/live');
      setVehicles(res.data || []);
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

  const center = [51.2, 4.4]; // Belgium default

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <h3 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wide text-sm">
          <Radio className="w-4 h-4 text-blue-500" />
          {t('dashboard.live_tracking', 'LIVE TRACKING')}
        </h3>
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 rounded-full">{vehicles.length} {t("live.active", "actif")}{vehicles.length !== 1 ? 's' : ''}</span>
            <button onClick={fetchLive} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
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
        <MapContainer
          center={center}
          zoom={8}
          className="w-full h-full"
          style={{ background: '#f8fafc' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; CARTO'
          />
          {vehicles.length > 0 && <FitBounds vehicles={vehicles} />}
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
                      className="w-8 h-8 rounded-full object-cover border-2" 
                      style={{ borderColor: v.team_color }}
                    />
                  )}
                  <div>
                    <div className="text-sm font-bold">{v.name}</div>
                  </div>
                </div>
                <div className="text-xs mt-1 text-slate-500">{t('live.last_seen', 'Vu')}: {formatLastSeen(v.last_seen, t)}</div>
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

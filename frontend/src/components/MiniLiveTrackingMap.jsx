import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import { useTenantStore } from '../store/tenantStore'
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
  const shortName = name ? name.substring(0, 15) : '?';
  const initials = shortName[0].toUpperCase();
  const apiBaseUrl = 'http://davidechape.localhost:5678';
  const fullAvatarUrl = avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : `${apiBaseUrl}${avatarUrl}`) : null;
  const themeColor = color || '#3b82f6';
  
  const avatarHtml = fullAvatarUrl 
    ? `<img src="${fullAvatarUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid white;" />`
    : `<div style="width:32px;height:32px;border-radius:50%;background-color:${themeColor};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h4.3c.6 0 1.1.4 1.3.9l.8 2.1c.2.5.7.9 1.3.9h6.3c.6 0 1 .4 1 1v7c0 .6-.4 1-1 1h-2"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle></svg></div>`;

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
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
        <h3 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wide text-sm">
          <Radio className="w-4 h-4 text-blue-500" />
          {t('dashboard.live_tracking', 'LIVE TRACKING')}
        </h3>
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 rounded-full">{vehicles.length} {t("live.active", "actif")}{vehicles.length !== 1 ? 's' : ''}</span>
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
        <MapContainer
          center={center}
          zoom={8}
          className="w-full h-full"
          style={{ background: '#f8fafc' }}
          zoomControl={false}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            attribution="&copy; Google Maps"
            maxZoom={20}
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

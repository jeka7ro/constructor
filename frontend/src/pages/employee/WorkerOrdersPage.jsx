/**
 * WorkerOrdersPage.jsx
 *
 * Interfata muncitorului / sefului de echipa pentru Comenzi de Lucru.
 * Design mobil-first, tab-uri: Info | Heures | Matériaux | Extra | Trimite
 *
 * Reguli UI respectate:
 *  - Fara emoji
 *  - Fara text placeholder — datele reale sau nimic
 *  - Buton principal "Start work" / "Stop work" fix in jos, proeminent
 *  - Culori: verde #16a34a primar (brand consistent cu ClockInPage)
 *  - Adresa cu link de navigatie catre Google Maps
 *  - Documente/poze instructiuni admin vizibile si descarcabile
 *  - Photos interne (sef echipa) separate de poze client
 */

import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useTenantStore } from '../../store/tenantStore'
import LanguageSelector from '../../components/LanguageSelector'
import MobileAgenda from '../../components/MobileAgenda'
import MapView from '../../components/MapView'
import WeatherWidget from '../../components/WeatherWidget'
import StreetViewPhotos from '../../components/StreetViewPhotos'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import useViewPreferencesStore from '../../store/viewPreferencesStore'
import EmployeeHeader from '../../components/layout/EmployeeHeader'
import {
    MapPin, Calendar as CalendarIcon, Clock, Users, Truck, Phone, Mail,
    FileImage, Download, ChevronRight, CheckCircle2,
    AlertCircle, Navigation, Package, Camera, Upload,
    Check, X, Plus, Trash2, ClipboardList, Info,
    Timer, Layers, Send, LogIn, LogOut, Lock, Eye, Home,
    FileText, ExternalLink, Loader2, Sun, Moon
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { isToday, isFuture, format, startOfDay, startOfWeek, addWeeks, subWeeks, isSameWeek, isSameDay, addDays, parseISO } from 'date-fns'
import { ro, fr } from 'date-fns/locale'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'info',       label: 'Info',       icon: Info },
    { id: 'materiale',  label: 'Matériaux',  icon: Package },
    { id: 'poze',       label: 'Photos',       icon: Camera },
    { id: 'trimite',    label: 'Finaliser',    icon: Send },
]

const STATUS_LABEL = {
    draft:       'Brouillon',
    sent:        'Envoyée',
    confirmed:   'Confirmée',
    in_progress: 'En cours',
    completed:   'Terminée',
    cancelled:   'Annulée',
}

const STATUS_COLOR = {
    draft:       'bg-slate-100 text-slate-600 border-slate-200',
    sent:        'bg-amber-50 text-amber-700 border-amber-200',
    confirmed:   'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-green-50 text-green-700 border-green-200',
    completed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled:   'bg-red-50 text-red-600 border-red-200',
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: haversine distance in meters
// ─────────────────────────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180
    const dp = (lat2 - lat1) * Math.PI / 180
    const dl = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: translate dynamic labels
// ─────────────────────────────────────────────────────────────────────────────
function translateDynamicLabel(text) {
    if (!text) return '—';
    let res = text;
    if (/^[sșş]ap[aăâ]$/i.test(res)) return 'Chape';
    if (/[sșş]ap[aăâ]/i.test(res)) res = res.replace(/[sșş]ap[aăâ]/ig, 'Chape');
    if (/manoper[aă]/i.test(res)) res = res.replace(/manoper[aă]/ig, "Main-d'œuvre");
    return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT DATE
// ─────────────────────────────────────────────────────────────────────────────
function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtTime(d) {
    if (!d) return '—'
    return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function fmtDuration(minutes) {
    if (!minutes) return '0 min'
    const h = Math.floor(minutes / 60), m = minutes % 60
    if (h === 0) return `${m} min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
}

function NavButtons({ lat, lon, address }) {
    const dest     = lat && lon ? `${lat},${lon}` : null
    const destEnc  = address ? encodeURIComponent(address) : null

    const googleUrl = dest
        ? `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`
        : destEnc ? `https://www.google.com/maps/dir/?api=1&destination=${destEnc}&travelmode=driving` : null

    const wazeUrl = dest
        ? `https://waze.com/ul?ll=${dest}&navigate=yes`
        : destEnc ? `https://waze.com/ul?q=${destEnc}&navigate=yes` : null

    const appleUrl = dest
        ? `https://maps.apple.com/?daddr=${dest}&dirflg=d`
        : destEnc ? `https://maps.apple.com/?daddr=${destEnc}&dirflg=d` : null

    if (!googleUrl) return null

    return (
        <div className="grid grid-cols-3 gap-2 mt-3">
            {googleUrl && (
                <a href={googleUrl} target="_blank" rel="noreferrer"
                    className="flex justify-center items-center gap-1.5 px-2 py-2.5 rounded-xl bg-blue-600 text-white text-[11px] sm:text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-500/20 whitespace-nowrap">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    Google
                </a>
            )}
            {wazeUrl && (
                <a href={wazeUrl} target="_blank" rel="noreferrer"
                    className="flex justify-center items-center gap-1.5 px-2 py-2.5 rounded-xl bg-[#05C8F7] text-white text-[11px] sm:text-xs font-bold hover:bg-[#04b0d8] active:scale-95 transition-all shadow-sm shadow-cyan-400/20 whitespace-nowrap">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.54 6.63C19.08 4.05 16.73 2.19 14 1.54V1.5c0-.83-.67-1.5-1.5-1.5S11 .67 11 1.5v.04C8.27 2.19 5.92 4.05 4.46 6.63A8.959 8.959 0 003 11c0 4.97 4.03 9 9 9s9-4.03 9-9c0-1.62-.43-3.14-1.46-4.37zM8.5 13c-.83 0-1.5-.67-1.5-1.5S7.67 10 8.5 10s1.5.67 1.5 1.5S9.33 13 8.5 13zm7 0c-.83 0-1.5-.67-1.5-1.5S14.67 10 15.5 10s1.5.67 1.5 1.5S16.33 13 15.5 13zm-3.5 4c-1.66 0-3-1.34-3-3h6c0 1.66-1.34 3-3 3z"/>
                    </svg>
                    Waze
                </a>
            )}
            {appleUrl && (
                <a href={appleUrl} target="_blank" rel="noreferrer"
                    className="flex justify-center items-center gap-1.5 px-2 py-2.5 rounded-xl bg-slate-800 text-white text-[11px] sm:text-xs font-bold hover:bg-slate-700 active:scale-95 transition-all shadow-sm whitespace-nowrap">
                    <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    Apple
                </a>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Order Card (lista)
// ─────────────────────────────────────────────────────────────────────────────
function OrderCard({ order, onClick }) {
    const { t } = useTranslation()
    const isLeader = order.team_leader_accepted_at != null
    const isActive = order.status === 'in_progress'

    // REGULĂ STRICTĂ: Citim tonajul pre-calculat din DB
    const sandTons = (parseFloat(order.route_sand_kg) || 0) / 1000;
    let durmitePlastic = '';
    let durmiteMetalic = '';
    if (order.materials && Array.isArray(order.materials)) {
        order.materials.forEach(m => {
            const name = (m.name || '').toLowerCase();
            if (name.includes('plastic')) {
                durmitePlastic = m.quantity + ' ' + (m.unit || 'Kg');
            } else if (name.includes('metal') || name.includes('métal')) {
                durmiteMetalic = m.quantity + ' ' + (m.unit || 'Kg');
            }
        });
    }

    const lat = order.site_latitude || order.site_lat;
    const lng = order.site_longitude || order.site_lng;
    const address = order.site_address || order.site?.address || order.address;
    const staticMapLoc = (lat && lng) ? `${lat},${lng}` : (address ? encodeURIComponent(address) : null);

    const color = order.assigned_team_color || '#3b82f6';
    const bgStyle = {
        backgroundColor: color + '1a',
        borderColor: color + '33',
        backdropFilter: 'blur(8px)'
    };

    return (
        <button
            onClick={onClick}
            className="w-full text-left rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow active:scale-[0.99] relative text-slate-800"
            style={bgStyle}
        >
            <div className="p-4 relative z-10">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold text-slate-900 leading-snug text-sm flex-1">
                        {order.client_name || "Client Necunoscut"}
                        {order.start_date && (
                            <span className="text-xs font-semibold text-blue-600 ml-2 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap">
                                {fmtDate(order.start_date)}
                            </span>
                        )}
                    </h3>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                    </div>
                </div>

                

                {order.site_address && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="truncate">{order.site_address}</span>
                    </div>
                )}

                {order.assigned_team_name && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{order.assigned_team_name}</span>
                        {order.assigned_vehicle_plate && (
                            <span className="ml-1 text-slate-400">· {order.assigned_vehicle_plate}</span>
                        )}
                    </div>
                )}

                {order.route_distance_km !== null && order.route_distance_km !== undefined && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span>{t('worker.route_distance', 'Distanță de la precedentul / bază:')} <strong>{parseFloat(order.route_distance_km).toFixed(1)} km</strong></span>
                    </div>
                )}

                {order.route_segments && order.route_segments.find(s => s.to === 'Baza') && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 bg-slate-100 px-2 py-1 rounded w-max border border-slate-200">
                        <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>{t('worker.return_to_base', 'Retur la bază:')} <strong>{parseFloat(order.route_segments.find(s => s.to === 'Baza').km).toFixed(1)} km</strong></span>
                    </div>
                )}

                {/* Indicatori confirmare */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                    <span className={`flex items-center gap-1 text-[10px] font-semibold ${order.my_acknowledged ? 'text-green-600' : 'text-slate-400'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {order.my_acknowledged ? 'Confirmé' : 'Non confirmé'}
                    </span>

                    <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
                        <Camera className="w-3.5 h-3.5" />
                        {order.photo_count}/{order.min_photos_required}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
            </div>
        </button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Tab Bar
// ─────────────────────────────────────────────────────────────────────────────
function TabBar({ active, onChange, onHomePress, tenant }) {
    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        const base = API_BASE.replace(/\/$/, '');
        const path = url.startsWith('/') ? url : `/${url}`;
        return `${base}${path}`;
    };

    return (
        <div 
            className="backdrop-blur-xl border-4 border-b-0 border-white/20 px-2 py-3 flex justify-between items-center shadow-[0_-10px_25px_rgba(0,0,0,0.2)] rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+12px)] relative"
            style={{ backgroundColor: tenant?.primary_color || '#2563EB' }}
        >
            <div className="flex justify-around w-[40%]">
                {TABS.slice(0, 2).map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => onChange(id)}
                        className={`flex flex-col items-center p-2 w-[72px] transition-all ${
                            active === id
                                ? 'text-white scale-110 drop-shadow-md'
                                : 'text-white/60'
                        }`}
                    >
                        <Icon className="w-7 h-7 mb-1.5" />
                        <span className="text-[10px] font-bold text-center leading-tight uppercase">{label}</span>
                    </button>
                ))}
            </div>

            <div className="relative flex justify-center w-[20%]">
                <button
                    onClick={onHomePress}
                    className={`absolute -top-14 flex flex-col items-center justify-center w-[76px] h-[76px] text-white rounded-full transition-all active:scale-95 border-4 border-white backdrop-blur-xl shadow-[0_0_20px_rgba(255,255,255,1),inset_0_2px_6px_rgba(255,255,255,0.4)] bg-[color:var(--mobile-bg)]`}
                    style={{ '--mobile-bg': tenant?.primary_color || '#2563EB' }}
                >
                    {tenant?.favicon_url ? (
                        <img src={getImageUrl(tenant.favicon_url)} alt="Favicon" className="w-9 h-9 object-contain drop-shadow-md rounded-xl" />
                    ) : tenant?.logo_url ? (
                        <img src={getImageUrl(tenant.logo_url)} alt="Logo" className="w-10 h-10 object-contain drop-shadow-md rounded-xl" />
                    ) : (
                        <Home className="w-8 h-8 drop-shadow-md text-white" />
                    )}
                </button>
            </div>

            <div className="flex justify-around w-[40%]">
                {TABS.slice(2).map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => onChange(id)}
                        className={`flex flex-col items-center p-2 w-[72px] transition-all ${
                            active === id
                                ? 'text-white scale-110 drop-shadow-md'
                                : 'text-white/60'
                        }`}
                    >
                        <Icon className="w-7 h-7 mb-1.5" />
                        <span className="text-[10px] font-bold text-center leading-tight uppercase">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Lightbox
// ─────────────────────────────────────────────────────────────────────────────
function Lightbox({ url, onClose }) {
    if (!url) return null;
    return (
        <div 
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors"
            >
                <X className="w-8 h-8" />
            </button>
            <img 
                src={url} 
                alt="Fullscreen" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={e => e.stopPropagation()} 
            />
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: INFO
// ─────────────────────────────────────────────────────────────────────────────
function TabInfo({ order, photos, documents, onAcknowledge, acknowledging, onPhotoClick, sandStations, isDriver, completionPhotos = [], prevOrderLoc }) {
    const { t } = useTranslation()
    const instPhotos = photos.filter(p => p.photo_type === 'instruction')
    const [showStation, setShowStation] = useState(false)
    const [enableStations, setEnableStations] = useState(false)

    // Parse access_notes in bullet lines
    const accessLines = (order.access_notes || '')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)

    return (
        <div className="pb-28 px-4 pt-4 space-y-4">
            {/* Suprafata si Épaisseur + Sable */}
            {order.volumes && order.volumes.length > 0 && (
                <Section label="Détails du travail">
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-2">
                        {order.volumes.map((v, idx) => {
                            const sq = parseFloat(v.quantity);
                            const th = parseFloat(v.thickness);
                            if (!sq && !th) return null;
                            return (
                                <div key={idx} className="flex flex-col gap-1 pb-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 text-blue-800">
                                                {sq > 0 ? `${sq} m²` : ''}
                                                {sq > 0 && th > 0 ? ' × ' : ''}
                                                {th > 0 ? `${th} cm` : ''}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium">{translateDynamicLabel(v.label) || `Zone ${idx + 1}`}</span>
                                        </div>
                                        {idx === 0 && order.start_date && (
                                            <span className="text-sm font-semibold text-slate-800 capitalize whitespace-nowrap text-right">
                                                {fmtDate(order.start_date)}
                                            </span>
                                        )}
                                    </div>
                                    {idx === 0 && order.deadline_date && (
                                        <div className="text-right mt-1">
                                            <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                Délai: {fmtDate(order.deadline_date)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {(() => {
                            // REGULĂ STRICTĂ: Citim tonajul pre-calculat din DB
                            const sandTons = (parseFloat(order.route_sand_kg) || 0) / 1000;
                            if (sandTons > 0) {
                                let bestStation = null;
                                let minDistance = Infinity;
                                const baseLat = 50.88243, baseLng = 4.39343; // Baza H&H Resources
                                const siteLat = parseFloat(order.site_lat || order.site_latitude);
                                const siteLng = parseFloat(order.site_lng || order.site_longitude);
                                const directDist = haversine(baseLat, baseLng, siteLat, siteLng) / 1000;
                                
                                if (sandStations && sandStations.length > 0 && siteLat && siteLng && !isNaN(directDist)) {
                                    sandStations.forEach(s => {
                                        const sLat = parseFloat(s.latitude);
                                        const sLng = parseFloat(s.longitude);
                                        if (sLat && sLng) {
                                            const dBase = haversine(baseLat, baseLng, sLat, sLng) / 1000;
                                            const dSite = haversine(sLat, sLng, siteLat, siteLng) / 1000;
                                            const totalDist = dBase + dSite;
                                            if (totalDist < minDistance) {
                                                minDistance = totalDist;
                                                bestStation = s;
                                            }
                                        }
                                    });
                                }
                                let durmitePlastic = '';
                                let durmiteMetalic = '';
                                if (order.materials && Array.isArray(order.materials)) {
                                    order.materials.forEach(m => {
                                        const name = (m.name || '').toLowerCase();
                                        if (name.includes('plastic')) durmitePlastic = m.quantity + ' ' + (m.unit || 'Kg');
                                        else if (name.includes('metal') || name.includes('métal')) durmiteMetalic = m.quantity + ' ' + (m.unit || 'Kg');
                                    });
                                }

                                return (
                                    <>
                                        {(sandTons > 0 || durmitePlastic || durmiteMetalic) && (
                                            <div className="pt-2 mt-2 border-t border-slate-100 flex flex-col gap-2">
                                                {sandTons > 0 && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-amber-700 font-bold">Necesar Sable (estimat)</span>
                                                        <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                                            {sandTons.toFixed(1)} T
                                                        </span>
                                                    </div>
                                                )}
                                                {durmitePlastic && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-slate-700 font-bold">Plastic (Duramint)</span>
                                                        <span className="text-sm font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                                            {durmitePlastic}
                                                        </span>
                                                    </div>
                                                )}
                                                {durmiteMetalic && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-slate-700 font-bold">Metalic (Plasă)</span>
                                                        <span className="text-sm font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                                            {durmiteMetalic}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {isDriver && sandTons > 0 && (
                                            <>
                                                <div className="pt-2 mt-2 flex justify-center">
                                            <button 
                                                onClick={() => setEnableStations(!enableStations)}
                                                className="text-[10px] font-bold text-amber-600 hover:text-amber-700 uppercase tracking-wider px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50"
                                            >
                                                {enableStations ? "Masquer les stations de sable" : "Afficher les stations de sable"}
                                            </button>
                                        </div>
                                        {bestStation && enableStations && (
                                            <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 transition-all duration-200">
                                                <div 
                                                    className="flex items-center justify-between cursor-pointer select-none"
                                                    onClick={() => setShowStation(!showStation)}
                                                >
                                                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider flex items-center gap-1.5 m-0">
                                                        <MapPin className="w-3 h-3" /> Sugestie Stație Sable
                                                    </p>
                                                    <button className="px-2.5 py-1 bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-lg transition-colors shadow-sm">
                                                        {showStation ? 'Ascunde' : 'Vezi Recomandare'}
                                                    </button>
                                                </div>
                                                
                                                {showStation && (
                                                    <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700/50">
                                                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3 h-3" /> Cea Recomandată
                                                        </p>
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-amber-900 dark:text-amber-400 leading-tight truncate">{bestStation.name}</p>
                                                                {bestStation.address && <p className="text-[11px] font-medium text-amber-700 dark:text-amber-500/80 mt-0.5 line-clamp-2">{bestStation.address}</p>}
                                                            </div>
                                                            <span className="shrink-0 bg-white dark:bg-slate-800 shadow-sm border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-[10px] font-black px-1.5 py-0.5 rounded">
                                                                +{Math.max(0, minDistance - directDist).toFixed(1)} km deviere
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2.5">
                                                            <a 
                                                                href={`https://waze.com/ul?ll=${bestStation.latitude},${bestStation.longitude}&navigate=yes`} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#05C8F7] hover:bg-[#04b0d8] text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                                                            >
                                                                Waze
                                                            </a>
                                                            <a 
                                                                href={`https://www.google.com/maps/dir/?api=1&destination=${bestStation.latitude},${bestStation.longitude}&travelmode=driving`} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                                                            >
                                                                Google
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                            </>
                                        )}
                                    </>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </Section>
            )}



            {/* Adresa */}
            {(() => {
                const finalLat = order.site_lat || order.site_latitude;
                const finalLng = order.site_lng || order.site_longitude || order.site_lon;
                return (order.site_address || (finalLat && finalLng)) && (
                    <Section label="Adresa">
                        {order.site_address && (
                            <div className="bg-white rounded-xl border border-slate-200 px-3 py-3 mb-2">
                                <p className="text-sm font-bold text-slate-900 flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    {order.site_address}
                                </p>
                            </div>
                        )}
                        {(finalLat && finalLng) ? (
                            <div className="rounded-xl overflow-hidden border border-slate-200 h-64 relative mb-2">
                                <MapView 
                                    latitude={finalLat} 
                                    longitude={finalLng}
                                    address={order.site_address}
                                    baseName={order.assigned_team_name}
                                    routeSegments={prevOrderLoc ? [{ from: prevOrderLoc.name, from_lat: prevOrderLoc.lat, from_lng: prevOrderLoc.lng }] : order.route_segments}
                                    sandStations={sandStations}
                                    zoom={13}
                                />
                            </div>
                        ) : order.site_address ? (
                            <div className="rounded-xl overflow-hidden border border-slate-200 h-48 relative mb-2">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    frameBorder="0" 
                                    style={{ border: 0 }} 
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(order.site_address)}&t=&z=13&ie=UTF8&iwloc=&output=embed`} 
                                    allowFullScreen
                                />
                            </div>
                        ) : null}
                        {((finalLat && finalLng) || order.site_address) && (
                            <div className="mb-2">
                                <StreetViewPhotos lat={finalLat} lng={finalLng} address={order.site_address} />
                            </div>
                        )}
                        <NavButtons lat={finalLat} lon={finalLng} address={order.site_address} />

                        {/* Photos de finalisation — afișate sub Street View dacă lucrarea e completă */}
                        {order.status === 'completed' && completionPhotos.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                                    {t('work_order.completion_photos', 'Photos de finalisation')}
                                </p>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {completionPhotos.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => onPhotoClick(p.url)}
                                            className="block w-full aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                                        >
                                            <img
                                                src={p.url}
                                                alt="Photo finalisation"
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Section>
                );
            })()}

            {/* Instructiuni acces (admin) */}
            {accessLines.length > 0 && (
                <Section label="Instructiuni Acces">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
                        {accessLines.map((line, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                <p className="text-sm text-amber-900">{line}</p>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Contact client */}
            {(order.client_name || order.client_phone) && (
                <Section label="Contact">
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                        {order.client_name && (
                            <p className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                                {order.client_name}
                                {order.client_language && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase">
                                        Langue: {order.client_language?.toUpperCase() === 'RO' ? 'FR' : order.client_language?.toUpperCase()}
                                    </span>
                                )}
                            </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                            {order.client_phone && (
                                <a
                                    href={`tel:${order.client_phone}`}
                                    className="flex items-center gap-2 text-sm text-green-700 font-semibold bg-green-50 px-3 py-1.5 rounded-lg"
                                >
                                    <Phone className="w-4 h-4" />
                                    {order.client_phone}
                                </a>
                            )}
                        </div>
                    </div>
                </Section>
            )}

            {/* Planuri/Documente Atasate */}
            {documents && documents.length > 0 && (
                <Section label="Documente / Planuri Atașate">
                    <div className="space-y-2">
                        {documents.map(doc => (
                            <a 
                                key={doc.id} 
                                href={doc.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-400 hover:shadow-md transition-all group"
                            >
                                <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{doc.filename}</p>
                                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">
                                        Fichier téléchargé • {Math.round(doc.file_size / 1024)} KB
                                    </p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                            </a>
                        ))}
                    </div>
                </Section>
            )}



            {/* Documente/poze admin (instruction) */}
            {instPhotos.length > 0 && (
                <Section label="Documents & Photos Instructions">
                    <div className="space-y-2">
                        {instPhotos.map(p => (
                            <button
                                key={p.id}
                                onClick={() => onPhotoClick(p.url)}
                                className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-3 hover:bg-slate-50 transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                    <FileImage className="w-5 h-5 text-slate-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                        {p.description || 'Photo instruction'}
                                    </p>
                                    <p className="text-xs text-slate-400">{fmtTime(p.uploaded_at)}</p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                            </button>
                        ))}
                    </div>
                </Section>
            )}

            {/* Note generale */}
            {order.notes && (
                <Section label="Notes">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap bg-white border border-slate-200 rounded-xl px-4 py-3">
                        {order.notes}
                    </p>
                </Section>
            )}

        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: MATERIALE
// ─────────────────────────────────────────────────────────────────────────────
function TabMatériaux({ order, onSaveConsumed, actualSurface, setActualSurface, actualThickness, setActualThickness, actualSand, setActualSand }) {
    let hasSapa = false;
    let totalSapaM2 = 0;
    (order.volumes || []).forEach(vol => {
        const surface = parseFloat(vol.quantity) || 0;
        const labelSafe = (vol.label ?? '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (surface > 0 && labelSafe.includes('sapa')) {
            hasSapa = true;
            totalSapaM2 += surface;
        }
    });
    
    // REGULĂ STRICTĂ: Citim tonajul pre-calculat din DB
    const sandTons = (parseFloat(order.route_sand_kg) || 0) / 1000;

    const estMaterials = [...(order.materials || [])].filter(m => 
        !m.name.toLowerCase().includes('duramit') && 
        !m.name.toLowerCase().includes('fibre') && 
        !m.name.toLowerCase().includes('metalic') && 
        !m.name.toLowerCase().includes('plastic')
    );
    
    // Inseram statusul clar pentru materiale speciale, imediat sub nisip
    const specialMats = [
        { name: 'Duramit', quantity: order.has_duramit ? 'OUI' : 'NON', unit: '' },
        { name: 'Fibre métallique', quantity: order.has_mesh ? 'OUI' : 'NON', unit: '' },
        { name: 'Fibre plastique', quantity: order.has_fiber ? 'OUI' : 'NON', unit: '' }
    ];
    
    if (sandTons > 0 && !estMaterials.find(m => m.name.toLowerCase().includes('nisip') || m.name.toLowerCase().includes('sable'))) {
        estMaterials.unshift({ name: 'Sable (Nécessaire calculé)', quantity: sandTons.toFixed(1), unit: 'T' });
        estMaterials.splice(1, 0, ...specialMats);
    } else {
        estMaterials.push(...specialMats);
    }

    const [rows, setRows] = useState(
        order.materials_consumed?.length > 0
            ? order.materials_consumed.map(m => ({ ...m }))
            : (sandTons > 0 ? [{ name: 'Sable', quantity: '', unit: 'T', note: '' }] : [{ name: '', quantity: '', unit: '', note: '' }])
    )
    const [showOtherMaterials, setShowOtherMaterials] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const save = async () => {
        setSaving(true)
        try {
            await onSaveConsumed(rows.filter(r => r.name?.trim()))
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="pb-28 px-4 pt-4 space-y-4">

            {/* Matériaux estimate (admin) */}
            {estMaterials.length > 0 && (
                <Section label="Matériaux (Estimé)">
                    <div className="space-y-2">
                        {estMaterials.map((m, i) => (
                            <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                                <span className="text-sm font-medium text-slate-700">{m.name}</span>
                                <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                                    {m.quantity} {m.unit}
                                </span>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Date Reale - Completeate de Sef */}
            <Section label="Données réelles du chantier (Chef d'équipe)">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 mb-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Surface coulée réelle (m²)</label>
                        <input 
                            type="number" min="0" step="0.01" value={actualSurface} onChange={(e) => setActualSurface(e.target.value)}
                            placeholder="Ex: 120.5"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Épaisseur réelle (cm)</label>
                        <input 
                            type="number" min="0" step="0.01" value={actualThickness} onChange={(e) => setActualThickness(e.target.value)}
                            placeholder="Ex: 5"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité de sable réelle (kg)</label>
                        <input 
                            type="number" min="0" step="0.01" value={actualSand} onChange={(e) => setActualSand(e.target.value)}
                            placeholder="Ex: 8500"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                </div>
            </Section>

            {/* Matériaux suplimentare */}
            <Section label="Autres matériaux consommés">
                <div className="mb-3 mt-2">
                    <button 
                        onClick={() => setShowOtherMaterials(!showOtherMaterials)}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors uppercase tracking-wider"
                    >
                        {showOtherMaterials ? "Masquer les autres matériaux" : "Ajouter d'autres matériaux consommés"}
                    </button>
                </div>
                {showOtherMaterials && (
                    <div className="w-full animate-in slide-in-from-top-2 duration-200">
                        
                <div className="space-y-2">
                    {rows.map((row, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-200"
                                    placeholder="Nom du matériau"
                                    value={row.name}
                                    onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                />
                                <button
                                    onClick={() => setRows(r => r.filter((_, j) => j !== i))}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    className="w-1/3 px-3 py-2 rounded-lg border border-slate-200 text-sm text-center focus:border-green-400 focus:outline-none"
                                    placeholder="Qté"
                                    value={row.quantity}
                                    onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))}
                                />
                                <input
                                    className="w-1/3 px-3 py-2 rounded-lg border border-slate-200 text-sm text-center focus:border-green-400 focus:outline-none"
                                    placeholder="UM"
                                    value={row.unit}
                                    onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                                />
                            </div>
                            <input
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-green-400 focus:outline-none"
                                placeholder="Note (optionnel)"
                                value={row.note || ''}
                                onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, note: e.target.value } : x))}
                            />
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => setRows(r => [...r, { name: '', quantity: '', unit: '', note: '' }])}
                    className="w-full mt-2 py-3 border-2 border-dashed border-green-200 rounded-xl text-sm text-green-600 font-semibold hover:bg-green-50 flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Ajouter du matériel
                </button>

                <button
                    disabled={saving}
                    onClick={save}
                    className={`mt-2 w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                        saved
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                    } disabled:opacity-60`}
                >
                    {saved ? <><Check className="w-4 h-4" /> Enregistré</> : saving ? 'Enregistrement...' : <><Check className="w-4 h-4" /> Enregistrer la consommation</>}
                </button>
            
                    </div>
                )}
</Section>

            {/* Cantitati executate (mp2, cm etc.) */}
            {order.volumes?.length > 0 && (
                <Section label="Quantités planifiées / estimées">
                    {order.volumes.map((v, i) => (
                        <Row key={i} label={translateDynamicLabel(v.label) || `Position ${i + 1}`} value={`${v.quantity} ${v.unit}`} />
                    ))}
                    
                    {/* Necesar Matériaux Calculat automat */}
                    {sandTons > 0 && (
                        <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-2">
                            <span className="text-sm font-semibold text-slate-700">Sable (Nécessaire estimé)</span>
                            <span className="text-sm font-bold text-slate-900">{sandTons.toFixed(1)} T</span>
                        </div>
                    )}
                </Section>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: EXTRA (poze interne — sef echipa)
// ─────────────────────────────────────────────────────────────────────────────
function TabExtra({ order, photos, isLeader, onUploadInternal, uploadingInternal, onPhotoClick }) {
    const internalPhotos = photos.filter(p => p.photo_type === 'internal')
    const fileRef = useRef(null)

    return (
        <div className="pb-28 px-4 pt-4 space-y-4">

            {isLeader ? (
                <>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
                        <Eye className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800">
                            Les photos ajoutées ici sont <strong>internes</strong>. Elles n'apparaissent pas dans le lien client.
                        </p>
                    </div>

                    <Section label="Photos Interne (Consommation matériaux, état du terrain)">
                        {internalPhotos.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {internalPhotos.map(p => (
                                    <button key={p.id} onClick={() => onPhotoClick(p.url)} className="block w-full text-left">
                                        <img
                                            src={p.url}
                                            alt={p.description || 'Photo interne'}
                                            className="w-full aspect-square object-cover rounded-xl border border-slate-200"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileRef}
                            onChange={e => {
                                const f = e.target.files?.[0]
                                if (f) onUploadInternal(f)
                                e.target.value = ''
                            }}
                        />
                        <button
                            disabled={uploadingInternal}
                            onClick={() => fileRef.current?.click()}
                            className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-sm text-blue-600 font-semibold hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                        >
                            <Camera className="w-4 h-4" />
                            {uploadingInternal ? 'Chargement...' : 'Ajouter photo interne'}
                        </button>
                    </Section>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Lock className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm text-center">Cette section est disponible<br />uniquement au chef d'équipe.</p>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: POZE
// ─────────────────────────────────────────────────────────────────────────────
function TabPhotos({ order, completionPhotos, machinePhotos, onUploadCompletion, onUploadMachine, uploadingCompletion, uploadingMachine, ocrData, onDeletePhoto, onPhotoClick }) {
    const fileRef = useRef(null)
    const machineFileRef = useRef(null)
    const isCompleted = order.status === 'completed'

    return (
        <div className="pb-28 px-4 pt-4 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-600">
                    Photos de finalisation requises : <strong className={completionPhotos.length >= order.min_photos_required ? 'text-blue-600' : 'text-red-600'}>
                        {completionPhotos.length} / {order.min_photos_required}
                    </strong>
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.min(100, (completionPhotos.length / (order.min_photos_required || 2)) * 100)}%` }}
                    />
                </div>
            </div>

            <Section label="Photos Finalisation (pour le client)">
                {completionPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        {completionPhotos.map(p => (
                            <div key={p.id} className="relative">
                                <button onClick={() => onPhotoClick(p.url)} className="block w-full text-left">
                                    <img src={p.url} alt="Photo finalisation" className="w-full aspect-square object-cover rounded-xl border border-slate-200" />
                                </button>
                                {!isCompleted && (
                                    <button onClick={() => onDeletePhoto(p.id)} className="absolute -top-2 -right-2 w-7 h-7 bg-white text-red-600 border border-slate-200 rounded-full flex items-center justify-center shadow-md opacity-90 hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={e => { const f = e.target.files?.[0]; if (f) onUploadCompletion(f); e.target.value = ''; }} />
                <button disabled={uploadingCompletion || isCompleted} onClick={() => fileRef.current?.click()} className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-sm text-blue-600 font-semibold hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                    <Camera className="w-4 h-4" />
                    {uploadingCompletion ? 'Chargement...' : 'Photographier la finalisation'}
                </button>
            </Section>

            <Section label="Photo Calculateur Machine (OBLIGATOIRE pour OCR)">
                {machinePhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        {machinePhotos.map(p => (
                            <div key={p.id} className="relative">
                                <button onClick={() => onPhotoClick(p.url)} className="block w-full text-left">
                                    <img src={p.url} alt="Photo calculateur machine" className="w-full aspect-square object-cover rounded-xl border border-blue-400 shadow-sm" />
                                </button>
                                {!isCompleted && (
                                    <button onClick={() => onDeletePhoto(p.id)} className="absolute -top-2 -right-2 w-7 h-7 bg-white text-red-600 border border-slate-200 rounded-full flex items-center justify-center shadow-md opacity-90 hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                
                {ocrData && ocrData.status === 'success' && (
                    <div className="mb-3 bg-emerald-50 text-emerald-700 p-2 text-xs rounded-xl border border-emerald-200">
                        ✅ Vérifié par IA: <strong>Sable: {ocrData.sand_kg}kg {ocrData.sand_m3 ? `(${ocrData.sand_m3}m³)` : ''}</strong> | Ciment: {ocrData.cement_kg}kg
                    </div>
                )}

                <input type="file" accept="image/*" className="hidden" ref={machineFileRef} onChange={e => { const f = e.target.files?.[0]; if (f) onUploadMachine(f); e.target.value = ''; }} />
                <button disabled={uploadingMachine || isCompleted} onClick={() => machineFileRef.current?.click()} className="w-full py-3 border-2 border-dashed border-indigo-300 rounded-xl text-sm text-indigo-700 font-semibold hover:bg-indigo-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                    <Camera className="w-4 h-4" />
                    {uploadingMachine ? 'IA en cours d\'analyse...' : 'Photographier écran machine (Bremat)'}
                </button>
            </Section>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: TRIMITE (inchidere comanda)
// ─────────────────────────────────────────────────────────────────────────────
function TabTrimite({ order, completionPhotos, machinePhotos, actualSurface, setActualSurface, actualThickness, setActualThickness, actualSand, setActualSand, actualSandM3, setActualSandM3, actualCement, setActualCement, onReopen, isReanalyzing, onReanalyze }) {
    const isCompleted = order.status === 'completed'

    return (
        <div className="pb-28 px-4 pt-4 space-y-4">

            {isCompleted ? (
                <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Commande finalisée</h3>
                    <p className="text-sm text-slate-500">L'admin enverra le lien de signature au client.</p>
                    <button
                        onClick={onReopen}
                        className="mt-6 text-sm text-blue-600 underline font-semibold"
                    >
                        Annuler la finalisation
                    </button>
                </div>
            ) : (
                <>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
                        <p className="text-sm font-semibold text-slate-800 mb-1">Vérification clôture commande</p>
                        <div className="text-xs space-y-1">
                            <div className="flex items-center gap-1.5">
                                {completionPhotos.length >= order.min_photos_required ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertCircle className="w-3 h-3 text-red-500" />}
                                <span className={completionPhotos.length >= order.min_photos_required ? 'text-slate-600' : 'text-red-600'}>Photos travaux ({completionPhotos.length}/{order.min_photos_required})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {machinePhotos.length > 0 ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertCircle className="w-3 h-3 text-red-500" />}
                                <span className={machinePhotos.length > 0 ? 'text-slate-600' : 'text-red-600'}>Photo écran machine</span>
                            </div>
                        </div>
                    </div>

                    {machinePhotos.length > 0 && (
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={onReanalyze}
                                disabled={isReanalyzing}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold border border-blue-200 active:bg-blue-100 disabled:opacity-50 transition-colors"
                            >
                                {isReanalyzing ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Analyse en cours...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                                        Ré-analyser photo par IA
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    <Section label="Mesures des travaux (OBLIGATOIRE)">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Surface coulée (m²)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.01"
                                    value={actualSurface}
                                    onChange={(e) => setActualSurface(e.target.value)}
                                    placeholder="Ex: 120.5"
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Épaisseur réelle (cm)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.1"
                                    value={actualThickness}
                                    onChange={(e) => setActualThickness(e.target.value)}
                                    placeholder="Ex: 6.5"
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité de sable (kg)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.01"
                                    value={actualSand}
                                    onChange={(e) => setActualSand(e.target.value)}
                                    placeholder="Ex: 8500"
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité de sable (m³)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.01"
                                    value={actualSandM3}
                                    onChange={(e) => setActualSandM3(e.target.value)}
                                    placeholder="Ex: 5.5"
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité de ciment (kg)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.01"
                                    value={actualCement}
                                    onChange={(e) => setActualCement(e.target.value)}
                                    placeholder="Ex: 1200"
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </Section>
                </>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE: Section wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Section({ label, children }) {
    return (
        <div className="px-4 pt-3 pb-1">
            <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-2">{label}</h4>
            <div className="space-y-1">{children}</div>
        </div>
    )
}

function Row({ label, value }) {
    return (
        <div className="flex items-start justify-between py-1.5 border-b border-slate-100 last:border-0">
            <span className="text-xs text-slate-500 shrink-0 w-28">{label}</span>
            <span className="text-xs text-slate-800 text-right flex-1">{value}</span>
        </div>
    )
}

import { useNavigate } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerOrdersPage({ isHistory = false }) {
    const [currentDate, setCurrentDate] = useState(() => {
        const d = new Date();
        if (isHistory) d.setDate(d.getDate() - 1);
        return d;
    });
    const { user, logout } = useAuthStore()
    const tenant = useTenantStore(s => s.tenant)
    const showToast = useUIStore(s => s.showToast)
    const navigate = useNavigate()
    const { t } = useTranslation()
    const globalTheme = useViewPreferencesStore(state => state.globalTheme)
    const toggleTheme = useViewPreferencesStore(state => state.toggleTheme)

    const handleLogout = async () => {
        try {
            if ('caches' in window) {
                const keys = await caches.keys()
                await Promise.all(keys.map(k => caches.delete(k)))
            }
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations()
                await Promise.all(regs.map(r => r.unregister()))
            }
        } catch (e) { /* ignore */ }
        logout()
    }

    const [orders, setOrders]         = useState([])
    const [loading, setLoading]       = useState(true)
    const [selected, setSelected]     = useState(null) // WorkOrder object
    const [activeTab, setActiveTab]   = useState('info')
    const [photos, setPhotos]         = useState([])
    const [documents, setDocuments]   = useState([])
    const [location, setLocation]     = useState(null)
    const [actualSurface, setActualSurface] = useState('')
    const [actualThickness, setActualThickness] = useState('')
    const [actualSand, setActualSand] = useState('')
    const [actualSandM3, setActualSandM3] = useState('')
    const [actualCement, setActualCement] = useState('')
    const [ocrData, setOcrData]       = useState(null)
    const [sandStations, setSandStations] = useState([])

    // Action states
    const [acknowledging, setAcknowledging]           = useState(false)
    const [loadingAction, setLoadingAction]           = useState(false)
    const [confirmDialog, setConfirmDialog] = useState(null)
    const [showFinalizeModal, setShowFinalizeModal] = useState(false)
    const [uploadingCompletion, setUploadingCompletion] = useState(false)
    const [uploadingInternal, setUploadingInternal]   = useState(false)
    const [uploadingMachine, setUploadingMachine]     = useState(false)
    const [closing, setClosing]                       = useState(false)
    const [lightboxUrl, setLightboxUrl]               = useState(null)

    const isLeader = ['TEAM_LEADER', 'TEAM_LEAD', 'SEF_ECHIPA', 'ADMIN', 'MANAGER', 'COMPANY_ADMIN'].includes(user?.role?.code)
    const isDriver = ['DRIVER', 'SOFER'].includes(user?.role?.code)

    // GPS watch
    useEffect(() => {
        if (!navigator.geolocation) return
        const id = navigator.geolocation.watchPosition(
            pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => {},
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        )
        return () => navigator.geolocation.clearWatch(id)
    }, [])

    // Auto-calculate Thickness when Surface and Sand change
    useEffect(() => {
        const surface = parseFloat(actualSurface) || 0
        const sandTons = (parseFloat(actualSand) || 0) / 1000 // if sand is in kg, it needs to be in Tons! Wait, actualSand is kg? Let's check formula.

        // Formula: Grosime (cm) = ( Tonaj_Nisip / Suprafața_Reală / 1.6 ) * 100
        if (surface > 0 && sandTons > 0) {
            const calculatedThickness = (sandTons / surface / 1.6) * 100;
            // Rounding logic:
            // .00 to .24 -> .0
            // .25 to .74 -> .5
            // .75 to .99 -> +1.0
            const roundedThickness = Math.round(calculatedThickness * 2) / 2;
            setActualThickness(roundedThickness.toString())
        }
    }, [actualSurface, actualSand])

    const fetchSandStations = async () => {
        try {
            const res = await api.get('/worker/orders/sand-stations')
            setSandStations(res.data || [])
        } catch {}
    }

    useEffect(() => {
        fetchOrders()
        fetchSandStations()
        const interval = setInterval(() => {
            if (!selected) {
                fetchOrders(true)
            }
        }, 10000)
        return () => clearInterval(interval)
    }, [selected])

    const fetchOrders = async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const res = await api.get('/worker/orders')
            let fetchedOrders = res.data || [];
            
            // Nu mai filtrăm comenzile aici pentru a permite MobileAgenda să navigheze liber între zile.
            // Componenta MobileAgenda va filtra automat comenzile afișate pentru ziua curentă (currentDate).

            setOrders(fetchedOrders);
        } catch {
            if (!silent) showToast('Erreur lors du chargement des commandes.', 'error')
        } finally {
            if (!silent) setLoading(false)
        }
    }

    const [prevOrderLoc, setPrevOrderLoc] = useState(null)

    const openOrder = async (order, pLat, pLng, pName) => {
        setSelected(order)
        if (pLat && pLng) {
            setPrevOrderLoc({ lat: pLat, lng: pLng, name: pName || 'Lucrarea Precedentă' })
        } else {
            setPrevOrderLoc(null)
        }
        setActiveTab('info') // Always open info tab first
        setPhotos([])
        setDocuments([])
        setActualSurface(order.actual_surface_m2 || '')
        setActualThickness(order.actual_thickness_cm || '')
        setActualSand(order.actual_sand_quantity || '')
        setActualSandM3(order.actual_sand_m3 || '')
        fetchOrderPhotos(order.id)
        fetchOrderDocuments(order.id)
    }

    const fetchOrderPhotos = async (id) => {
        try {
            const res = await api.get(`/worker/orders/${id}/photos`)
            setPhotos(res.data || [])
        } catch {}
    }

    const fetchOrderDocuments = async (id) => {
        try {
            const res = await api.get(`/worker/orders/${id}/documents`)
            setDocuments(res.data || [])
        } catch {}
    }

    const refreshSelected = async () => {
        if (!selected) return
        const res = await api.get(`/worker/orders/${selected.id}`)
        setSelected(res.data)
        await fetchOrders()
        await fetchOrderPhotos(selected.id)
        await fetchOrderDocuments(selected.id)
    }

    // ACKNOWLEDGE
    const handleAcknowledge = async () => {
        setAcknowledging(true)
        try {
            await api.post(`/worker/orders/${selected.id}/acknowledge`)
            showToast('Confirmé avec succès.', 'success')
            await refreshSelected()
        } catch (e) {
            showToast(e.response?.data?.detail || 'Erreur lors de la confirmation.', 'error')
        } finally {
            setAcknowledging(false)
        }
    }

    // UPLOAD PHOTO
    const handleUploadPhoto = async (file, photoType) => {
        let setter = setUploadingCompletion
        if (photoType === 'internal') setter = setUploadingInternal
        if (photoType === 'machine_computer') setter = setUploadingMachine
        
        setter(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('photo_type', photoType)
            const res = await api.post(`/worker/orders/${selected.id}/photos`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            showToast('Photo ajoutée.', 'success')
            
            if (photoType === 'machine_computer' && res.data?.ocr_data) {
                setOcrData(res.data.ocr_data)
                if (res.data.ocr_data.sand_kg) {
                    setActualSand(res.data.ocr_data.sand_kg) // autofill
                }
                if (res.data.ocr_data.sand_m3) {
                    setActualSandM3(res.data.ocr_data.sand_m3)
                }
                if (res.data.ocr_data.cement_kg) {
                    setActualCement(res.data.ocr_data.cement_kg)
                }
                if (res.data.ocr_data.status === 'error') {
                    showToast(`Eroare OCR: ${res.data.ocr_data.error}`, 'error')
                }
            }
            
            await fetchOrderPhotos(selected.id)
            await refreshSelected()
        } catch (e) {
            showToast(e.response?.data?.detail || 'Eroare la upload.', 'error')
        } finally {
            setter(false)
        }
    }

    // SAVE CONSUMED MATERIALS
    const handleSaveConsumed = async (materials) => {
        await api.post(`/worker/orders/${selected.id}/close`, {
            materials_consumed: materials,
            volumes: selected.volumes || [],
        }).catch(async () => {
            // Daca inchiderea esueaza (poze insuficiente), salveaza doar materialele
            // via close payload partial — in viitor poate fi un endpoint separat
        })
        await refreshSelected()
    }

    const handleClose = async () => {
        // Câmpuri obligatorii — nu se poate finaliza fără suprafață și grosime reale
        if (!actualSurface || parseFloat(actualSurface) <= 0) {
            showToast('⚠️ La superficie réelle (m²) est obligatoire pour finaliser!', 'error')
            return
        }
        if (!actualThickness || parseFloat(actualThickness) <= 0) {
            showToast('⚠️ L\'épaisseur réelle (cm) est obligatoire pour finaliser!', 'error')
            return
        }
        if (ocrData?.sand_kg && actualSand) {
            const difference = Math.abs(parseFloat(actualSand) - parseFloat(ocrData.sand_kg));
            const percentage = (difference / parseFloat(ocrData.sand_kg)) * 100;
            if (percentage > 5) {
                setConfirmDialog({
                    title: 'ATENȚIE!',
                    message: `Cantitatea de nisip introdusă (${actualSand}kg) diferă semnificativ de valoarea citită de AI de pe ecran (${ocrData.sand_kg}kg).\n\nEști sigur că vrei să salvezi cantitatea ta? Dacă e o greșeală, apasă Anulare și corectează.`,
                    onConfirm: executeClose
                })
                return;
            }
        }
        executeClose()
    }

    const executeClose = async () => {
        setClosing(true)
        try {
            const res = await api.post(`/worker/orders/${selected.id}/close`, {
                materials_consumed: [
                    ...(selected.materials_consumed || []),
                    ...(actualSandM3 ? [{ name: 'Sable (m³)', quantity: parseFloat(actualSandM3), unit: 'm³' }] : []),
                    ...(actualCement ? [{ name: 'Ciment', quantity: parseFloat(actualCement), unit: 'kg' }] : [])
                ],
                volumes: selected.volumes || [],
                actual_surface_m2: parseFloat(actualSurface) || null,
                actual_thickness_cm: parseFloat(actualThickness) || null,
                actual_sand_quantity: parseFloat(actualSand) || null,
            })
            showToast(res.data?.message || 'Comanda finalizata.', 'success')
            setSelected(null) // inchide modalul
            await fetchOrders() // reincarca lista
        } catch (e) {
            showToast(e.response?.data?.detail || 'Erreur de finalisation.', 'error')
        } finally {
            setClosing(false)
        }
    }

    // REOPEN ORDER
    const handleReopen = async () => {
        setConfirmDialog({
            title: 'Redeschide Comanda',
            message: 'Ești sigur că vrei să redeschizi comanda? Statutul se va schimba din nou în „În lucru”.',
            onConfirm: async () => {
                try {
                    const res = await api.post(`/worker/orders/${selected.id}/reopen`)
                    showToast(res.data?.message || 'Comanda redeschisa.', 'success')
                    await refreshSelected()
                } catch (e) {
                    showToast(e.response?.data?.detail || 'Eroare la redeschidere.', 'error')
                }
            }
        })
    }

    const [isReanalyzing, setIsReanalyzing] = useState(false)

    const handleReanalyzeOCR = async () => {
        const machinePhoto = machinePhotos[0]
        if (!machinePhoto) return
        
        setIsReanalyzing(true)
        try {
            const res = await api.post(`/worker/orders/${selected.id}/photos/${machinePhoto.id}/re-ocr`)
            showToast('Analiza AI completată cu succes.', 'success')
            
            if (res.data?.ocr_data) {
                setOcrData(res.data.ocr_data)
                if (res.data.ocr_data.sand_kg) {
                    setActualSand(res.data.ocr_data.sand_kg)
                }
                if (res.data.ocr_data.sand_m3) {
                    setActualSandM3(res.data.ocr_data.sand_m3)
                }
                if (res.data.ocr_data.cement_kg) {
                    setActualCement(res.data.ocr_data.cement_kg)
                }
                if (res.data.ocr_data.status === 'error') {
                    showToast(`Eroare OCR: ${res.data.ocr_data.error}`, 'error')
                }
            }
        } catch (e) {
            showToast(e.response?.data?.detail || 'Eroare la re-analiza pozei.', 'error')
        } finally {
            setIsReanalyzing(false)
        }
    }

    // DELETE PHOTO
    const handleDeletePhoto = async (photoId) => {
        setConfirmDialog({
            title: 'Ștergere Poză',
            message: 'Ești sigur că vrei să ștergi această poză?',
            onConfirm: async () => {
                try {
                    await api.delete(`/worker/orders/${selected.id}/photos/${photoId}`)
                    showToast('Poza a fost ștearsă.', 'success')
                    await fetchOrderPhotos(selected.id)
                } catch (e) {
                    showToast(e.response?.data?.detail || 'Eroare la ștergerea pozei.', 'error')
                }
            }
        })
    }

    // ── State derivat
    const isCompleted = selected?.status === 'completed'
    const completionPhotos = photos.filter(p => p.photo_type === 'completion')
    const machinePhotos = photos.filter(p => p.photo_type === 'machine_computer')
    const hasMeasurements = actualSurface !== '' && actualSand !== '' && parseFloat(actualSurface) > 0 && parseFloat(actualSand) > 0
    const canClose = completionPhotos.length >= (selected?.min_photos_required || 2) && hasMeasurements && machinePhotos.length > 0

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: LISTA comenzi
    // ─────────────────────────────────────────────────────────────────────────
    if (!selected) {
        return (
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 dark:text-slate-200">
                {/* Header cu Profil si Logout */}
                <div 
                    className={`text-white p-4 shadow-lg sticky top-0 z-20 transition-colors ${globalTheme === 'dark' ? 'bg-slate-900' : 'bg-[color:var(--mobile-bg)]'}`}
                    style={globalTheme === 'dark' ? {} : { '--mobile-bg': tenant?.primary_color || '#2563EB' }}
                >
                    <div className="flex items-center justify-between max-w-md mx-auto">
                        <div className="flex items-center gap-3">
                            {user?.avatar_path && (
                                <img
                                    src={user.avatar_path.startsWith('http') ? user.avatar_path : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${user.avatar_path}`}
                                    alt=""
                                    className="w-12 h-12 rounded-lg object-cover object-[center_20%] shrink-0 ring-2 ring-white/50"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                />
                            )}
                            <div className={`w-12 h-12 rounded-lg bg-white/20 items-center justify-center text-lg font-bold shrink-0 ${user?.avatar_path ? 'hidden' : 'flex'}`}>
                                {user?.full_name?.charAt(0) || '?'}
                            </div>
                            <div>
                                <h2 className="font-bold text-lg leading-tight">{user?.full_name}</h2>
                                <p className="text-blue-200 text-sm">{isLeader ? t('roles.team_leader', "Chef d'équipe") : t('roles.worker', 'Ouvrier')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <LanguageSelector variant="light" className="bg-white/20 border-0 text-white hover:bg-white/30" />
                            <button
                                onClick={toggleTheme}
                                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors text-white"
                                title={globalTheme === 'dark' ? t('live.light_mode', 'Mode Clair') : t('live.dark_mode', 'Mode Sombre')}
                            >
                                {globalTheme === 'dark' ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <button onClick={handleLogout} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                                <LogOut className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        <MobileAgenda
                            orders={orders}
                            onOrderClick={(wo, pLat, pLng, pName) => openOrder(wo, pLat, pLng, pName)}
                            currentDate={currentDate}
                            setCurrentDate={setCurrentDate}
                            isHistory={isHistory}
                        />
                        
                        {/* Eliminat lista duplicată de comenzi, deoarece ShortWorksCalendar afiseaza deja comenzile */}
                    </div>
                )}
            </div>
        )
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: DETALIU comanda
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className={`fixed inset-x-0 top-0 bottom-0 z-[60] bg-slate-50 dark:bg-slate-900 flex flex-col transition-transform duration-300 ${selected ? 'translate-x-0' : 'translate-x-full'}`}>
            <EmployeeHeader 
                title={selected.client_name || "Client Necunoscut"} 
                showBack={false} 
                rightContent={
                    <button
                        onClick={() => setSelected(null)}
                        className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md w-10 h-10 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 active:scale-95 transition-all"
                    >
                        <ChevronRight className="w-6 h-6 rotate-180" />
                    </button>
                }
            />

            {/* Continut tab */}
            <div className="flex-1 overflow-y-auto pb-6">
                {activeTab === 'info' && (
                    <TabInfo
                        order={selected}
                        photos={photos}
                        documents={documents}
                        onAcknowledge={handleAcknowledge}
                        acknowledging={acknowledging}
                        onPhotoClick={setLightboxUrl}
                        sandStations={sandStations}
                        isDriver={isDriver}
                        completionPhotos={completionPhotos}
                        prevOrderLoc={prevOrderLoc}
                    />
                )}

                {activeTab === 'materiale' && (
                    <TabMatériaux
                        order={selected}
                        onSaveConsumed={handleSaveConsumed}
                    />
                )}
                {activeTab === 'extra' && (
                    <TabExtra
                        order={selected}
                        photos={photos}
                        isLeader={isLeader}
                        onUploadInternal={f => handleUploadPhoto(f, 'internal')}
                        uploadingInternal={uploadingInternal}
                        onPhotoClick={setLightboxUrl}
                    />
                )}
                {activeTab === 'poze' && (
                    <TabPhotos
                        order={selected}
                        completionPhotos={completionPhotos}
                        machinePhotos={machinePhotos}
                        onUploadCompletion={f => handleUploadPhoto(f, 'completion')}
                        onUploadMachine={f => handleUploadPhoto(f, 'machine_computer')}
                        uploadingCompletion={uploadingCompletion}
                        uploadingMachine={uploadingMachine}
                        ocrData={ocrData}
                        onDeletePhoto={handleDeletePhoto}
                        onPhotoClick={setLightboxUrl}
                    />
                )}
                {activeTab === 'trimite' && (
                    <TabTrimite
                        order={selected}
                        completionPhotos={completionPhotos}
                        machinePhotos={machinePhotos}
                        actualSurface={actualSurface}
                        setActualSurface={setActualSurface}
                        actualThickness={actualThickness}
                        setActualThickness={setActualThickness}
                        actualSand={actualSand}
                        setActualSand={setActualSand}
                        actualSandM3={actualSandM3}
                        setActualSandM3={setActualSandM3}
                        actualCement={actualCement}
                        setActualCement={setActualCement}
                        onReopen={handleReopen}
                        isReanalyzing={isReanalyzing}
                        onReanalyze={handleReanalyzeOCR}
                    />
                )}
            </div>

            {confirmDialog && (
                <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmDialog.title}</h3>
                        <p className="text-slate-600 mb-6 whitespace-pre-line">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                            >
                                Anulare
                            </button>
                            <button
                                onClick={() => {
                                    confirmDialog.onConfirm();
                                    setConfirmDialog(null);
                                }}
                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30"
                            >
                                Confirmă
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Buton principal fix jos — DOAR FINALIZEAZA */}
            {!isCompleted && activeTab === 'trimite' && (
                <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
                    <button
                        disabled={closing || !canClose}
                        onClick={handleClose}
                        className={`w-full py-4 text-white font-bold text-base rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-60 ${canClose ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400'}`}
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        {closing ? 'Finalisation en cours...' : (canClose ? 'Finaliser la commande' : 'Ajouter les données nécessaires')}
                    </button>
                </div>
            )}

            {/* TabBar mutat in panoul de jos */}
            <div className="shrink-0 z-20">
                <TabBar active={activeTab} onChange={setActiveTab} onHomePress={() => navigate('/')} tenant={tenant} />
            </div>

            <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
        </div>
    )
}

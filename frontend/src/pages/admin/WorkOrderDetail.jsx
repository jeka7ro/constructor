import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ChevronLeft, ClipboardList, MapPin, User, Calendar, Clock,
    Package, Camera, Edit2, Timer, AlertCircle, FileText,
    Navigation, Send, Play, Ban, CheckCircle, CheckCircle2,
    Circle, Users, Wrench, BarChart2, ExternalLink, Activity, Paperclip, ImageIcon, Download, Layers
} from 'lucide-react'
import api from '../../lib/api'
import MapView from '../../components/MapView'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts'
import HourlyWeather from '../../components/HourlyWeather'

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
    draft:       { label: 'Nouă',        color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-400',   icon: Circle },
    sent:        { label: 'Trimisă',      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500', icon: Send },
    confirmed:   { label: 'Confirmată',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500', icon: CheckCircle2 },
    in_progress: { label: 'În Execuție',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500',   icon: Play },
    completed:   { label: 'Finalizată',   color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', dot: 'bg-violet-500', icon: CheckCircle },
    cancelled:   { label: 'Anulată',      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500',       icon: Ban },
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const STEP_LABELS = [
    { key: 'draft',       label: 'Creată',      icon: FileText },
    { key: 'sent',        label: 'Trimisă',      icon: Send },
    { key: 'confirmed',   label: 'Confirmată',   icon: CheckCircle2 },
    { key: 'in_progress', label: 'În Execuție',  icon: Play },
    { key: 'completed',   label: 'Finalizată',   icon: CheckCircle },
]
const STATUS_ORDER = ['draft', 'sent', 'confirmed', 'in_progress', 'completed']

const fmt     = (d) => d ? new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '—'
const fmtFull = (d) => d ? `${fmt(d)} ${fmtTime(d)}` : '—'

// ─── Sub-components ────────────────────────────────────────────────────────────
function KPI({ icon: Icon, label, value, sub, color = 'blue' }) {
    const grad = {
        blue:   'from-blue-500 to-blue-600 shadow-blue-500/30',
        green:  'from-emerald-500 to-green-600 shadow-emerald-500/30',
        purple: 'from-violet-500 to-purple-600 shadow-violet-500/30',
        amber:  'from-amber-400 to-orange-500 shadow-amber-400/30',
        slate:  'from-slate-500 to-slate-600 shadow-slate-500/20',
        rose:   'from-rose-400 to-rose-500 shadow-rose-400/30',
    }
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 sm:p-2.5 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-2">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br ${grad[color]} flex items-center justify-center shadow-sm shrink-0`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight truncate">{value}</div>
                <div className="text-[8px] sm:text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                    {label} {sub && <span className="text-slate-400 lowercase font-normal ml-0.5">({sub})</span>}
                </div>
            </div>
        </div>
    )
}

function Section({ className = '', icon: Icon, title, children }) {
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden ${className}`}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5 shrink-0">
                <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">{title}</h2>
            </div>
            <div className="p-5 flex-1">{children}</div>
        </div>
    )
}

function Row({ label, value, mono }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between py-2.5 sm:py-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0 gap-0.5 sm:gap-3">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider sm:w-44 shrink-0">{label}</span>
            <span className={`text-sm font-semibold text-slate-800 dark:text-slate-200 sm:text-right ${mono ? 'font-mono' : ''} break-words whitespace-pre-line`}>{value || '—'}</span>
        </div>
    )
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
        <>
            {googleUrl && (
                <a href={googleUrl} target="_blank" rel="noreferrer"
                    className="flex justify-center items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-500/20 whitespace-nowrap">
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    Google
                </a>
            )}
            {wazeUrl && (
                <a href={wazeUrl} target="_blank" rel="noreferrer"
                    className="flex justify-center items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#05C8F7] text-white text-[11px] font-bold hover:bg-[#04b0d8] active:scale-95 transition-all shadow-sm shadow-cyan-400/20 whitespace-nowrap">
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.54 6.63C19.08 4.05 16.73 2.19 14 1.54V1.5c0-.83-.67-1.5-1.5-1.5S11 .67 11 1.5v.04C8.27 2.19 5.92 4.05 4.46 6.63A8.959 8.959 0 003 11c0 4.97 4.03 9 9 9s9-4.03 9-9c0-1.62-.43-3.14-1.46-4.37zM8.5 13c-.83 0-1.5-.67-1.5-1.5S7.67 10 8.5 10s1.5.67 1.5 1.5S9.33 13 8.5 13zm7 0c-.83 0-1.5-.67-1.5-1.5S14.67 10 15.5 10s1.5.67 1.5 1.5S16.33 13 15.5 13zm-3.5 4c-1.66 0-3-1.34-3-3h6c0 1.66-1.34 3-3 3z"/>
                    </svg>
                    Waze
                </a>
            )}
            {appleUrl && (
                <a href={appleUrl} target="_blank" rel="noreferrer"
                    className="flex justify-center items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-600 text-white text-[11px] font-bold hover:bg-slate-700 active:scale-95 transition-all shadow-sm whitespace-nowrap">
                    <Navigation className="w-3 h-3 shrink-0" />
                    Apple
                </a>
            )}
        </>
    )
}


// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkOrderDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [wo, setWo]           = useState(null)
    const [sessions, setSessions] = useState(null)
    const [photos, setPhotos]   = useState([])
    const [loading, setLoading] = useState(true)
    const [lightbox, setLightbox] = useState(null)
    const [sandStations, setSandStations] = useState([])

    const handleInvoiceUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadingInvoice(true)
        const formData = new FormData()
        formData.append('file', file)
        try {
            await api.post(`/admin/work-orders/${id}/final-invoice`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            alert('Factura finală a fost încărcată cu succes!')
            load()
        } catch (err) {
            alert(err.response?.data?.detail || 'Eroare la încărcare factură.')
        } finally {
            setUploadingInvoice(false)
        }
    }

    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [woRes, sessRes, photosRes, stationsRes] = await Promise.allSettled([
                api.get(`/admin/work-orders/${id}`),
                api.get(`/admin/work-orders/${id}/sessions`),
                api.get(`/admin/work-orders/${id}/photos`),
                api.get('/admin/logistics/sand-stations'),
            ])
            if (woRes.status === 'fulfilled')     setWo(woRes.value.data)
            if (sessRes.status === 'fulfilled')   setSessions(sessRes.value.data)
            if (stationsRes.status === 'fulfilled') setSandStations(stationsRes.value.data)
            if (photosRes.status === 'fulfilled') {
                const p = photosRes.value.data
                setPhotos(Array.isArray(p) ? p : (p?.photos || []))
            }
        } catch {} finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { load() }, [load])

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                <span className="text-sm text-slate-500 font-medium">Se încarcă comanda...</span>
            </div>
        </div>
    )
    if (!wo) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400 font-semibold">Comanda nu a fost găsită</p>
                <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-colors">
                    ← Înapoi
                </button>
            </div>
        </div>
    )

    const cfg = STATUS[wo.status] || STATUS.draft
    const currentStep = STATUS_ORDER.indexOf(wo.status)

    // GPS — vine din serializer backend
    const lat     = wo.site_latitude  ?? null
    const lon     = wo.site_longitude ?? null
    const geoR    = wo.geo_radius     ?? null
    const address = wo.site_address   || wo.site_name || null

    // KPIs
    const totalHours = sessions?.total_hours || 0
    const sessCount  = sessions?.sessions_count || 0
    
    // Dynamic Materials KPI
    const hasStarted = wo.status === 'in_progress' || wo.status === 'completed';
    const materialsArray = (hasStarted ? wo.materials_consumed : wo.materials) || [];
    const activeMats = materialsArray.filter(m => m.name);

    let matValue = '—';
    let matSub = 'niciun material';

    // Auto-calculate estimated sand from volumes if no materials are explicitly added
    let autoSandKg = 0;
    if (wo.volumes && wo.volumes.length > 0) {
        wo.volumes.forEach(vol => {
            const surface = parseFloat(vol.quantity) || 0;
            const thickness = parseFloat(vol.thickness) || 0;
            autoSandKg += (surface * thickness * 16);
        });
    } else {
        const fallbackSurface = parseFloat(wo.surface_area) || parseFloat(wo.surface) || 0;
        const fallbackThick = parseFloat(wo.thickness) || 0;
        autoSandKg = fallbackSurface * fallbackThick * 16;
    }

    if (activeMats.length === 1) {
        const m = activeMats[0];
        let q = parseFloat(m.quantity) || 0;
        if (m.unit === 'kg') q = q / 1000;
        matValue = `${q.toFixed(1)} tone`;
        matSub = m.name;
    } else if (activeMats.length > 1) {
        let totalT = 0;
        const names = [];
        activeMats.forEach(m => {
            let q = parseFloat(m.quantity) || 0;
            if (m.unit === 'kg') q = q / 1000;
            totalT += q;
            if (m.name && !names.includes(m.name)) names.push(m.name);
        });
        
        if (totalT > 0) {
            matValue = `${totalT.toFixed(1)} tone`;
            let namesStr = names.join(', ');
            if (namesStr.length > 20) namesStr = namesStr.substring(0, 17) + '...';
            matSub = namesStr;
        } else {
            matValue = activeMats.length;
            matSub = 'tipuri materiale';
        }
    } else if (autoSandKg > 0) {
        // Fallback: Show estimated sand from volumes if no explicit materials were added
        const tons = autoSandKg / 1000;
        matValue = `${tons.toFixed(1)} tone`;
        matSub = 'Nisip (estimat)';
    }

    const matLabel = hasStarted ? "Mat. Consumate" : "Mat. Necesare";


    // Calculation Logic for Sapa
    let autoNet = 0;
    let autoBase = 0;
    let autoExtra = 0;
    let autoFoil = 0;
    let autoMesh = 0;
    let autoFiber = 0;
    let isAuto = false;
    let surfaceForAuto = 0;
    let extraThickForAuto = 0;

    (wo.volumes || []).forEach(vol => {
        const surface = parseFloat(vol.quantity) || 0;
        const thickness = parseFloat(vol.thickness) || 0;
        if (vol.label?.toLowerCase()?.includes('sapa') && surface > 0) {
            isAuto = true;
            surfaceForAuto += surface;
            const extraThickness = Math.max(0, thickness - 5);
            extraThickForAuto = extraThickness;
            autoBase += 12.5 * surface;
            autoExtra += extraThickness * 1.25 * surface;
            autoFoil += vol.has_foil ? 1.2 * surface : 0;
            autoMesh += vol.has_mesh ? 2.5 * surface : 0;
            
            const fiberRate = surface <= 200 ? 2.5 : 2.0;
            autoFiber += surface * fiberRate;
        }
    });

    autoNet = autoBase + autoExtra + autoFoil + autoMesh + autoFiber;
    let autoVat = 0;
    let totalGross = autoNet;
    if (isAuto && wo.client_type === 'fizica') {
        autoVat = autoNet * 0.21;
        totalGross = autoNet + autoVat;
    }

    const rawVolumeTotal = (wo.volumes || []).reduce((a, v) => a + (parseFloat(v.quantity) || 0), 0)
    const fallbackSurface = parseFloat(wo.surface_area) || parseFloat(wo.surface) || 0;
    const volumeTotal = rawVolumeTotal > 0 ? rawVolumeTotal : fallbackSurface;

    // Charts
    const hoursPerUser = {}
    ;(sessions?.sessions || []).forEach(s => {
        if (!hoursPerUser[s.user_name]) hoursPerUser[s.user_name] = 0
        hoursPerUser[s.user_name] += s.hours || 0
    })
    
    const activeWorkersCount = Object.keys(hoursPerUser).length;
    const workersValue = activeWorkersCount > 0 ? activeWorkersCount : (wo.assigned_team_name || 'Echipă');
    const workersSub = activeWorkersCount > 0 ? "au pontat" : "alocată";
    
    const rawMaxThickness = (wo.volumes || []).reduce((a, v) => Math.max(a, parseFloat(v.thickness) || 0), 0);
    const fallbackThick = parseFloat(wo.thickness) || 0;
    const maxThickness = rawMaxThickness > 0 ? rawMaxThickness : fallbackThick;
    
    const volUnit = (wo.volumes || [])[0]?.unit || 'm²';
    const volSub = volUnit;
    const hoursChartData = Object.entries(hoursPerUser).map(([name, hours]) => ({
        name: name.split(' ')[0],
        ore: parseFloat(hours.toFixed(2))
    }))
    const matPieData = (wo.materials_consumed || [])
        .filter(m => m.name && m.quantity)
        .map(m => ({ name: m.name, value: parseFloat(m.quantity) || 0 }))
        .slice(0, 6)

    const hasSig = wo.client_signature && (wo.status === 'confirmed' || wo.status === 'completed')

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 pb-10">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => navigate(-1)}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                        <ChevronLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30 shrink-0">
                        <ClipboardList className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight truncate">{wo.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                            </span>
                            {wo.site_address && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />{wo.site_address}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 sm:ml-auto shrink-0">
                    <button onClick={() => navigate(`/admin/work-orders/${id}/edit`)}
                        className="flex items-center gap-2 px-4 h-9 rounded-full border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" /> Editează
                    </button>
                </div>
            </div>

            {/* ── KPIs ────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                <KPI icon={Users}    label="Angajați"       value={workersValue}     sub={workersSub}       color="purple" />
                <KPI icon={Package}  label={matLabel}       value={matValue}         sub={matSub}           color="amber" />
                <KPI icon={BarChart2} label="Volum"         value={volumeTotal > 0 ? volumeTotal : '—'} sub={volSub} color="green" />
                <KPI icon={Layers}   label="Grosime"        value={maxThickness > 0 ? `${maxThickness.toFixed(1)} cm` : '—'} sub="medie" color="rose" />
                <KPI icon={Navigation} label="Traseu"       value={wo.route_distance_km ? `${wo.route_distance_km.toFixed(1)} km` : '—'} sub="dus-întors" color="slate" />
            </div>

            {/* ── Locație & Hartă (Moved up for Mobile) ────────────────────── */}
            <div className="bg-transparent rounded-2xl border-0 overflow-hidden">
                <div className="px-1 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide truncate">{address || 'Fără adresă specificată'}</div>
                    </div>
                    {/* Mobile nav buttons rendered by MapView instead or we can just leave it to MapView */}
                </div>
                
                {(lat || lon || address) && (
                    <div className="p-0">
                        <MapView
                            latitude={lat}
                            longitude={lon}
                            address={address}
                            height={220}
                            zoom={15}
                            geofenceRadius={geoR}
                            label={`Locație: ${address}`}
                            routeSegments={wo.route_segments}
                            navButtons={(lat || lon || address) ? <NavButtons lat={lat} lon={lon} address={address} /> : null}
                            sandStations={sandStations}
                        />
                    </div>
                )}

                {wo.access_notes && (
                    <div className="px-4 pb-4 pt-3">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">🔑 Note Acces</p>
                            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 whitespace-pre-line">{wo.access_notes}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Vreme Orară Detaliată ───────────────────────────────────────── */}
            <HourlyWeather 
                lat={lat || 50.8503} 
                lon={lon || 4.3517} 
                dateStr={wo.start_date || wo.deadline_date || wo.created_at} 
            />

            {/* ── Main Grid ───────────────────────────────────────────────────── */}
                        {/* ── Main Grid ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                {/* ROW 1 */}
                <div className="h-full">

                    <Section className="h-full" icon={FileText} title="Detalii Generale">
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ID Comandă</p>
                                                    <p className="font-mono text-sm font-black tracking-widest">{wo.id?.slice(0, 8).toUpperCase()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Status</p>
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 uppercase tracking-wider">
                                                        {cfg?.label || wo.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 pb-4 border-b border-slate-50 dark:border-slate-700/50">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Client</p>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{wo.client_name} <span className="text-xs text-slate-400">({wo.client_language?.toUpperCase()})</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-all">{wo.client_email || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Telefon</p>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{wo.client_phone || '—'}</p>
                                                </div>
                                            </div>
                                            {wo.estimated_price && <Row label="Preț Estimativ" value={wo.estimated_price} />}
                                            {isAuto && (
                                                <div className="mt-4 mb-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                                    <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">Calcul Cost (Doar Admin)</p>
                                                    <div className="space-y-1.5 text-sm">
                                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                                            <span>Șapă de bază (≤5cm)</span>
                                                            <span>{surfaceForAuto} m² × 12.50 = <b>{autoBase.toFixed(2)} EUR</b></span>
                                                        </div>
                                                        {autoExtra > 0 && (
                                                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                                                <span>Grosime extra ({extraThickForAuto} cm)</span>
                                                                <span>{surfaceForAuto} m² × {extraThickForAuto * 1.25} = <b>{autoExtra.toFixed(2)} EUR</b></span>
                                                            </div>
                                                        )}
                                                        {autoFoil > 0 && (
                                                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                                                <span>Folie plastic</span>
                                                                <span>{surfaceForAuto} m² × 1.20 = <b>{autoFoil.toFixed(2)} EUR</b></span>
                                                            </div>
                                                        )}
                                                        {autoMesh > 0 && (
                                                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                                                <span>Plasă metalică</span>
                                                                <span>{surfaceForAuto} m² × 2.50 = <b>{autoMesh.toFixed(2)} EUR</b></span>
                                                            </div>
                                                        )}
                                                        {autoFiber > 0 && (
                                                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                                                <span>Fibre + Duramit</span>
                                                                <span>{surfaceForAuto} m² × {(surfaceForAuto <= 200 ? 2.5 : 2.0).toFixed(2)} = <b>{autoFiber.toFixed(2)} EUR</b></span>
                                                            </div>
                                                        )}
                                                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                                                        <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                                                            <span>Total Net:</span>
                                                            <span>{autoNet.toFixed(2)} EUR</span>
                                                        </div>
                                                        {wo.client_type === 'fizica' ? (
                                                            <div className="flex justify-between font-bold text-amber-600 dark:text-amber-500">
                                                                <span>TVA (21% Persoană Fizică):</span>
                                                                <span>{autoVat.toFixed(2)} EUR</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-between text-slate-500 text-xs">
                                                                <span>TVA: 0% (Persoană Juridică)</span>
                                                                <span>0.00 EUR</span>
                                                            </div>
                                                        )}
                                                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                                                        <div className="flex justify-between text-base font-black text-blue-600 dark:text-blue-400">
                                                            <span>TOTAL DE PLATĂ:</span>
                                                            <span>{totalGross.toFixed(2)} EUR</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Section>
                </div>
                <div className="flex flex-col gap-5 h-full">

                    <Section icon={CheckCircle2} title="Confirmări Status">
                                            <div className="flex flex-col xl:flex-row gap-6">
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Șef Echipă</p>
                                                    <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                        <span className="font-bold text-slate-500 uppercase">Acceptat</span>
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{fmtFull(wo.team_leader_accepted_at) || '—'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                        <span className="font-bold text-slate-500 uppercase">Confirmat</span>
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{fmtFull(wo.team_leader_confirmed_at) || '—'}</span>
                                                    </div>
                                                    {wo.team_leader_confirmation_note && (
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl mt-2">
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Notă</p>
                                                            <p className="text-xs text-slate-700 dark:text-slate-300">{wo.team_leader_confirmation_note}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-px bg-slate-100 dark:bg-slate-700 hidden xl:block"></div>
                                                <div className="flex-1 border-t xl:border-t-0 border-slate-100 dark:border-slate-700 pt-4 xl:pt-0 space-y-2">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Client / Beneficiar</p>
                                                    {wo.confirmed_at ? (
                                                        <>
                                                            <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                                <span className="font-bold text-slate-500 uppercase">Confirmat de</span>
                                                                <span className="font-semibold text-emerald-600">{wo.confirmed_by_name}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                                <span className="font-bold text-slate-500 uppercase">La Data</span>
                                                                <span className="font-semibold text-emerald-600">{fmtFull(wo.confirmed_at)}</span>
                                                            </div>
                                                            {hasSig && (
                                                                <div className="mt-2 flex justify-end">
                                                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 px-2 py-1 inline-flex items-center justify-center">
                                                                        <img src={wo.client_signature} alt="Semnătură" className="h-8 object-contain" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                            <p className="text-xs text-slate-400 font-medium">Neconfirmată de client.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Section>
                    <Section className="flex-1" icon={Wrench} title="Cantități & Materiale (Estimate vs Consumate)">
                                            <div className="flex flex-col xl:flex-row gap-6">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Planificat / Estimat</p>
                                                    </div>
                                            {(wo.volumes || []).length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lucrări / Volume</p>
                                                    <div className="space-y-1.5">
                                                        {wo.volumes.map((v, i) => (
                                                            <div key={i} className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{v.label || '—'}</span>
                                                                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{v.quantity} {v.unit}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {(wo.materials || []).length > 0 && (
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Materiale Necesare</p>
                                                    <div className="space-y-1.5">
                                                        {wo.materials.map((m, i) => (
                                                            <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{m.name}</span>
                                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{m.quantity} {m.unit}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {!(wo.volumes?.length) && !(wo.materials?.length) && (
                                                <p className="text-sm text-slate-400 text-center py-4">Nicio cantitate înregistrată</p>
                                            )}
                                        
                                                </div>
                                                <div className="w-px bg-slate-100 dark:bg-slate-700 hidden xl:block"></div>
                                                <div className="flex-1 border-t xl:border-t-0 border-slate-100 dark:border-slate-700 pt-5 xl:pt-0">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consumat Efectiv</p>
                                                    </div>
                                            {(wo.materials_consumed || []).filter(m => m.name).length > 0 ? (
                                                <>
                                                    <div className="space-y-1.5 mb-4">
                                                        {wo.materials_consumed.filter(m => m.name).map((m, i) => (
                                                            <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                                                <div>
                                                                    <span className="text-sm font-bold text-amber-800 dark:text-amber-300">{m.name}</span>
                                                                    {m.note && <p className="text-xs text-amber-600">{m.note}</p>}
                                                                </div>
                                                                <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400 ml-3 shrink-0">{m.quantity} {m.unit}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {matPieData.length > 0 && (
                                                        <>
                                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Distribuție Cantități</p>
                                                            <ResponsiveContainer width="100%" height={180}>
                                                                <PieChart>
                                                                    <Pie data={matPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                                                                        {matPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                                    </Pie>
                                                                    <Tooltip formatter={(v, n) => [v, n]} />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-sm text-slate-400 text-center py-4">Niciun material consumat înregistrat</p>
                                            )}
                                        
                                                </div>
                                            </div>
                                        </Section>
                </div>

                {/* ROW 2 */}
                <div className="h-full">

                    <Section className="h-full" icon={Navigation} title="Planificare, Echipaj & Traseu">
                                            <div className="flex flex-col md:flex-row gap-6">
                                                <div className="flex-1 space-y-5">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Orar Planificat</p>
                                                        <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                            <span className="font-bold text-slate-500 uppercase">Start Lucrare</span>
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {fmt(wo.start_date)} {wo.start_time ? `— ${wo.start_time}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Echipaj Alocat</p>
                                                        <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-2 mb-2">
                                                            <span className="font-bold text-slate-500 uppercase">Responsabil</span>
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{wo.assigned_team_name || '—'}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                            <span className="font-bold text-slate-500 uppercase">Vehicul</span>
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {wo.assigned_vehicle_plate ? `${wo.assigned_vehicle_plate} — ${wo.assigned_vehicle_name || ''}` : wo.assigned_vehicle_name || '—'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-px bg-slate-100 dark:bg-slate-700 hidden md:block"></div>
                                                <div className="flex-1 border-t md:border-t-0 border-slate-100 dark:border-slate-700 pt-4 md:pt-0">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><Navigation className="w-3 h-3"/> Traseu (Hop-uri)</p>
                                                    {(wo.route_segments && wo.route_segments.length > 0) ? (
                                                        <>
                                                            <div className="relative pl-6 space-y-4 before:absolute before:inset-y-2 before:left-[11px] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                                                                {wo.route_segments.map((seg, idx) => (
                                                                    <div key={idx} className="relative">
                                                                        <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-800 shadow-sm"></div>
                                                                        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-2 border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                                                    <span className="truncate max-w-[80px] sm:max-w-[120px]">{seg.from}</span>
                                                                                    <span className="text-slate-400">→</span>
                                                                                    <span className="truncate max-w-[80px] sm:max-w-[120px]">{seg.to}</span>
                                                                                </div>
                                                                                <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md shrink-0">
                                                                                    {seg.km} km
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Parcurs:</span>
                                                                <span className="text-sm font-black text-slate-900 dark:text-white">{wo.route_distance_km?.toFixed(2) || 0} km</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-24 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                            <span className="text-xs text-slate-400 font-medium">Fără traseu înregistrat</span>
                                                        </div>
                                                    )}
                                                </div>
                    
                                            </div>
                                        </Section>
                </div>
                <div className="flex flex-col gap-5 h-full">

                    <Section className="flex-1" icon={Paperclip} title="Documente & Fișiere">
                                            {(wo.documents && wo.documents.length > 0) && (
                                                <div className="mb-4">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Atașamente Robaws</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {wo.documents.map((doc, idx) => {
                                                        const isImg = doc.content_type?.startsWith('image/');
                                                        const Icon = isImg ? ImageIcon : FileText;
                                                        return (
                                                            <a
                                                                key={doc.id || idx}
                                                                href={`${API_BASE}${doc.file_path}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                                                            >
                                                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                                                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={doc.filename}>{doc.filename}</p>
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                        {doc.file_size ? (doc.file_size / 1024).toFixed(0) + ' KB' : 'Atașament'}
                                                                    </p>
                                                                </div>
                                                                <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                                </div>
                                            )}
                                            
                                            {/* Final Invoice Section for Completed Orders */}
                                                {wo.status === 'completed' && (
                                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Factură Finală (PDF)</p>
                                                        {wo.final_invoice_path ? (
                                                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">Factură Finală Încarcată</span>
                                                                </div>
                                                                <a href={`${API_BASE}${wo.final_invoice_path}`} target="_blank" rel="noreferrer"
                                                                    className="px-3 py-1.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 transition-colors">
                                                                    Vezi PDF
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-center">
                                                                <FileText className="w-6 h-6 text-slate-400 mb-2" />
                                                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">Nu ai încărcat factura finală.</p>
                                                                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors">
                                                                    {uploadingInvoice ? 'Se încarcă...' : 'Alege PDF Factură'}
                                                                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleInvoiceUpload} disabled={uploadingInvoice} />
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            
                                            {!(wo.documents && wo.documents.length > 0) && wo.status !== 'completed' && (
                                                <p className="text-sm text-slate-400 text-center py-4">Niciun document disponibil.</p>
                                            )}
                                        </Section>
                </div>
            </div>

{/* ── Fotografii ──────────────────────────────────────────────────── */}
            <Section icon={Camera} title={`Fotografii (${photos.length})`}>
                {photos.length > 0 ? (
                    <div className="space-y-6">
                        {/* Poze Calculator Masina (OCR) */}
                        {photos.filter(p => p.photo_type === 'machine_computer').length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Camera className="w-4 h-4" /> Verificare AI (Ecrane Bremat)
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {photos.filter(p => p.photo_type === 'machine_computer').map((p, i) => {
                                        const src = `${API_BASE}${p.url || p.file_url || p.path || ''}`
                                        return (
                                            <div key={`mc-${i}`}
                                                className="relative aspect-square rounded-xl overflow-hidden border-2 border-indigo-400 cursor-zoom-in hover:shadow-lg transition-all"
                                                onClick={() => setLightbox(src)}>
                                                <img src={src} alt="Ecran Masina" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                                <div className="absolute bottom-0 left-0 right-0 bg-indigo-900/80 backdrop-blur-sm p-1.5 text-center">
                                                    <span className="text-white text-[10px] font-bold">ECRAN MAȘINĂ</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Poze Finalizare (Client) */}
                        {photos.filter(p => p.photo_type === 'completion').length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Poze Finalizare (Către Client)</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {photos.filter(p => p.photo_type === 'completion').map((p, i) => {
                                        const src = `${API_BASE}${p.url || p.file_url || p.path || ''}`
                                        return (
                                            <div key={`comp-${i}`}
                                                className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-zoom-in hover:border-blue-400 hover:shadow-md transition-all"
                                                onClick={() => setLightbox(src)}>
                                                <img src={src} alt={`Finalizare ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                                <span className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-xl shadow-sm">
                                                    FINAL
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Alte poze */}
                        {photos.filter(p => p.photo_type !== 'machine_computer' && p.photo_type !== 'completion').length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Alte Fotografii (Interne)</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {photos.filter(p => p.photo_type !== 'machine_computer' && p.photo_type !== 'completion').map((p, i) => {
                                        const src = `${API_BASE}${p.url || p.file_url || p.path || ''}`
                                        return (
                                            <div key={`alt-${i}`}
                                                className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-zoom-in hover:shadow-md transition-all"
                                                onClick={() => setLightbox(src)}>
                                                <img src={src} alt={`Interna ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-bold rounded uppercase">
                                                    {p.photo_type || 'intern'}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-10 gap-3">
                        <Camera className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        <p className="text-sm text-slate-400">Nicio fotografie înregistrată</p>
                    </div>
                )}
            </Section>

            {/* ── Lightbox ────────────────────────────────────────────────────── */}
            {lightbox && (
                <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setLightbox(null)}>
                    <img src={lightbox} alt="Preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                    <button onClick={() => setLightbox(null)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl font-bold transition-colors">
                        ✕
                    </button>
                </div>
            )}
        </div>
    )
}

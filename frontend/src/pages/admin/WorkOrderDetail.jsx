import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ChevronLeft, ClipboardList, MapPin, User, Calendar, Clock,
    Package, Camera, Edit2, Timer, AlertCircle, FileText,
    Navigation, Send, Play, Ban, CheckCircle, CheckCircle2,
    Circle, Users, Wrench, BarChart2, ExternalLink, Activity
} from 'lucide-react'
import api from '../../lib/api'
import MapView from '../../components/MapView'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts'

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
    }
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${grad[color]} flex items-center justify-center shadow-md mb-2 sm:mb-3`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{value}</div>
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5 sm:mt-1">{label}</div>
            {sub && <div className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{sub}</div>}
        </div>
    )
}

function Section({ icon: Icon, title, children }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
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
                    className="flex justify-center items-center gap-1.5 px-2 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-600 text-white text-[11px] sm:text-xs font-bold hover:bg-slate-700 active:scale-95 transition-all shadow-sm whitespace-nowrap">
                    <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    Apple
                </a>
            )}
        </div>
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
    const [uploadingInvoice, setUploadingInvoice] = useState(false)

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
            const [woRes, sessRes, photosRes] = await Promise.allSettled([
                api.get(`/admin/work-orders/${id}`),
                api.get(`/admin/work-orders/${id}/sessions`),
                api.get(`/admin/work-orders/${id}/photos`),
            ])
            if (woRes.status === 'fulfilled')     setWo(woRes.value.data)
            if (sessRes.status === 'fulfilled')   setSessions(sessRes.value.data)
            if (photosRes.status === 'fulfilled') {
                const p = photosRes.value.data
                setPhotos(Array.isArray(p) ? p : (p?.photos || []))
            }
        } catch {}
        setLoading(false)
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
                <button onClick={() => navigate('/admin/work-orders')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-colors">
                    ← Înapoi la Comenzi
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

    if (activeMats.length === 1) {
        const m = activeMats[0];
        let q = parseFloat(m.quantity) || 0;
        let u = (m.unit || '').toLowerCase();
        if (u === 'kg') {
            q = q / 1000;
            u = 'tone';
        }
        matValue = `${q} ${u}`;
        matSub = m.name;
    } else if (activeMats.length > 1) {
        let totalT = 0;
        let names = [];
        activeMats.forEach(m => {
            let q = parseFloat(m.quantity) || 0;
            let u = (m.unit || '').toLowerCase();
            names.push(m.name);
            if (u === 'kg') totalT += q / 1000;
            else if (u === 't' || u === 'tone' || u === 'tonă') totalT += q;
        });
        
        if (totalT > 0) {
            matValue = `${totalT} tone`;
            // Limit names to avoid overflow
            let namesStr = names.join(', ');
            if (namesStr.length > 20) namesStr = namesStr.substring(0, 17) + '...';
            matSub = namesStr;
        } else {
            matValue = activeMats.length;
            matSub = 'tipuri materiale';
        }
    }

    const matLabel = hasStarted ? "Mat. Consumate" : "Mat. Necesare";

    const volumeTotal = (wo.volumes || []).reduce((a, v) => a + (parseFloat(v.quantity) || 0), 0)

    // Charts
    const hoursPerUser = {}
    ;(sessions?.sessions || []).forEach(s => {
        if (!hoursPerUser[s.user_name]) hoursPerUser[s.user_name] = 0
        hoursPerUser[s.user_name] += s.hours || 0
    })
    
    const activeWorkersCount = Object.keys(hoursPerUser).length;
    const workersValue = activeWorkersCount > 0 ? activeWorkersCount : (wo.assigned_team_name ? 'Echipă' : '—');
    const workersSub = activeWorkersCount > 0 ? "au pontat" : (wo.assigned_team_name ? "alocată" : "nealocat");
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
                    <button onClick={() => navigate('/admin/work-orders')}
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

            {/* ── Stepper ─────────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-3 sm:p-5">
                <div className="flex items-center justify-between relative">
                    <div className="absolute top-3 sm:top-4 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 mx-4 sm:mx-8" />
                    <div className="absolute top-3 sm:top-4 left-4 sm:left-8 h-0.5 bg-blue-500 transition-all duration-700"
                        style={{ width: `calc(${(currentStep / (STEP_LABELS.length - 1)) * 100}% - 32px)` }} />
                    {STEP_LABELS.map((step, i) => {
                        const done = i <= currentStep
                        const Icon = step.icon
                        return (
                            <div key={step.key} className="flex flex-col items-center gap-1 sm:gap-1.5 relative z-10 w-12 sm:w-auto">
                                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-500/30' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                                    <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${done ? 'text-white' : 'text-slate-400'}`} />
                                </div>
                                <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-wide text-center leading-none ${done ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>{step.label}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ── KPIs ────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
                <KPI icon={Users}    label="Angajați"       value={workersValue}     sub={workersSub}       color="purple" />
                <KPI icon={Package}  label={matLabel}       value={matValue}         sub={matSub}           color="amber" />
                <KPI icon={BarChart2} label="Volum"         value={volumeTotal > 0 ? volumeTotal : '—'} sub={(wo.volumes || [])[0]?.unit || 'unități'} color="green" />
                <KPI icon={Camera}   label="Poze"           value={photos.length}     sub="înregistrate"     color="slate" />
            </div>

            {/* ── Locație & Hartă (Moved up for Mobile) ────────────────────── */}
            {(lat || lon || address) && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide truncate">{address || 'Fără adresă specificată'}</div>
                        </div>
                        <NavButtons lat={lat} lon={lon} address={address} />
                    </div>
                    <div className="p-0">
                        <MapView
                            latitude={lat}
                            longitude={lon}
                            address={address}
                            height={220}
                            zoom={15}
                            geofenceRadius={geoR}
                            label={wo.site_name || wo.title}
                        />
                        {wo.access_notes && (
                            <div className="m-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">🔑 Note Acces</p>
                                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 whitespace-pre-line">{wo.access_notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Main Grid ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* LEFT */}
                <div className="space-y-5">

                    {/* Detalii */}
                    <Section icon={FileText} title="Detalii Generale">
                        <Row label="ID Comandă"          value={wo.id?.slice(0, 8).toUpperCase()} mono />
                        <Row label="Status"              value={cfg.label} />
                        <Row label="Client"              value={wo.client_name ? `${wo.client_name} ${wo.client_language ? `(Limba: ${wo.client_language.toUpperCase()})` : ''}` : ''} />
                        <Row label="Email Client"        value={wo.client_email} />
                        <Row label="Telefon Client"      value={wo.client_phone} />
                        {wo.estimated_price && <Row label="Preț Estimativ" value={wo.estimated_price} />}
                        <Row label="Creat la"            value={fmtFull(wo.created_at)} />
                        <Row label="Ultima Actualizare"  value={fmtFull(wo.updated_at)} />
                    </Section>

                    {/* Planificare */}
                    <Section icon={Calendar} title="Planificare">
                        <Row label="Data Începere"   value={fmt(wo.start_date)} />
                        <Row label="Ora Start"       value={wo.start_time || '—'} />
                        <Row label="Termen Limită"   value={fmt(wo.deadline_date)} />
                        <Row label="Check-in Echipă" value={fmtFull(wo.checkin_at)} />
                        <Row label="Check-out Echipă" value={fmtFull(wo.checkout_at)} />
                    </Section>

                    {/* Echipă & Vehicul */}
                    <Section icon={Users} title="Echipă & Vehicul">
                        <Row label="Echipă / Responsabil" value={wo.assigned_team_name} />
                        <Row label="Vehicul"               value={wo.assigned_vehicle_plate
                            ? `${wo.assigned_vehicle_plate} — ${wo.assigned_vehicle_name || ''}`
                            : wo.assigned_vehicle_name} />
                        <Row label="Acceptat de șef"  value={fmtFull(wo.team_leader_accepted_at)} />
                        <Row label="Confirmat de șef" value={fmtFull(wo.team_leader_confirmed_at)} />
                        {wo.team_leader_confirmation_note && (
                            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notă Șef Echipă</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{wo.team_leader_confirmation_note}</p>
                            </div>
                        )}
                    </Section>
                </div>

                {/* RIGHT */}
                <div className="space-y-5">

                    {/* Confirmare Client */}
                    <div className={`rounded-2xl border shadow-sm overflow-hidden ${wo.confirmed_at
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10'
                        : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
                            {wo.confirmed_at
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                : <Circle className="w-4 h-4 text-slate-400" />}
                            <h2 className="font-extrabold text-sm uppercase tracking-wide text-slate-900 dark:text-white">Confirmare Client</h2>
                        </div>
                        <div className="p-5">
                            {wo.confirmed_at ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                                        <div>
                                            <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">Comandă Confirmată de Client ✓</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">{fmtFull(wo.confirmed_at)}</p>
                                        </div>
                                    </div>
                                    <Row label="Confirmat de" value={wo.confirmed_by_name} />
                                    <Row label="Data & Ora"   value={fmtFull(wo.confirmed_at)} />
                                    {hasSig && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Semnătură Digitală</p>
                                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 p-3 flex items-center justify-center">
                                                <img src={wo.client_signature} alt="Semnătură" className="max-h-28 max-w-full object-contain" />
                                            </div>
                                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1.5">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Semnătură autentică stocată
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-6 gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                        <Clock className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="text-sm text-slate-500 text-center">Clientul nu a confirmat comanda.</p>
                                    {wo.token && wo.status !== 'draft' && (
                                        <a href={`${window.location.origin}/confirm/${wo.token}`} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition-colors">
                                            <ExternalLink className="w-3 h-3" /> Link Confirmare Client
                                        </a>
                                    )}
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
                        </div>
                    </div>

                    {/* Cantități & Materiale */}
                    <Section icon={Wrench} title="Cantități & Materiale Estimate">
                        {(wo.volumes || []).length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lucrări / Volume</p>
                                <div className="space-y-1.5">
                                    {wo.volumes.map((v, i) => (
                                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
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
                                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
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
                    </Section>

                    {/* Materiale Consumate */}
                    <Section icon={Package} title="Materiale Consumate Efectiv">
                        {(wo.materials_consumed || []).filter(m => m.name).length > 0 ? (
                            <>
                                <div className="space-y-1.5 mb-4">
                                    {wo.materials_consumed.filter(m => m.name).map((m, i) => (
                                        <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30">
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
                    </Section>

                    {/* Măsurători Reale & Validare AI */}
                    {(wo.actual_surface_m2 || wo.actual_sand_quantity || wo.ai_sand_kg) && (
                        <Section icon={Activity} title="Măsurători & Verificare AI">
                            <div className="space-y-2">
                                {wo.actual_surface_m2 && (
                                    <Row label="Suprafață Măsurată (m²)" value={wo.actual_surface_m2} />
                                )}
                                {wo.actual_sand_quantity && (
                                    <Row label="Nisip Declarat (Muncitor)" value={`${wo.actual_sand_quantity} kg`} />
                                )}
                                {wo.ai_sand_kg && (
                                    <div className={`mt-3 p-3 rounded-xl border ${
                                        Math.abs(wo.actual_sand_quantity - wo.ai_sand_kg) / wo.ai_sand_kg > 0.05
                                            ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                            : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                                    }`}>
                                        <div className="flex items-start gap-2">
                                            {Math.abs(wo.actual_sand_quantity - wo.ai_sand_kg) / wo.ai_sand_kg > 0.05 ? (
                                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                                            ) : (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                                            )}
                                            <div>
                                                <p className={`text-sm font-bold ${
                                                    Math.abs(wo.actual_sand_quantity - wo.ai_sand_kg) / wo.ai_sand_kg > 0.05
                                                        ? 'text-red-800 dark:text-red-400'
                                                        : 'text-emerald-800 dark:text-emerald-400'
                                                }`}>
                                                    AI a extras de pe ecran: {wo.ai_sand_kg} kg nisip
                                                </p>
                                                {Math.abs(wo.actual_sand_quantity - wo.ai_sand_kg) / wo.ai_sand_kg > 0.05 && (
                                                    <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                                                        Atenție: Muncitorul a introdus o valoare diferită ({wo.actual_sand_quantity} kg). Verifică poza manual pentru a corecta.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Section>
                    )}
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
                                                <span className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-sm">
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

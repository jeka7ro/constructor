import { useState, useEffect, useCallback, useRef } from 'react'
import { SAND_STATIONS } from '../../data/sandStations'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
    ChevronLeft, ClipboardList, MapPin, User, Calendar, Clock,
    Package, Camera, Edit2, Timer, AlertCircle, FileText,
    Navigation, Send, Play, Ban, CheckCircle, CheckCircle2,
    Circle, Users, Wrench, BarChart2, ExternalLink, Activity, Paperclip, ImageIcon, Download, Layers, X, Calculator, CalendarDays, Trash2, Link
} from 'lucide-react'
import DocumentPreviewModal from '../../components/DocumentPreviewModal'
import api from '../../lib/api'
import MapView from '../../components/MapView'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts'
import { useTranslation } from 'react-i18next'
import HourlyWeather from '../../components/HourlyWeather'

// ─── Status config ─────────────────────────────────────────────────────────────
const getStatusConfig = (t) => ({
    draft:       { label: t('common.new', 'Nouă'),        color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-400',   icon: Circle },
    sent:        { label: t('work_orders.status_sent', 'Trimisă'),      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500', icon: Send },
    confirmed:   { label: t('work_orders.status_confirmed', 'Confirmată'),   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500', icon: CheckCircle2 },
    in_progress: { label: t('work_orders.status_in_progress', 'În Execuție'),  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500',   icon: Play },
    completed:   { label: t('common.completed', 'Finalizată'),   color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', dot: 'bg-violet-500', icon: CheckCircle },
    cancelled:   { label: t('common.cancelled', 'Anulată'),      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500',       icon: Ban },
})
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const getStepLabels = (t) => [
    { key: 'draft',       label: t('common.created', 'Creată'),      icon: FileText },
    { key: 'sent',        label: t('work_orders.status_sent', 'Trimisă'),      icon: Send },
    { key: 'confirmed',   label: t('work_orders.status_confirmed', 'Confirmată'),   icon: CheckCircle2 },
    { key: 'in_progress', label: t('work_orders.status_in_progress', 'În Execuție'),  icon: Play },
    { key: 'completed',   label: t('common.completed', 'Finalizată'),   icon: CheckCircle },
]
const STATUS_ORDER = ['draft', 'sent', 'confirmed', 'in_progress', 'completed']

const fmt     = (d) => d ? new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '—'
const fmtFull = (d) => d ? `${fmt(d)} ${fmtTime(d)}` : '—'

const getLanguageFlag = (lang) => {
    const l = lang?.toLowerCase();
    if (l === 'ro') return '🇷🇴';
    if (l === 'fr') return '🇫🇷';
    if (l === 'en') return '🇬🇧';
    if (l === 'de') return '🇩🇪';
    if (l === 'it') return '🇮🇹';
    if (l === 'es') return '🇪🇸';
    if (l === 'nl') return '🇳🇱';
    return l ? l.toUpperCase() : '';
};

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

function TruckSVG({ color = '#2563eb', className = 'w-4 h-4' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <path d="M16 8h4l3 5v4h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    )
}

function Section({ className = '', contentClassName = '', icon: Icon, title, children, headerRight }) {
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden ${className}`}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h2 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">{title}</h2>
                </div>
                {headerRight && <div>{headerRight}</div>}
            </div>
            <div className={`p-5 flex-1 ${contentClassName}`}>{children}</div>
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
                    <TruckSVG color="white" className="w-3 h-3 shrink-0" />
                    Apple
                </a>
            )}
        </>
    )
}


// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkOrderDetail({ orderId, onBack, isEmbedded }) {
    const { t } = useTranslation()
    const params = useParams()
    const id = orderId || params.id
    const navigate = useNavigate()
    const location = useLocation()
    const goBack = () => {
        if (onBack) return onBack();
        const from = location.state?.from;
        if (from) navigate(from);
        else navigate(-1);
    };
    const [wo, setWo]           = useState(null)
    const [sessions, setSessions] = useState(null)
    const [photos, setPhotos]   = useState([])
    const [loading, setLoading] = useState(true)
    const [lightbox, setLightbox] = useState(null)
    // Sand stations — folosim lista hardcodata completa (aceleasi ca in Logistica)
    const [uploadingInvoice, setUploadingInvoice] = useState(false)
    const [invoiceNumberDraft, setInvoiceNumberDraft] = useState(null)
    const [savingInvoiceStatus, setSavingInvoiceStatus] = useState(false)
    // TVA toggle — NOT automatic, user controls it
    const [vatEnabled, setVatEnabled] = useState(false)
    const [vatType, setVatType] = useState('21') // '21', '6', '0'
    const [signatureConfirm, setSignatureConfirm] = useState(false)
    const [previewDocIndex, setPreviewDocIndex] = useState(null)
    const [showCamera, setShowCamera] = useState(false)
    const [toastMessage, setToastMessage] = useState(null)

    const showToast = (msg) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 3000)
    }

    const handleInvoiceUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadingInvoice(true)
        const formData = new FormData()
        formData.append('file', file)
        try {
            const res = await api.post(`/admin/work-orders/${id}/final-invoice`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setWo(res.data)
            setInvoiceNumberDraft(null)
        } catch (err) {
            alert(err.response?.data?.detail || 'Eroare la încărcare factură.')
        } finally {
            setUploadingInvoice(false)
        }
    }

    const handleToggleInvoiced = async (newValue) => {
        setSavingInvoiceStatus(true)
        try {
            const res = await api.patch(`/admin/work-orders/${id}/invoice-status`, {
                is_invoiced: newValue,
                invoice_number: invoiceNumberDraft ?? wo.invoice_number ?? null,
            })
            setWo(res.data)
            setInvoiceNumberDraft(null)
        } catch (err) {
            alert(err.response?.data?.detail || 'Eroare la actualizare status factură.')
        } finally {
            setSavingInvoiceStatus(false)
        }
    }

    const handleSaveInvoiceNumber = async () => {
        setSavingInvoiceStatus(true)
        try {
            const res = await api.patch(`/admin/work-orders/${id}/invoice-status`, {
                is_invoiced: wo.is_invoiced || false,
                invoice_number: invoiceNumberDraft,
            })
            setWo(res.data)
            setInvoiceNumberDraft(null)
        } catch (err) {
            alert(err.response?.data?.detail || 'Eroare la salvare număr factură.')
        } finally {
            setSavingInvoiceStatus(false)
        }
    }

    const fileInputRef = useRef(null)
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        setIsUploadingPhoto(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('photo_type', 'completion')

        try {
            const res = await api.post(`/admin/work-orders/${id}/photos`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            const photosRes = await api.get(`/admin/work-orders/${id}/photos`)
            setPhotos(Array.isArray(photosRes.data) ? photosRes.data : (photosRes.data?.photos || []))
            showToast('Poza a fost încărcată cu succes!')
        } catch (err) {
            console.error(err)
            alert(err.response?.data?.detail || 'Eroare la încărcarea pozei.')
        } finally {
            setIsUploadingPhoto(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const [isConverting, setIsConverting] = useState(false)
    const handleConvertToOrder = async () => {
        if (!wo?.start_date) {
            alert(t('quotes.req_start_date', 'Trebuie să selectați o dată de start (din Editează) înainte de conversie.'))
            return
        }
        if (!window.confirm(t('quotes.confirm_convert', 'Sigur transformați acest devis într-o comandă de lucru?'))) return
        setIsConverting(true)
        try {
            const res = await api.post(`/admin/work-orders/${id}/convert-to-order`, {
                start_date: wo.start_date
            })
            setWo(res.data.work_order)
            alert(t('quotes.success_convert', 'Devisul a fost transformat cu succes!'))
        } catch (err) {
            alert(err.response?.data?.detail || t('quotes.err_convert', 'Eroare la conversie.'))
        } finally {
            setIsConverting(false)
        }
    }

    const handleRouteCalculated = async (km) => {
        if (!wo || km <= 0) return;
        if (wo.route_distance_km && Math.abs(wo.route_distance_km - km) < 0.1) return;
        try {
            const updatedSegments = [...(wo.route_segments || [])];
            // Distribute the calculated distance proportionally across all segments
            const oldTotal = updatedSegments.reduce((sum, s) => sum + (s.km || 0), 0);
            if (oldTotal > 0 && updatedSegments.length > 0) {
                updatedSegments.forEach(seg => {
                    seg.km = parseFloat(((seg.km / oldTotal) * km * 2).toFixed(1));
                });
            } else if (updatedSegments.length === 2) {
                // Simple A→B→A: split equally
                updatedSegments[0].km = parseFloat(km.toFixed(1));
                updatedSegments[1].km = parseFloat(km.toFixed(1));
            } else if (updatedSegments.length > 0) {
                updatedSegments[0].km = parseFloat(km.toFixed(1));
            }
            setWo(prev => ({ 
                ...prev, 
                route_distance_km: km,
                route_segments: updatedSegments 
            }));
            await api.patch(`/admin/work-orders/${id}`, {
                route_distance_km: km,
                route_segments: updatedSegments
            });
        } catch (err) {
            console.error("Failed to save calculated route distance", err);
        }
    };

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
        } catch {} finally {
            setLoading(false)
        }
    }, [id])


    useEffect(() => { load() }, [load])

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                <span className="text-sm text-slate-500 font-medium">{t('work_order_detail.loading_order', 'Se încarcă comanda...')}</span>
            </div>
        </div>
    )
    if (!wo) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400 font-semibold">{t('work_order_detail.not_found', 'Comanda nu a fost găsită')}</p>
                <button onClick={() => goBack()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-colors">
                    ← {t('work_order_detail.back', 'Înapoi')}
                </button>
            </div>
        </div>
    )

    const STATUS = getStatusConfig(t)
    const STEP_LABELS = getStepLabels(t)
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
    let matSub = t('work_order_detail.kpi.no_material', 'niciun material');

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
            matValue = `${q.toFixed(1)} ${t('work_order_detail.kpi.tons', 'tone')}`;
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
            matValue = `${totalT.toFixed(1)} ${t('work_order_detail.kpi.tons', 'tone')}`;
            let namesStr = names.join(', ');
            if (namesStr.length > 20) namesStr = namesStr.substring(0, 17) + '...';
            matSub = namesStr;
        } else {
            matValue = activeMats.length;
            matSub = t('work_order_detail.kpi.mat_types', 'tipuri materiale');
        }
    } else if (autoSandKg > 0) {
        // Fallback: Show estimated sand from volumes if no explicit materials were added
        const tons = autoSandKg / 1000;
        matValue = `${tons.toFixed(1)} ${t('work_order_detail.kpi.tons', 'tone')}`;
        matSub = t('work_order_detail.kpi.sand_est', 'Nisip (estimat)');
    }

    const matLabel = hasStarted ? t('work_order_detail.kpi.mat_consumed', "Mat. Consumate") : t('work_order_detail.kpi.mat_required', "Mat. Necesare");


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
        const labelSafe = (vol.label || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (labelSafe.includes('sapa') && surface > 0) {
            isAuto = true;
            surfaceForAuto += surface;
            const extraThickness = Math.max(0, thickness - 5);
            extraThickForAuto = extraThickness;
            autoBase += parseFloat(wo.prices?.base || 12.5) * surface;
            autoExtra += extraThickness * parseFloat(wo.prices?.extra || 1.25) * surface;
            autoFoil += vol.has_foil ? parseFloat(wo.prices?.foil || 1.2) * surface : 0;
            autoMesh += vol.has_mesh ? parseFloat(wo.prices?.mesh || 2.5) * surface : 0;
            
            const fiberRate = parseFloat(wo.prices?.fiber || (surface <= 200 ? 2.5 : 2.0));
            autoFiber += surface * fiberRate;
        }
    });

    autoNet = autoBase + autoExtra + autoFoil + autoMesh + autoFiber;
    // TVA is controlled by user toggle, NOT automatic
    const vatRate = vatEnabled ? (vatType === '21' ? 0.21 : vatType === '6' ? 0.06 : 0) : 0;
    let autoVat = autoNet * vatRate;
    let totalGross = autoNet + autoVat;

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
    const workersValue = activeWorkersCount > 0 ? activeWorkersCount : (wo.assigned_team_name || '—');
    const workersSub = activeWorkersCount > 0 ? t('work_order_detail.kpi.clocked_in', "au pontat") : t('work_order_detail.kpi.assigned', "alocată");
    
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

    const pageContent = (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 pb-10">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => goBack()}
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
                    {wo.token && (
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/confirm/${wo.token}`)
                                showToast(t('quotes.link_copied', 'Le lien du client a été copié dans le presse-papiers !'))
                            }}
                            className="flex items-center gap-2 px-4 h-9 rounded-full bg-blue-100 text-blue-700 text-sm font-bold hover:bg-blue-200 transition-colors shadow-sm shrink-0"
                            title={t('quotes.copy_link_desc', 'Envoyer ce lien au client pour signature')}
                        >
                            <Link className="w-3.5 h-3.5" />
                            {t('quotes.copy_link', 'Copier le lien client')}
                        </button>
                    )}
                    {wo.is_quote && (
                        <>
                            <button
                                onClick={() => navigate(`/admin/quotes/${id}/pdf`)}
                                className="flex items-center gap-2 px-4 h-9 rounded-full bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                Devis PDF
                            </button>
                            <button onClick={handleConvertToOrder} disabled={isConverting}
                                className="flex items-center gap-2 px-4 h-9 rounded-full bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50">
                                {isConverting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />} 
                                {t('quotes.btn_convert', 'Conversie în Comandă')}
                            </button>
                        </>
                    )}
                    {wo.status !== 'completed' && (
                        <>
                            <button onClick={() => navigate(`/admin/work-orders/${id}/edit`)}
                                className="flex items-center gap-2 px-4 h-9 rounded-full border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" /> {t('work_order_detail.edit', 'Editează')}
                            </button>
                            <button 
                                onClick={() => {
                                    if(window.confirm('Ștergeți definitiv acest devis/comandă?')) {
                                        api.put(`/admin/work-orders/${id}`, { status: 'cancelled' })
                                           .then(() => navigate('/admin/quotes'))
                                           .catch(console.error)
                                    }
                                }}
                                className="flex items-center gap-2 px-4 h-9 rounded-full bg-red-50 text-red-600 border border-red-200 text-sm font-bold hover:bg-red-100 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" /> Șterge
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── KPIs ────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                <KPI icon={Users}    label={t('work_order_detail.kpi.employees', "Angajați")}       value={workersValue}     sub={workersSub}       color="purple" />
                <KPI icon={Package}  label={matLabel}       value={matValue}         sub={matSub}           color="amber" />
                <KPI icon={BarChart2} label={t('work_order_detail.kpi.volume', "Volum")}         value={volumeTotal > 0 ? volumeTotal : '—'} sub={volSub} color="green" />
                <KPI icon={Layers}   label={t('work_order_detail.kpi.thickness', "Grosime")}        value={maxThickness > 0 ? `${maxThickness.toFixed(1)} cm` : '—'} sub={t('work_order_detail.kpi.avg', "medie")} color="rose" />
                <KPI icon={({ className }) => <TruckSVG color="white" className={className} />} label={t('work_order_detail.kpi.route', "Traseu")}       value={wo.route_distance_km ? `${(wo.route_distance_km * 2).toFixed(1)} km` : '—'} sub={t('work_order_detail.kpi.round_trip', "dus-întors")} color="slate" />
            </div>

            {/* ── Locație & Hartă (Moved up for Mobile) ────────────────────── */}
            <div className="bg-transparent rounded-2xl border-0 overflow-hidden">
                <div className="px-1 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide truncate">{address || t('work_order_detail.location.no_address', 'Fără adresă specificată')}</div>
                    </div>
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
                            label={`${t('work_order_detail.location.loc_label', 'Locație: ')}${address}`}
                            baseName={wo.assigned_team_name}
                            routeSegments={wo.route_segments}
                            onRouteCalculated={handleRouteCalculated}
                            navButtons={(lat || lon || address) ? <NavButtons lat={lat} lon={lon} address={address} /> : null}
                            sandStations={SAND_STATIONS}
                            teamColor={wo.team_color || '#2563eb'}
                            leftPanelContent={
                                <>
                                    <div className="w-full shrink-0">
                                        <HourlyWeather 
                                            lat={lat || 50.8503} 
                                            lon={lon || 4.3517} 
                                            dateStr={wo.start_date || wo.deadline_date || wo.created_at} 
                                            address={address}
                                            orderTime={wo.start_time}
                                            compact={true}
                                        />
                                    </div>
                                    <div className="w-full shrink-0">
                                        <Section className="h-full" icon={({ className }) => <TruckSVG color={wo.team_color || '#2563eb'} className={className} />} title={t('work_order_detail.planning.title', "Planificare, Echipaj & Traseu")}>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex-1 space-y-1.5">
                                                    <div>
                                                        <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.planning.schedule', 'Orar Planificat')}</p>
                                                        <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-1">
                                                            <span className="font-bold text-slate-500 uppercase">{t('work_order_detail.planning.start_work', 'Start Lucrare')}</span>
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {fmt(wo.start_date)} {wo.start_time ? `— ${wo.start_time.substring(0,5)}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.planning.crew', 'Echipaj Alocat')}</p>
                                                        <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-1 mb-1">
                                                            <span className="font-bold text-slate-500 uppercase">{t('work_order_detail.planning.manager', 'Responsabil')}</span>
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{wo.assigned_team_name || '—'}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-1">
                                                            <span className="font-bold text-slate-500 uppercase">{t('work_order_detail.planning.vehicle', 'Vehicul')}</span>
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {wo.assigned_vehicle_plate ? `${wo.assigned_vehicle_plate} — ${wo.assigned_vehicle_name || ''}` : wo.assigned_vehicle_name || '—'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="border-t border-slate-100 dark:border-slate-700 pt-2">
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><TruckSVG color={wo.team_color || '#2563eb'} className="w-3 h-3"/> {t('work_order_detail.planning.route_hops', 'Traseu (Hop-uri)')}</p>
                                                    {(wo.route_segments && wo.route_segments.length > 0) ? (
                                                        <>
                                                            <div className="relative pl-6 space-y-1.5 before:absolute before:inset-y-2 before:left-[11px] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                                                                {wo.route_segments.map((seg, idx) => (
                                                                    <div key={idx} className="relative">
                                                                        <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-800 shadow-sm"></div>
                                                                        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-1.5 border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                                                    <span className="truncate max-w-[80px] sm:max-w-[120px]">{seg.from}</span>
                                                                                    <span className="text-slate-400">→</span>
                                                                                    <span className="truncate max-w-[80px] sm:max-w-[120px]">{seg.to}</span>
                                                                                </div>
                                                                                <div className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md shrink-0">
                                                                                    {seg.km} km
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.planning.total_dist', 'Total Parcurs:')} (Dus-Întors)</span>
                                                                <span className="text-sm font-black text-blue-600 dark:text-blue-400">{wo.route_distance_km ? (wo.route_distance_km * 2).toFixed(1) : '—'} km</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-xs text-slate-400 italic">{t('work_order_detail.planning.no_route', 'Nu există segmente de traseu salvate.')}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </Section>
                                    </div>
                                </>
                            }
                        />
                    </div>
                )}

                {wo.access_notes && (
                    <div className="px-4 pb-4 pt-3">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                            <p className="text-[10px] whitespace-nowrap font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">🔑 {t('work_order_detail.access_notes', 'Note Acces')}</p>
                            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 whitespace-pre-line">{wo.access_notes}</p>
                        </div>
                    </div>
                )}
            </div>



            {/* ── Main Grid ───────────────────────────────────────────────────── */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="h-full">
                    <HourlyWeather 
                        lat={lat || 50.8503} 
                        lon={lon || 4.3517} 
                        dateStr={wo.start_date || wo.deadline_date || wo.created_at} 
                        address={address}
                        orderTime={wo.start_time}
                        compact={true}
                    />
                </div>
                <div className="h-full">
                    <Section className="h-full" icon={({ className }) => <TruckSVG color={wo.team_color || '#2563eb'} className={className} />} title={t('work_order_detail.planning.title', "Planificare, Echipaj & Traseu")}>
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Left: Schedule + Crew */}
                            <div className="flex-shrink-0 md:w-44 space-y-2">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.planning.schedule', 'Orar Planificat')}</p>
                                    <div className="flex items-baseline gap-1 text-xs">
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{fmt(wo.start_date)}</span>
                                        {wo.start_time && <span className="text-slate-400 font-medium">· {wo.start_time.substring(0,5)}</span>}
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 dark:border-slate-700 pt-2">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('work_order_detail.planning.crew', 'Echipaj')}</p>
                                    <div className="space-y-1 text-xs">
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase block">{t('work_order_detail.planning.manager', 'Responsabil')}</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{wo.assigned_team_name || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase block">{t('work_order_detail.planning.vehicle', 'Vehicul')}</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {wo.assigned_vehicle_plate ? `${wo.assigned_vehicle_plate}${wo.assigned_vehicle_name ? ' · ' + wo.assigned_vehicle_name : ''}` : wo.assigned_vehicle_name || '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Divider */}
                            <div className="w-px bg-slate-100 dark:bg-slate-700 hidden md:block flex-shrink-0"></div>
                            <div className="h-px bg-slate-100 dark:bg-slate-700 md:hidden"></div>
                            {/* Right: Route */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <TruckSVG color={wo.team_color || '#2563eb'} className="w-3 h-3"/>
                                    {t('work_order_detail.planning.route_hops', 'Traseu (Etape)')}
                                </p>
                                {(wo.route_segments && wo.route_segments.length > 0) ? (
                                    <>
                                        <div className="relative pl-5 space-y-1.5 before:absolute before:inset-y-2 before:left-[9px] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                                            {wo.route_segments.map((seg, idx) => (
                                                <div key={idx} className="relative">
                                                    <div className="absolute -left-[24px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-800 shadow-sm"></div>
                                                    <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg px-2 py-1 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-1 min-w-0">
                                                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-tight min-w-0 flex-1">
                                                            <span className="block truncate">{seg.from}</span>
                                                            <span className="text-slate-400">→ </span>
                                                            <span className="block truncate">{seg.to}</span>
                                                        </p>
                                                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">{seg.km} km</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.planning.total_dist', 'Distanță Totală (Dus-Întors)')}</span>
                                            <span className="text-sm font-black text-slate-900 dark:text-white">{wo.route_distance_km ? (wo.route_distance_km * 2).toFixed(1) : 0} km</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-16 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                        <span className="text-xs text-slate-400 font-medium">{t('work_order_detail.planning.no_route', 'Fără traseu înregistrat')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Section>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch mb-5">
                <div className="flex flex-col gap-5">

                    <Section className="flex-1" icon={FileText} title={t('work_order_detail.general_details.title', "Detalii Generale")} contentClassName="!p-3">
                                            <div className="grid grid-cols-2 gap-4 mb-2">
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.general_details.id', 'ID Comandă')}</p>
                                                    <p className="font-mono text-sm font-black tracking-widest">{wo.id?.slice(0, 8).toUpperCase()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.general_details.status', 'Status')}</p>
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 uppercase tracking-wider">
                                                        {cfg?.label || wo.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-2 pb-2 border-b border-slate-50 dark:border-slate-700/50">
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('quotes.approx_date', 'Dată Aprox.')}</p>
                                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                        <CalendarDays className="w-4 h-4 text-slate-400" />
                                                        <span>{wo.approximate_date ? new Date(wo.approximate_date).toLocaleDateString('ro-RO') : '—'}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('quotes.price', 'Preț Est. (€)')}</p>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                        {wo.estimated_price ? `${wo.estimated_price} €` : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mb-2 pb-2 border-b border-slate-50 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0">{t('work_order_detail.general_details.team_leader', 'Șef Echipă (Confirmare)')}</p>
                                                {wo.team_leader_confirmed_at ? (
                                                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex flex-col sm:text-right">
                                                        <span>{t('work_order_detail.status.acknowledged_on', 'A luat la cunoștință pe')} {new Date(wo.team_leader_confirmed_at).toLocaleString('ro-RO')}</span>
                                                        {wo.team_leader_confirmation_note && (
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">{t('work_order_detail.status.note', 'Notă:')} {wo.team_leader_confirmation_note}</span>
                                                        )}
                                                    </div>
                                                ) : wo.team_leader_accepted_at ? (
                                                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 sm:text-right">
                                                        <span>{t('work_order_detail.status.opened_on', 'A deschis comanda pe')} {new Date(wo.team_leader_accepted_at).toLocaleString('ro-RO')}</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm font-semibold text-amber-600 dark:text-amber-500 sm:text-right">
                                                        <span>{t('work_order_detail.status.not_acknowledged', 'Nu a luat la cunoștință încă')}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.general_details.client', 'Client')}</p>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{wo.client_name} <span className="text-xs text-slate-400">{getLanguageFlag(wo.client_language)}</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('common.email', 'Email')}</p>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-all">{wo.client_email || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('common.phone', 'Telefon')}</p>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{wo.client_phone || '—'}</p>
                                                </div>
                                            </div>

                                        </Section>
                </div>
                <div className="flex flex-col gap-5">

                    <Section icon={CheckCircle2} title={t('work_order_detail.status_confirmations.title', "Confirmări Status")} contentClassName="!p-3">
                                            <div className="flex flex-col xl:flex-row gap-3">
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-2">{t('work_order_detail.general_details.team_leader_short', 'Șef Echipă')}</p>
                                                    {wo.team_leader_confirmed_at ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5">
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">{t('work_order_detail.status.confirmed', 'Confirmat')}</span>
                                                            </div>
                                                            <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold pl-5">{fmtFull(wo.team_leader_confirmed_at)}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5">
                                                            <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                                                            <span className="text-xs font-semibold text-slate-400">{t('work_order_detail.status.awaiting_confirmation', 'În așteptare confirmare')}</span>
                                                        </div>
                                                    )}
                                                    {wo.team_leader_confirmation_note && (
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl mt-2">
                                                            <p className="text-[10px] whitespace-nowrap font-bold text-slate-500 uppercase tracking-wider mb-1">{t('common.note', 'Notă')}</p>
                                                            <p className="text-xs text-slate-700 dark:text-slate-300">{wo.team_leader_confirmation_note}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-px bg-slate-100 dark:bg-slate-700 hidden xl:block"></div>
                                                <div className="flex-1 border-t xl:border-t-0 border-slate-100 dark:border-slate-700 pt-4 xl:pt-0 space-y-2">
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-2">{t('work_order_detail.general_details.client_beneficiary', 'Client / Beneficiar')}</p>
                                                    {wo.confirmed_at ? (
                                                        <>
                                                            <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                                <span className="font-bold text-slate-500 uppercase">{t('work_order_detail.status.confirmed_by', 'Confirmat de')}</span>
                                                                <span className="font-semibold text-emerald-600">{wo.confirmed_by_name}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                                <span className="font-bold text-slate-500 uppercase">{t('work_order_detail.status.at_date', 'La Data')}</span>
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
                                                        <div className="flex items-center justify-center py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                            <p className="text-xs text-slate-400 font-medium">{t('work_order_detail.status.not_confirmed_by_client', 'Neconfirmată de client.')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Section>
                    {(() => {
                        const hasConsumed = (wo.materials_consumed || []).filter(m => m.name).length > 0 || wo.actual_surface_m2 || wo.actual_sand_quantity;
                        const sectionTitle = hasConsumed 
                            ? t('work_order_detail.materials_volumes.title', "Cantități & Materiale (Estimate vs Consumate)")
                            : t('work_order_detail.materials_volumes.title_no_consumed', "Cantități & Materiale (Estimate)");
                        
                        return (
                            <Section className="flex-1" icon={Wrench} title={sectionTitle} contentClassName="!p-3">
                                            <div className="flex flex-col xl:flex-row gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center flex-nowrap gap-2 overflow-x-auto no-scrollbar">
                                                        <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                            <p className="text-[10px] whitespace-nowrap font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials_volumes.planned', 'Planificat / Estimat')}</p>
                                                        </div>
                                                        {(wo.volumes || []).length > 0 && (
                                                            <>
                                                                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                                                                <p className="text-[10px] whitespace-nowrap font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials_volumes.works_volumes', 'Lucrări / Volume')}</p>
                                                                <div className="flex items-center gap-2">
                                                                    {wo.volumes.map((v, i) => (
                                                                        <div key={i} className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg">
                                                                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{v.label || '—'}</span>
                                                                            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">{v.quantity} {v.unit}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                        {(wo.materials || []).length > 0 && (
                                                            <>
                                                                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                                                                <p className="text-[10px] whitespace-nowrap font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials.required', 'Materiale Necesare')}</p>
                                                                <div className="flex items-center gap-2">
                                                                    {wo.materials.map((m, i) => (
                                                                        <div key={i} className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 rounded-lg">
                                                                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{m.name}</span>
                                                                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{m.quantity} {m.unit}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                            {!(wo.volumes?.length) && !(wo.materials?.length) && (
                                                <p className="text-sm text-slate-400 text-center py-4">{t('work_order_detail.materials.no_quantity', 'Nicio cantitate înregistrată')}</p>
                                            )}
                                        
                                                </div>
                                                {hasConsumed ? (
                                                    <>
                                                        <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 hidden xl:block self-center mx-2"></div>
                                                        <div className="flex items-center flex-nowrap gap-2 overflow-x-auto no-scrollbar pt-2 xl:pt-0">
                                                            <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                                <p className="text-[10px] whitespace-nowrap font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials_volumes.consumed', 'RÉELLEMENT CONSOMMÉ')}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {wo.actual_surface_m2 && (
                                                                    <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg">
                                                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{t('work_order_detail.materials_volumes.confirmed_surface', 'Surface confirmée')}</span>
                                                                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{wo.actual_surface_m2} m²</span>
                                                                    </div>
                                                                )}
                                                                
                                                                {wo.actual_thickness_cm && (
                                                                    <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg">
                                                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{t('work_order_detail.materials_volumes.confirmed_thickness', 'Épaisseur confirmée')}</span>
                                                                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{wo.actual_thickness_cm} cm</span>
                                                                    </div>
                                                                )}
                                                                
                                                                {wo.actual_sand_quantity && (
                                                                    <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg">
                                                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{t('work_order_detail.materials_volumes.confirmed_sand', 'Sable')}</span>
                                                                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{wo.actual_sand_quantity} kg</span>
                                                                    </div>
                                                                )}

                                                                {(wo.materials_consumed || []).filter(m => m.name).map((m, i) => (
                                                                    <div key={i} className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg">
                                                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{m.name} {m.note && `(${m.note})`}</span>
                                                                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{m.quantity} {m.unit}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex-1 hidden xl:block"></div>
                                                )}
                                            </div>
                                        </Section>
                        );
                    })()}
                </div>
            </div>

            {(wo.documents && wo.documents.length > 0) && (
                <div className="mb-5">
                    <Section icon={Paperclip} title={t('work_order_detail.documents.title', "Documente & Fișiere")}>
                        <div className="mb-4">
                            <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-2">Atașamente</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {wo.documents.map((doc, idx) => {
                                const isImg = doc.content_type?.startsWith('image/');
                                const Icon = isImg ? ImageIcon : FileText;
                                return (
                                    <button
                                        key={doc.id || idx}
                                        onClick={() => setPreviewDocIndex(idx)}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group text-left w-full"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={doc.filename}>{doc.filename}</p>
                                                {doc.source === 'client' && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 uppercase tracking-widest shrink-0 border border-blue-200">
                                                        De la Client
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {doc.file_size ? (doc.file_size / 1024).toFixed(0) + ' KB' : 'Atașament'}
                                            </p>
                                        </div>
                                        <Download 
                                            className="w-4 h-4 text-slate-400 hover:text-blue-500 shrink-0 cursor-pointer" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rawUrl = doc.file_url || doc.file_path;
                                                const finalUrl = rawUrl?.startsWith('http') ? rawUrl : `${API_BASE}${rawUrl?.startsWith('/') ? '' : '/'}${rawUrl}`;
                                                window.open(finalUrl, '_blank');
                                            }}
                                        />
                                    </button>
                                );
                            })}
                            </div>
                        </div>
                    </Section>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                {/* ─── Calcul Cost ────────────────────────────────────────── */}
                <div className="flex flex-col h-full">
                    <Section icon={Calculator} title={t('work_order_detail.invoicing.title_calc', 'Calcul Cost')} className="h-full">
                        {wo.estimated_price && !isAuto && (
                            <div className="mb-4">
                                <Row label={t('work_order_detail.general_details.estimated_price', 'Preț Estimativ')} value={`${parseFloat(wo.estimated_price).toFixed(2)} EUR`} />
                            </div>
                        )}

                        {isAuto ? (
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{t('work_order_detail.invoicing.calc', 'Calcul Șapă (Automat)')}</p>
                                    <button 
                                        onClick={() => navigate(`/admin/work-orders/${id}/edit`)}
                                        className="text-slate-400 hover:text-blue-600 transition-colors bg-white dark:bg-slate-800 p-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm"
                                        title={t('work_order_detail.edit', 'Editează')}
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>{t('work_order_detail.invoicing.base', 'Șapă de bază (≤5cm)')}</span>
                                        <span>{surfaceForAuto} m² × {parseFloat(wo.prices?.base || 12.5).toFixed(2)} = <b>{autoBase.toFixed(2)} EUR</b></span>
                                    </div>
                                    {autoExtra > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>{t('work_order_detail.invoicing.extra', 'Grosime extra (>5cm)')} ({extraThickForAuto} cm)</span>
                                            <span>{surfaceForAuto} m² × {extraThickForAuto} cm × {parseFloat(wo.prices?.extra || 1.25).toFixed(2)} = <b>{autoExtra.toFixed(2)} EUR</b></span>
                                        </div>
                                    )}
                                    {autoFoil > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>{t('work_order_detail.invoicing.foil', 'Folie plastic')}</span>
                                            <span>{surfaceForAuto} m² × {parseFloat(wo.prices?.foil || 1.2).toFixed(2)} = <b>{autoFoil.toFixed(2)} EUR</b></span>
                                        </div>
                                    )}
                                    {autoMesh > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>{t('work_order_detail.invoicing.mesh', 'Plasă metalică')}</span>
                                            <span>{surfaceForAuto} m² × {parseFloat(wo.prices?.mesh || 2.5).toFixed(2)} = <b>{autoMesh.toFixed(2)} EUR</b></span>
                                        </div>
                                    )}
                                    {autoFiber > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>{t('work_order_detail.invoicing.fiber', 'Fibre')}</span>
                                            <span>{surfaceForAuto} m² × {parseFloat(wo.prices?.fiber || (surfaceForAuto <= 200 ? 2.5 : 2.0)).toFixed(2)} = <b>{autoFiber.toFixed(2)} EUR</b></span>
                                        </div>
                                    )}
                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                                    <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                                        <span>{t('work_order_detail.invoicing.net', 'Net:')}</span>
                                        <span>{autoNet.toFixed(2)} EUR</span>
                                    </div>

                                    {/* TVA Toggle */}
                                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">{t('quotes.tva_toggle', 'Appliquer TVA')}</span>
                                            <button
                                                onClick={() => setVatEnabled(v => !v)}
                                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                                                    vatEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                                                }`}
                                            >
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                                    vatEnabled ? 'translate-x-5' : 'translate-x-1'
                                                }`} />
                                            </button>
                                        </div>
                                        {vatEnabled && (
                                            <div className="flex flex-col gap-1.5 mt-2">
                                                {[
                                                    { val: '21', label: t('quotes.tva_type_new', 'Construction neuve (21%)') },
                                                    { val: '6',  label: t('quotes.tva_type_renov', 'Rénovation (6%)') },
                                                    ...(wo.client_type === 'juridica' ? [{ val: '0', label: t('quotes.tva_type_zero', '0% TVA (Entreprise)') }] : []),
                                                ].map(opt => (
                                                    <label key={opt.val} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="vatType"
                                                            value={opt.val}
                                                            checked={vatType === opt.val}
                                                            onChange={() => setVatType(opt.val)}
                                                            className="text-amber-500 focus:ring-amber-400"
                                                        />
                                                        <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">{opt.label}</span>
                                                    </label>
                                                ))}
                                                <div className="flex justify-between font-bold text-amber-700 dark:text-amber-400 mt-1 pt-1 border-t border-amber-200 dark:border-amber-700">
                                                    <span>TVA ({vatType}%):</span>
                                                    <span>{autoVat.toFixed(2)} EUR</span>
                                                </div>
                                            </div>
                                        )}
                                        {!vatEnabled && (
                                            <p className="text-xs text-slate-400 dark:text-slate-500">{t('quotes.tva_disabled', 'TVA non appliquée / 0%')}</p>
                                        )}
                                    </div>

                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                                    <div className="flex justify-between text-base font-black text-blue-600 dark:text-blue-400">
                                        <span>{t('work_order_detail.invoicing.gross', 'TOTAL À PAYER:')}</span>
                                        <span>{totalGross.toFixed(2)} EUR</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            !wo.estimated_price && <p className="text-sm text-slate-400 py-4">{t('work_order_detail.invoicing.no_calc', 'Aucun calcul disponible.')}</p>
                        )}
                    </Section>
                </div>

                {/* ─── Facturare ──────────────────────────────────────────── */}
                <div className="flex flex-col h-full">
                    <Section icon={FileText} title={t('work_order_detail.invoicing.title', 'Facturare')} className="h-full">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.invoicing.status_label', 'Status Factură')}</p>
                            {wo.is_invoiced ? (
                                <span className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                    {t('work_order_detail.invoicing.invoiced', 'Facturat')}
                                </span>
                            ) : (
                                <span className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
                                    {t('work_order_detail.invoicing.not_invoiced', 'Nefacturat')}
                                </span>
                            )}
                        </div>

                        {/* Documente Generate */}
                        <div className="space-y-3 mt-4 mb-4">
                            {/* Proforma Block */}
                            {wo.proforma_path && (
                                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                                        <a href={`/admin/invoices/${wo.id}?type=proforma`} target="_blank" rel="noreferrer"
                                            className="text-sm font-bold text-blue-700 dark:text-blue-400 truncate hover:underline cursor-pointer">
                                            Proformă PDF Emisă
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a href={wo.proforma_path} target="_blank" rel="noreferrer"
                                            className="px-4 py-1.5 bg-blue-600 dark:bg-blue-700 border border-transparent rounded-lg text-xs font-bold text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shrink-0 shadow-sm">
                                            Descarcă PDF
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Invoice Block */}
                            {wo.is_invoiced && (
                                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <div className="flex flex-col">
                                            <a href={`/admin/invoices/${wo.id}?type=invoice`} target="_blank" rel="noreferrer"
                                                className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate hover:underline cursor-pointer">
                                                Factură PDF (Generată)
                                            </a>
                                            {wo.invoice_number && (
                                                <span className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">N° {wo.invoice_number}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a href={wo.final_invoice_path || `/admin/invoices/${wo.id}?type=invoice`} target="_blank" rel="noreferrer"
                                            className="px-4 py-1.5 bg-emerald-600 dark:bg-emerald-700 border border-transparent rounded-lg text-xs font-bold text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shrink-0 shadow-sm">
                                            Descarcă PDF
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Fallback Generate Button */}
                            {(!wo.proforma_path && !wo.is_invoiced) && (
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">Niciun document emis</span>
                                    </div>
                                    <button onClick={() => navigate('/admin/invoicing')}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors shrink-0">
                                        Generează
                                    </button>
                                </div>
                            )}
                        </div>
                    </Section>
                </div>

                </div>

            {/* ── Devis PDF Preview ── */}
            {wo.is_quote && (
                <Section icon={FileText} title={t('work_order_detail.pdf_preview', 'Previzualizare Devis PDF')}>
                    <div className="w-full h-[800px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white">
                        <iframe
                            src={`/admin/quotes/${wo.id}/pdf`}
                            className="w-full h-full border-none"
                            title="Devis PDF"
                        />
                    </div>
                </Section>
            )}

{/* ── Fotografii ──────────────────────────────────────────────────── */}
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
            <Section 
                icon={Camera} 
                title={`${t('work_order_detail.photos.title', 'Fotografii')} (${photos.length})`}
                headerRight={
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold transition-colors"
                    >
                        {isUploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                        {t('common.add_photo', 'Adaugă Poză')}
                    </button>
                }
            >
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
                                        const rawSrc = p.url || p.file_url || p.path || '';
                                        const src = rawSrc.startsWith('http') ? rawSrc : `${API_BASE}${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`;
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
                                        const rawSrc = p.url || p.file_url || p.path || '';
                                        const src = rawSrc.startsWith('http') ? rawSrc : `${API_BASE}${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`;
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
                                        const rawSrc = p.url || p.file_url || p.path || '';
                                        const src = rawSrc.startsWith('http') ? rawSrc : `${API_BASE}${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`;
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
                        <p className="text-sm text-slate-400">{t('work_order_detail.photos.no_photos', 'Nu există fotografii asociate.')}</p>
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
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[9999] bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="font-bold text-sm">{toastMessage}</span>
                </div>
            )}

            {previewDocIndex !== null && wo?.documents && (
                <DocumentPreviewModal 
                    documents={wo.documents} 
                    initialIndex={previewDocIndex}
                    onClose={() => setPreviewDocIndex(null)} 
                />
            )}
        </div>
    )
    if (isEmbedded) {
        return (
            <div className="fixed inset-0 z-[99999] bg-slate-50 dark:bg-slate-950 overflow-y-auto w-full h-full">
                {pageContent}
            </div>
        )
    }
    return pageContent;
}
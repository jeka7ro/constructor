import { getPrice } from "../../utils/pricingEngine";
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { SAND_STATIONS } from '../../data/sandStations'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
    ChevronLeft, ClipboardList, MapPin, User, Calendar, Clock,
    Package, Camera, Edit2, Timer, AlertCircle, FileText,
    Navigation, Send, Play, Ban, CheckCircle, CheckCircle2,
    Circle, Users, Wrench, BarChart2, ExternalLink, Activity, Paperclip, ImageIcon, Download, Layers, X, Calculator, CalendarDays, Trash2, Link, RefreshCw, ChevronRight, XCircle, Building2, MessageSquare, EyeOff, Globe, Eye, Mail, Smile, Copy, Check
} from 'lucide-react'
import PdfThumbnail from '../../components/PdfThumbnail'
import DocumentPreviewModal from '../../components/DocumentPreviewModal'
import ConfirmModal from '../../components/ConfirmModal'
import api from '../../lib/api'
import MapView from '../../components/MapView'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts'
import { useTenantStore } from '../../store/tenantStore';
import { useTranslation } from 'react-i18next'
import HourlyWeather from '../../components/HourlyWeather'
import StreetViewPhotos from '../../components/StreetViewPhotos'
import AddressAutocomplete from '../../components/AddressAutocomplete'

// ─── Status config ─────────────────────────────────────────────────────────────
const getStatusConfig = (t) => ({
    draft:       { label: t('common.new', 'Nouveau'),        color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-400',   icon: Circle },
    sent:        { label: t('work_orders.status_sent', 'Envoyée'),      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500', icon: Send },
    confirmed:   { label: t('work_orders.status_confirmed', 'Confirmée'),   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500', icon: CheckCircle2 },
    in_progress: { label: t('work_orders.status_in_progress', 'En exécution'),  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500',   icon: Play },
    completed:   { label: t('common.completed', 'Terminée'),   color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', dot: 'bg-violet-500', icon: CheckCircle },
    cancelled:   { label: t('common.cancelled', 'Annulée'),      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500',       icon: Ban },
})
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const getStepLabels = (t) => [
    { key: 'draft',       label: t('common.created', 'Créée'),      icon: FileText },
    { key: 'sent',        label: t('work_orders.status_sent', 'Envoyée'),      icon: Send },
    { key: 'confirmed',   label: t('work_orders.status_confirmed', 'Confirmée'),   icon: CheckCircle2 },
    { key: 'in_progress', label: t('work_orders.status_in_progress', 'En exécution'),  icon: Play },
    { key: 'completed',   label: t('common.completed', 'Terminée'),   icon: CheckCircle },
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
    const { tenant } = useTenantStore();
    const { t, i18n } = useTranslation()
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
    const quoteIds = location.state?.quoteIds || [];
    const currentIndex = quoteIds.findIndex(qid => String(qid) === String(id));
    const prevId = currentIndex > 0 ? quoteIds[currentIndex - 1] : null;
    const nextId = currentIndex >= 0 && currentIndex < quoteIds.length - 1 ? quoteIds[currentIndex + 1] : null;

    const [wo, setWo]           = useState(null)
    const [pricingSettings, setPricingSettings] = useState(null)
    const [sessions, setSessions] = useState(null)
    const [photos, setPhotos]   = useState([])

    const translateDynamicLabel = (text) => {
        if (!text) return '—';
        let res = text;
        if (/^[sșş]ap[aăâ]$/i.test(res)) return t('materials.chape', 'Chape');
        if (/[sșş]ap[aăâ]/i.test(res)) res = res.replace(/[sșş]ap[aăâ]/ig, t('materials.chape_inline', 'Chape'));
        if (/manoper[aă]/i.test(res)) res = res.replace(/manoper[aă]/ig, t('materials.workmanship', "Main-d'œuvre"));
        return res;
    };
    const [loading, setLoading] = useState(true)
    const [lightbox, setLightbox] = useState(null)
    // Sand stations — folosim lista hardcodata completa (aceleasi ca in Logistica)
    const [uploadingInvoice, setUploadingInvoice] = useState(false)
    const [invoiceNumberDraft, setInvoiceNumberDraft] = useState(null)
    const [savingInvoiceStatus, setSavingInvoiceStatus] = useState(false)
    // TVA toggle — NOT automatic, user controls it
    const [vatEnabled, setVatEnabled] = useState(false)
    const [vatType, setVatType] = useState('21') // '21', '6', '0'

    const [gpsArrival, setGpsArrival] = useState(null)
    const [loadingGpsArrival, setLoadingGpsArrival] = useState(false)

    useEffect(() => {
        if (!wo || wo.is_quote || !wo.start_date || !wo.assigned_team_id) return;
        let mounted = true;
        
        const fetchGps = async () => {
            setLoadingGpsArrival(true)
            try {
                // Fetch daily GPS info for all vehicles
                const res = await api.get(`/admin/gps-verification/daily?date=${wo.start_date}`, { validateStatus: () => true })
                if (mounted && res.status === 200 && res.data.results) {
                    
                    let foundWo = null;
                    // Look through all vehicles' itineraries to find any vehicle that stopped at this work order
                    for (const vehicleRes of res.data.results) {
                        if (vehicleRes.itinerary) {
                            const match = vehicleRes.itinerary.find(w => w.type === 'work_order' && (w.id === wo.id || w.name === wo.client_name))
                            if (match && match.arrived) {
                                foundWo = match;
                                break;
                            }
                        }
                    }
                    
                    if (foundWo) {
                        setGpsArrival(foundWo)
                    }
                }
            } catch(e) {}
            if (mounted) setLoadingGpsArrival(false)
        }
        fetchGps()
        return () => { mounted = false }
    }, [wo?.start_date, wo?.assigned_team_id, wo?.client_name, wo?.is_quote])
    const [signatureConfirm, setSignatureConfirm] = useState(false)
    const [previewAttachment, setPreviewAttachment] = useState(null)
    const [previewDocIndex, setPreviewDocIndex] = useState(null)
    const [showEmailPreview, setShowEmailPreview] = useState(false)
    const [emailPreviewContent, setEmailPreviewContent] = useState('')
    const [activeTab, setActiveTab] = useState('info');
    const [isEditingLang, setIsEditingLang] = useState(false);
    const [editLang, setEditLang] = useState('fr');
    const [showCamera, setShowCamera] = useState(false)
    const [toast, setToast] = useState({ message: null, type: 'success' })
    // Calcul Edit Modal (Estimatif)
    const [calcEditOpen, setCalcEditOpen] = useState(false)
    const [showDiscountNotifyPrompt, setShowDiscountNotifyPrompt] = useState(false)
    const [calcEditSaving, setCalcEditSaving] = useState(false)
    const [calcEditForm, setCalcEditForm] = useState(null)
    const [calcEditTab, setCalcEditTab] = useState('chape') // 'chape', 'isolation'
    
    // Calcul Edit Modal (Real)
    const [calcRealEditOpen, setCalcRealEditOpen] = useState(false)
    const [calcRealEditSaving, setCalcRealEditSaving] = useState(false)
    const [calcRealEditForm, setCalcRealEditForm] = useState(null)
    const [generatingProforma, setGeneratingProforma] = useState(false)
    const [activeDocTab, setActiveDocTab] = useState('devis')
    const [pdfScrollActive, setPdfScrollActive] = useState(false)
    const [docDrawerState, setDocDrawerState] = useState(null)
    const [syncingPrices, setSyncingPrices] = useState(false)
    const [showSyncConfirm, setShowSyncConfirm] = useState(false)
    
    // Modale pentru ștergere și convertire (înlocuiesc alertele native de browser)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showConvertConfirm, setShowConvertConfirm] = useState(false)
    
    // Address Edit
    const [isEditingAddress, setIsEditingAddress] = useState(false)
    const [editAddressData, setEditAddressData] = useState({ address: '', lat: null, lon: null })
    
    // Route Recalculation
    const [isRecalculatingRoute, setIsRecalculatingRoute] = useState(false)
    
    // Chat Admin-Client
    const [messages, setMessages] = useState([])
    const [chatMessage, setChatMessage] = useState("")
    const [sendingMessage, setSendingMessage] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState([])
    const [isUploadingFiles, setIsUploadingFiles] = useState(false)
    const chatFileInputRef = useRef(null)
    const [targetLang, setTargetLang] = useState('nl')
    const [previewTranslation, setPreviewTranslation] = useState('')
    const [isTranslating, setIsTranslating] = useState(false)
    const [historyModalOpen, setHistoryModalOpen] = useState(false)
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editMessageText, setEditMessageText] = useState("")
    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null)
    
    const messagesEndRef = useRef(null)
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            const parent = messagesEndRef.current.parentElement;
            if (parent) {
                parent.scrollTo({ top: parent.scrollHeight, behavior: 'smooth' });
            }
        }
    }
    useEffect(() => {
        setTimeout(scrollToBottom, 100)
    }, [messages])

    const showToast = (msg, type = 'success') => {
        if (typeof msg === 'object' && msg !== null) {
            msg = JSON.stringify(msg);
        }
        setToast({ message: msg, type })
        setTimeout(() => setToast({ message: null, type: 'success' }), 3000)
    }
    const [copiedLink, setCopiedLink] = useState(false)

    const handleSaveAddress = async () => {
        try {
            await api.put(`/admin/work-orders/${id}`, {
                site_address: editAddressData.address,
                site_latitude: editAddressData.lat,
                site_longitude: editAddressData.lon
            })
            setWo(prev => ({
                ...prev,
                site_address: editAddressData.address,
                site_latitude: editAddressData.lat,
                site_longitude: editAddressData.lon
            }))
            setIsEditingAddress(false)
            showToast(t('admin.address_updated', 'Adresse mise à jour'), "success")
        } catch (err) {
            console.error(err)
            showToast(t('admin.address_update_error', "Erreur lors de la mise à jour de l'adresse"), "error")
        }
    }

    const handleGenerateProforma = async () => {
        setGeneratingProforma(true)
        try {
            const res = await api.post(`/admin/work-orders/${id}/generate-proforma`)
            setWo(prev => ({ ...prev, proforma_path: res.data.proforma_path, proforma_issued_at: res.data.proforma_issued_at }))
            showToast(t('work_order_detail.invoicing.proforma_generated', 'Proforma générée avec succès !'))
        } catch (err) {
            showToast(err.response?.data?.detail || t('common.error_proforma', 'Erreur lors de la génération du proforma.'))
        } finally {
            setGeneratingProforma(false)
        }
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
            alert(err.response?.data?.detail || t('work_order_detail.invoicing.error_upload_invoice', 'Erreur lors du téléchargement de la facture.'))
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
            alert(err.response?.data?.detail || t('work_order_detail.invoicing.error_update_invoice_status', 'Erreur lors de la mise à jour du statut de la facture.'))
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
            alert(err.response?.data?.detail || t('work_order_detail.invoicing.error_save_invoice_number', "Erreur lors de l'enregistrement du numéro de facture."))
        } finally {
            setSavingInvoiceStatus(false)
        }
    }

    const handleSendToBilltobox = async () => {
        try {
            setWo(prev => ({ ...prev, billtobox_status: 'pending' }))
            showToast(t('work_order_detail.invoicing.sending_to_billtobox', 'Envoi de la facture vers Billtobox...'), 'success')
            
            const res = await api.post(`/admin/work-orders/${id}/billtobox`)
            
            setWo(prev => ({ ...prev, billtobox_status: res.data.status }))
            showToast(t('work_order_detail.invoicing.sent_to_billtobox_success', 'La facture a été envoyée avec succès vers Billtobox !'), 'success')
        } catch (error) {
            console.error('Failed to send invoice to Billtobox:', error)
            const msg = error.response?.data?.detail || t('work_order_detail.invoicing.error_send_billtobox', "Une erreur s'est produite lors de l'envoi de la facture.")
            showToast(msg, 'error')
            setWo(prev => ({ ...prev, billtobox_status: 'error', billtobox_error: msg }))
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
            showToast(t('work_order_detail.photo_upload_success', 'La photo a été téléchargée avec succès !'))
        } catch (err) {
            console.error(err)
            alert(err.response?.data?.detail || t('work_order_detail.photo_upload_error', 'Erreur lors du téléchargement de la photo.'))
        } finally {
            setIsUploadingPhoto(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const [isConverting, setIsConverting] = useState(false)
    const handleConvertToOrder = async () => {
        if (!wo?.start_date) {
            showToast(t('quotes.req_start_date', 'Vous devez sélectionner une date de début (depuis Éditer) avant la conversion.'), 'error')
            return
        }
        setShowConvertConfirm(true)
    }

    const executeConvertToOrder = async () => {
        setIsConverting(true)
        try {
            const res = await api.post(`/admin/work-orders/${id}/convert-to-order`, {
                start_date: wo.start_date
            })
            setWo(res.data.work_order)
            showToast(t('quotes.success_convert', 'Le devis a été transformé avec succès !'), 'success')
        } catch (err) {
            showToast(err.response?.data?.detail || t('quotes.err_convert', 'Erreur de conversion.'), 'error')
        } finally {
            setIsConverting(false)
            setShowConvertConfirm(false)
        }
    }

    const handleRouteCalculated = async (km) => {
        if (!wo || km <= 0) return;
        
        const currentSegmentsTotal = (wo.route_segments || []).reduce((sum, s) => sum + (s.km || 0), 0);
        const isSegmentsCorrect = Math.abs(currentSegmentsTotal - (km / 2)) < 0.1;
        
        if (wo.route_distance_km && Math.abs(wo.route_distance_km - km) < 0.1 && isSegmentsCorrect) return;
        
        try {
            const updatedSegments = [...(wo.route_segments || [])];
            const oldTotal = updatedSegments.reduce((sum, s) => sum + (s.km || 0), 0);
            const oneWayKm = km / 2;
            
            if (oldTotal > 0 && updatedSegments.length > 0) {
                updatedSegments.forEach(seg => {
                    seg.km = parseFloat(((seg.km / oldTotal) * oneWayKm).toFixed(1));
                });
            } else if (updatedSegments.length === 2) {
                // Simple A→B→A: split equally
                updatedSegments[0].km = parseFloat((oneWayKm / 2).toFixed(1));
                updatedSegments[1].km = parseFloat((oneWayKm / 2).toFixed(1));
            } else if (updatedSegments.length > 0) {
                updatedSegments[0].km = parseFloat(oneWayKm.toFixed(1));
            }
            setWo(prev => ({ 
                ...prev, 
                route_distance_km: km,
                route_segments: updatedSegments 
            }));
            await api.put(`/admin/work-orders/${id}`, {
                route_distance_km: km,
                route_segments: updatedSegments
            });
        } catch (err) {
            console.error("Failed to save calculated route distance", err);
        }
    };

    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `${API_BASE}${url.startsWith('/') ? url : '/' + url}`;
    };

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [woRes, sessRes, photosRes, msgRes] = await Promise.allSettled([
                api.get(`/admin/work-orders/${id}`),
                api.get(`/admin/work-orders/${id}/sessions`),
                api.get(`/admin/work-orders/${id}/photos`),
                api.get(`/admin/work-orders/${id}/messages`),
            ])
            if (woRes.status === 'fulfilled') {
                const data = woRes.value.data
                setWo(data)
                
                // Mark as read in the background
                api.post(`/admin/work-orders/${id}/mark-read`).catch(err => console.error('Failed to mark read', err))
                
                // Init TVA based on client type and work type
                if (data.prices && data.prices.useVat !== false) {
                    setVatEnabled(true)
                    if (data.prices?.vat_type !== undefined) {
                        setVatType(String(data.prices.vat_type))
                    } else if (data.client_type === 'pj' || data.client_type === 'juridica') {
                        setVatType('0')
                    } else {
                        setVatType(data.work_type === 'repair' ? '6' : '21')
                    }
                } else {
                    setVatEnabled(false)
                }
            }
            if (sessRes.status === 'fulfilled')   setSessions(sessRes.value.data)
            if (photosRes.status === 'fulfilled') {
                const p = photosRes.value.data
                setPhotos(Array.isArray(p) ? p : (p?.photos || []))
            }
            if (msgRes.status === 'fulfilled') {
                setMessages(msgRes.value.data || [])
            }
        } catch {} finally {
            setLoading(false)
        }
    }, [id])


    useEffect(() => { load() }, [load])

    // Fetch pricing settings (tarife) pentru calcul transport
    useEffect(() => {
        api.get('/admin/pricing-settings')
            .then(res => setPricingSettings(res.data))
            .catch(err => console.error('Failed to load pricing settings:', err))
    }, [])

    const handleTranslatePreview = async () => {
        if (!chatMessage.trim() || targetLang === 'none') return;
        setIsTranslating(true);
        try {
            const res = await api.post('/admin/translate', {
                text: chatMessage,
                target_lang: targetLang
            });
            setPreviewTranslation(res.data.translatedText);
        } catch (e) {
            console.error("Translation error", e);
        } finally {
            setIsTranslating(false);
        }
    }

    const handleSendMessage = async () => {
        if ((!chatMessage.trim() && selectedFiles.length === 0) || sendingMessage || isUploadingFiles) return;
        setSendingMessage(true);
        setIsUploadingFiles(true);
        let uploadedAttachments = []
        try {
            for (const file of selectedFiles) {
                const formData = new FormData()
                formData.append('file', file)
                const res = await api.post(`/admin/work-orders/${id}/chat-attachment`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                uploadedAttachments.push(res.data)
            }
        } catch (err) {
            showToast("Eroare la încărcarea fișierelor.", "error");
            setIsUploadingFiles(false);
            setSendingMessage(false);
            return;
        }

        try {
            const payload = {
                message: chatMessage,
                target_lang: targetLang === 'none' ? null : targetLang,
                attachments: uploadedAttachments
            };
            if (previewTranslation.trim()) {
                payload.translations = { [targetLang]: previewTranslation };
            }
            const res = await api.post(`/admin/work-orders/${id}/messages`, payload);
            setMessages(prev => [...prev, res.data]);
            setChatMessage("");
            setPreviewTranslation("");
            setSelectedFiles([]);
        } catch (err) {
            showToast("Eroare la trimiterea mesajului.", "error");
        } finally {
            setSendingMessage(false);
            setIsUploadingFiles(false);
        }
    };

    const handleToggleReaction = async (msgId, emoji) => {
        try {
            const res = await api.post(`/admin/work-orders/${id}/messages/${msgId}/react`, { emoji })
            setMessages(prev => prev.map(m => m.id === msgId ? res.data : m))
            setShowEmojiPickerFor(null)
        } catch (err) {
            showToast(t('admin.error_reacting', "Erreur lors de l'ajout de la réaction"), 'error')
        }
    }

    const handleToggleVisibility = async (msgId) => {
        try {
            const res = await api.put(`/admin/work-orders/${id}/messages/${msgId}/toggle-visibility`);
            setMessages(prev => prev.map(m => m.id === msgId ? res.data : m));
            showToast(res.data.is_hidden ? t('admin.message_hidden', 'Message masqué au client') : t('admin.message_visible', 'Message visible pour le client'), "success");
        } catch (err) {
            showToast(t('admin.error_toggling_visibility', 'Erreur lors de la modification de la visibilité'), "error");
        }
    }

    const handleDeleteMessage = async (msgId) => {
        try {
            await api.delete(`/admin/work-orders/${id}/messages/${msgId}`);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            showToast("Mesajul a fost șters.", "success");
        } catch (err) {
            showToast("Eroare la ștergerea mesajului.", "error");
        }
    };

    const handleEditMessage = async (msgId) => {
        if (!editMessageText.trim()) return;
        try {
            const res = await api.put(`/admin/work-orders/${id}/messages/${msgId}`, {
                message: editMessageText
            });
            setMessages(prev => prev.map(m => m.id === msgId ? res.data : m));
            setEditingMessageId(null);
            showToast("Mesajul a fost actualizat.", "success");
        } catch (err) {
            showToast("Eroare la actualizarea mesajului.", "error");
        }
    };

    const handleMarkUnread = async (msgId) => {
        try {
            await api.post(`/admin/work-orders/${id}/messages/${msgId}/unread`);
            showToast(t('admin.message_marked_unread', 'Mesaj marcat ca necitit'), "success");
            window.dispatchEvent(new CustomEvent('refresh-notifications'));
        } catch (err) {
            showToast(t('admin.error_marking_unread', 'Eroare la marcarea mesajului'), "error");
        }
    };

    const handleRecalculateRoute = async () => {
        if (!wo) return;
        
        // If scheduled for a specific date, trigger full day recalculation via logistics
        if (wo.start_date && wo.status !== 'quote' && wo.status !== 'new') {
            setIsRecalculatingRoute(true);
            try {
                await api.post(`/admin/logistics/archive-day`, { target_date: wo.start_date });
                showToast(t('work_order_detail.route_updated', 'Les itinéraires de la journée ont été recalculés !'), 'success');
                load(); // refresh all data to get new segments
            } catch (err) {
                console.error("Recalc route error", err);
                showToast(t('work_order_detail.recalc_error', 'Erreur lors du recalcul de l\'itinéraire.'), 'error');
            } finally {
                setIsRecalculatingRoute(false);
            }
            return;
        }

        // Fallback for simple standalone quotes or unscheduled work orders
        if (!window.google || !window.google.maps) {
            showToast(t('work_order_detail.maps_not_loaded', 'Google Maps non chargé.'), 'error');
            return;
        }
        
        setIsRecalculatingRoute(true);
        let startLat = 50.88243;
        let startLng = 4.39343;

        let endLat = parseFloat(wo.site_latitude);
        let endLng = parseFloat(wo.site_longitude);

        // Dacă nu avem coordonate dar avem adresă, geocodificăm adresa mai întâi
        if ((!endLat || !endLng) && wo.site_address) {
            try {
                const geocoder = new window.google.maps.Geocoder();
                const geoResult = await new Promise((resolve, reject) => {
                    geocoder.geocode({ address: wo.site_address }, (results, status) => {
                        if (status === 'OK' && results[0]) {
                            resolve({
                                lat: results[0].geometry.location.lat(),
                                lng: results[0].geometry.location.lng()
                            });
                        } else {
                            reject(new Error('Geocoding failed'));
                        }
                    });
                });
                endLat = geoResult.lat;
                endLng = geoResult.lng;
            } catch(e) {
                showToast(t('work_order_detail.geocode_failed', 'Impossible de géocoder l\'adresse. Vérifiez l\'adresse.'), 'error');
                setIsRecalculatingRoute(false);
                return;
            }
        }

        if (!endLat || !endLng) {
            showToast(t('work_order_detail.invalid_coords', 'Coordonnées invalides pour le calcul.'), 'error');
            setIsRecalculatingRoute(false);
            return;
        }

        fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`)
            .then(res => res.json())
            .then(async data => {
                if (data && data.code === "Ok" && data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    const distanceKm = route.distance / 1000;
                    const roundTrip = distanceKm * 2;
                    
                    const newRouteSegments = [
                        {
                            from: "H&H Resources Brussels",
                            to: wo.site_address || wo.title,
                            km: parseFloat(distanceKm.toFixed(2)),
                            from_lat: startLat,
                            from_lng: startLng
                        },
                        {
                            from: wo.site_address || wo.title,
                            to: "Baza",
                            km: parseFloat(distanceKm.toFixed(2)),
                            from_lat: endLat,
                            from_lng: endLng
                        }
                    ];

                    try {
                        await api.put(`/admin/work-orders/${id}`, { 
                            site_latitude: endLat,
                            site_longitude: endLng,
                            route_distance_km: roundTrip,
                            route_segments: newRouteSegments
                        });
                        setWo(prev => ({ 
                            ...prev, 
                            route_distance_km: roundTrip,
                            route_segments: newRouteSegments,
                            site_latitude: endLat,
                            site_longitude: endLng
                        }));
                        showToast(t('work_order_detail.route_updated', 'La distance a été recalculée et sauvegardée.'), 'success');
                    } catch (e) {
                        showToast('Erreur', 'error');
                    }
                } else {
                    showToast(t('work_order_detail.route_not_found', 'Impossible de calculer l\'itinéraire (API).'), 'error');
                }
            })
            .catch(err => {
                console.error('OSRM route error:', err);
                showToast(t('work_order_detail.route_not_found', 'Impossible de calculer l\'itinéraire (API).'), 'error');
            })
            .finally(() => {
                setIsRecalculatingRoute(false);
            });
    };


    // ESC key — close lightbox
    useEffect(() => {
        const handler = (e) => { 
            if (e.key === 'Escape') {
                setLightbox(null); 
                setPreviewDocIndex(null);
            }
            if (lightbox !== null && typeof lightbox === 'number') {
                if (e.key === 'ArrowRight') setLightbox(prev => (prev + 1) % photos.length);
                if (e.key === 'ArrowLeft') setLightbox(prev => (prev - 1 + photos.length) % photos.length);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightbox, photos.length]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                <span className="text-sm text-slate-500 font-medium">{t('work_order_detail.loading_order', 'Chargement de la commande...')}</span>
            </div>
        </div>
    )
    if (!wo) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400 font-semibold">{t('work_order_detail.not_found', 'Commande introuvable')}</p>
                <button onClick={() => goBack()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-colors">
                    ← {t('work_order_detail.back', 'Retour')}
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
    let rawAddress = wo.site_address || wo.site_name || null;
    let countryTranslated = 'Belgique';
    if (i18n.language?.startsWith('nl')) countryTranslated = 'België';
    else if (i18n.language?.startsWith('de')) countryTranslated = 'Belgien';
    else if (i18n.language?.startsWith('en')) countryTranslated = 'Belgium';
    else if (i18n.language?.startsWith('ro')) countryTranslated = 'Belgia';
    const address = rawAddress ? rawAddress.replace(/,\s*(belgia|belgique|belgium|belgië|belgien)\s*$/i, `, ${countryTranslated}`).replace(/\b(belgia|belgique|belgium|belgië|belgien)\b/i, countryTranslated) : null;

    // KPIs
    const totalHours = sessions?.total_hours || 0
    const sessCount  = sessions?.sessions_count || 0
    
    // Dynamic Materials KPI
    const hasStarted = wo.status === 'in_progress' || wo.status === 'completed';
    const materialsArray = (hasStarted ? wo.materials_consumed : wo.materials) || [];
    const activeMats = materialsArray.filter(m => m.name);

    let matValue = '—';
    let matSub = t('work_order_detail.kpi.no_material', 'aucun matériau');

    // REGULĂ STRICTĂ: Se preferă valoarea din DB, dar dacă lipsește (ex. la comenzi noi), se calculează estimativ pe frontend.
    let autoSandKg = parseFloat(wo.route_sand_kg) || 0;
    if (autoSandKg === 0) {
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
    }

        if (activeMats.length === 1) {
            const m = activeMats[0];
            let q = parseFloat(m.quantity) || 0;
            if (m.unit === 'kg') q = q / 1000;
            matValue = `${q.toFixed(1)} ${t('work_order_detail.kpi.tons', 'tonnes')}`;
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
            matValue = `${totalT.toFixed(1)} ${t('work_order_detail.kpi.tons', 'tonnes')}`;
            let namesStr = names.join(', ');
            if (namesStr.length > 20) namesStr = namesStr.substring(0, 17) + '...';
            matSub = namesStr;
        } else {
            matValue = activeMats.length;
            matSub = t('work_order_detail.kpi.mat_types', 'types de matériaux');
        }
    } else if (autoSandKg > 0) {
        // Fallback: Show estimated sand from volumes if no explicit materials were added
        const tons = autoSandKg / 1000;
        matValue = `${tons.toFixed(1)} ${t('work_order_detail.kpi.tons', 'tonnes')}`;
        matSub = t('work_order_detail.kpi.sand_est', 'Sable (estimé)');
    }

    const matLabel = hasStarted ? t('work_order_detail.kpi.mat_consumed', 'Mat. Consommés') : t('work_order_detail.kpi.mat_required', 'Mat. Requis');


    // ── Funcție unică de calcul (aceeași formulă pentru deviz și factură) ──────
    const computeChapeTotal = (surface, thickness, flags, prices) => {
        if (!surface || surface <= 0) return { base: 0, extra: 0, foil: 0, mesh: 0, fiber: 0, threshold: 0, truck_cost: 0, discount: 0, net: 0, extraThick: 0 };
        const standardThick = parseFloat(prices?.standard_thickness || 5);
        const extraThick = Math.max(0, thickness - standardThick);
        const base  = parseFloat(prices?.base  || 12.5) * surface;
        
        let extraRate = 0;
        if (prices?.extra_large !== undefined && prices?.extra_threshold !== undefined) {
            extraRate = surface > parseFloat(prices.extra_threshold) ? parseFloat(prices.extra_large) : parseFloat(prices.extra);
        } else {
            extraRate = parseFloat(prices?.extra ?? prices?.extra_thickness_price_per_cm ?? 1.25);
        }
        const extra = extraThick * extraRate * surface;
        const foil  = flags?.has_foil  ? parseFloat(prices?.foil  || 1.2) * surface : 0;
        const mesh  = flags?.has_mesh  ? parseFloat(prices?.mesh  || 2.5) * surface : 0;
        let fiberRate = 0;
        if (prices?.fiber_large !== undefined && prices?.fiber_threshold !== undefined) {
            fiberRate = surface > parseFloat(prices.fiber_threshold) ? parseFloat(prices.fiber_large) : parseFloat(prices.fiber);
        } else {
            fiberRate = parseFloat(prices?.fiber || 2.5);
        }
        const fiber = (flags?.has_fiber || flags?.has_duramint) ? fiberRate * surface : 0;
        const discountPct = parseFloat(prices?.discount_pct || 0);
        // ── Aplicare Seuil de Surface (grila de suprafață) ─────────────────────
        const thresholds = prices?.surface_thresholds || [];
        let threshold = 0;
        if (prices?.custom_threshold !== undefined && prices.custom_threshold !== null && prices.custom_threshold !== '') {
            threshold = parseFloat(prices.custom_threshold) || 0;
        } else if (thresholds.length > 0) {
            const match = thresholds.find(t =>
                surface >= parseFloat(t.min_sqm) && surface <= parseFloat(t.max_sqm)
            );
            if (match) threshold = parseFloat(match.extra_charge) || 0;
        }
        let truck_cost = parseFloat(prices?.truck_cost || 0);
        
        // Regulă strictă: Folosim EXCLUSIV distanța unică (one-way) calculată la crearea devizului
        // Nu mai folosim wo.route_distance_km sau wo.route_segments (care sunt din planificare)
        const actualDistKm = parseFloat(prices?.distance_km || 0);

        if (truck_cost <= 0 && pricingSettings && actualDistKm > 0) {
            const truckFlat = parseFloat(pricingSettings.truck_extra_price_flat || 0);
            const distThreshold = parseFloat(pricingSettings.truck_distance_threshold_km || 50);
            const surfThreshold = parseFloat(pricingSettings.truck_surface_threshold_free_sqm || 500);
            
            if (truckFlat > 0 && actualDistKm > distThreshold && surface <= surfThreshold) {
                truck_cost = truckFlat;
            }
        }
        const grossBeforeDiscount = base + extra + foil + mesh + fiber + threshold + truck_cost;
        const discountAmount = (grossBeforeDiscount * discountPct) / 100;
        return { base, extra, foil, mesh, fiber, threshold, truck_cost, discountPct, discount: discountAmount, net: grossBeforeDiscount - discountAmount, extraThick, actualDistKm };
    };

    // Calculation Logic for Sapa — Estimatif (din volumes[])
    const hasRealData = Object.keys(wo.prices?.invoice || {}).length > 0 || (wo.actual_surface_m2 && wo.actual_surface_m2 > 0);
    
    // Izolatii
    const getIsolationData = () => {
        let purSurface = 0, purThick = 0, epsM3 = 0, epsSurface = 0, epsThick = 0;
        (wo.volumes || []).forEach(v => {
            const labelSafe = (v.label || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (/isolation\s*pur/i.test(labelSafe)) {
                purSurface += parseFloat(v.quantity || 0);
                purThick = Math.max(purThick, parseFloat(v.thickness || 0));
            }
            if (/isolation\s*eps/i.test(labelSafe)) {
                const s = parseFloat(v.quantity || 0);
                const t = parseFloat(v.thickness || 0);
                epsSurface += s;
                epsThick = Math.max(epsThick, t);
                epsM3 += (s * t) / 100;
            }
        });
        return { purSurface, purThick, epsM3, epsSurface, epsThick };
    };
    
    const { purSurface: isoPurSurface, purThick: isoPurThick, epsM3: isoEpsM3, epsSurface: isoEpsSurface, epsThick: isoEpsThick } = getIsolationData();

    let isAuto = false;
    let surfaceForAuto = 0;
    let extraThickForAuto = 0;
    let chapeFlags = {}; // has_foil, has_mesh, has_fiber, has_duramint
    let estimCalc = { base: 0, extra: 0, foil: 0, mesh: 0, fiber: 0, threshold: 0, truck_cost: 0, discount: 0, net: 0, discountPct: 0, isoPurBase: 0, isoPurOpt: 0, isoEpsBase: 0, purDiscount: 0, purDiscountPct: 0, epsDiscount: 0, epsDiscountPct: 0 };
    let purOpts = { aspiration: 0, niveller: 0, poncage: 0, protection: 0 };

    (wo.volumes || []).forEach(vol => {
        const surface = parseFloat(vol.quantity) || 0;
        const thickness = parseFloat(vol.thickness) || 0;
        const labelSafe = (vol.label || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const isChape = /chape|[sșş]ap[aăâ]/i.test(labelSafe);
        if (isChape && surface > 0) {
            isAuto = true;
            surfaceForAuto += surface;
            chapeFlags = { has_foil: vol.has_foil, has_mesh: vol.has_mesh, has_fiber: vol.has_fiber, has_duramint: vol.has_duramint };
            const c = computeChapeTotal(surface, thickness, chapeFlags, wo.prices);
            extraThickForAuto = c.extraThick;
            estimCalc.base  += c.base;
            estimCalc.extra += c.extra;
            estimCalc.foil  += c.foil;
            estimCalc.mesh  += c.mesh;
            estimCalc.fiber += c.fiber;
            estimCalc.threshold += c.threshold;
            estimCalc.truck_cost += c.truck_cost;
            estimCalc.discount += c.discount;
            estimCalc.discountPct = c.discountPct;
            estimCalc.net   += c.net;
            estimCalc.actualDistKm = c.actualDistKm;
        } else if (/isolation\s*pur/i.test(labelSafe) && surface > 0) {
            isAuto = true;
            let purBase = parseFloat(wo.prices?.pur_base_price_3cm || 13.95);
            if (isoPurThick > 3 && isoPurThick <= 10) {
                purBase += (isoPurThick - 3) * parseFloat(wo.prices?.pur_step_price_up_to_10cm || 1.65);
            } else if (isoPurThick > 10) {
                purBase += 7 * parseFloat(wo.prices?.pur_step_price_up_to_10cm || 1.65);
                purBase += (isoPurThick - 10) * parseFloat(wo.prices?.pur_extra_price_above_10cm || 2.10);
            }
            if (surface > 100) {
                purBase += Math.floor((surface - 100) / 100) * parseFloat(wo.prices?.pur_surface_discount_step || -0.50);
            }
            purBase = Math.max(0, purBase);
            const isoPurBaseCost = purBase * surface;
            estimCalc.isoPurBase += isoPurBaseCost;
            
            let thisPurTotal = isoPurBaseCost;
            
            if (vol.pur_aspiration) {
                let cost = parseFloat(wo.prices?.pur_opt_aspiration || 2.00) * surface;
                estimCalc.isoPurOpt += cost;
                purOpts.aspiration += cost;
                thisPurTotal += cost;
            }
            if (vol.pur_niveller) {
                let cost = parseFloat(wo.prices?.pur_opt_niveller || 4.25) * surface;
                estimCalc.isoPurOpt += cost;
                purOpts.niveller += cost;
                thisPurTotal += cost;
            }
            if (vol.pur_poncage) {
                let cost = parseFloat(wo.prices?.pur_opt_poncage || 1.50) * surface;
                estimCalc.isoPurOpt += cost;
                purOpts.poncage += cost;
                thisPurTotal += cost;
            }
            if (vol.pur_protection) {
                let cost = parseFloat(wo.prices?.pur_opt_protection || 1.50) * surface;
                estimCalc.isoPurOpt += cost;
                purOpts.protection += cost;
                thisPurTotal += cost;
            }
            let purDiscountPct = parseFloat(wo.prices?.pur_discount_pct || 0);
            let netPur = thisPurTotal * (1 - purDiscountPct / 100);
            estimCalc.purDiscount = thisPurTotal * (purDiscountPct / 100);
            estimCalc.purDiscountPct = purDiscountPct;
            estimCalc.net += netPur;
        } else if (/isolation\s*eps/i.test(labelSafe) && surface > 0) {
            isAuto = true;
            let epsVol = (surface * (thickness || 1)) / 100;
            const epsTiers = wo.prices?.eps_volume_thresholds || [
                { max_m3: 10, price_flat: 1495 },
                { max_m3: 20, price_per_m3: 160 },
                { max_m3: 40, price_per_m3: 155 },
                { max_m3: 99999, price_per_m3: 150 }
            ];
            let epsPrice = 0;
            for (let tier of epsTiers) {
                if (epsVol <= parseFloat(tier.max_m3 || 99999)) {
                    if (tier.price_flat) epsPrice = parseFloat(tier.price_flat);
                    else epsPrice = epsVol * parseFloat(tier.price_per_m3 || 150);
                    break;
                }
            }
            
            // overrides from devis explicitly
            if (wo.prices?.custom_eps_price_flat !== undefined && wo.prices.custom_eps_price_flat !== null) {
                epsPrice = parseFloat(wo.prices.custom_eps_price_flat);
            } else if (wo.prices?.custom_eps_price_per_m3 !== undefined && wo.prices.custom_eps_price_per_m3 !== null) {
                epsPrice = epsVol * parseFloat(wo.prices.custom_eps_price_per_m3);
            }

            estimCalc.isoEpsBase += epsPrice;
            let epsDiscountPct = parseFloat(wo.prices?.eps_discount_pct || 0);
            let netEps = epsPrice * (1 - epsDiscountPct / 100);
            estimCalc.epsDiscount = epsPrice * (epsDiscountPct / 100);
            estimCalc.epsDiscountPct = epsDiscountPct;
            estimCalc.net += netEps;
        }
    });

    // Raccourcis pour compatibilitate cu codul existent
    const autoBase  = estimCalc.base;
    const autoExtra = estimCalc.extra;
    const autoFoil  = estimCalc.foil;
    const autoMesh  = estimCalc.mesh;
    const autoFiber = estimCalc.fiber;
    const autoNet   = estimCalc.net;

    // TVA is controlled by user toggle, NOT automatic
    const vatRate = vatEnabled ? (vatType === '21' ? 0.21 : vatType === '6' ? 0.06 : 0) : 0;
    let autoVat = autoNet * vatRate;
    let totalGross = autoNet + autoVat;

    // Calculation Réel — pe baza datelor introduse de șeful de echipă
    const realSurface   = parseFloat(wo.actual_surface_m2)   || 0;
    const realThickness = parseFloat(wo.actual_thickness_cm) || 0;
    const realChapeFlags = wo.prices?.invoice ? {
        has_foil: wo.prices.invoice.has_foil,
        has_mesh: wo.prices.invoice.has_mesh,
        has_fiber: wo.prices.invoice.has_fiber,
        has_duramint: wo.prices.invoice.has_duramint
    } : chapeFlags;
    const realCalc = hasRealData
        ? computeChapeTotal(realSurface, realThickness, realChapeFlags, wo.prices?.invoice || wo.prices)
        : null;
    const realVat   = realCalc ? realCalc.net * vatRate : 0;
    const realGross = realCalc ? realCalc.net + realVat : 0;

    // Alert diferență majoră (>20%)
    const diffPct = (autoNet > 0 && realCalc)
        ? Math.abs((realCalc.net - autoNet) / autoNet * 100)
        : 0;
    const bigDiff = diffPct > 20;

    const handleSyncPrices = () => {
        setShowSyncConfirm(true);
    };

    const executeSyncPrices = async () => {
        setShowSyncConfirm(false);
        setSyncingPrices(true);
        try {
            await api.post(`/admin/work-orders/${id}/sync-prices`);
            showToast(t('work_order_detail.sync_success', 'Les prix ont été synchronisés avec succès.'));
            load(); // reîncarcă datele pentru a afișa noile prețuri
        } catch (err) {
            console.error(err);
            showToast(t('common.error', 'Erreur lors de la synchronisation des prix.'), 'error');
        } finally {
            setSyncingPrices(false);
        }
    };

    // Handler salvare modal Calcul Edit
    const handleCalcEditSave = async () => {
        if (!calcEditForm) return;
        setCalcEditSaving(true);
        try {
            const surface = parseFloat(calcEditForm.surface) || 0;
            const thickness = parseFloat(calcEditForm.thickness) || 0;
            
            const newPurSurface = parseFloat(calcEditForm.iso_pur_surface) || 0;
            const newPurThickness = parseFloat(calcEditForm.iso_pur_thickness) || 0;
            const newEpsVolume = parseFloat(calcEditForm.iso_eps_m3) || 0;

            const newVolumes = (wo.volumes || []).map(v => {
                const labelSafe = (v.label || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                if (/chape|[sșş]ap[aăâ]/i.test(labelSafe)) {
                    return { ...v, quantity: surface, thickness, has_foil: !!calcEditForm.has_foil, has_mesh: !!calcEditForm.has_mesh, has_fiber: !!calcEditForm.has_fiber, has_duramint: !!calcEditForm.has_duramint };
                }
                if (/isolation\s*pur/i.test(labelSafe)) {
                    return { ...v, quantity: newPurSurface, thickness: newPurThickness };
                }
                if (/isolation\s*eps/i.test(labelSafe)) {
                    return { ...v, quantity: parseFloat(calcEditForm.iso_eps_surface) || 0, eps_surface: parseFloat(calcEditForm.iso_eps_surface) || 0, thickness: parseFloat(calcEditForm.iso_eps_thickness) || 0 };
                }
                return v;
            });
            // Dacă nu există niciun volum Chape, creăm unul
            const hasChapeVol = (wo.volumes || []).some(v => /chape|[sșş]ap[aăâ]/i.test((v.label || '').toLowerCase()));
            if (!hasChapeVol && surface > 0) {
                newVolumes.push({ label: 'Chape', quantity: surface, unit: 'm²', thickness, has_foil: !!calcEditForm.has_foil, has_mesh: !!calcEditForm.has_mesh, has_fiber: !!calcEditForm.has_fiber, has_duramint: !!calcEditForm.has_duramint });
            }
            const newPrices = {
                ...(wo.prices || {}),
                base: parseFloat(calcEditForm.base_price) || 0,
                extra: parseFloat(calcEditForm.extra_price) || 0,
                extra_thickness_price_per_cm: parseFloat(calcEditForm.extra_price) || 0,
                foil: parseFloat(calcEditForm.foil_price) || 0,
                mesh: parseFloat(calcEditForm.mesh_price) || 0,
                fiber: parseFloat(calcEditForm.fiber_price) || 0,
                discount_pct: parseFloat(calcEditForm.discount_pct) || 0,
                custom_threshold: calcEditForm.custom_threshold !== '' ? parseFloat(calcEditForm.custom_threshold) : null,
                pur_discount_pct: parseFloat(calcEditForm.pur_discount_pct) || 0,
                eps_discount_pct: parseFloat(calcEditForm.eps_discount_pct) || 0,
                // PUR
                pur_base_price_3cm: parseFloat(calcEditForm.pur_base_price_3cm) || 0,
                pur_step_price_up_to_10cm: parseFloat(calcEditForm.pur_step_price_up_to_10cm) || 0,
                pur_extra_price_above_10cm: parseFloat(calcEditForm.pur_extra_price_above_10cm) || 0,
                pur_opt_aspiration: parseFloat(calcEditForm.pur_opt_aspiration) || 0,
                pur_opt_niveller: parseFloat(calcEditForm.pur_opt_niveller) || 0,
                pur_opt_poncage: parseFloat(calcEditForm.pur_opt_poncage) || 0,
                pur_opt_protection: parseFloat(calcEditForm.pur_opt_protection) || 0,
            };
            
            if (calcEditForm.custom_eps_price_flat !== '') {
                newPrices.custom_eps_price_flat = parseFloat(calcEditForm.custom_eps_price_flat);
            } else {
                delete newPrices.custom_eps_price_flat;
                newPrices.custom_eps_price_flat = null; // force remove for backend
            }
            if (calcEditForm.custom_eps_price_per_m3 !== '') {
                newPrices.custom_eps_price_per_m3 = parseFloat(calcEditForm.custom_eps_price_per_m3);
            } else {
                delete newPrices.custom_eps_price_per_m3;
                newPrices.custom_eps_price_per_m3 = null;
            }
            
            // Stergem logica cu threshold daca pretul fiber a fost editat custom
            delete newPrices.fiber_large;
            delete newPrices.fiber_threshold;
            // Calcul nou estimat
            const totalChapeSurface = (calcEditForm.chapes || []).reduce((sum, c) => sum + (parseFloat(c.surface) || 0), 0);
            
            // Compute base totals without threshold and truck cost
            const chapeTotals = (calcEditForm.chapes || []).map(c => {
                return computeChapeTotal(parseFloat(c.surface) || 0, parseFloat(c.thickness) || 0, c, newPrices);
            });
            
            let totalNet = chapeTotals.reduce((sum, c) => sum + (c.base + c.extra + c.foil + c.mesh + c.fiber), 0);
            
            // Re-evaluate threshold & truck cost on TOTAL surface
            let threshold = 0;
            const thresholds = newPrices?.surface_thresholds || [];
            if (newPrices?.custom_threshold !== undefined && newPrices.custom_threshold !== null && newPrices.custom_threshold !== '') {
                threshold = parseFloat(newPrices.custom_threshold) || 0;
            } else if (thresholds.length > 0) {
                const match = thresholds.find(t => totalChapeSurface >= parseFloat(t.min_sqm) && totalChapeSurface <= parseFloat(t.max_sqm));
                if (match) threshold = parseFloat(match.extra_charge) || 0;
            }
            
            let truck_cost = parseFloat(newPrices?.truck_cost || 0);
            const actualDistKm = parseFloat(newPrices?.distance_km || 0);
            
            if (truck_cost <= 0 && pricingSettings && actualDistKm > 0) {
                const truckFlat = parseFloat(pricingSettings.truck_extra_price_flat || 0);
                const distThreshold = parseFloat(pricingSettings.truck_distance_threshold_km || 50);
                const surfThreshold = parseFloat(pricingSettings.truck_surface_threshold_free_sqm || 500);
                if (truckFlat > 0 && actualDistKm > distThreshold && totalChapeSurface <= surfThreshold) {
                    truck_cost = truckFlat;
                }
            }
            
            totalNet += threshold + truck_cost;
            const discountPct = parseFloat(newPrices?.discount_pct || 0);
            totalNet = totalNet - (totalNet * discountPct / 100);
            
            // Also add PUR and EPS to estimated price (rough approx, backend might recalculate)
            // Wait, does estimated_price currently include PUR/EPS?
            // computeChapeTotal only returns Chape total!
            const newCalc = { net: totalNet };

            // Sincronizare automată TVA în funcție de noile date de client/lucrare
            let newVatType = newPrices.vat_type;
            if (calcEditForm.client_type === 'pj' || calcEditForm.client_type === 'juridica') {
                newVatType = '0';
            } else if (calcEditForm.work_type === 'repair') {
                newVatType = '6';
            } else {
                newVatType = '21';
            }
            newPrices.vat_type = newVatType;

            // Update the legacy proforma_data object so the public page sees the changes
            const newProformaData = {
                ...(wo.proforma_data || {}),
                discountPct: newPrices.discount_pct,
                vatRate: newVatType,
                // also resync items if we have them so the price update applies
                items: null // clearing items forces the public page to re-render using the fallback logic which correctly uses `prices`
            };
            
            const res = await api.put(`/admin/work-orders/${id}`, { 
                client_type: calcEditForm.client_type,
                work_type: calcEditForm.work_type,
                volumes: newVolumes, 
                estimated_price: String(newCalc.net), 
                prices: newPrices,
                proforma_data: newProformaData
            });
            setWo(res.data);
            setVatType(String(newVatType));
            setCalcEditOpen(false);
            showToast(t('work_order_detail.calc_edit.saved', 'Calcul mis à jour avec succès.'));
            
            // Si le discount a changé, proposer d'envoyer une notification au client
            const oldDiscountPct = parseFloat(wo.prices?.discount_pct || 0);
            const newDiscountPct = parseFloat(calcEditForm.discount_pct || 0);
            if (oldDiscountPct !== newDiscountPct && newDiscountPct > 0 && res.data?.client_email) {
                setTimeout(() => setShowDiscountNotifyPrompt(true), 500);
            }
        } catch (e) {
            console.error("Save calc error:", e?.response?.data || e.message);
            showToast(t('work_order_detail.calc_edit.error', 'Erreur lors de la sauvegarde du calcul.'), 'error');
        } finally {
            setCalcEditSaving(false);
        }
    };

    // Handler salvare modal Calcul Real Edit
    const handleCalcRealEditSave = async () => {
        if (!calcRealEditForm) return;
        setCalcRealEditSaving(true);
        try {
            const surface = parseFloat(calcRealEditForm.surface) || 0;
            const thickness = parseFloat(calcRealEditForm.thickness) || 0;
            
            const newInvoicePrices = {
                has_foil: !!calcRealEditForm.has_foil,
                has_mesh: !!calcRealEditForm.has_mesh,
                has_fiber: !!calcRealEditForm.has_fiber,
                has_duramint: !!calcRealEditForm.has_duramint,
            };

            const newPrices = {
                ...(wo.prices || {}),
                invoice: newInvoicePrices
            };

            const res = await api.put(`/admin/work-orders/${id}`, { 
                actual_surface_m2: surface, 
                actual_thickness_cm: thickness, 
                prices: newPrices 
            });
            setWo(res.data);
            setCalcRealEditOpen(false);
            showToast(t('work_order_detail.calc_edit_real.saved', 'Calcul réel mis à jour avec succès !'));
        } catch (e) {
            showToast(t('work_order_detail.calc_edit_real.error', 'Erreur lors de la sauvegarde du calcul réel.'), 'error');
        } finally {
            setCalcRealEditSaving(false);
        }
    };

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
    const workersSub = activeWorkersCount > 0 ? t('work_order_detail.kpi.clocked_in', 'ont pointé') : t('work_order_detail.kpi.assigned', 'assignée');
    
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
        <div className="p-4 sm:p-6 max-w-7xl ml-0 space-y-5 pb-10">

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
                        <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight truncate">
                            {wo.client_name && wo.client_name !== 'None' ? wo.client_name : wo.title}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 sm:ml-auto shrink-0 items-center">
                    {quoteIds.length > 0 && (
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm mr-1 sm:mr-3">
                            <button 
                                onClick={() => navigate(`/admin/work-orders/${prevId}`, { state: location.state })}
                                disabled={!prevId}
                                title={t('common.prev', 'Précédent')}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] font-bold text-slate-400 px-1">{currentIndex + 1} / {quoteIds.length}</span>
                            <button 
                                onClick={() => navigate(`/admin/work-orders/${nextId}`, { state: location.state })}
                                disabled={!nextId}
                                title={t('common.next', 'Suivant')}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <HourlyWeather 
                        lat={lat || 50.8503} 
                        lon={lon || 4.3517} 
                        dateStr={wo.start_date || wo.deadline_date || wo.created_at} 
                        address={address}
                        orderTime={wo.start_time}
                        inline={true}
                    />
                    <div className="flex items-center gap-1">
                        <button
                            onClick={async () => {
                                try {
                                    await api.post(`/admin/work-orders/${id}/mark-unread`);
                                    showToast(t('work_order_detail.marked_unread', 'Marcat ca necitit!'), 'success');
                                } catch(e) {
                                    console.error(e);
                                    showToast('Eroare la marcarea ca necitit.', 'error');
                                }
                            }}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
                            title={t('work_order_detail.mark_unread_desc', 'Marchează înapoi ca Nou (Necitit)')}
                        >
                            <EyeOff className="w-4 h-4" />
                        </button>
                        {wo.token && (
                            <>
                                <button
                                    onClick={() => {
                                        const clientLink = wo.is_invoiced 
                                            ? `${window.location.origin}/public/proforma/${wo.token}?type=invoice`
                                            : `${window.location.origin}/confirm/${wo.token}`;
                                        navigator.clipboard.writeText(clientLink)
                                        showToast(t('quotes.link_copied', 'Le lien du client a été copié dans le presse-papiers !'))
                                        setCopiedLink(true)
                                        setTimeout(() => setCopiedLink(false), 3000)
                                    }}
                                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0 ${copiedLink ? 'bg-emerald-50 text-emerald-600 border border-emerald-500' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                    title={wo.is_invoiced ? t('quotes.copy_link_invoice', 'Copier le lien de la facture') : t('quotes.copy_link_desc', 'Envoyer ce lien au client pour signature')}
                                >
                                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <a
                                    href={wo.is_invoiced 
                                        ? `/public/proforma/${wo.token}?type=invoice`
                                        : `/confirm/${wo.token}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
                                    title={t('quotes.open_link', 'Ouvrir le lien')}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </>
                        )}
                    </div>
                    {wo.status !== 'completed' && wo.status !== 'cancelled' && wo.status !== 'draft' && (
                        <button
                            onClick={async () => {
                                if (window.confirm(t('work_order_detail.confirm_complete', 'Êtes-vous sûr de vouloir marquer cette commande comme terminée ?'))) {
                                    try {
                                        await api.put(`/admin/work-orders/${id}`, { status: 'completed' });
                                        setWo(prev => ({ ...prev, status: 'completed' }));
                                        showToast(t('work_order_detail.marked_completed', 'Commande marquée comme terminée !'), 'success');
                                    } catch (e) {
                                        console.error(e);
                                        showToast(t('common.error', 'Erreur'), 'error');
                                    }
                                }
                            }}
                            className="flex items-center gap-2 px-4 h-9 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold hover:bg-emerald-100 transition-colors shrink-0"
                            title={t('work_order_detail.mark_completed', 'Marquer comme terminé')}
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {t('work_order_detail.mark_completed_btn', 'Marquer comme terminé')}
                        </button>
                    )}
                    <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 h-9 rounded-full bg-red-50 text-red-600 border border-red-200 text-sm font-bold hover:bg-red-100 transition-colors shrink-0"
                        title={t('common.delete', 'Supprimer')}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('common.delete', 'Supprimer')}
                    </button>
                    {/* wo.status !== 'completed' && (
                        <>
                            {wo.status === 'planning' && wo.client_email && (
                                <button
                                    onClick={async () => {
                                        if (confirm(t('planning.confirm_send_notification', 'Êtes-vous sûr de vouloir envoyer (ou renvoyer) l\\'email de notification au client ?'))) {
                                            try {
                                                await api.put(`/admin/work-orders/${id}`, { send_notification: true });
                                                showToast(t('planning.notification_sent', 'Notification envoyée avec succès !'), 'success');
                                            } catch (e) {
                                                console.error(e);
                                                showToast(t('planning.notification_error', 'Erreur lors de l\\'envoi de la notification.'), 'error');
                                            }
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 h-9 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold hover:bg-emerald-100 transition-colors shrink-0"
                                    title={t('planning.send_notification_btn', 'Envoyer / Renvoyer la notification de planification')}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    {t('planning.send_email_btn', 'Envoyer Notification')}
                                </button>
                            )}
                            <button
                                onClick={() => document.getElementById('chat-input-field')?.focus()}
                                className="flex items-center gap-2 px-4 h-9 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-sm font-bold hover:bg-blue-100 transition-colors shrink-0"
                                title="Chat cu clientul"
                            >
                                <MessageSquare className="w-4 h-4" />
                                {messages.length > 0 ? (
                                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{messages.length}</span>
                                ) : null}
                                Chat
                            </button>
                            <button onClick={() => navigate(`/admin/work-orders/${id}/edit`)}
                                className="flex items-center gap-2 px-4 h-9 rounded-full border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" /> {t('common.edit', 'Modifier')}
                            </button>
                            <button 
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-4 h-9 rounded-full bg-red-50 text-red-600 border border-red-200 text-sm font-bold hover:bg-red-100 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" /> {t('common.delete', 'Supprimer')}
                            </button>
                        </>
                    ) */}
                </div>
            </div>

            {/* ── KPIs ────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                <KPI icon={Users}    label={t('work_order_detail.kpi.employees', 'Employés')}       value={workersValue}     sub={workersSub}       color="purple" />
                <KPI icon={Package}  label={matLabel}       value={matValue}         sub={matSub}           color="amber" />
                <KPI icon={BarChart2} label={t('work_order_detail.kpi.volume', 'Volume')}         value={volumeTotal > 0 ? volumeTotal : '—'} sub={volSub} color="green" />
                <KPI icon={Layers}   label={t('work_order_detail.kpi.thickness', 'Épaisseur')}        value={maxThickness > 0 ? `${maxThickness.toFixed(1)} cm` : '—'} sub={t('work_order_detail.kpi.avg', 'moyenne')} color="rose" />
                <KPI icon={({ className }) => <TruckSVG color="white" className={className} />} label={t('work_order_detail.kpi.base_dist', 'Distance Base')}       
                    value={
                        <div className="flex items-center gap-1.5">
                            <span>{wo.route_distance_km ? `${parseFloat(wo.route_distance_km).toFixed(1)} km` : (wo.prices?.distance_km ? `${(parseFloat(wo.prices.distance_km) * 2).toFixed(1)} km` : (
                                (wo.route_segments && wo.route_segments.length > 0) ? `${(((wo.route_segments).reduce((sum, seg) => sum + (parseFloat(seg.km) || 0), 0)) * 2).toFixed(1)} km` : '—'
                            ))}</span>
                        </div>
                    } 
                    sub={t('work_order_detail.kpi.round_trip', 'aller-retour')} color="slate" />

            </div>

            {/* ── Locație & Hartă (Moved up for Mobile) ────────────────────── */}
            <div className="bg-transparent rounded-2xl border-0 overflow-hidden">
                <div className="px-1 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    {isEditingAddress ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 w-full max-w-md z-50">
                            <div className="flex-1 relative z-50">
                                <AddressAutocomplete
                                    value={editAddressData.address}
                                    onChange={(val) => setEditAddressData(p => ({ ...p, address: val }))}
                                    onSelect={({ address, lat, lon }) => setEditAddressData({ address, lat, lon })}
                                    placeholder={t('quotes.address', 'Adresse')}
                                    className="!bg-transparent !border-none !text-xs !py-1 !px-2 !shadow-none !h-7 !min-h-0"
                                />
                            </div>
                            <div className="flex shrink-0 gap-1 pr-1">
                                <button 
                                    onClick={handleSaveAddress}
                                    className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded transition-colors"
                                    title={t('common.save', 'Enregistrer')}
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onClick={() => setIsEditingAddress(false)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded transition-colors"
                                    title={t('common.cancel', 'Annuler')}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide truncate">{address || t('work_order_detail.location.no_address', 'Aucune adresse spécifiée')}</div>
                            <button
                                onClick={() => {
                                    setEditAddressData({ address: wo.site_address || '', lat: wo.site_latitude, lon: wo.site_longitude });
                                    setIsEditingAddress(true);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 transition-colors shrink-0"
                                title={t('common.edit', 'Modifier')}
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
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
                            label={`${t('work_order_detail.location.loc_label', 'Emplacement : ')}${address}`}
                            baseName={t('work_order_detail.location.base_name', 'Base')}
                            routeSegments={wo.route_segments}
                            onRouteCalculated={handleRouteCalculated}
                            navButtons={(lat || lon || address) ? <NavButtons lat={lat} lon={lon} address={address} /> : null}
                            sandStations={SAND_STATIONS}
                            teamColor={wo.team_color || '#2563eb'}
                            leftPanelContent={
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
                            }
                        />
                    </div>
                )}

                {wo.access_notes && (
                    <div className="px-4 pb-4 pt-3">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                            <p className="text-[10px] whitespace-nowrap font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">🔑 {t('work_order_detail.access_notes', "Notes d'Accès")}</p>
                            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 whitespace-pre-line">{wo.access_notes}</p>
                        </div>
                    </div>
                )}
            </div>



            {/* ── Main Grid ───────────────────────────────────────────────────── */}


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch mb-5">
                <div className="flex flex-col gap-5">

                    <Section 
                        className="flex-1" 
                        icon={FileText} 
                        title={t('work_order_detail.general_details.title', 'Détails Généraux')} 
                        contentClassName="!p-3"
                    >
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2 pb-2 border-b border-slate-50 dark:border-slate-700/50">
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.general_details.quote_number', 'Numéro de Devis')}</p>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-black tracking-widest text-slate-800 dark:text-white">{wo.quote_number || wo.id?.slice(0, 8).toUpperCase()}</p>
                                                        {wo.source_system === 'we-r' || wo.source_system === 'calculator_public' ? (
                                                            <span className="text-[8px] font-bold uppercase tracking-wide text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">{t('source.we_r', 'WE-R')}</span>
                                                        ) : wo.source_system === 'devis_online' ? (
                                                            <span className="text-[8px] font-bold uppercase tracking-wide text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">{t('source.devis', 'Devis en ligne')}</span>
                                                        ) : wo.source_system === 'robaws' ? (
                                                            <span className="text-[8px] font-bold uppercase tracking-wide text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">{t('source.robaws', 'Robaws')}</span>
                                                        ) : (
                                                            <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 bg-slate-500/10 px-1.5 py-0.5 rounded">{t('source.manual', 'Ajouté manuellement')}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('planning.planned', 'Planifié')}</p>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${wo.start_date ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                        {wo.start_date ? t('planning.yes', 'Oui') : t('planning.no', 'Non')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.status_invoiced', 'Facturé')}</p>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${wo.is_invoiced ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                        {wo.is_invoiced ? t('general.yes', 'Oui') : t('general.no', 'Non')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">Billtobox</p>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${wo.billtobox_status === 'sent' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                        {wo.billtobox_status === 'sent' ? t('invoicing.billtobox_sent', 'Envoyé') : t('general.no', 'Non')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4 pb-4 border-b border-slate-50 dark:border-slate-700/50 mt-4">
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('quotes.date', 'Date Devis')}</p>
                                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                        <CalendarDays className="w-4 h-4 text-slate-400" />
                                                        <span>{wo.created_at ? new Date(wo.created_at).toLocaleDateString('ro-RO') : '—'}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('quotes.approx_date', 'Date Approx.')}</p>
                                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                        <CalendarDays className="w-4 h-4 text-slate-400" />
                                                        <span>{wo.approximate_date ? new Date(wo.approximate_date).toLocaleDateString('ro-RO') : '—'}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.status.confirmed_by_team', 'Confirmé Équipe')}</p>
                                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                        <CalendarDays className="w-4 h-4 text-slate-400" />
                                                        <span>{wo.start_date ? `${new Date(wo.start_date).toLocaleDateString('ro-RO')}${wo.start_time ? ` ${wo.start_time}` : ''}` : '—'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.general_details.client', 'Client')}</p>
                                                    <div className="flex flex-col">
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                            {wo.client_name} <span className="text-xs text-slate-400">{getLanguageFlag(wo.client_language)}</span>
                                                        </p>
                                                        {wo.client_email && (
                                                            <a href={`mailto:${wo.client_email}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline mt-0.5 break-all transition-colors">
                                                                {wo.client_email}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('common.phone', 'Téléphone')}</p>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{wo.client_phone || '—'}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('work_order_detail.project_info.client_type', 'Type de Client')}</p>
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                                        {(wo.client_type === 'pf' || wo.client_type === 'fizica') ? t('quotes.pf', 'Particulier') : 
                                                         (wo.client_type === 'pj' || wo.client_type === 'juridica') ? t('quotes.pj', 'Entreprise') : '—'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('work_order_detail.project_info.construction_type', 'Type de Construction')}</p>
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                                        {wo.work_type === 'new' ? t('quotes.construction_new', 'Nouvelle Construction') : 
                                                         wo.work_type === 'repair' ? t('quotes.construction_renovation', 'Rénovation') : '—'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">TVA / CUI</p>
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                        {wo.client_cui || '—'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Langue Client</p>
                                                    {isEditingLang ? (
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={editLang}
                                                                onChange={(e) => setEditLang(e.target.value)}
                                                                className="text-sm bg-white border border-slate-300 rounded px-2 py-1"
                                                            >
                                                                <option value="fr">FR</option>
                                                                <option value="en">EN</option>
                                                                <option value="nl">NL</option>
                                                                <option value="ro">RO</option>
                                                            </select>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await api.put(`/admin/work-orders/${id}`, { client_language: editLang });
                                                                        wo.client_language = editLang;
                                                                        setIsEditingLang(false);
                                                                    } catch (e) {
                                                                        console.error(e);
                                                                    }
                                                                }}
                                                                className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setIsEditingLang(false)}
                                                                className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 group">
                                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase">
                                                                {wo.client_language || 'FR'}
                                                            </span>
                                                            <button 
                                                                onClick={() => { setEditLang(wo.client_language || 'fr'); setIsEditingLang(true); }}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 transition-opacity"
                                                                title="Schimbă limba"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {(wo.volumes && wo.volumes.length > 0) && (
                                                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('work_order_detail.project_info.materials', 'Détails de Surface & Matériaux')}</p>
                                                    <div className="space-y-3">
                                                        {wo.volumes.map((v, i) => {
                                                            const options = [];
                                                            if (v.has_foil) options.push(t('materials.foil', 'Film'));
                                                            if (v.has_mesh) options.push(t('materials.mesh', 'Treillis métallique'));
                                                            if (v.has_duramint || v.has_fiber) options.push(t('materials.fiber', 'Fibre'));
                                                            if (v.has_sound_insulation) options.push(t('materials.sound_insulation', 'Isolation acoustique'));
                                                            if (v.has_floor_heating_add) options.push(t('materials.floor_heating_add', 'Additif pour chauffage'));
                                                            if (v.pur_aspiration) options.push(t('materials.pur_aspiration', 'Aspiration'));
                                                            if (v.pur_niveller) options.push(t('materials.pur_niveller', 'Niveler'));
                                                            if (v.pur_poncage) options.push(t('materials.pur_poncage', 'Ponçage'));
                                                            if (v.pur_protection) options.push(t('materials.pur_protection', 'Protection'));
                                                            
                                                            return (
                                                                <div key={i} className="flex flex-col gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                                                                            {v.label || 'Surface'}
                                                                        </span>
                                                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-sm border border-slate-200 dark:border-slate-600">
                                                                            {v.quantity || 0} {v.unit || 'm²'} <span className="text-slate-300 dark:text-slate-600 mx-1">|</span> {v.thickness || 0} CM
                                                                        </span>
                                                                    </div>
                                                                    {options.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                                            {options.map((opt, j) => (
                                                                                <span key={j} className="inline-flex items-center bg-blue-100/60 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                                                                    ✓ {opt}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50 space-y-2">
                                                <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-2">{t('work_order_detail.general_details.client_beneficiary', 'Client / Bénéficiaire')}</p>
                                                {(wo.confirmed_at || wo.date_confirmed_at) ? (
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div className="flex-1">
                                                            {wo.reschedule_requested && (
                                                                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                                                        <span className="font-bold text-amber-800 uppercase text-[10px]">{t('work_order_detail.reschedule_requested', 'Le client a demandé une reprogrammation')}</span>
                                                                    </div>
                                                                    {wo.reschedule_requested_date && (
                                                                        <div className="text-xs font-bold text-amber-900 mb-1">
                                                                            {t('work_order_detail.requested_date', 'Date souhaitée :')} {new Date(wo.reschedule_requested_date).toLocaleDateString('fr-FR')}
                                                                        </div>
                                                                    )}
                                                                    {wo.reschedule_reason && (
                                                                        <p className="text-xs text-amber-700 font-semibold italic mb-2">"{wo.reschedule_reason}"</p>
                                                                    )}
                                                                    <button
                                                                        onClick={() => document.getElementById('chat-input-field')?.focus()}
                                                                        className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold uppercase transition-colors"
                                                                    >
                                                                        <MessageSquare className="w-4 h-4" />
                                                                        {t('work_order_detail.reply_to_client', 'Répondre au client')}
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {wo.confirmed_at && (
                                                                <>
                                                                    <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                                        <span className="font-bold text-slate-500 uppercase">{t('work_order_detail.status.confirmed_by', 'Confirmat de')}</span>
                                                                        <span className="font-semibold text-emerald-600">{wo.confirmed_by_name}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-700/50 pb-2 mt-2">
                                                                        <span className="font-bold text-slate-500 uppercase">{t('work_order_detail.status.at_date', 'La')}</span>
                                                                        <span className="font-semibold text-emerald-600">{fmtFull(wo.confirmed_at)}</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {wo.start_date && (
                                                                <div className="flex items-center justify-between text-xs pt-2">
                                                                    <span className={`font-bold uppercase ${wo.date_confirmed_at ? 'text-slate-500' : 'text-red-500'}`}>{t('work_order_detail.status.accepted_date', 'Data Intervenției (Propusă/Acceptată)')}</span>
                                                                    <span className={`font-semibold ${wo.date_confirmed_at ? 'text-blue-600' : 'text-red-600 animate-pulse'}`}>
                                                                        {new Date(wo.start_date).toLocaleDateString('ro-RO')} {wo.start_time && ` • ${wo.start_time}`}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {wo.date_confirmed_at ? (
                                                                <div className="flex items-center justify-between text-xs border-t border-emerald-100 bg-emerald-50/50 p-2 mt-2 rounded-lg">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-emerald-700 uppercase text-[10px]">{t('work_order_detail.status.date_confirmed_at', 'Confirmé par le client')}</span>
                                                                        <span className="font-bold text-emerald-600">{wo.client_name}</span>
                                                                    </div>
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <span className="font-bold text-emerald-700">{fmtFull(wo.date_confirmed_at)}</span>
                                                                        {wo.date_history && wo.date_history.length > 0 && (
                                                                            <button 
                                                                                onClick={() => setHistoryModalOpen(true)}
                                                                                className="text-[10px] text-emerald-600 hover:text-emerald-800 underline uppercase"
                                                                            >
                                                                                {t('work_order_detail.btn_history', 'Historique')}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                wo.date_history && wo.date_history.length > 0 && (
                                                                    <div className="flex items-center justify-end text-xs p-2 mt-2">
                                                                        <button 
                                                                            onClick={() => setHistoryModalOpen(true)}
                                                                            className="text-[10px] text-slate-500 hover:text-slate-800 underline uppercase"
                                                                        >
                                                                            {t('work_order_detail.btn_history', 'Historique')}
                                                                        </button>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                        {hasSig && (
                                                            <div className="flex-shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 p-2 flex items-center justify-center">
                                                                <img src={wo.client_signature} alt="Semnătură" className="h-12 object-contain" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                        <p className="text-xs text-slate-400 font-medium">{t('work_order_detail.status.not_confirmed_by_client', 'Neconfirmat de client.')}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {(!wo.external_id && ((wo.site_latitude && wo.site_longitude) || wo.site_address)) && (
                                                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                                                    <StreetViewPhotos lat={wo.site_latitude} lng={wo.site_longitude} address={wo.site_address} />
                                                </div>
                                            )}
                                        </Section>
                </div>
                <div className="flex flex-col gap-5">

                    <Section 
                        className="flex-1 flex flex-col min-h-[500px]" 
                        icon={MessageSquare} 
                        title={t('admin.chat_with_client', 'Chat avec le client')}
                        contentClassName="!p-0 flex flex-col flex-1 h-[500px] max-h-[70vh] relative"
                    >
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/50 pb-20">
                            {messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                    {t('admin.no_messages', 'Aucun message')}
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isSystem = msg.sender === 'system' || msg.is_hidden;
                                    const isOwn = !isSystem && msg.sender !== 'client';
                                    return (
                                    <div key={msg.id} className="group relative">
                                        <div className={`w-fit min-w-[140px] max-w-[85%] md:max-w-[75%] rounded-2xl p-3 shadow-sm relative ${isOwn && !isSystem ? 'bg-blue-600 text-white rounded-tr-sm ml-auto' : isSystem ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-xs italic text-center border border-slate-200 dark:border-slate-700 mx-auto' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white rounded-tl-sm mr-auto'}`}>
                                            {editingMessageId === msg.id ? (
                                                <div className="flex flex-col gap-2">
                                                    <textarea 
                                                        value={editMessageText}
                                                        onChange={(e) => setEditMessageText(e.target.value)}
                                                        className="w-full text-sm text-slate-900 bg-white rounded p-1.5 border-none outline-none focus:ring-2 focus:ring-blue-400"
                                                        rows={2}
                                                    />
                                                    <div className="flex justify-end gap-2 mt-1">
                                                        <button onClick={() => setEditingMessageId(null)} className="text-[10px] uppercase font-bold text-blue-200 hover:text-white transition-colors">{t('common.cancel', 'Annuler')}</button>
                                                        <button onClick={() => handleEditMessage(msg.id)} className="text-[10px] uppercase font-bold bg-white text-blue-600 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">{t('common.save', 'Enregistrer')}</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2 mb-1 justify-between">
                                                        <span className={`text-xs font-medium flex items-center gap-1.5 ${isOwn ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                                            {msg.sender === 'client' ? (
                                                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 hidden md:flex items-center justify-center font-bold text-[10px] shrink-0">
                                                                    {(wo?.client_name || '?').charAt(0).toUpperCase()}
                                                                </span>
                                                            ) : msg.sender === 'admin' ? (
                                                                tenant?.favicon_url ? (
                                                                    <img src={getImageUrl(tenant.favicon_url)} alt={tenant?.name || "Company"} className="w-5 h-5 rounded-full object-contain bg-white p-[2px] shrink-0 hidden md:block" />
                                                                ) : (
                                                                    <span className="w-5 h-5 rounded-full bg-white text-blue-600 hidden md:flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm border border-slate-100">
                                                                        {(tenant?.name || 'DC').substring(0, 2).toUpperCase()}
                                                                    </span>
                                                                )
                                                            ) : null}
                                                            <span className="truncate max-w-[150px] md:max-w-[200px]">
                                                                {msg.sender === 'client' ? wo?.client_name : (msg.sender === 'admin' ? (wo?.client_language === 'nl' || wo?.client_language === 'en' ? 'Team Davide Chape' : 'Equipe Davide Chape') : t('admin.system', 'Sistem'))}
                                                            </span>
                                                        </span>
                                                        <span className={`text-[10px] ${isOwn ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${isOwn ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {msg.message}
                                                    </div>
                                                    
                                                            {msg.attachments && msg.attachments.length > 0 && (
                                                                <div className="mb-2 flex flex-col gap-2">
                                                                    {msg.attachments.map((att, idx) => {
                                                                        const isPdf = att.type === 'pdf' || (att.url && att.url.toLowerCase().endsWith('.pdf'));
                                                                        const isImage = att.type === 'image' || (att.url && att.url.match(/\.(jpeg|jpg|gif|png|webp)$/i));
                                                                        
                                                                        if (isImage || isPdf) {
                                                                            return (
                                                                                <button 
                                                                                    type="button"
                                                                                    key={idx} 
                                                                                    onClick={() => setPreviewAttachment({ ...att, isPdf, isImage })}
                                                                                    className={`flex flex-col text-left rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-blue-500 transition-all shadow-sm ${isImage || isPdf ? 'p-0 w-[200px] sm:w-[240px] bg-white dark:bg-slate-800' : 'p-2.5 bg-white dark:bg-slate-800'}`}
                                                                                >
                                                                                    {isImage ? (
                                                                                        <img src={getImageUrl(att.url)} alt="attachment" className="w-full object-cover" />
                                                                                    ) : isPdf ? (
                                                                                        <div className="flex flex-col w-full h-full">
                                                                                            <div className="w-full h-[140px] bg-white relative">
                                                                                                <PdfThumbnail url={getImageUrl(att.url)} className="w-full h-full" />
                                                                                            </div>
                                                                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 flex items-center gap-3 border-t border-slate-200 dark:border-slate-700/50">
                                                                                                <div className="bg-red-500 text-white rounded w-8 h-9 flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
                                                                                                    <span className="text-[10px] font-bold mt-1.5">PDF</span>
                                                                                                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-600 rounded-bl shadow-sm"></div>
                                                                                                </div>
                                                                                                <div className="flex flex-col flex-1 min-w-0">
                                                                                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{att.name || 'Document'}</span>
                                                                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Document PDF</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="flex items-center gap-2 p-2.5">
                                                                                            <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{att.name || 'Document'}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </button>
                                                                            )
                                                                        }
                                                                        return (
                                                                            <a key={idx} href={getImageUrl(att.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm w-fit">
                                                                                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{att.name || 'File'}</span>
                                                                            </a>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )}

                                                    {/* Translation Display */}
                                                    {msg.translations && Object.keys(msg.translations).length > 0 && (
                                                        (() => {
                                                            const displayLang = targetLang !== 'none' ? targetLang : (wo?.client_language || 'fr').toLowerCase();
                                                            const transText = msg.translations[displayLang] || msg.translations['fr'] || Object.values(msg.translations)[0] || '';
                                                            if (transText.includes('Error 500') || transText.includes('Eroare la traducere') || transText.includes("That's an error")) return null;
                                                            return (
                                                                <div className={`mt-2 pt-2 border-t text-xs italic ${isOwn ? 'border-blue-400 text-blue-100' : 'border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400'}`}>
                                                                    <span className="font-semibold block mb-0.5">🌐 Traducere:</span>
                                                                    {transText}
                                                                </div>
                                                            );
                                                        })()
                                                    )}
                                                </>
                                            )}
                                            
                                            {msg.sender !== 'system' && (
                                                <span className={`text-[10px] mt-1 block ${isOwn && !msg.is_hidden ? 'text-blue-200' : 'text-slate-400'}`}>
                                                    {msg.is_hidden && ` • ${t('admin.hidden_from_client', 'Masqué au client')}`}
                                                </span>
                                            )}
                                        
                                        {/* Render Emojis */}
                                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                            <div className={`absolute -bottom-3 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-white dark:bg-slate-800 rounded-full shadow-sm px-1.5 py-0.5 text-xs z-10 border border-slate-100 dark:border-slate-700`}>
                                                {Object.entries(msg.reactions).map(([emoji, users]) => (
                                                    <button 
                                                        key={emoji} 
                                                        onClick={() => handleToggleReaction(msg.id, emoji)}
                                                        className={`hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full px-1 ${users.includes('admin') ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                                        title={users.join(', ')}
                                                    >
                                                        {emoji} <span className="text-[10px] text-slate-500">{users.length > 1 ? users.length : ''}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Reaction Picker Popover */}
                                        {showEmojiPickerFor === msg.id && (
                                            <div className={`absolute -top-10 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1 z-20`}>
                                                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(em => (
                                                    <button 
                                                        key={em} 
                                                        onClick={() => handleToggleReaction(msg.id, em)}
                                                        className="hover:bg-slate-100 dark:hover:bg-slate-700 rounded p-1 text-base transition-transform hover:scale-110"
                                                    >
                                                        {em}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Hover actions */}
                                    <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : ''}`}>
                                        <button
                                            onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                                            className="p-1.5 rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                            title={t('admin.react', 'Réagir')}
                                        >
                                            <Smile className="w-3.5 h-3.5" />
                                        </button>
                                        
                                        {!isSystem && isOwn && msg.id !== 'initial-req' && msg.id !== 'reschedule-req' && (
                                            <>
                                                <button
                                                    onClick={() => handleToggleVisibility(msg.id)}
                                                    className="p-1.5 rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                    title={msg.is_hidden ? t('admin.show_to_client', 'Afișează la client') : t('admin.hide_from_client', 'Ascunde de la client')}
                                                >
                                                    {msg.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingMessageId(msg.id);
                                                        setEditMessageText(msg.message);
                                                    }}
                                                    className="p-1.5 rounded-full text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                    title={t('admin.edit_message', 'Éditer le message')}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                    title={t('admin.delete_message', 'Supprimer le message')}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                        {!isSystem && !isOwn && (
                                                <button
                                                onClick={() => handleMarkUnread(msg.id)}
                                                className="p-1.5 rounded-full text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                title={t('admin.mark_unread', 'Marquer comme non lu')}
                                            >
                                                <Mail className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    </div>
                                )})
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 shrink-0">
                            <form 
                                onSubmit={e => {
                                    e.preventDefault();
                                    handleSendMessage();
                                }} 
                                className="max-w-3xl mx-auto flex flex-col gap-2"
                            >
                                {selectedFiles.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                        {selectedFiles.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm text-xs border border-slate-200 dark:border-slate-700">
                                                <span className="truncate max-w-[150px] text-slate-700 dark:text-slate-300">{f.name}</span>
                                                <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full p-0.5">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2 w-full items-center">
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        ref={chatFileInputRef}
                                        accept="image/*,application/pdf"
                                        onChange={e => {
                                            if (e.target.files) {
                                                setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)])
                                            }
                                        }}
                                    />
                                    
                                    <button
                                        type="button"
                                        onClick={() => chatFileInputRef.current?.click()}
                                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                                        title="Adaugă atașament"
                                    >
                                        <Paperclip className="w-5 h-5" />
                                    </button>
                                    
                                    <input
                                        id="chat-input-field"
                                        type="text"
                                        value={chatMessage}
                                        onChange={e => setChatMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                        placeholder={t('admin.type_message', 'Tapez votre message...')}
                                        className="flex-1 min-w-[100px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 md:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                    />
                                    <select 
                                        value={targetLang}
                                        onChange={e => setTargetLang(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none"
                                        title="Limbă Traducere (la Client)"
                                    >
                                        <option value="none">Fără trad.</option>
                                        <option value="nl">NL (Vlaams/Dutch)</option>
                                        <option value="fr">FR</option>
                                        <option value="en">EN</option>
                                    </select>
                                    {targetLang !== 'none' && (
                                        <button
                                            type="button"
                                            disabled={isTranslating || !chatMessage.trim()}
                                            onClick={handleTranslatePreview}
                                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-600 dark:text-slate-300 rounded-xl px-3 py-2 flex items-center justify-center transition-colors shadow-sm"
                                            title="Previzualizare Traducere"
                                        >
                                            {isTranslating ? (
                                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <Globe className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}


                                    <button
                                        type="submit"
                                        disabled={(!chatMessage.trim() && selectedFiles.length === 0) || sendingMessage || isUploadingFiles}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 flex items-center justify-center transition-colors shadow-sm"
                                    >
                                        {sendingMessage || isUploadingFiles ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                {previewTranslation !== '' && targetLang !== 'none' && (
                                    <div className="flex gap-2 items-start bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                        <div className="text-[10px] text-blue-400 pt-2 flex-shrink-0 font-medium">
                                            <Globe className="w-3 h-3 inline mr-1" />
                                            TR:
                                        </div>
                                        <textarea 
                                            value={previewTranslation}
                                            onChange={e => setPreviewTranslation(e.target.value)}
                                            className="flex-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-slate-200 resize-none"
                                            rows={2}
                                        />
                                        <button type="button" onClick={() => setPreviewTranslation('')} className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </Section>

                </div>
            </div>

            {(wo.documents && wo.documents.length > 0) && (
                <div className="mb-5">
                    <Section icon={Paperclip} title={t('work_order_detail.documents.title', 'Documents & Fichiers')}>
                        <div className="mb-4">
                            <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-2">{t('work_order_detail.documents.attachments', 'Pièces jointes')}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {wo.documents.map((doc, idx) => {
                                const isImg = doc.content_type?.startsWith('image/');
                                const Icon = isImg ? ImageIcon : FileText;
                                return (
                                    <button
                                        key={doc.id || idx}
                                        onClick={() => {
                                            setPreviewDocIndex(idx);
                                        }}
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
                                                        {t('work_order_detail.documents.from_client', 'Du client')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {doc.file_size ? (doc.file_size / 1024).toFixed(0) + ' KB' : t('work_order_detail.documents.attachment', 'Pièce jointe')}
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
                    <Section icon={Calculator} title={t('work_order_detail.invoicing.title_calc', 'Calcul des Coûts')} className="h-full">
                        {wo.estimated_price && !isAuto && (
                            <div className="mb-4">
                                <Row label={t('work_order_detail.general_details.estimated_price', 'Prix Estimé')} value={`${parseFloat(wo.estimated_price).toFixed(2)} EUR`} />
                            </div>
                        )}

                        {isAuto ? (
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-0 border border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{t('work_order_detail.invoicing.calc', 'Calcul Chape')} <span className="text-slate-400 font-normal normal-case ml-1">({t('work_order_detail.calc_estimatif', 'estimatif')})</span></p>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={handleSyncPrices}
                                            disabled={syncingPrices}
                                            className="text-indigo-400 hover:text-indigo-600 transition-colors bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-md border border-indigo-200 dark:border-indigo-800 shadow-sm disabled:opacity-50"
                                            title={t('work_order_detail.sync_prices_title', 'Resynchroniser les prix avec les tarifs globaux actuels')}
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${syncingPrices ? 'animate-spin' : ''}`} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const allChapes = (wo.volumes || []).filter(v => /chape|[sșş]ap[aăâ]/i.test((v.label || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
                                                const allPurs = (wo.volumes || []).filter(v => /isolation\s*pur/i.test((v.label || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
                                                const allEps = (wo.volumes || []).filter(v => /isolation\s*eps/i.test((v.label || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));

                                                const chapes = allChapes.length > 0 ? allChapes.map((v, i) => ({
                                                    id: Date.now() + i,
                                                    surface: v.quantity || '',
                                                    thickness: v.thickness || '',
                                                    has_foil: v.has_foil || false,
                                                    has_mesh: v.has_mesh || false,
                                                    has_fiber: v.has_fiber || false,
                                                    has_duramint: v.has_duramint || false
                                                })) : [{ id: Date.now(), surface: surfaceForAuto || '', thickness: '', has_foil: false, has_mesh: false, has_fiber: false, has_duramint: false }];
                                                
                                                const pur_isolations = allPurs.length > 0 ? allPurs.map((v, i) => ({
                                                    id: Date.now() + 1000 + i,
                                                    surface: v.quantity || '',
                                                    thickness: v.thickness || '',
                                                    pur_aspiration: v.pur_aspiration || false,
                                                    pur_niveller: v.pur_niveller || false,
                                                    pur_poncage: v.pur_poncage || false,
                                                    pur_protection: v.pur_protection || false
                                                })) : [];
                                                
                                                const eps_isolations = allEps.length > 0 ? allEps.map((v, i) => ({
                                                    id: Date.now() + 2000 + i,
                                                    surface: v.eps_surface || v.quantity || '',
                                                    thickness: v.thickness || ''
                                                })) : [];

                                                setCalcEditForm({
                                                    client_type: wo.client_type || (wo.client ? wo.client.client_type : 'fizica'),
                                                    work_type: wo.work_type || 'new',
                                                    chapes,
                                                    pur_isolations,
                                                    eps_isolations,
                                                    base_price: wo.prices?.base ?? 12.5,
                                                    extra_price: wo.prices?.extra ?? 1.25,
                                                    foil_price: wo.prices?.foil ?? 1.2,
                                                    mesh_price: wo.prices?.mesh ?? 2.5,
                                                    fiber_price: wo.prices?.fiber ?? (surfaceForAuto <= 200 ? 2.5 : 2.0),
                                                    discount_pct: wo.prices?.discount_pct ?? 0,
                                                    custom_threshold: wo.prices?.custom_threshold !== undefined && wo.prices.custom_threshold !== null ? parseFloat(wo.prices.custom_threshold) : '',
                                                    custom_eps_price_flat: wo.prices?.custom_eps_price_flat !== undefined ? parseFloat(wo.prices.custom_eps_price_flat) : '',
                                                    custom_eps_price_per_m3: wo.prices?.custom_eps_price_per_m3 !== undefined ? parseFloat(wo.prices.custom_eps_price_per_m3) : '',
                                                    eps_tier1_flat: wo.prices?.eps_volume_thresholds?.[0]?.price_flat || 1495,
                                                    eps_tier2_m3: wo.prices?.eps_volume_thresholds?.[1]?.price_per_m3 || 160,
                                                    eps_tier3_m3: wo.prices?.eps_volume_thresholds?.[2]?.price_per_m3 || 155,
                                                    eps_tier4_m3: wo.prices?.eps_volume_thresholds?.[3]?.price_per_m3 || 150,
                                                    pur_base_price_3cm: parseFloat(wo.prices?.pur_base_price_3cm || 0),
                                                    pur_step_price_up_to_10cm: parseFloat(wo.prices?.pur_step_price_up_to_10cm || 0),
                                                    pur_extra_price_above_10cm: parseFloat(wo.prices?.pur_extra_price_above_10cm || 0),
                                                    pur_opt_aspiration: parseFloat(wo.prices?.pur_opt_aspiration || 0),
                                                    pur_opt_niveller: parseFloat(wo.prices?.pur_opt_niveller || 0),
                                                    pur_opt_poncage: parseFloat(wo.prices?.pur_opt_poncage || 0),
                                                    pur_opt_protection: parseFloat(wo.prices?.pur_opt_protection || 0),
                                                    pur_discount_pct: parseFloat(wo.prices?.pur_discount_pct || 0),
                                                    eps_discount_pct: parseFloat(wo.prices?.eps_discount_pct || 0)
                                                });
                                                setCalcEditTab('chape');
                                                setCalcEditOpen(true);
                                            }}
                                            className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 dark:bg-slate-800 p-1.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm"
                                            title={t('work_order_detail.edit', 'Modifier le calcul')}
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* ── Alert différence majeure ── */}
                                {bigDiff && hasRealData && (
                                    <div className="m-4 mb-0 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('work_order_detail.calc_diff_alert', 'Différence importante détectée')}</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">{t('work_order_detail.calc_diff_pct', 'Écart entre estimatif et réel')}: <b>{diffPct.toFixed(1)}%</b></p>
                                        </div>
                                    </div>
                                )}
                                <div className="p-4 space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                        <span className="font-medium">{t('work_order_detail.invoicing.base', 'Chape de base (≤5cm)')}</span>
                                        <span className="text-right tabular-nums">{surfaceForAuto} m² × {getPrice(wo.prices?.base, surfaceForAuto <= 200 ? pricingSettings?.base_price_sqm : pricingSettings?.base_price_sqm_large, 12.5).toFixed(2)} = <b>{autoBase.toFixed(2)}&nbsp;EUR</b></span>
                                    </div>
                                    {autoExtra > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                            <span className="font-medium">{t('work_order_detail.invoicing.extra', 'Épaisseur extra (>5cm)')} ({extraThickForAuto} cm)</span>
                                            <span className="text-right tabular-nums">{surfaceForAuto} m² × {extraThickForAuto} cm × {(autoExtra / (surfaceForAuto * extraThickForAuto)).toFixed(2)} = <b>{autoExtra.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {autoFoil > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                            <span className="font-medium">{t('work_order_detail.invoicing.foil', 'Feuille plastique')}</span>
                                            <span className="text-right tabular-nums">{surfaceForAuto} m² × {getPrice(wo.prices?.foil, pricingSettings?.plastic_foil_price_sqm, 1.2).toFixed(2)} = <b>{autoFoil.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {autoMesh > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                            <span className="font-medium">{t('work_order_detail.invoicing.mesh', 'Treillis métallique')}</span>
                                            <span className="text-right tabular-nums">{surfaceForAuto} m² × {getPrice(wo.prices?.mesh, pricingSettings?.metal_mesh_price_sqm, 2.5).toFixed(2)} = <b>{autoMesh.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {autoFiber > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                            <span className="font-medium">{t('work_order_detail.invoicing.fiber', 'Fibres / Duramint')}</span>
                                            <span className="text-right tabular-nums">
                                                {surfaceForAuto} m² × {(wo.prices?.fiber_large !== undefined ? (surfaceForAuto > parseFloat(wo.prices.fiber_threshold) ? parseFloat(wo.prices.fiber_large) : parseFloat(wo.prices.fiber)) : parseFloat(wo.prices?.fiber || 2.5)).toFixed(2)} = <b>{autoFiber.toFixed(2)}&nbsp;EUR</b>
                                            </span>
                                        </div>
                                    )}
                                    {estimCalc.isoPurBase > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <span className="font-medium">Isolation PUR ({isoPurThick} cm)</span>
                                            <span className="text-right tabular-nums">{isoPurSurface} m² = <b>{estimCalc.isoPurBase.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {purOpts.aspiration > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span className="font-medium">↳ Aspiration</span>
                                            <span className="text-right tabular-nums"><b>{purOpts.aspiration.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {purOpts.niveller > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span className="font-medium">↳ Nivellement au laser</span>
                                            <span className="text-right tabular-nums"><b>{purOpts.niveller.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {purOpts.poncage > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span className="font-medium">↳ Ponçage de la mousse</span>
                                            <span className="text-right tabular-nums"><b>{purOpts.poncage.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {purOpts.protection > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span className="font-medium">↳ Protection au-dessus 1M</span>
                                            <span className="text-right tabular-nums"><b>{purOpts.protection.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {estimCalc.purDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                                            <span className="font-medium">{t('work_order_detail.invoicing.discount_pur', 'Remise PUR')} ({estimCalc.purDiscountPct}%)</span>
                                            <span className="text-right tabular-nums">- <b>{estimCalc.purDiscount.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {estimCalc.isoEpsBase > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <span className="font-medium">Isolation EPS ({isoEpsM3.toFixed(2)} m³)</span>
                                            <span className="text-right tabular-nums"><b>{estimCalc.isoEpsBase.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {estimCalc.epsDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                                            <span className="font-medium">{t('work_order_detail.invoicing.discount_eps', 'Remise EPS')} ({estimCalc.epsDiscountPct}%)</span>
                                            <span className="text-right tabular-nums">- <b>{estimCalc.epsDiscount.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {estimCalc.threshold > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                                            <span className="font-medium">{t('work_order_detail.invoicing.threshold', 'Forfait')}</span>
                                            <span className="text-right tabular-nums">+ <b>{estimCalc.threshold.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {estimCalc.discount > 0 && (
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                                            <span className="font-medium">{t('work_order_detail.invoicing.discount_chape', 'Remise Chape')} ({estimCalc.discountPct}%)</span>
                                            <span className="text-right tabular-nums">- <b>{estimCalc.discount.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {estimCalc.truck_cost > 0 && (
                                        <div className={`flex justify-between font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 ${estimCalc.truck_cost > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                            <span className="font-medium">{t('work_order_detail.invoicing.transport', 'Transport')} ({Math.round(estimCalc.actualDistKm)} km)</span>
                                            <span className="text-right tabular-nums">{estimCalc.truck_cost > 0 ? `+ ` : ''}<b>{estimCalc.truck_cost.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {/* TVA Auto-calculated */}
                                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                                            <span>{t('work_order_detail.invoicing.net_htva', 'Total Net (HTVA)')}</span>
                                            <span className="tabular-nums">{autoNet.toFixed(2)}&nbsp;EUR</span>
                                        </div>
                                        
                                        {vatEnabled ? (
                                            <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium mt-1">
                                                <span>TVA ({vatType}%)</span>
                                                <span className="tabular-nums">{autoVat.toFixed(2)}&nbsp;EUR</span>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between text-slate-500 dark:text-slate-500 font-medium mt-1">
                                                <span>{t('quotes.tva_disabled', 'TVA non appliquée')}</span>
                                                <span className="tabular-nums">0.00&nbsp;EUR</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-3"></div>
                                    <div className="flex justify-between text-lg font-black text-slate-900 dark:text-white">
                                        <span>{t('work_order_detail.invoicing.gross', 'TOTAL À PAYER:')}</span>
                                        <span className="tabular-nums">{totalGross.toFixed(2)}&nbsp;EUR</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            !wo.estimated_price && <p className="text-sm text-slate-400 py-4">{t('work_order_detail.invoicing.no_calc', 'Aucun calcul disponible.')}</p>
                        )}

                        {/* ── Calcul RÉEL (date de la șeful de echipă) ── */}
                        {isAuto && hasRealData && realCalc && (
                            <div className="mt-4 bg-white dark:bg-slate-900 rounded-xl p-0 border border-slate-200 dark:border-slate-700">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{t('work_order_detail.invoicing.calc_real', 'Calcul Réel (chef de chantier)')}</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const realPrices = wo.prices?.invoice || wo.prices;
                                            setCalcRealEditForm({
                                                surface: realSurface || '',
                                                thickness: realThickness || '',
                                                has_foil: realChapeFlags?.has_foil || false,
                                                has_mesh: realChapeFlags?.has_mesh || false,
                                                has_fiber: realChapeFlags?.has_fiber || false,
                                                has_duramint: realChapeFlags?.has_duramint || false
                                            });
                                            setCalcRealEditOpen(true);
                                        }}
                                        className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 dark:bg-slate-800 p-1.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm"
                                        title={t('work_order_detail.edit_real', 'Modifier le calcul réel')}
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="p-4 space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                        <span className="font-medium">{t('work_order_detail.invoicing.base', 'Chape de base (≤5cm)')}</span>
                                        <span className="text-right tabular-nums">{realSurface} m² × {getPrice(wo.prices?.base, realSurface <= 200 ? pricingSettings?.base_price_sqm : pricingSettings?.base_price_sqm_large, 12.5).toFixed(2)} = <b>{realCalc.base.toFixed(2)}&nbsp;EUR</b></span>
                                    </div>
                                    {realCalc.extra > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                            <span className="font-medium">{t('work_order_detail.invoicing.extra', 'Épaisseur extra (>5cm)')} ({realCalc.extraThick} cm)</span>
                                            <span className="text-right tabular-nums">{realSurface} m² × {realCalc.extraThick} cm × {(realCalc.extra / (realSurface * realCalc.extraThick)).toFixed(2)} = <b>{realCalc.extra.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realCalc.foil > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                            <span className="font-medium">{t('work_order_detail.invoicing.foil', 'Feuille plastique')}</span>
                                            <span className="text-right tabular-nums">{realSurface} m² × {getPrice(wo.prices?.foil, pricingSettings?.plastic_foil_price_sqm, 1.2).toFixed(2)} = <b>{realCalc.foil.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realCalc.mesh > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                            <span className="font-medium">{t('work_order_detail.invoicing.mesh', 'Treillis métallique')}</span>
                                            <span className="text-right tabular-nums">{realSurface} m² × {getPrice(wo.prices?.mesh, pricingSettings?.metal_mesh_price_sqm, 2.5).toFixed(2)} = <b>{realCalc.mesh.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realCalc.fiber > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                            <span className="font-medium">{t('work_order_detail.invoicing.fiber', 'Fibres / Duramint')}</span>
                                            <span className="text-right tabular-nums">
                                                {realSurface} m² × {(wo.prices?.fiber_large !== undefined ? (realSurface > parseFloat(wo.prices.fiber_threshold) ? parseFloat(wo.prices.fiber_large) : parseFloat(wo.prices.fiber)) : parseFloat(wo.prices?.fiber || 2.5)).toFixed(2)} = <b>{realCalc.fiber.toFixed(2)}&nbsp;EUR</b>
                                            </span>
                                        </div>
                                    )}
                                    {realCalc.threshold > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                                            <span className="font-medium">{t('work_order_detail.invoicing.threshold', 'Forfait')}</span>
                                            <span className="text-right tabular-nums">+ <b>{realCalc.threshold.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realCalc.discount > 0 && (
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                                            <span className="font-medium">{t('work_order_detail.invoicing.discount', 'Remise (Discount)')} ({realCalc.discountPct}%)</span>
                                            <span className="text-right tabular-nums">- <b>{realCalc.discount.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-3" />
                                    <div className="flex justify-between text-base font-black text-slate-900 dark:text-white">
                                        <span>{t('work_order_detail.invoicing.gross', 'TOTAL RÉEL:')}</span>
                                        <span className="tabular-nums">{(realCalc.net + realCalc.net * vatRate).toFixed(2)}&nbsp;EUR</span>
                                    </div>
                                    {bigDiff && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-200 dark:border-slate-700">
                                            {t('work_order_detail.diff_vs_estim', 'Écart vs estimatif')}: {realCalc.net > autoNet ? '+' : ''}{(realCalc.net - autoNet).toFixed(2)} EUR ({diffPct.toFixed(1)}%)
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Section>
                </div>
                {/* ─── Facturare ──────────────────────────────────────────── */}
                <div className="flex flex-col h-full">
                    <Section icon={FileText} title={t('work_order_detail.invoicing.title', 'Facturation')} className="h-full">
                        {/* Status + Tabs + Badge — totul pe un singur rând */}
                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                            {/* Tabs DEVIS / FACTURE — schimbă preview, click pe PDF deschide full page */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex gap-1">
                                    <button
                                        onClick={() => setActiveDocTab('devis')}
                                        style={activeDocTab === 'devis' ? { backgroundColor: `#2563EB20`, color: '#2563EB', borderColor: `#2563EB40` } : {}}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${activeDocTab === 'devis' ? 'shadow-sm ring-1' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                    >
                                        DEVIS
                                    </button>
                                    {wo.is_invoiced && (
                                        <button
                                            onClick={() => setActiveDocTab('facture')}
                                            style={activeDocTab === 'facture' ? { backgroundColor: `#2563EB20`, color: '#2563EB', borderColor: `#2563EB40` } : {}}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${activeDocTab === 'facture' ? 'shadow-sm ring-1' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            FACTURE
                                        </button>
                                    )}
                                </div>
                            {/* Badge FACTURAT / NEFACTURAT */}
                            
                            {/* Buton Previzualizare Email */}
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await api.get(`/admin/work-orders/${id}/email-preview`);
                                        setEmailPreviewContent(res.data.html);
                                        setShowEmailPreview(true);
                                    } catch (err) {
                                        showToast(t('work_order_detail.email_prev_err', 'Erreur lors de la prévisualisation de l\'email.'), 'error');
                                    }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-[10px] sm:text-xs uppercase tracking-wider shadow-sm transition-colors shrink-0"
                            >
                                <Mail className="w-3.5 h-3.5" />
                                {t('work_order_detail.btn_preview_email', 'Trimite Email')}
                            </button>

                            <div className="ml-auto">
                                {wo.is_invoiced ? (
                                    <span className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                        {t('work_order_detail.invoicing.invoiced', 'Facturé')}
                                    </span>
                                ) : (
                                    <span className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 inline-block"></span>
                                        {t('work_order_detail.invoicing.not_invoiced', 'Non facturé')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Preview iframe — click pentru a activa scroll-ul în PDF */}
                        <div className={`relative w-full h-[700px] rounded-xl overflow-hidden border-2 transition-colors ${pdfScrollActive ? 'border-blue-400 shadow-lg shadow-blue-100' : 'border-slate-200'}`}
                            onBlur={() => setPdfScrollActive(false)}
                        >
                                {/* Overlay — vizibil când PDF-ul NU e activ: scroll-ul trece la pagină */}
                                {!pdfScrollActive && (
                                    <div
                                        className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors"
                                        onClick={() => setPdfScrollActive(true)}
                                        onWheel={(e) => { window.scrollBy(0, e.deltaY); }}
                                    >
                                        <span className="bg-slate-800/80 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg">
                                            Cliquez pour naviguer dans le PDF
                                        </span>
                                    </div>
                                )}
                                {/* Buton close scroll activ */}
                                {pdfScrollActive && (
                                    <button
                                        onClick={() => setPdfScrollActive(false)}
                                        className="absolute top-4 left-4 z-30 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 text-xs font-bold transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Quitter le mode PDF
                                    </button>
                                )}
                                {/* Floating expand button */}
                                <button
                                    onClick={() => setDocDrawerState({ url: activeDocTab === 'facture' ? `${window.location.origin}/proforma/${wo.id}?type=invoice` : `${window.location.origin}/admin/quotes/${wo.id}/pdf`, type: activeDocTab })}
                                    className="absolute top-4 right-4 z-30 bg-slate-800/80 hover:bg-slate-900 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-xs font-bold transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Ouvrir en plein écran
                                </button>
                                
                                <iframe
                                    src={activeDocTab === 'facture' ? `${window.location.origin}/proforma/${wo.id}?type=invoice&_t=${wo.updated_at || Date.now()}#bottom` : `${window.location.origin}/admin/quotes/${wo.id}/pdf?_t=${wo.updated_at || Date.now()}#bottom`}
                                    className="w-full h-full border-none"
                                    title={activeDocTab === 'facture' ? 'Facture PDF' : 'Devis PDF'}
                                    onLoad={(e) => {
                                        try {
                                            const doc = e.target.contentWindow.document;
                                            const scrollHeight = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
                                            e.target.contentWindow.scrollTo(0, scrollHeight);
                                        } catch(err) {}
                                    }}
                                />
                            </div>

                            {wo?.is_invoiced && activeDocTab === 'facture' && (
                                <div className="mt-3 flex justify-end">
                                    <button
                                        onClick={handleSendToBilltobox}
                                        disabled={wo?.billtobox_status === 'sent' || wo?.billtobox_status === 'pending'}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${wo?.billtobox_status === 'sent' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'}`}
                                    >
                                        {wo?.billtobox_status === 'pending' ? <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin" /> : (wo?.billtobox_status === 'sent' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />)}
                                        {wo?.billtobox_status === 'sent' ? t('invoicing.sent_to_billtobox', 'Envoyé à Billtobox') : t('invoicing.send_to_billtobox', 'Envoyer à Billtobox')}
                                    </button>
                                </div>
                            )}
                    </Section>
                </div>
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch mb-5">
                <div className="h-full">
                    <Section className="h-full" icon={({ className }) => <TruckSVG color={wo.team_color || '#2563eb'} className={className} />} title={t('work_order_detail.planning.title', "Planificare, Echipaj & Traseu")}>
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Left: Schedule + Crew */}
                            <div className="flex-shrink-0 md:w-44 space-y-2">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.planning.schedule', 'Orar Planificat')}</p>
                                    <div className="flex items-baseline gap-1 text-xs">
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{fmt(wo.start_date)}</span> {wo.start_time ? <span className="font-semibold text-slate-500"> {wo.start_time}</span> : ''}
                                    </div>
                                    <div className="mt-1.5 p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700/50">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                            <Navigation className="w-2.5 h-2.5" /> 
                                            Ora Reală Sosire (GPS)
                                        </p>
                                        <div className="text-xs font-bold">
                                            {loadingGpsArrival ? (
                                                <span className="text-slate-400 italic">Se verifică GPS...</span>
                                            ) : gpsArrival?.arrived ? (
                                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    {wo.start_date ? new Date(wo.start_date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}, {gpsArrival.arrived}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic">Nu există date GPS</span>
                                            )}
                                        </div>
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
                                                    <div className="absolute -left-[24px] top-1.5 w-2.5 h-2.5 rounded-full bg-fuchsia-500 ring-2 ring-white dark:ring-slate-800 shadow-sm"></div>
                                                    <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg px-2 py-1 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-1 min-w-0">
                                                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-tight min-w-0 flex-1">
                                                            <span className="block truncate">{seg.from}</span>
                                                            <span className="text-slate-400">→ </span>
                                                            <span className="block truncate">{seg.to}</span>
                                                        </p>
                                                        <span className="text-[9px] font-black text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-100 dark:bg-fuchsia-900/30 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">{seg.km} km</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.planning.total_dist', 'Distance Totale (Aller-Retour)')}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-slate-900 dark:text-white">{((wo.route_segments || []).reduce((sum, seg) => sum + (parseFloat(seg.km) || 0), 0)).toFixed(1)} km</span>
                                                {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                                                    <button 
                                                        onClick={handleRecalculateRoute}
                                                        disabled={isRecalculatingRoute}
                                                        title={t('work_order_detail.recalculate', 'Recalculer l\'itinéraire')}
                                                        className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-blue-500 transition-colors ${isRecalculatingRoute ? 'opacity-50 animate-spin' : ''}`}
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                        <span className="text-xs text-slate-400 font-medium mb-2">{t('work_order_detail.planning.no_route', 'Aucun itinéraire enregistré')}</span>
                                        {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                                            <button 
                                                onClick={handleRecalculateRoute}
                                                disabled={isRecalculatingRoute}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 transition-colors ${isRecalculatingRoute ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <RefreshCw className={`w-3 h-3 ${isRecalculatingRoute ? 'animate-spin' : ''}`} />
                                                {t('work_order_detail.recalculate', 'Recalculer l\'itinéraire')}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Section>
                </div>
                <div className="h-full flex flex-col">
                    {(() => {
                        const hasConsumed = (wo.materials_consumed || []).filter(m => m.name).length > 0 || wo.actual_surface_m2 || wo.actual_sand_quantity;
                        const sectionTitle = t('work_order_detail.team_leader_details.title', 'Équipe Davide (Confirmations & Quantités)');
                        
                        let selectedMats = [];
                        if (wo.volumes && wo.volumes.length > 0) {
                            wo.volumes.forEach(v => {
                                if (v.has_foil) selectedMats.push(t('materials.foil', 'Film'));
                                if (v.has_mesh) selectedMats.push(t('materials.mesh', 'Treillis métallique'));
                                if (v.has_duramint || v.has_fiber) selectedMats.push(t('materials.fiber', 'Fibre'));
                                if (v.has_sound_insulation) selectedMats.push(t('materials.sound_insulation', 'Isolation acoustique'));
                                if (v.has_floor_heating_add) selectedMats.push(t('materials.floor_heating_add', 'Additif pour chauffage'));
                            });
                        }
                        selectedMats = [...new Set(selectedMats)];
                        
                        return (
                            <Section className="flex-1" icon={Wrench} title={sectionTitle} contentClassName="!p-3">
                                            <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-2">{t('work_order_detail.general_details.team_leader_short', 'Chef Équipe')}</p>
                                                {wo.team_leader_confirmed_at ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">{t('work_order_detail.status.confirmed', 'Confirmé')}</span>
                                                        </div>
                                                        <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold pl-5">{fmtFull(wo.team_leader_confirmed_at)}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5">
                                                        <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                                                        <span className="text-xs font-semibold text-slate-400">{t('work_order_detail.status.awaiting_confirmation', 'En attente de confirmation')}</span>
                                                    </div>
                                                )}
                                                {wo.team_leader_confirmation_note && (
                                                    <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl mt-2">
                                                        <p className="text-[10px] whitespace-nowrap font-bold text-slate-500 uppercase tracking-wider mb-1">{t('common.note', 'Note')}</p>
                                                        <p className="text-xs text-slate-700 dark:text-slate-300">{wo.team_leader_confirmation_note}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center flex-wrap gap-2">
                                                        <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                            <p className="text-[10px] whitespace-nowrap font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials_volumes.planned', 'Planifié / Estimé')}</p>
                                                        </div>
                                                        {(wo.volumes || []).length > 0 && (
                                                            <>
                                                                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                                                                <p className="text-[10px] whitespace-nowrap font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials_volumes.works_volumes', 'Travaux / Volumes')}</p>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    {wo.volumes.map((v, i) => (
                                                                        <div key={i} className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{translateDynamicLabel(v.label)}</span>
                                                                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{v.quantity} {v.unit}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                        {(wo.materials?.length > 0 || selectedMats.length > 0 || autoSandKg > 0) && (
                                                            <>
                                                                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                                                                <p className="text-[10px] whitespace-nowrap font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials.required', 'Matériaux Requis')}</p>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    {(wo.materials || []).map((m, i) => (
                                                                        <div key={`m-${i}`} className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{translateDynamicLabel(m.name)}</span>
                                                                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{m.quantity} {m.unit}</span>
                                                                        </div>
                                                                    ))}
                                                                    {selectedMats.map((mat, i) => (
                                                                        <div key={`sel-${i}`} className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{mat}</span>
                                                                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">✓</span>
                                                                        </div>
                                                                    ))}
                                                                    {autoSandKg > 0 && (
                                                                        <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-lg">
                                                                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{t('work_order_detail.kpi.sand_est', 'Sable (estimé)')}</span>
                                                                            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-200">{(autoSandKg/1000).toFixed(1)} t</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                            {!(wo.volumes?.length) && !(wo.materials?.length) && selectedMats.length === 0 && autoSandKg === 0 && (
                                                <p className="text-sm text-slate-400 text-center py-4">{t('work_order_detail.materials.no_quantity', 'Aucune quantité enregistrée')}</p>
                                            )}
                                        
                                                </div>
                                                {hasConsumed ? (
                                                    <>
                                                        <div className="w-full h-px bg-slate-100 dark:bg-slate-700/50 my-1"></div>
                                                        <div className="flex items-center flex-wrap gap-2 pt-1">
                                                            <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                <p className="text-[10px] whitespace-nowrap font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials_volumes.consumed', 'RÉELLEMENT CONSOMMÉ')}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {wo.actual_surface_m2 && (
                                                                    <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{t('work_order_detail.materials_volumes.confirmed_surface', 'Surface confirmée')}</span>
                                                                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{wo.actual_surface_m2} m²</span>
                                                                    </div>
                                                                )}
                                                                
                                                                {wo.actual_thickness_cm && (
                                                                    <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{t('work_order_detail.materials_volumes.confirmed_thickness', 'Épaisseur confirmée')}</span>
                                                                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{(Math.round(parseFloat(wo.actual_thickness_cm) * 2) / 2).toFixed(1)} cm</span>
                                                                    </div>
                                                                )}
                                                                
                                                                {wo.actual_sand_quantity && (
                                                                    <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{t('work_order_detail.materials_volumes.confirmed_sand', 'Sable')}</span>
                                                                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{wo.actual_sand_quantity} kg</span>
                                                                    </div>
                                                                )}

                                                                {(wo.materials_consumed || []).filter(m => m.name).map((m, i) => (
                                                                    <div key={i} className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{m.name} {m.note && `(${m.note})`}</span>
                                                                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{m.quantity} {m.unit}</span>
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




{/* ── Fotografii ──────────────────────────────────────────────────── */}
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
            <Section 
                icon={Camera} 
                title={`${t('work_order_detail.photos.title', 'Photos')} (${photos.length})`}
                headerRight={
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold transition-colors"
                    >
                        {isUploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                        {t('common.add_photo', 'Ajouter une Photo')}
                    </button>
                }
            >
                {photos.length > 0 ? (
                    <div className="space-y-6">
                        {/* Poze Calculator Masina (OCR) */}
                        {photos.filter(p => p.photo_type === 'machine_computer').length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Camera className="w-4 h-4" /> {t('work_order_detail.photos.ai_verification', 'Vérification IA (Écrans Bremat)')}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {photos.filter(p => p.photo_type === 'machine_computer').map((p, i) => {
                                        const rawSrc = p.url || p.file_url || p.path || '';
                                        const src = rawSrc.startsWith('http') ? rawSrc : `${API_BASE}${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`;
                                        const fallbackSrc = `https://cmr.up.railway.app${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`;
                                        return (
                                            <div key={`mc-${i}`}
                                                className="relative aspect-square rounded-xl overflow-hidden border-2 border-indigo-400 cursor-zoom-in hover:shadow-lg transition-all"
                                                onClick={() => {
                                                    const idx = photos.findIndex(px => px.id === p.id || px === p);
                                                    setLightbox(idx >= 0 ? idx : 0);
                                                }}>
                                                <img src={src} onError={(e) => { if (e.target.src !== fallbackSrc) e.target.src = fallbackSrc; }} alt="Ecran Masina" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                                <div className="absolute bottom-0 left-0 right-0 bg-indigo-900/80 backdrop-blur-sm p-1.5 text-center">
                                                    <span className="text-white text-[10px] font-bold">{t('work_order_detail.photos.machine_screen', 'ÉCRAN MACHINE')}</span>
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
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('work_order_detail.photos.completion_photos', 'Photos de Finalisation (Client)')}</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {photos.filter(p => p.photo_type === 'completion').map((p, i) => {
                                        const rawSrc = p.url || p.file_url || p.path || '';
                                        const src = rawSrc.startsWith('http') ? rawSrc : `${API_BASE}${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`;
                                        const fallbackSrc = `https://cmr.up.railway.app${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`;
                                        return (
                                            <div key={`comp-${i}`}
                                                className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-zoom-in hover:border-blue-400 hover:shadow-md transition-all"
                                                onClick={() => {
                                                    const idx = photos.findIndex(px => px.id === p.id || px === p);
                                                    setLightbox(idx >= 0 ? idx : 0);
                                                }}>
                                                <img src={src} onError={(e) => { if (e.target.src !== fallbackSrc) e.target.src = fallbackSrc; }} alt={`Finalizare ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                                <span className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-xl shadow-sm">
                                                    {t('work_order_detail.photos.final', 'FINAL')}
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
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('work_order_detail.photos.other_photos', 'Autres Photos (Internes)')}</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {photos.filter(p => p.photo_type !== 'machine_computer' && p.photo_type !== 'completion').map((p, i) => {
                                        const rawSrc = p.url || p.file_url || p.path || '';
                                        const src = rawSrc.startsWith('http') ? rawSrc : `${API_BASE}${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`;
                                        const fallbackSrc = `https://cmr.up.railway.app${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`;
                                        return (
                                            <div key={`alt-${i}`}
                                                className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-zoom-in hover:shadow-md transition-all"
                                                onClick={() => {
                                                    const idx = photos.findIndex(px => px.id === p.id || px === p);
                                                    setLightbox(idx >= 0 ? idx : 0);
                                                }}>
                                                <img src={src} onError={(e) => { if (e.target.src !== fallbackSrc) e.target.src = fallbackSrc; }} alt={`Interna ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-bold rounded uppercase">
                                                    {p.photo_type || t('work_order_detail.photos.internal', 'interne')}
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
                        <p className="text-sm text-slate-400">{t('work_order_detail.photos.no_photos', 'Aucune photo associée.')}</p>
                    </div>
                )}
            </Section>

            {/* ── Modal Editare Calcul (focalizat) ─────────────────────────── */}
            {calcEditOpen && calcEditForm && createPortal(
                <div className="fixed inset-0 bg-black/60 z-[99998] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setCalcEditOpen(false); }}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/20">
                            <div className="flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-indigo-600" />
                                <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-wide uppercase">Éditer le Calcul</h3>
                            </div>
                            <button onClick={() => setCalcEditOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Tabs Container */}
                        <div className="flex px-5 border-b border-slate-200 dark:border-slate-700 pt-2 shrink-0 bg-white dark:bg-slate-900 sticky top-0 z-10">
                            <button
                                onClick={() => setCalcEditTab('chape')}
                                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors uppercase tracking-wider ${calcEditTab === 'chape' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Chape
                            </button>
                            {(isoPurSurface > 0 || isoEpsM3 > 0) && (
                                <button
                                    onClick={() => setCalcEditTab('isolation')}
                                    className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors uppercase tracking-wider ${calcEditTab === 'isolation' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    Isolation
                                </button>
                            )}
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 relative">
                            
                            {/* TAB: CHAPE */}
                            {calcEditTab === 'chape' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('work_order_detail.project_info.client_type', 'Type de Client')}</label>
                                            <select
                                                value={calcEditForm.client_type}
                                                onChange={e => setCalcEditForm(f => ({ ...f, client_type: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="fizica">{t('quotes.pf', 'Particulier')}</option>
                                                <option value="juridica">{t('quotes.pj', 'Entreprise')}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('work_order_detail.project_info.construction_type', 'Type de Construction')}</label>
                                            <select
                                                value={calcEditForm.work_type}
                                                onChange={e => setCalcEditForm(f => ({ ...f, work_type: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="new">{t('quotes.construction_new', 'Nouvelle Construction')}</option>
                                                <option value="repair">{t('quotes.construction_renovation', 'Rénovation')}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {(calcEditForm.chapes || []).map((chape, idx) => (
                                            <div key={chape.id} className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl relative">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase">Chape {idx + 1}</h4>
                                                    {calcEditForm.chapes.length > 1 && (
                                                        <button 
                                                            onClick={() => setCalcEditForm(f => ({ ...f, chapes: f.chapes.filter((_, i) => i !== idx) }))}
                                                            className="text-red-500 hover:text-red-600 transition-colors"
                                                            title={t('common.delete', 'Supprimer')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('work_order_detail.calc_edit.surface', 'Surface (m²)')} *</label>
                                                        <input
                                                            type="number" min="0" step="0.5"
                                                            value={chape.surface}
                                                            onChange={e => {
                                                                const newChapes = [...calcEditForm.chapes];
                                                                newChapes[idx].surface = e.target.value;
                                                                setCalcEditForm({ ...calcEditForm, chapes: newChapes });
                                                            }}
                                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            placeholder="ex: 130"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('work_order_detail.calc_edit.thickness', 'Épaisseur (cm)')}</label>
                                                        <input
                                                            type="number" min="0" step="0.5"
                                                            value={chape.thickness}
                                                            onChange={e => {
                                                                const newChapes = [...calcEditForm.chapes];
                                                                newChapes[idx].thickness = e.target.value;
                                                                setCalcEditForm({ ...calcEditForm, chapes: newChapes });
                                                            }}
                                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            placeholder="ex: 10"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('work_order_detail.calc_edit.options', 'Options incluses')}</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        {[
                                                            { key: 'has_foil',     label: t('work_order_detail.calc_edit.foil',     'Feuille') },
                                                            { key: 'has_mesh',     label: t('work_order_detail.calc_edit.mesh',     'Treillis') },
                                                            { key: 'has_fiber',    label: t('work_order_detail.calc_edit.fiber',    'Fibres') },
                                                            { key: 'has_duramint', label: t('work_order_detail.calc_edit.duramint', 'Duramint') },
                                                        ].map(({ key, label }) => (
                                                            <label key={key} className="flex items-center gap-2 cursor-pointer group p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!chape[key]}
                                                                    onChange={e => {
                                                                        const newChapes = [...calcEditForm.chapes];
                                                                        newChapes[idx][key] = e.target.checked;
                                                                        setCalcEditForm({ ...calcEditForm, chapes: newChapes });
                                                                    }}
                                                                    className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">{label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={() => setCalcEditForm(f => ({ ...f, chapes: [...(f.chapes || []), { id: Date.now(), surface: '', thickness: '', has_foil: false, has_mesh: false, has_fiber: false, has_duramint: false }] }))}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-bold text-xs transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Ajouter une surface Chape
                                        </button>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{t('work_order_detail.calc_edit.prices', 'Grille de Tarifs Personnalisée')} (Chape)</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {[
                                                { key: 'base_price', label: t('work_order_detail.calc_edit.base_price', 'Base /m²') },
                                                { key: 'extra_price', label: t('work_order_detail.calc_edit.extra_price', 'Extra /m²/cm') },
                                                { key: 'foil_price', label: t('work_order_detail.calc_edit.foil_price', 'Feuille /m²') },
                                                { key: 'mesh_price', label: t('work_order_detail.calc_edit.mesh_price', 'Treillis /m²') },
                                                { key: 'fiber_price', label: t('work_order_detail.calc_edit.fiber_price', 'Fibres /m²') },
                                                { key: 'custom_threshold', label: t('work_order_detail.invoicing.threshold', 'Forfait') },
                                                { key: 'discount_pct', label: t('work_order_detail.calc_edit.discount_chape', 'Remise Chape (%)') }
                                            ].map(({ key, label }) => (
                                                <div key={key}>
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">{label}</label>
                                                    <input
                                                        type="number" min="0" step="0.01"
                                                        value={calcEditForm[key]}
                                                        onChange={e => setCalcEditForm(f => ({ ...f, [key]: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        placeholder={key === 'custom_threshold' ? 'Auto' : ''}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: ISOLATION */}
                            {calcEditTab === 'isolation' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                    {((calcEditForm.pur_isolations || []).length > 0 || isoPurSurface > 0) && (
                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Isolation PUR</p>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setCalcEditForm(f => ({ ...f, pur_isolations: [...(f.pur_isolations || []), { id: Date.now(), surface: '', thickness: '', pur_aspiration: false, pur_niveller: false, pur_poncage: false, pur_protection: false }] }))}
                                                    className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-md text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" /> Ajouter
                                                </button>
                                            </div>
                                            
                                            <div className="space-y-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                                                {(calcEditForm.pur_isolations || []).map((pur, idx) => (
                                                    <div key={pur.id} className="relative p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                        {calcEditForm.pur_isolations.length > 1 && (
                                                            <button 
                                                                onClick={() => setCalcEditForm(f => ({ ...f, pur_isolations: f.pur_isolations.filter((_, i) => i !== idx) }))}
                                                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                                                                title={t('common.delete', 'Supprimer')}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Surface PUR (m²) {idx + 1}</label>
                                                                <input
                                                                    type="number" min="0" step="0.5"
                                                                    value={pur.surface}
                                                                    onChange={e => {
                                                                        const newPurs = [...calcEditForm.pur_isolations];
                                                                        newPurs[idx].surface = e.target.value;
                                                                        setCalcEditForm({ ...calcEditForm, pur_isolations: newPurs });
                                                                    }}
                                                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    placeholder="ex: 130"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Épaisseur PUR (cm)</label>
                                                                <input
                                                                    type="number" min="0" step="0.5"
                                                                    value={pur.thickness}
                                                                    onChange={e => {
                                                                        const newPurs = [...calcEditForm.pur_isolations];
                                                                        newPurs[idx].thickness = e.target.value;
                                                                        setCalcEditForm({ ...calcEditForm, pur_isolations: newPurs });
                                                                    }}
                                                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    placeholder="ex: 10"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="mt-3">
                                                            <div className="flex flex-wrap gap-2">
                                                                {[
                                                                    { key: 'pur_aspiration', label: 'Aspiration' },
                                                                    { key: 'pur_niveller', label: 'Niveller' },
                                                                    { key: 'pur_poncage', label: 'Ponçage' },
                                                                    { key: 'pur_protection', label: 'Protection' }
                                                                ].map(({ key, label }) => (
                                                                    <label key={key} className="flex items-center gap-1.5 cursor-pointer group p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={!!pur[key]}
                                                                            onChange={e => {
                                                                                const newPurs = [...calcEditForm.pur_isolations];
                                                                                newPurs[idx][key] = e.target.checked;
                                                                                setCalcEditForm({ ...calcEditForm, pur_isolations: newPurs });
                                                                            }}
                                                                            className="w-3 h-3 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                                        />
                                                                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">{label}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tarifs & Remises PUR</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {[
                                                    { key: 'pur_base_price_3cm', label: 'Base 3cm /m²' },
                                                    { key: 'pur_step_price_up_to_10cm', label: 'Extra <10cm /cm' },
                                                    { key: 'pur_extra_price_above_10cm', label: 'Extra >10cm /cm' },
                                                    { key: 'pur_opt_aspiration', label: 'Aspiration' },
                                                    { key: 'pur_opt_niveller', label: 'Niveller' },
                                                    { key: 'pur_opt_poncage', label: 'Ponçage' },
                                                    { key: 'pur_opt_protection', label: 'Protection' },
                                                    { key: 'pur_discount_pct', label: 'Remise PUR (%)' }
                                                ].map(({ key, label }) => (
                                                    <div key={key}>
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">{label}</label>
                                                        <input
                                                            type="number" min="0" step="0.01"
                                                            value={calcEditForm[key]}
                                                            onChange={e => setCalcEditForm(f => ({ ...f, [key]: e.target.value }))}
                                                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {isoEpsM3 > 0 && (
                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-4">
                                            <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">Isolation EPS</p>
                                            
                                            <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Surface EPS (m²)</label>
                                                    <input
                                                        type="number" min="0" step="0.5"
                                                        value={calcEditForm.iso_eps_surface || ''}
                                                        onChange={e => {
                                                            const s = parseFloat(e.target.value) || 0;
                                                            const t = parseFloat(calcEditForm.iso_eps_thickness) || 0;
                                                            setCalcEditForm(f => ({ ...f, iso_eps_surface: e.target.value, iso_eps_m3: (s * t / 100).toFixed(2) }))
                                                        }}
                                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        placeholder="ex: 130"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Épaisseur EPS (cm)</label>
                                                    <input
                                                        type="number" min="0" step="0.5"
                                                        value={calcEditForm.iso_eps_thickness || ''}
                                                        onChange={e => {
                                                            const t = parseFloat(e.target.value) || 0;
                                                            const s = parseFloat(calcEditForm.iso_eps_surface) || 0;
                                                            setCalcEditForm(f => ({ ...f, iso_eps_thickness: e.target.value, iso_eps_m3: (s * t / 100).toFixed(2) }))
                                                        }}
                                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        placeholder="ex: 10"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Volume EPS (m³)</label>
                                                    <input
                                                        type="number" min="0" step="0.1"
                                                        value={calcEditForm.iso_eps_m3}
                                                        onChange={e => setCalcEditForm(f => ({ ...f, iso_eps_m3: e.target.value }))}
                                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        placeholder="ex: 12.5"
                                                    />
                                                </div>
                                            </div>

                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tarifs & Remises EPS</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                                                {[
                                                    { key: 'eps_tier1_flat', label: 'Forfait <10m³' },
                                                    { key: 'eps_tier2_m3', label: 'Tarif <20m³ /m³' },
                                                    { key: 'eps_tier3_m3', label: 'Tarif <40m³ /m³' },
                                                    { key: 'eps_tier4_m3', label: 'Tarif >40m³ /m³' }
                                                ].map(({ key, label }) => (
                                                    <div key={key}>
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">{label}</label>
                                                        <input
                                                            type="number" min="0" step="0.01"
                                                            value={calcEditForm[key]}
                                                            onChange={e => setCalcEditForm(f => ({ ...f, [key]: e.target.value }))}
                                                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Remplissez ci-dessous UNIQUEMENT pour forcer un prix unique ignorant la grille.</p>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">Prix Fixe (Forfait)</label>
                                                    <input
                                                        type="number" min="0" step="0.01"
                                                        value={calcEditForm.custom_eps_price_flat}
                                                        onChange={e => setCalcEditForm(f => ({ ...f, custom_eps_price_flat: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        placeholder="Laisser vide"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">Ou Tarif / m³</label>
                                                    <input
                                                        type="number" min="0" step="0.01"
                                                        value={calcEditForm.custom_eps_price_per_m3}
                                                        onChange={e => setCalcEditForm(f => ({ ...f, custom_eps_price_per_m3: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        placeholder="Laisser vide"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">Remise EPS (%)</label>
                                                    <input
                                                        type="number" min="0" step="0.01"
                                                        value={calcEditForm.eps_discount_pct}
                                                        onChange={e => setCalcEditForm(f => ({ ...f, eps_discount_pct: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-5 pb-4">
                            {parseFloat(calcEditForm.surface) > 0 && (() => {
                                const livePrices = {
                                    ...wo.prices,
                                    base: parseFloat(calcEditForm.base_price) || 0,
                                    extra: parseFloat(calcEditForm.extra_price) || 0,
                                    foil: parseFloat(calcEditForm.foil_price) || 0,
                                    mesh: parseFloat(calcEditForm.mesh_price) || 0,
                                    fiber: parseFloat(calcEditForm.fiber_price) || 0,
                                    discount_pct: parseFloat(calcEditForm.discount_pct) || 0,
                                    
                                    // PUR
                                    pur_base_price_3cm: parseFloat(calcEditForm.pur_base_price_3cm) || 0,
                                    pur_step_price_up_to_10cm: parseFloat(calcEditForm.pur_step_price_up_to_10cm) || 0,
                                    pur_extra_price_above_10cm: parseFloat(calcEditForm.pur_extra_price_above_10cm) || 0,
                                    pur_opt_aspiration: parseFloat(calcEditForm.pur_opt_aspiration) || 0,
                                    pur_opt_niveller: parseFloat(calcEditForm.pur_opt_niveller) || 0,
                                    pur_opt_poncage: parseFloat(calcEditForm.pur_opt_poncage) || 0,
                                    pur_opt_protection: parseFloat(calcEditForm.pur_opt_protection) || 0,
                                    pur_discount_pct: parseFloat(calcEditForm.pur_discount_pct) || 0,
                                    eps_discount_pct: parseFloat(calcEditForm.eps_discount_pct) || 0,
                                };
                                
                                if (calcEditForm.custom_eps_price_flat !== '') {
                                    livePrices.custom_eps_price_flat = parseFloat(calcEditForm.custom_eps_price_flat);
                                } else {
                                    delete livePrices.custom_eps_price_flat;
                                }
                                if (calcEditForm.custom_eps_price_per_m3 !== '') {
                                    livePrices.custom_eps_price_per_m3 = parseFloat(calcEditForm.custom_eps_price_per_m3);
                                } else {
                                    delete livePrices.custom_eps_price_per_m3;
                                }

                                const liveEpsTiers = [
                                    { max_m3: 10, price_flat: parseFloat(calcEditForm.eps_tier1_flat) || 1495, price_per_m3: null },
                                    { max_m3: 20, price_flat: null, price_per_m3: parseFloat(calcEditForm.eps_tier2_m3) || 160 },
                                    { max_m3: 40, price_flat: null, price_per_m3: parseFloat(calcEditForm.eps_tier3_m3) || 155 },
                                    { max_m3: 99999, price_flat: null, price_per_m3: parseFloat(calcEditForm.eps_tier4_m3) || 150 }
                                ];
                                livePrices.eps_volume_thresholds = liveEpsTiers;

                                const liveFlags = {
                                    has_foil: !!calcEditForm.has_foil,
                                    has_mesh: !!calcEditForm.has_mesh,
                                    has_fiber: !!calcEditForm.has_fiber,
                                    has_duramint: !!calcEditForm.has_duramint
                                };
                                const liveChapeCalc = computeChapeTotal(
                                    parseFloat(calcEditForm.surface) || 0,
                                    parseFloat(calcEditForm.thickness) || 0,
                                    liveFlags,
                                    livePrices
                                );
                                
                                let liveNet = liveChapeCalc.net;
                                let liveChape = liveNet - liveChapeCalc.threshold;
                                let liveThreshold = liveChapeCalc.threshold;
                                let livePurMath = '';
                                let liveEpsMath = '';
                                let livePur = 0;
                                let liveEps = 0;

                                // Add PUR
                                if (parseFloat(calcEditForm.iso_pur_surface) > 0) {
                                    const formPurSurface = parseFloat(calcEditForm.iso_pur_surface);
                                    const formPurThick = parseFloat(calcEditForm.iso_pur_thickness) || 0;
                                    let purBase = livePrices.pur_base_price_3cm || 0;
                                    if (formPurThick > 3 && formPurThick <= 10) {
                                        purBase += (formPurThick - 3) * (livePrices.pur_step_price_up_to_10cm || 0);
                                    } else if (formPurThick > 10) {
                                        purBase += 7 * (livePrices.pur_step_price_up_to_10cm || 0);
                                        purBase += (formPurThick - 10) * (livePrices.pur_extra_price_above_10cm || 0);
                                    }
                                    if (formPurSurface > 100) {
                                        purBase += Math.floor((formPurSurface - 100) / 100) * (wo.prices?.pur_surface_discount_step || -0.50);
                                    }
                                    purBase = Math.max(0, purBase);
                                    
                                    let thisPurTotal = purBase * formPurSurface;
                                    livePurMath = `${formPurSurface} m² x ${purBase.toFixed(2)}€`;

                                    (wo.volumes || []).forEach(vol => {
                                        const labelSafe = (vol.label || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                        if (/isolation\s*pur/i.test(labelSafe) && parseFloat(vol.quantity) > 0) {
                                            const surface = parseFloat(vol.quantity);
                                            if (vol.pur_aspiration) thisPurTotal += (livePrices.pur_opt_aspiration || 0) * surface;
                                            if (vol.pur_niveller) thisPurTotal += (livePrices.pur_opt_niveller || 0) * surface;
                                            if (vol.pur_poncage) thisPurTotal += (livePrices.pur_opt_poncage || 0) * surface;
                                            if (vol.pur_protection) thisPurTotal += (livePrices.pur_opt_protection || 0) * surface;
                                        }
                                    });
                                    
                                    let netPur = thisPurTotal * (1 - (livePrices.pur_discount_pct || 0) / 100);
                                    liveNet += netPur;
                                    livePur = netPur;
                                    if (livePrices.pur_discount_pct > 0) livePurMath += ` (-${livePrices.pur_discount_pct}%)`;
                                }

                                // Add EPS
                                if (parseFloat(calcEditForm.iso_eps_m3) > 0) {
                                    let epsPrice = 0;
                                    let formEpsVol = parseFloat(calcEditForm.iso_eps_m3);
                                    if (livePrices.custom_eps_price_flat !== undefined && !isNaN(livePrices.custom_eps_price_flat)) {
                                        epsPrice = livePrices.custom_eps_price_flat;
                                        liveEpsMath = `Forfait = ${epsPrice.toFixed(2)}€`;
                                    } else if (livePrices.custom_eps_price_per_m3 !== undefined && !isNaN(livePrices.custom_eps_price_per_m3)) {
                                        epsPrice = formEpsVol * livePrices.custom_eps_price_per_m3;
                                        liveEpsMath = `${formEpsVol.toFixed(2)} m³ x ${livePrices.custom_eps_price_per_m3}€ = ${epsPrice.toFixed(2)}€`;
                                    } else {
                                        const epsTiers = livePrices.eps_volume_thresholds || [
                                            { max_m3: 10, price_flat: 1495 },
                                            { max_m3: 20, price_per_m3: 160 },
                                            { max_m3: 40, price_per_m3: 155 },
                                            { max_m3: 99999, price_per_m3: 150 }
                                        ];
                                        for (let tier of epsTiers) {
                                            if (formEpsVol <= parseFloat(tier.max_m3 || 99999)) {
                                                if (tier.price_flat) {
                                                    epsPrice = parseFloat(tier.price_flat);
                                                    liveEpsMath = `Forfait auto = ${epsPrice.toFixed(2)}€`;
                                                } else {
                                                    epsPrice = formEpsVol * parseFloat(tier.price_per_m3 || 150);
                                                    liveEpsMath = `${formEpsVol.toFixed(2)} m³ x ${tier.price_per_m3}€ = ${epsPrice.toFixed(2)}€`;
                                                }
                                                break;
                                            }
                                        }
                                    }
                                    
                                    let netEps = epsPrice * (1 - (livePrices.eps_discount_pct || 0) / 100);
                                    liveNet += netEps;
                                    liveEps = netEps;
                                    if (livePrices.eps_discount_pct > 0) liveEpsMath += ` (-${livePrices.eps_discount_pct}%)`;
                                }

                                const totalChape = liveChape + liveThreshold;
                                const totalIso = livePur + liveEps;
                                const grandTotal = totalChape + totalIso;
                                
                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 w-full flex flex-col justify-center items-center text-center">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Chape</p>
                                            <p className="text-base font-black text-slate-800 dark:text-slate-200">{totalChape.toFixed(2)} EUR</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 w-full flex flex-col justify-center items-center text-center">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Isolation</p>
                                            <p className="text-base font-black text-slate-800 dark:text-slate-200">{totalIso.toFixed(2)} EUR</p>
                                            {(livePur > 0 || liveEps > 0) && (
                                                <div className="mt-1.5 text-[9px] font-medium text-slate-400 dark:text-slate-500 flex flex-col gap-0.5 w-full">
                                                    {livePur > 0 && <span className="truncate">PUR: {livePurMath}</span>}
                                                    {liveEps > 0 && <span className="truncate">EPS: {liveEpsMath}</span>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-200 dark:border-indigo-800 w-full flex flex-col justify-center items-center text-center">
                                            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5">Total Général</p>
                                            <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">{grandTotal.toFixed(2)} EUR</p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 shrink-0">
                            <button onClick={() => setCalcEditOpen(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button onClick={handleCalcEditSave} disabled={calcEditSaving || !parseFloat(calcEditForm.surface)} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {calcEditSaving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {t('common.save', 'Enregistrer')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Modal Editare Calcul Real ────────────────────────────────────────── */}
            {calcRealEditOpen && calcRealEditForm && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20">
                            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                {t('work_order_detail.calc_edit_real.title', 'Modifier Calcul Réel')}
                            </h3>
                            <button onClick={() => setCalcRealEditOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('work_order_detail.calc_edit.surface', 'Surface (m²)')} *</label>
                                <input
                                    type="number" min="0" step="0.5"
                                    value={calcRealEditForm.surface}
                                    onChange={e => setCalcRealEditForm(f => ({ ...f, surface: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="ex: 130"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('work_order_detail.calc_edit.thickness', 'Épaisseur (cm)')}</label>
                                <input
                                    type="number" min="0" step="0.5"
                                    value={calcRealEditForm.thickness}
                                    onChange={e => setCalcRealEditForm(f => ({ ...f, thickness: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="ex: 10"
                                />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('work_order_detail.calc_edit.options', 'Options incluses')}</p>
                                <div className="space-y-2">
                                    {[
                                        { key: 'has_foil',     label: t('work_order_detail.calc_edit.foil',     'Feuille plastique') },
                                        { key: 'has_mesh',     label: t('work_order_detail.calc_edit.mesh',     'Treillis métallique') },
                                        { key: 'has_fiber',    label: t('work_order_detail.calc_edit.fiber',    'Fibres') },
                                        { key: 'has_duramint', label: t('work_order_detail.calc_edit.duramint', 'Duramint') },
                                    ].map(({ key, label }) => (
                                        <label key={key} className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={!!calcRealEditForm[key]}
                                                onChange={e => setCalcRealEditForm(f => ({ ...f, [key]: e.target.checked }))}
                                                className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                            />
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('work_order_detail.calc_edit.note_prices', 'Les prix unitaires et les remises sont hérités du devis initial.')}</p>
                            </div>
                            {parseFloat(calcRealEditForm.surface) > 0 && (() => {
                                const livePrices = {
                                    ...wo.prices
                                };
                                const prev = computeChapeTotal(parseFloat(calcRealEditForm.surface), parseFloat(calcRealEditForm.thickness) || 0, calcRealEditForm, livePrices);
                                return (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800">
                                        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">{t('work_order_detail.calc_edit.preview', 'Aperçu du total estimatif')}</p>
                                        <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{prev.net.toFixed(2)} EUR</p>
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                            <button onClick={() => setCalcRealEditOpen(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button onClick={handleCalcRealEditSave} disabled={calcRealEditSaving || !parseFloat(calcRealEditForm.surface)} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {calcRealEditSaving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {t('common.save', 'Enregistrer')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Lightbox ────────────────────────────────────────────────────── */}
            {lightbox !== null && typeof lightbox === 'number' && photos[lightbox] && createPortal(
                <div className="fixed inset-0 bg-black/95 z-[99999] flex flex-col items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm" onClick={() => setLightbox(null)}>
                    
                    <button onClick={(e) => { e.stopPropagation(); setLightbox(null) }}
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center text-white transition-colors z-50">
                        <X className="w-6 h-6" />
                    </button>

                    {photos.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); setLightbox(prev => (prev - 1 + photos.length) % photos.length) }}
                            className="absolute left-2 sm:left-6 w-12 h-12 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center text-white transition-colors z-50">
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                    )}

                    <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                            const p = photos[lightbox];
                            const rawSrc = p.url || p.file_url || p.path || '';
                            const src = rawSrc.startsWith('http') ? rawSrc : `${API_BASE}${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`;
                            const fallbackSrc = `https://cmr.up.railway.app${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`;
                            return (
                                <img 
                                    src={src} 
                                    onError={(e) => { if (e.target.src !== fallbackSrc) e.target.src = fallbackSrc; }} 
                                    alt="Preview" 
                                    className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" 
                                />
                            );
                        })()}
                        
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-bold tracking-widest">
                            {lightbox + 1} / {photos.length}
                        </div>
                    </div>

                    {photos.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); setLightbox(prev => (prev + 1) % photos.length) }}
                            className="absolute right-2 sm:right-6 w-12 h-12 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center text-white transition-colors z-50">
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    )}
                </div>,
                document.body
            )}
            {toast.message && (
                <div className={`fixed bottom-4 right-4 z-[9999] px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4 ${
                    toast.type === 'error' 
                        ? 'bg-red-50 text-red-700 border border-red-200' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                    {toast.type === 'error' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    )}
                    <span className="font-bold text-sm">{toast.message}</span>
                </div>
            )}

            {previewDocIndex !== null && wo?.documents && (
                <DocumentPreviewModal 
                    documents={wo.documents} 
                    initialIndex={previewDocIndex}
                    onClose={() => setPreviewDocIndex(null)} 
                />
            )}

            {/* FULL PAGE PREVIEW MODAL pentru Facturi si Devize PDF */}
            {docDrawerState && createPortal(
                <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-100 dark:bg-slate-950">
                    <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 shrink-0 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setDocDrawerState(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">PRÉVISUALISATION {docDrawerState.type === 'facture' ? 'FACTURE' : docDrawerState.type === 'proforma' ? 'PROFORMA' : 'DEVIS'}</h2>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{wo?.client?.name || wo?.client_name || t('work_order_detail.documents.no_client', 'Sans Client')}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {!wo?.is_invoiced && (
                                <button
                                    onClick={() => {
                                        setDocDrawerState(null);
                                        handleToggleInvoiced(true);
                                    }}
                                    className="px-6 py-2.5 rounded-full font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    {t('work_order_detail.invoicing.issue_invoice', 'Émettre la Facture')}
                                </button>
                            )}
                            <button 
                                onClick={() => setDocDrawerState(null)}
                                className="px-6 py-2.5 rounded-full font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                            >
                                {t('common.close', 'Fermer')}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden p-6 relative flex justify-center items-center bg-slate-50 dark:bg-slate-900/50">
                        <div className="w-full h-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-200/50">
                            <iframe 
                                src={docDrawerState.url} 
                                className="w-full h-full border-none"
                                title={docDrawerState.type === 'facture' ? 'Facture PDF' : 'Devis PDF'}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmModal
                isOpen={showSyncConfirm}
                onClose={() => setShowSyncConfirm(false)}
                onConfirm={executeSyncPrices}
                title={t('work_order_detail.sync_prices_title_modal', 'Resynchronisation des Tarifs')}
                message={t('work_order_detail.sync_prices_confirm', 'Êtes-vous sûr de vouloir resynchroniser cette commande avec les tarifs globaux actuels ? Cela modifiera définitivement les prix historiques de la commande.')}
                confirmText={t('common.confirm', 'Confirmer')}
                cancelText={t('common.cancel', 'Annuler')}
                type="danger"
            />

            <ConfirmModal
                isOpen={showDiscountNotifyPrompt}
                onClose={() => setShowDiscountNotifyPrompt(false)}
                onConfirm={async () => {
                    setShowDiscountNotifyPrompt(false);
                    try {
                        const discPct = parseFloat(wo.prices?.discount_pct || 0);
                        const proformaUrl = `${window.location.origin}/public/proforma/${wo.token}`;
                        // Send chat message + email notification
                        await api.post(`/admin/work-orders/${id}/messages`, {
                            message: `Bonjour, l'équipe Davide Chape vous a accordé une remise de ${discPct}% sur votre devis. Veuillez vérifier l'offre actualisée: ${proformaUrl}`,
                            sender: 'admin'
                        });
                        showToast(t('work_order_detail.discount_notify_sent', 'Notification envoyée au client avec succès.'));
                    } catch (e) {
                        console.error('Discount notify error:', e);
                        showToast(t('work_order_detail.discount_notify_error', 'Erreur lors de la notification.'), 'error');
                    }
                }}
                title={t('work_order_detail.discount_notify_title', 'Notifier le client ?')}
                message={t('work_order_detail.discount_notify_msg', 'La remise a été mise à jour. Voulez-vous envoyer un message au client pour l\'informer de la nouvelle offre ?')}
                confirmText={t('work_order_detail.discount_notify_yes', 'Oui, notifier')}
                cancelText={t('work_order_detail.discount_notify_no', 'Non, pas maintenant')}
                type="info"
            />
            
            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => {
                    api.put(`/admin/work-orders/${id}`, { status: 'cancelled' })
                       .then(() => navigate('/admin/quotes'))
                       .catch((err) => {
                           console.error(err);
                           showToast(t('common.error', 'Erreur'), 'error');
                       })
                }}
                title={t('common.delete', 'Supprimer')}
                message={t('work_order_detail.delete_confirm', 'Êtes-vous sûr de vouloir supprimer ceci définitivement ?')}
                confirmText={t('common.delete', 'Supprimer')}
                cancelText={t('common.cancel', 'Annuler')}
                type="danger"
            />

            <ConfirmModal
                isOpen={showConvertConfirm}
                onClose={() => setShowConvertConfirm(false)}
                onConfirm={executeConvertToOrder}
                title={t('quotes.convert', 'Transformer')}
                message={t('quotes.confirm_convert', 'Êtes-vous sûr de vouloir transformer ce devis en intervention ?')}
                confirmText={t('quotes.convert', 'Transformer')}
                cancelText={t('common.cancel', 'Annuler')}
            />

            

            {historyModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setHistoryModalOpen(false)}></div>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 flex flex-col overflow-hidden max-h-[85vh]">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800">{t('work_order_detail.history.title', 'Historique des dates')}</h3>
                            <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 relative">
                            <div className="absolute left-6 top-8 bottom-4 w-0.5 bg-slate-200"></div>
                            {wo?.date_history && wo.date_history.map((hist, idx) => {
                                const isLast = idx === wo.date_history.length - 1;
                                const isConfirmed = hist.action === 'confirmed_by_client';
                                return (
                                    <div key={idx} className={`relative flex gap-4 ${!isLast ? 'opacity-70' : ''}`}>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center relative z-10 mt-1 shrink-0 ${isConfirmed ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                                            {isConfirmed ? <CheckCircle2 className="w-3 h-3" /> : <CalendarDays className="w-3 h-3" />}
                                        </div>
                                        <div className={`flex-1 p-3 rounded-xl border ${isLast && isConfirmed ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200'}`}>
                                            <p className={`text-xs font-bold uppercase mb-1 ${isConfirmed ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                {isConfirmed 
                                                    ? t('work_order_detail.history.action_confirmed', 'Confirmé par client')
                                                    : t('work_order_detail.history.action_changed', 'Modifié par Admin')}
                                            </p>
                                            <p className="text-sm font-medium text-slate-700">
                                                {isConfirmed ? (
                                                    <span>{hist.client_name}</span>
                                                ) : (
                                                    <span>{t('work_order_detail.history.new_date', 'Nouvelle date:')} {hist.new_date ? new Date(hist.new_date).toLocaleDateString('ro-RO') : t('general.none', 'N/A')}</span>
                                                )}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-2">{fmtFull(hist.timestamp)}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}


            
            {/* Email Preview Modal */}
            {showEmailPreview && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowEmailPreview(false)}></div>
                    <div className="relative w-full max-w-3xl h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Mail className="w-5 h-5 text-blue-500" />
                                {t('work_order_detail.email_preview_title', 'Aperçu de l\'Email')}
                            </h3>
                            <button onClick={() => setShowEmailPreview(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden bg-white">
                            <iframe 
                                className="w-full h-full border-0" 
                                srcDoc={emailPreviewContent} 
                                title="Email Preview"
                            />
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                            <button onClick={() => setShowEmailPreview(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900">
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button onClick={async () => {
                                try {
                                    await api.post(`/admin/work-orders/${id}/send-email`, { proforma_url: `https://davidechape.pontaj.app/public/proforma/${wo.token}` });
                                    setShowEmailPreview(false);
                                    showToast(t('work_order_detail.email_sent', 'Email envoyé avec succès!'), 'success');
                                } catch (err) {
                                    showToast(t('work_order_detail.email_err', 'Erreur lors de l\'envoi de l\'email.'), 'error');
                                }
                            }} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm">
                                {t('work_order_detail.send_email_btn', 'Envoyer l\'Email')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Attachment Preview Modal */}
            {previewAttachment && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewAttachment(null)}></div>
                    <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                            <div className="flex items-center gap-3 truncate pr-4">
                                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <h3 className="font-semibold text-slate-800 dark:text-white truncate">
                                    {previewAttachment.name || 'Previzualizare Fișier'}
                                </h3>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {!previewAttachment.isInternalUrl && (
                                    <a 
                                        href={getImageUrl(previewAttachment.url)} 
                                        download 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-colors flex items-center gap-2 font-medium text-sm"
                                        title="Descarcă Fișier"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span className="hidden sm:inline">Descarcă</span>
                                    </a>
                                )}
                                <button
                                    onClick={() => setPreviewAttachment(null)}
                                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-black/50 p-4">
                            {previewAttachment.isImage ? (
                                <img 
                                    src={getImageUrl(previewAttachment.url)} 
                                    alt={previewAttachment.name} 
                                    className="max-w-full max-h-[70vh] object-contain rounded shadow-sm"
                                />
                            ) : previewAttachment.isPdf ? (
                                <iframe
                                    src={previewAttachment.isInternalUrl ? previewAttachment.url : getImageUrl(previewAttachment.url)}
                                    title="PDF Preview"
                                    className="w-full h-[70vh] rounded shadow-sm bg-white"
                                />
                            ) : (
                                <div className="text-center p-8 text-slate-500">
                                    Format nesuportat pentru previzualizare directă.
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
    
    if (isEmbedded) {
        return createPortal(
            <div className="fixed inset-0 z-[99999] bg-slate-50 dark:bg-slate-950 overflow-y-auto w-full h-full">
                {pageContent}
            </div>,
            document.body
        )
    }
    return pageContent;
}
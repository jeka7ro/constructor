import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import partnerApi from '../../lib/partnerApi'
import MapView from '../../components/MapView'
import {
    ArrowLeft, MapPin, Calendar, Layers, Clock, CheckCircle, Camera,
    X, Image, Users, Ruler, ChevronLeft, ChevronRight, Loader2,
    Wrench, Sparkles, ExternalLink, Navigation, Phone, Upload,
    FileText, Trash2, Paperclip, Download, Eye, Edit, Trash, ClipboardList
} from 'lucide-react'
import { useRef } from 'react'
import PartnerWorkOrderModal from './PartnerWorkOrderModal'
import ConfirmModal from '../../components/ConfirmModal'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

const T = {
    fr: {
        back: 'Retour',
        details: 'Détails de la commande',
        address: 'Adresse du chantier',
        work_type: 'Type de travail',
        new_work: 'Nouveau',
        repair_work: 'Rénovation',
        date: 'Date prévue',
        status: 'Statut',
        team: 'Équipe assignée',
        surfaces: 'Surfaces',
        estimated: 'Estimées',
        actual: 'Réelles (mesurées)',
        actual_surface: 'Surface réelle',
        actual_thickness: 'Épaisseur réelle',
        thickness: 'Épaisseur',
        photos: 'Photos du chantier',
        no_photos: 'Aucune photo disponible pour le moment',
        photos_desc: 'Les photos seront ajoutées par l\'équipe lors de l\'intervention',
        checkin: 'Arrivée sur site',
        checkout: 'Départ du site',
        confirmed_by_team: 'Confirmé par le chef d\'équipe',
        team_note: 'Note du chef',
        timeline: 'Chronologie',
        created: 'Commande créée',
        notes: 'Remarques',
        navigate: 'Naviguer',
        loading: 'Chargement...',
        not_found: 'Commande non trouvée',
        foil: 'Film plastique',
        mesh: 'Treillis',
        fiber: 'Fibres + Duramint',
        pending: 'En attente',
        confirmed: 'Confirmé',
        planning: 'Planifié',
        in_progress: 'En cours',
        completed: 'Terminé',
        draft: 'Brouillon',
        sent: 'Envoyé',
        attachments: 'Documents joints',
        upload_file: 'Joindre un fichier',
        uploading: 'Envoi en cours...',
        upload_desc: 'PDF, photos — max 20 MB',
        no_attachments: 'Aucun document joint',
        no_attachments_desc: 'Ajoutez des PDF ou des photos pour cette commande',
        delete_attachment: 'Supprimer',
        attachment_deleted: 'Document supprimé',
        edit: 'Modifier',
        delete: 'Supprimer',
        delete_confirm_title: 'Supprimer la commande',
        delete_confirm_desc: 'Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.',
        cancel: 'Annuler',
        confirm: 'Confirmer',
        chat: 'Discussion',
        type_message: 'Écrivez un message...',
        send: 'Envoyer',
        no_messages: 'Aucun message pour le moment',
        sending: 'Envoi...',
        from_date: 'Du',
        to_date: 'au'
    },
    nl: {
        back: 'Terug',
        details: 'Bestelling details',
        address: 'Werfadres',
        work_type: 'Type werk',
        new_work: 'Nieuwbouw',
        repair_work: 'Renovatie',
        date: 'Geplande datum',
        status: 'Status',
        team: 'Toegewezen team',
        surfaces: 'Oppervlakten',
        estimated: 'Geschat',
        actual: 'Werkelijk (gemeten)',
        actual_surface: 'Werkelijke opp.',
        actual_thickness: 'Werkelijke dikte',
        thickness: 'Dikte',
        photos: 'Werffoto\'s',
        no_photos: 'Nog geen foto\'s beschikbaar',
        photos_desc: 'Foto\'s worden toegevoegd door het team',
        checkin: 'Aankomst op werf',
        checkout: 'Vertrek van werf',
        confirmed_by_team: 'Bevestigd door ploegbaas',
        team_note: 'Notitie ploegbaas',
        timeline: 'Tijdlijn',
        created: 'Bestelling aangemaakt',
        notes: 'Opmerkingen',
        navigate: 'Navigeren',
        loading: 'Laden...',
        not_found: 'Bestelling niet gevonden',
        foil: 'Folie',
        mesh: 'Netten',
        fiber: 'Vezel + Duramint',
        pending: 'In afwachting',
        confirmed: 'Bevestigd',
        planning: 'Gepland',
        in_progress: 'In uitvoering',
        completed: 'Voltooid',
        draft: 'Concept',
        sent: 'Verzonden',
        attachments: 'Bijlagen',
        upload_file: 'Bestand toevoegen',
        uploading: 'Uploaden...',
        upload_desc: 'PDF, foto\'s — max 20 MB',
        no_attachments: 'Geen bijlagen',
        no_attachments_desc: 'Voeg PDF\'s of foto\'s toe',
        delete_attachment: 'Verwijderen',
        attachment_deleted: 'Bijlage verwijderd',
        edit: 'Bewerken',
        delete: 'Verwijderen',
        delete_confirm_title: 'Bestelling verwijderen',
        delete_confirm_desc: 'Weet u zeker dat u deze bestelling wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
        cancel: 'Annuleren',
        confirm: 'Bevestigen',
        deleted_success: 'Bestelling verwijderd',
        chat: 'Gesprek',
        type_message: 'Typ een bericht...',
        send: 'Verzenden',
        no_messages: 'Nog geen berichten',
        sending: 'Verzenden...',
        from_date: 'Van',
        to_date: 'tot'
    },
    en: {
        back: 'Back',
        details: 'Order details',
        address: 'Site address',
        work_type: 'Work type',
        new_work: 'New',
        repair_work: 'Renovation',
        date: 'Planned date',
        status: 'Status',
        team: 'Assigned team',
        surfaces: 'Surfaces',
        estimated: 'Estimated',
        actual: 'Actual (measured)',
        actual_surface: 'Actual surface',
        actual_thickness: 'Actual thickness',
        thickness: 'Thickness',
        photos: 'Site photos',
        no_photos: 'No photos available yet',
        photos_desc: 'Photos will be added by the team during the intervention',
        checkin: 'Arrival on site',
        checkout: 'Departure from site',
        confirmed_by_team: 'Confirmed by team leader',
        team_note: 'Team leader note',
        timeline: 'Timeline',
        created: 'Order created',
        notes: 'Notes',
        navigate: 'Navigate',
        loading: 'Loading...',
        not_found: 'Order not found',
        foil: 'Plastic foil',
        mesh: 'Metal mesh',
        fiber: 'Fibres + Duramint',
        pending: 'Pending',
        confirmed: 'Confirmed',
        planning: 'Planned',
        in_progress: 'In progress',
        completed: 'Completed',
        draft: 'Draft',
        sent: 'Sent',
        attachments: 'Attached documents',
        upload_file: 'Attach a file',
        uploading: 'Uploading...',
        upload_desc: 'PDF, photos — max 20 MB',
        no_attachments: 'No attached documents',
        no_attachments_desc: 'Add PDFs or photos for this order',
        delete_attachment: 'Delete',
        attachment_deleted: 'Document deleted',
        edit: 'Edit',
        delete: 'Delete',
        delete_confirm_title: 'Delete order',
        delete_confirm_desc: 'Are you sure you want to delete this order? This action is irreversible.',
        cancel: 'Cancel',
        confirm: 'Confirm',
        from_date: 'From',
        to_date: 'to'
    },
}

const STATUS_COLORS = {
    draft: 'bg-slate-100 text-slate-700',
    pending: 'bg-amber-100 text-amber-700',
    sent: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    planning: 'bg-sky-100 text-sky-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-green-100 text-green-700',
}

function formatDateTime(iso, lang) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString(lang === 'nl' ? 'nl-BE' : lang === 'en' ? 'en-GB' : 'fr-BE', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
}

function formatDateRange(dateStr, durationDays, lang, t) {
    if (!dateStr) return '—'
    const start = new Date(dateStr + 'T00:00:00')
    const locale = lang === 'nl' ? 'nl-BE' : lang === 'en' ? 'en-GB' : 'fr-BE'
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    const startStr = start.toLocaleDateString(locale, options)
    
    if (!durationDays || durationDays <= 1) {
        return startStr
    }
    
    const end = new Date(start)
    end.setDate(end.getDate() + (durationDays - 1))
    const endStr = end.toLocaleDateString(locale, options)
    
    return `${t.from_date} ${startStr} ${t.to_date} ${endStr}`
}

export default function PartnerOrderDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { lang } = useOutletContext()
    const t = T[lang] || T.fr

    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [lightboxImg, setLightboxImg] = useState(null)
    const [attachments, setAttachments] = useState([])
    const [uploading, setUploading] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const fileInputRef = useRef(null)
    const chatEndRef = useRef(null)
    const chatContainerRef = useRef(null)
    const prevMessagesLength = useRef(0)

    // Chat state
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [isSendingMsg, setIsSendingMsg] = useState(false)

    const fetchOrder = useCallback(async () => {
        try {
            const res = await partnerApi.get(`/work-orders/${id}`)
            setOrder(res.data)
        } catch (err) {
            console.error('Failed to fetch order', err)
        }
    }, [id])

    const fetchAttachments = useCallback(async () => {
        try {
            const res = await partnerApi.get(`/work-orders/${id}/attachments`)
            setAttachments(res.data || [])
        } catch (err) {
            console.error('Failed to fetch attachments', err)
        }
    }, [id])

    const fetchMessages = useCallback(async () => {
        try {
            const res = await partnerApi.get(`/work-orders/${id}/messages`)
            setMessages(res.data || [])
        } catch (err) {
            console.error('Failed to fetch messages', err)
        }
    }, [id])

    useEffect(() => {
        const init = async () => {
            setLoading(true)
            await Promise.all([fetchOrder(), fetchAttachments(), fetchMessages()])
            setLoading(false)
        }
        init()
        
        const interval = setInterval(fetchMessages, 3000)
        return () => clearInterval(interval)
    }, [id, fetchOrder, fetchAttachments, fetchMessages])

    useEffect(() => {
        if (messages.length > prevMessagesLength.current) {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
        prevMessagesLength.current = messages.length;
    }, [messages])

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim() || isSendingMsg) return
        
        setIsSendingMsg(true)
        try {
            await partnerApi.post(`/work-orders/${id}/messages`, {
                message: newMessage.trim()
            })
            setNewMessage('')
            fetchMessages()
        } catch (err) {
            console.error('Failed to send message', err)
        } finally {
            setIsSendingMsg(false)
        }
    }

    const handleDelete = async () => {
        try {
            await partnerApi.delete(`/work-orders/${id}`)
            navigate('/partner/planning')
        } catch (err) {
            console.error('Failed to delete order', err)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 text-slate-500">{t.loading}</span>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="text-center py-32">
                <p className="text-slate-400 text-lg">{t.not_found}</p>
                <button onClick={() => navigate('/partner/planning')} className="mt-4 text-blue-600 hover:underline">
                    ← {t.back}
                </button>
            </div>
        )
    }

    const vols = order.volumes || []
    const totalSurface = vols.reduce((s, v) => s + (parseFloat(v.quantity) || 0), 0)
    const photos = (order.photos || []).filter(p => p.photo_type !== 'partner_document')

    const adminDocs = (order?.documents || []).filter(d => d.source !== 'partner').map(d => ({
        id: d.id,
        url: d.file_path?.startsWith('http') ? d.file_path : (d.file_path ? `/uploads/${d.file_path}` : ''),
        name: d.filename,
        date: d.uploaded_at,
        canDelete: false,
        size: d.file_size
    }))
    const partnerDocs = attachments.map(a => ({
        id: a.id,
        url: a.file_path?.startsWith('http') ? a.file_path : (a.file_path ? `/uploads/${a.file_path}` : ''),
        name: a.filename || t.attachments + ' ' + a.id.slice(0,4),
        date: a.uploaded_at,
        canDelete: true,
        deleteId: a.id,
        size: a.file_size
    }))
    const allDocs = [...adminDocs, ...partnerDocs].sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0))

    const getStatusLabel = (status) => t[status] || status

    // Navigation URL
    const navUrl = order.latitude && order.longitude
        ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}&travelmode=driving`
        : order.site_address
            ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.site_address)}&travelmode=driving`
            : null

    const getImgUrl = (path) => {
        if (!path) return ''
        if (path.startsWith('http')) return path
        const base = API_BASE.replace(/\/$/, '')
        return `${base}${path.startsWith('/') ? '' : '/'}${path}`
    }

    // Timeline events
    const timeline = []
    if (order.created_at) timeline.push({ time: order.created_at, label: t.created, icon: '📋', color: 'bg-slate-400' })
    if (order.checkin_at) timeline.push({ time: order.checkin_at, label: t.checkin, icon: '🟢', color: 'bg-emerald-500' })
    if (order.team_leader_confirmed_at) timeline.push({ time: order.team_leader_confirmed_at, label: t.confirmed_by_team, icon: '✅', color: 'bg-green-500' })
    if (order.checkout_at) timeline.push({ time: order.checkout_at, label: t.checkout, icon: '🔴', color: 'bg-red-400' })
    timeline.sort((a, b) => new Date(a.time) - new Date(b.time))

    return (
        <div className="max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate('/partner/planning')}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">{t.details}</h1>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {order.site_address}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        title={t.edit}
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 transition-colors"
                        title={t.delete}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_COLORS[order.status] || STATUS_COLORS.draft}`}>
                        {getStatusLabel(order.status)}
                    </span>
                </div>
            </div>

            {/* Détails Généraux */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm mb-6">
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <ClipboardList className="w-5 h-5 text-slate-500" />
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                        {t('work_order_detail.general_details.title', 'Détails Généraux')}
                    </h2>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.general_details.quote_number', 'Numéro de Devis')}</p>
                        <p className="text-sm font-black tracking-widest text-slate-800 dark:text-white">{order.quote_number || order.id?.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div>
                        <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.general_details.type', 'Type d\'intervention')}</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">{order.work_type}</p>
                    </div>
                    <div>
                        <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.general_details.date', 'Date d\'intervention')}</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {order.start_date ? new Date(order.start_date).toLocaleDateString(lang === 'nl' ? 'nl-BE' : lang === 'en' ? 'en-GB' : 'fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('work_order_detail.general_details.time', 'Heure d\'intervention')}</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {order.start_time || '-'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Map + Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Map (2/3 width) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    {(order.latitude && order.longitude) || order.site_address ? (
                        <MapView
                            latitude={order.latitude}
                            longitude={order.longitude}
                            address={order.site_address}
                            height={350}
                            zoom={15}
                            label={order.client_name || order.site_address?.split(',')[0]}
                        />
                    ) : (
                        <div className="h-[350px] bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <MapPin className="w-12 h-12 text-slate-300" />
                        </div>
                    )}
                    {/* Nav button below map */}
                    {navUrl && (
                        <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-sm text-slate-500 truncate flex-1">{order.site_address}</span>
                            <a
                                href={navUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shrink-0"
                            >
                                <Navigation className="w-4 h-4" />
                                {t.navigate}
                            </a>
                        </div>
                    )}
                </div>

                {/* Info cards (1/3 width) */}
                <div className="space-y-3">
                    {/* Date */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <div className="text-xs font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {t.date}
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {formatDateRange(order.start_date, order.duration_days, lang, t)}
                        </p>
                    </div>


                    {/* Timeline */}
                    {timeline.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                            <div className="text-xs font-semibold text-slate-400 uppercase mb-3 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {t.timeline}
                            </div>
                            <div className="space-y-3">
                                {timeline.map((ev, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-2.5 h-2.5 rounded-full ${ev.color}`} />
                                            {i < timeline.length - 1 && <div className="w-px h-6 bg-slate-200 dark:bg-slate-600" />}
                                        </div>
                                        <div className="flex-1 -mt-0.5">
                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{ev.label}</p>
                                            <p className="text-[10px] text-slate-400">{formatDateTime(ev.time, lang)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Équipe assignée */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <div className="text-xs font-semibold text-slate-400 uppercase mb-3 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> Équipe
                        </div>
                        {order.team_name ? (
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{order.team_name}</p>
                                    <p className="text-[10px] text-emerald-500 font-medium">Assignée</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">En attente d'attribution</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Surfaces */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Estimated Surfaces */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-500" />
                        {t.surfaces} — {t.estimated}
                    </h3>
                    <div className="space-y-2">
                        {vols.map((v, i) => (
                            <div key={i} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{v.label || `Surface ${i + 1}`}</span>
                                    <span className="font-mono text-sm font-semibold text-blue-800 dark:text-blue-200">{v.quantity} m²</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-blue-500 dark:text-blue-400">
                                    <span>{t.thickness}: {v.thickness || '?'} cm</span>
                                    {v.has_foil && <span className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded">{t.foil}</span>}
                                    {v.has_mesh && <span className="bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded">{t.mesh}</span>}
                                    {v.has_duramint && <span className="bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded">{t.fiber}</span>}
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
                            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Total</span>
                            <span className="text-lg font-bold text-blue-800 dark:text-blue-200">{totalSurface} m²</span>
                        </div>
                    </div>
                </div>

                {/* Actual Surfaces */}
                <div className={`rounded-xl border p-5 shadow-sm ${order.actual_surface_m2
                        ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-800'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}>
                    <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${order.actual_surface_m2
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-slate-400'
                        }`}>
                        <Ruler className="w-4 h-4" />
                        {t.surfaces} — {t.actual}
                    </h3>
                    {order.actual_surface_m2 ? (
                        <div className="space-y-3">
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800 text-center">
                                <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                                    {order.actual_surface_m2} m²
                                </div>
                                {order.actual_thickness_cm && (
                                    <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                                        {t.actual_thickness}: {order.actual_thickness_cm} cm
                                    </div>
                                )}
                            </div>
                            {/* Difference */}
                            {totalSurface > 0 && (
                                <div className="text-center text-xs text-slate-500">
                                    {order.actual_surface_m2 > totalSurface
                                        ? `+${(order.actual_surface_m2 - totalSurface).toFixed(1)} m² vs ${t.estimated.toLowerCase()}`
                                        : order.actual_surface_m2 < totalSurface
                                            ? `${(order.actual_surface_m2 - totalSurface).toFixed(1)} m² vs ${t.estimated.toLowerCase()}`
                                            : `= ${t.estimated.toLowerCase()}`
                                    }
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Ruler className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                            <p className="text-slate-400 text-sm italic">—</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Team Leader Confirmation */}
            {order.team_leader_confirmed_at && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-5 mb-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{t.confirmed_by_team}</span>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
                        {formatDateTime(order.team_leader_confirmed_at, lang)}
                    </p>
                    {order.team_leader_confirmation_note && (
                        <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-medium">{t.team_note}:</span> {order.team_leader_confirmation_note}
                        </div>
                    )}
                </div>
            )}

            {/* Notes */}
            {order.notes && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{t.notes}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{order.notes}</p>
                </div>
            )}

            {/* ── Partner Attachments (PDF / Photos) ── */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-indigo-500" />
                        {t.attachments}
                        {allDocs.length > 0 && (
                            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{allDocs.length}</span>
                        )}
                    </h3>
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.bmp,.tiff"
                            className="hidden"
                            onChange={async (e) => {
                                const files = Array.from(e.target.files || [])
                                if (files.length === 0) return
                                setUploading(true)
                                try {
                                    for (const file of files) {
                                        const formData = new FormData()
                                        formData.append('file', file)
                                        await partnerApi.post(`/work-orders/${id}/attachments`, formData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        })
                                    }
                                    fetchAttachments()
                                } catch (err) {
                                    console.error('Upload failed', err)
                                } finally {
                                    setUploading(false)
                                    e.target.value = ''
                                }
                            }}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-medium transition-colors"
                        >
                            {uploading ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.uploading}</>
                            ) : (
                                <><Upload className="w-3.5 h-3.5" /> {t.upload_file}</>
                            )}
                        </button>
                    </div>
                </div>

                {allDocs.length > 0 ? (
                    <div className="space-y-2">
                        {allDocs.map((doc) => {
                            const isPdf = doc.url?.toLowerCase().endsWith('.pdf')
                            const imgUrl = getImgUrl(doc.url)
                            const fileSize = doc.size ? (doc.size > 1024 * 1024
                                ? `${(doc.size / 1024 / 1024).toFixed(1)} MB`
                                : `${Math.round(doc.size / 1024)} KB`) : ''

                            return (
                                <div key={doc.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600 group">
                                    {/* Icon / Thumbnail */}
                                    {isPdf ? (
                                        <div 
                                            className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800 cursor-pointer"
                                            onClick={() => setLightboxImg(imgUrl)}
                                        >
                                            <FileText className="w-6 h-6 text-red-500" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-600 cursor-pointer"
                                             onClick={() => setLightboxImg(imgUrl)}>
                                            <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                            {doc.name || 'Document'}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            {fileSize && <span>{fileSize}</span>}
                                            {doc.date && <span>{formatDateTime(doc.date, lang)}</span>}
                                            {!doc.canDelete && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">ADMIN</span>}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {/* View */}
                                        <button
                                            onClick={() => setLightboxImg(imgUrl)}
                                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-400 hover:text-blue-500 transition-colors"
                                            title={t.view || 'View'}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {/* Download */}
                                        <a
                                            href={imgUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-400 hover:text-blue-500 transition-colors"
                                            title={t.download || 'Download'}
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                        {/* Delete */}
                                        {doc.canDelete && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await partnerApi.delete(`/work-orders/${id}/attachments/${doc.deleteId}`)
                                                        setAttachments(prev => prev.filter(a => a.id !== doc.deleteId))
                                                    } catch (err) {
                                                        console.error('Delete failed', err)
                                                    }
                                                }}
                                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                title={t.delete_attachment}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-600">
                        <Paperclip className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm font-medium">{t.no_attachments}</p>
                        <p className="text-slate-300 dark:text-slate-500 text-xs mt-1">{t.no_attachments_desc}</p>
                    </div>
                )}

                <p className="text-xs text-slate-400 mt-3">{t.upload_desc}</p>
            </div>

            {/* Chat Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm mb-6 flex flex-col h-[500px]">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2 shrink-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </span>
                    {t.chat}
                </h3>
                
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 mb-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <span className="text-xs">{t.no_messages}</span>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.sender === 'partner'
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-baseline gap-2 mb-1 px-1">
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            {msg.sender_name || (msg.sender === 'admin' ? 'Support' : 'Client')}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {formatDateTime(msg.created_at, lang)}
                                        </span>
                                    </div>
                                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] ${
                                        isMe 
                                            ? 'bg-blue-500 text-white rounded-tr-sm shadow-sm' 
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap break-words">
                                            {isMe ? msg.message : (msg.translations?.[lang] || msg.message)}
                                        </p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={t.type_message}
                            disabled={order.is_chat_closed || isSendingMsg}
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all text-slate-800 dark:text-slate-200"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isSendingMsg || order.is_chat_closed}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSendingMsg ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Navigation className="w-4 h-4 rotate-45" />
                            )}
                            <span className="hidden sm:inline">{t.send}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Photos Gallery */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-500" />
                    {t.photos}
                    {photos.length > 0 && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{photos.length}</span>
                    )}
                </h3>

                {photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {photos.map((photo) => {
                            const imgUrl = getImgUrl(photo.photo_path)
                            const thumbUrl = getImgUrl(photo.thumbnail_path) || imgUrl
                            return (
                                <div
                                    key={photo.id}
                                    className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 cursor-pointer"
                                    onClick={() => setLightboxImg(imgUrl)}
                                >
                                    <img
                                        src={thumbUrl}
                                        alt={photo.description || 'Photo'}
                                        className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${photo.photo_type === 'completion'
                                                ? 'bg-green-500/80 text-white'
                                                : photo.photo_type === 'instruction'
                                                    ? 'bg-blue-500/80 text-white'
                                                    : 'bg-slate-500/80 text-white'
                                            }`}>
                                            {photo.photo_type || 'photo'}
                                        </span>
                                        {photo.uploaded_at && (
                                            <p className="text-white/60 text-[10px] mt-0.5">
                                                {formatDateTime(photo.uploaded_at, lang)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-600">
                        <Image className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm font-medium">{t.no_photos}</p>
                        <p className="text-slate-300 dark:text-slate-500 text-xs mt-1">{t.photos_desc}</p>
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightboxImg && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setLightboxImg(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        onClick={() => setLightboxImg(null)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    {lightboxImg.toLowerCase().endsWith('.pdf') ? (
                        <iframe
                            src={lightboxImg}
                            className="w-full max-w-5xl h-[85vh] bg-white rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                            title="PDF Preview"
                        />
                    ) : (
                        <img
                            src={lightboxImg}
                            alt="Full size"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>,
                document.body
            )}

            {/* Modals */}
            {showEditModal && (
                <PartnerWorkOrderModal
                    order={order}
                    lang={lang}
                    onClose={() => setShowEditModal(false)}
                    onSaved={() => {
                        setShowEditModal(false)
                        fetchOrder()
                        fetchAttachments()
                    }}
                />
            )}

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title={t.delete_confirm_title}
                message={t.delete_confirm_desc}
                confirmText={t.confirm}
                cancelText={t.cancel}
                type="danger"
            />
        </div>
    )
}

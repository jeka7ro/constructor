import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { FileText, CheckCircle2, ClipboardList, MapPin, Calendar, User, AlertCircle, Loader2, Pen, RotateCcw, Camera, Paperclip } from 'lucide-react'
import api from '../../lib/api'
import MapView from '../../components/MapView'
import DevisView from '../admin/DevisView'

// ─── Signature Pad ────────────────────────────────────────────────────────────
function SignaturePad({ onChange, disabled, t }) {
    const canvasRef = useRef(null)
    const drawing = useRef(false)
    const hasDrawn = useRef(false)
    const [isEmpty, setIsEmpty] = useState(true)

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        if (e.touches) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            }
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        }
    }

    const startDraw = useCallback((e) => {
        if (disabled) return
        e.preventDefault()
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const pos = getPos(e, canvas)
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
        drawing.current = true
    }, [disabled])

    const draw = useCallback((e) => {
        if (!drawing.current || disabled) return
        e.preventDefault()
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const pos = getPos(e, canvas)
        ctx.lineTo(pos.x, pos.y)
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
        hasDrawn.current = true
        setIsEmpty(false)
    }, [disabled])

    const stopDraw = useCallback(() => {
        if (!drawing.current) return
        drawing.current = false
        if (hasDrawn.current && onChange) {
            onChange(canvasRef.current.toDataURL('image/png'))
        }
    }, [onChange])

    const clear = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        hasDrawn.current = false
        setIsEmpty(true)
        if (onChange) onChange(null)
    }

    useEffect(() => {
        const canvas = canvasRef.current
        canvas.addEventListener('touchstart', startDraw, { passive: false })
        canvas.addEventListener('touchmove', draw, { passive: false })
        canvas.addEventListener('touchend', stopDraw)
        return () => {
            canvas.removeEventListener('touchstart', startDraw)
            canvas.removeEventListener('touchmove', draw)
            canvas.removeEventListener('touchend', stopDraw)
        }
    }, [startDraw, draw, stopDraw])

    return (
        <div className="space-y-2">
            <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden hover:border-slate-400 transition-colors">
                <canvas
                    ref={canvasRef}
                    width={700}
                    height={200}
                    className="w-full touch-none cursor-crosshair block"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                />
                {isEmpty && !disabled && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                        <Pen className="w-6 h-6 text-slate-300 mb-1.5" />
                        <p className="text-sm text-slate-400 font-medium">{t.signHere}</p>
                    </div>
                )}
            </div>
            {!disabled && (
                <button type="button" onClick={clear}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors font-bold">
                    <RotateCcw className="w-3.5 h-3.5" /> {t.clearSignature}
                </button>
            )}
        </div>
    )
}

const LANG_DICT = {
    ro: {
        workOrder: 'Comandă de Lucru / Deviz',
        finalWorkOrder: 'Lucrare Finalizată',
        confirmed: 'Confirmat!',
        confirmedBy: 'Confirmat de',
        onDate: 'pe',
        signature: 'Semnătură înregistrată',
        start: 'Start',
        deadline: 'Termen',
        client: 'Beneficiar',
        location: 'Locație Lucrare',
        requirements: 'Cerințe de Lucru',
        volumes: 'Volume Estimate',
        materials: 'Materiale',
        notes: 'Observații',
        approxDate: 'Dată (Aproximativă)',
        confirmOrder: 'Confirmare Deviz',
        confirmOrderFinal: 'Confirmare Lucrare Finalizată',
        confirmDesc: 'Completați datele, aplicați semnătura digitală și confirmați.',
        confirmedByLabel: 'Confirmat de *',
        namePlaceholder: 'Nume și prenume / Companie',
        digitalSignature: 'Semnătură Digitală *',
        signatureRequired: 'Semnătura este obligatorie',
        terms: 'Am citit și sunt de acord cu toate cerințele, condițiile și prețurile estimate specificate în acest deviz.',
        termsFinal: 'J\'ai vérifié les travaux exécutés, y compris les photos jointes, et je confirme que le travail a été correctement terminé.',
        confirmBtn: 'Confirm și Semnez',
        confirmingBtn: 'Se confirmă...',
        estimatedPrice: 'Preț Estimativ',
        finalInvoice: 'Factură Finală (PDF)',
        downloadPdf: 'Descarcă PDF',
        completionPhotos: 'Photos de Fin de Travaux',
        signHere: 'Semnați aici cu mouse-ul sau degetul',
        clearSignature: 'Șterge semnătura',
        loadingOrder: 'Se încarcă comanda...',
        orderNotFound: 'Comandă negăsită',
        errorLoading: 'Nu am putut accesa comanda. Verificați conexiunea la internet.',
        errorConfirming: 'Eroare la confirmare. Încearcă din nou.'
    },
    en: {
        workOrder: 'Work Order',
        confirmed: 'Order Confirmed!',
        confirmedBy: 'Confirmed by',
        onDate: 'on',
        signature: 'Registered Signature',
        start: 'Start',
        deadline: 'Deadline',
        client: 'Client',
        location: 'Location',
        requirements: 'Requirements',
        volumes: 'Estimated Volumes',
        materials: 'Materials',
        notes: 'Notes',
        approxDate: 'Date (Approx.)',
        confirmOrder: 'Order Confirmation',
        confirmDesc: 'Fill in your details, apply your digital signature, and confirm.',
        confirmedByLabel: 'Confirmed by *',
        namePlaceholder: 'Full Name / Company',
        digitalSignature: 'Digital Signature *',
        signatureRequired: 'Signature is required',
        terms: 'I have read and agree to all the requirements, terms, and conditions specified in this work order.',
        confirmBtn: 'Confirm and Sign',
        confirmingBtn: 'Confirming...',
        estimatedPrice: 'Estimated Price',
        finalInvoice: 'Final Invoice (PDF)',
        downloadPdf: 'Download PDF',
        completionPhotos: 'Completion Photos',
        signHere: 'Sign here with mouse or finger',
        clearSignature: 'Clear signature',
        loadingOrder: 'Loading order...',
        orderNotFound: 'Order not found',
        errorLoading: 'Could not access the order. Check your internet connection.',
        errorConfirming: 'Confirmation error. Try again.'
    },
    fr: {
        workOrder: 'Bon de travail',
        confirmed: 'Commande confirmée !',
        confirmedBy: 'Confirmé par',
        onDate: 'le',
        signature: 'Signature enregistrée',
        start: 'Début',
        deadline: 'Date limite',
        client: 'Client',
        location: 'Lieu',
        requirements: 'Exigences',
        volumes: 'Volumes estimés',
        materials: 'Matériaux',
        notes: 'Remarques',
        approxDate: 'Date (Approximative)',
        confirmOrder: 'Confirmation de commande',
        confirmDesc: 'Remplissez vos coordonnées, appliquez votre signature numérique et confirmez.',
        confirmedByLabel: 'Confirmé par *',
        namePlaceholder: 'Nom et prénom / Entreprise',
        digitalSignature: 'Signature numérique *',
        signatureRequired: 'La signature est obligatoire',
        terms: "J'ai lu et j'accepte toutes les exigences, termes et conditions spécifiés dans ce bon de travail.",
        confirmBtn: 'Confirmer et signer',
        confirmingBtn: 'Confirmation en cours...',
        estimatedPrice: 'Prix estimé',
        finalInvoice: 'Facture finale (PDF)',
        downloadPdf: 'Télécharger le PDF',
        completionPhotos: 'Photos de réalisation',
        signHere: 'Signez ici avec la souris ou le doigt',
        clearSignature: 'Effacer la signature',
        loadingOrder: 'Chargement de la commande...',
        orderNotFound: 'Commande introuvable',
        errorLoading: 'Impossible d\'accéder à la commande. Vérifiez votre connexion Internet.',
        errorConfirming: 'Erreur de confirmation. Réessayez.',
        clientDocuments: 'Documents Client (Plans / Photos)',
        addDocument: 'Ajouter un Document',
        noDocuments: 'Aucun document chargé.'
    },
    de: {
        workOrder: 'Arbeitsauftrag',
        confirmed: 'Auftrag bestätigt!',
        confirmedBy: 'Bestätigt von',
        onDate: 'am',
        signature: 'Registrierte Unterschrift',
        start: 'Start',
        deadline: 'Frist',
        client: 'Kunde',
        location: 'Standort',
        requirements: 'Anforderungen',
        volumes: 'Geschätzte Mengen',
        materials: 'Materialien',
        notes: 'Notizen',
        confirmOrder: 'Auftragsbestätigung',
        confirmDesc: 'Füllen Sie Ihre Daten aus, fügen Sie Ihre digitale Unterschrift hinzu und bestätigen Sie.',
        confirmedByLabel: 'Bestätigt von *',
        namePlaceholder: 'Vollständiger Name / Firma',
        digitalSignature: 'Digitale Unterschrift *',
        signatureRequired: 'Unterschrift ist erforderlich',
        terms: 'Ich habe alle in diesem Arbeitsauftrag festgelegten Anforderungen, Bedingungen und Fristen gelesen und stimme ihnen zu.',
        confirmBtn: 'Bestätigen und Unterschreiben',
        confirmingBtn: 'Wird bestätigt...',
        estimatedPrice: 'Geschätzter Preis',
        finalInvoice: 'Schlussrechnung (PDF)',
        downloadPdf: 'PDF herunterladen',
        completionPhotos: 'Fertigstellungsfotos',
        signHere: 'Hier mit Maus oder Finger unterschreiben',
        clearSignature: 'Unterschrift löschen',
        loadingOrder: 'Auftrag wird geladen...',
        orderNotFound: 'Auftrag nicht gefunden',
        errorLoading: 'Zugriff auf Auftrag fehlgeschlagen. Überprüfen Sie Ihre Internetverbindung.',
        errorConfirming: 'Bestätigungsfehler. Versuchen Sie es erneut.'
    },
    nl: {
        workOrder: 'Werkbon',
        confirmed: 'Bestelling bevestigd!',
        confirmedBy: 'Bevestigd door',
        onDate: 'op',
        signature: 'Geregistreerde handtekening',
        start: 'Start',
        deadline: 'Deadline',
        client: 'Klant',
        location: 'Locatie',
        requirements: 'Vereisten',
        volumes: 'Geschatte volumes',
        materials: 'Materialen',
        notes: 'Opmerkingen',
        approxDate: 'Datum (Geschat)',
        confirmOrder: 'Orderbevestiging',
        confirmDesc: 'Vul uw gegevens in, plaats uw digitale handtekening en bevestig.',
        confirmedByLabel: 'Bevestigd door *',
        namePlaceholder: 'Volledige naam / Bedrijf',
        digitalSignature: 'Digitale handtekening *',
        signatureRequired: 'Handtekening is verplicht',
        terms: 'Ik heb alle vereisten, voorwaarden en termijnen vermeld in deze werkbon gelezen en ga hiermee akkoord.',
        confirmBtn: 'Bevestigen en tekenen',
        confirmingBtn: 'Bevestigen...',
        estimatedPrice: 'Geschatte prijs',
        finalInvoice: 'Eindfactuur (PDF)',
        downloadPdf: 'PDF downloaden',
        completionPhotos: "Voltooiingsfoto's",
        signHere: 'Teken hier met muis of vinger',
        clearSignature: 'Handtekening wissen',
        loadingOrder: 'Bestelling laden...',
        orderNotFound: 'Bestelling niet gevonden',
        errorLoading: 'Kan de bestelling niet openen. Controleer uw internetverbinding.',
        errorConfirming: 'Bevestigingsfout. Probeer het opnieuw.'
    },
    ru: {
        workOrder: 'Заказ-наряд',
        confirmed: 'Заказ подтвержден!',
        confirmedBy: 'Подтверждено',
        onDate: 'дата',
        signature: 'Зарегистрированная подпись',
        start: 'Начало',
        deadline: 'Срок',
        client: 'Клиент',
        location: 'Местоположение',
        requirements: 'Требования',
        volumes: 'Оценочные объемы',
        materials: 'Материалы',
        notes: 'Примечания',
        confirmOrder: 'Подтверждение заказа',
        confirmDesc: 'Заполните свои данные, поставьте цифровую подпись и подтвердите.',
        confirmedByLabel: 'Подтверждено (кем) *',
        namePlaceholder: 'ФИО / Компания',
        digitalSignature: 'Цифровая подпись *',
        signatureRequired: 'Подпись обязательна',
        terms: 'Я прочитал и согласен со всеми требованиями, условиями и сроками, указанными в этом заказе-наряде.',
        confirmBtn: 'Подтвердить и подписать',
        confirmingBtn: 'Подтверждение...',
        estimatedPrice: 'Ориентировочная цена',
        finalInvoice: 'Финальный счет (PDF)',
        downloadPdf: 'Скачать PDF',
        completionPhotos: 'Фото завершения',
        signHere: 'Подпишитесь здесь мышью или пальцем',
        clearSignature: 'Очистить подпись',
        loadingOrder: 'Загрузка заказа...',
        orderNotFound: 'Заказ не найден',
        errorLoading: 'Не удалось получить доступ к заказу. Проверьте подключение к интернету.',
        errorConfirming: 'Ошибка подтверждения. Попробуйте снова.'
    }
}

// ─── Dynamic Terms Translation (Regex based) ──────────────────────────────────
const translateDynamic = (text, lang) => {
    if (!text) return text;
    // Don't translate if Romanian
    if (lang === 'ro') return text;

    let t = text.toString();
    
    const rules = [
        { regex: /montaj[ \-]*[sșş]ap[aăâ]/i, fr: 'Chape', nl: 'Chape', en: 'Screed' },
        { regex: /^[sșş]ap[aăâ]$/i, fr: 'Chape', nl: 'Chape', en: 'Screed' },
        { regex: /manoper[aăâ]/i, fr: "Main-d'œuvre", nl: 'Arbeid', en: 'Labor' }
    ];

    for (const rule of rules) {
        if (rule.regex.test(t)) {
            // Replace the matched part or the whole string if it's a direct match
            // For simplicity, if it matches, we'll replace the regex match with the translation
            t = t.replace(rule.regex, rule[lang] || rule.en);
        }
    }
    return t;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WorkOrderConfirm() {
    const { token } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    const urlLang = searchParams.get('lang')
    const [lang, setLang] = useState(urlLang || 'fr')
    const t = LANG_DICT[lang] || LANG_DICT['fr']
    
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [confirmed, setConfirmed] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [checkedTerms, setCheckedTerms] = useState(false)
    const [confirmedByName, setConfirmedByName] = useState('')
    const [signature, setSignature] = useState(null)
    const [mode, setMode] = useState('quote')

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get(`/public/work-orders/${token}`)
                const data = res.data
                setOrder(data)
                if (data.client_name) setConfirmedByName(data.client_name)
                
                const isFinal = data.status === 'completed' || data.final_confirmed_at;
                setMode(isFinal ? 'final' : 'quote');
                
                if (isFinal) {
                    if (data.final_confirmed_at) setConfirmed(true)
                } else {
                    if (data.confirmed_at) setConfirmed(true)
                }
            } catch (err) {
                setError(err.response?.data?.detail || t.errorLoading)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [token])

    const handleConfirm = async () => {
        if (!checkedTerms || !signature) return
        setConfirming(true)
        try {
            const res = await api.post(`/public/work-orders/${token}/confirm`, {
                confirmed_by_name: confirmedByName,
                client_signature: signature,
                mode: mode
            })
            setOrder(res.data)
            setConfirmed(true)
        } catch (err) {
            setError(err.response?.data?.detail || t.errorConfirming)
        } finally {
            setConfirming(false)
        }
    }

    const docInputRef = useRef(null)
    const [isUploadingDoc, setIsUploadingDoc] = useState(false)
    const [toast, setToast] = useState(null)
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 4000)
    }
    const handleDocumentUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files || [])
        if (!selectedFiles.length) return
        
        if (selectedFiles.length > 10) {
            showToast('Vous pouvez charger au maximum 10 fichiers à la fois.', 'error')
            if (docInputRef.current) docInputRef.current.value = ''
            return
        }

        setIsUploadingDoc(true)
        const formData = new FormData()
        selectedFiles.forEach(f => formData.append('files', f))

        try {
            const res = await api.post(`/public/work-orders/${token}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            // Update order with the new document(s)
            setOrder(prev => ({
                ...prev,
                client_documents: [...(prev.client_documents || []), ...(res.data.documents || [])]
            }))
            showToast(res.data.message || 'Documents chargés avec succès !')
        } catch (err) {
            console.error(err)
            showToast(err.response?.data?.detail || 'Erreur lors du chargement des documents.', 'error')
        } finally {
            setIsUploadingDoc(false)
            if (docInputRef.current) docInputRef.current.value = ''
        }
    }

    const primaryColor = order?.org_primary_color || '#3b82f6'
    const canConfirm = checkedTerms && !!signature && !confirming

    const formatDate = (d) => d
        ? new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
        : null

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">{t.loadingOrder}</p>
            </div>
        </div>
    )

    if (error && !order) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-black text-slate-900 mb-2">{t.orderNotFound}</h1>
                <p className="text-slate-600">{error}</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            {/* Header branded */}
            <div className="w-full py-5 px-6 border-b border-slate-200 bg-white shadow-sm">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {order?.org_logo ? (
                            <img src={order.org_logo} alt={order.org_name} className="h-10 object-contain" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md"
                                style={{ backgroundColor: primaryColor }}>
                                {order?.org_name?.charAt(0) || 'C'}
                            </div>
                        )}
                        <div>
                            <p className="font-black text-slate-900 text-lg">{order?.org_name}</p>
                            <p className="text-xs text-slate-500 font-medium">{t.workOrder}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-600">{t.workOrder}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                {/* Confirmed banner */}
                {confirmed && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                        <h2 className="text-xl font-black text-emerald-800 mb-1">{t.confirmed}</h2>
                        {order?.confirmed_at && mode === 'quote' && (
                            <p className="text-emerald-600 text-sm">
                                {t.confirmedBy} <strong>{order.confirmed_by_name}</strong> {t.onDate}{' '}
                                {new Date(order.confirmed_at).toLocaleString(lang === 'ro' ? 'ro-RO' : 'en-GB')}
                            </p>
                        )}
                        
                        {order?.final_confirmed_at && mode === 'final' && (
                            <p className="text-emerald-600 text-sm">
                                {t.confirmedBy} <strong>{order.final_confirmed_by_name}</strong> {t.onDate}{' '}
                                {new Date(order.final_confirmed_at).toLocaleString(lang === 'ro' ? 'ro-RO' : 'en-GB')}
                            </p>
                        )}
                    </div>
                )}

                {/* Action Bar & Language Switcher */}
                <div className="flex justify-between items-center mb-4 print:hidden">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg shadow hover:bg-slate-700 transition-colors"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        {t.downloadPdf || 'PDF'}
                    </button>
                    
                    <div className="flex gap-1.5">
                        {[
                            { code: 'fr', label: '🇫🇷 FR' },
                            { code: 'nl', label: '🇳🇱 NL' },
                            { code: 'en', label: '🇬🇧 EN' }
                        ].map(l => (
                            <button
                                key={l.code}
                                onClick={() => {
                                    setLang(l.code);
                                    setSearchParams({ lang: l.code }, { replace: true });
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-colors flex items-center gap-1 ${lang === l.code ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Location Map Container */}
                {/* Location Map Container */}
                {(order?.site_name || order?.site_address || order?.site_lat) && (() => {
                    const getLocalizedAddress = (addr) => {
                        if (!addr) return '';
                        let str = addr;
                        if (lang === 'fr') {
                            str = str.replace(/\bBelgia\b/gi, 'Belgique').replace(/\bRomania\b|\bRomânia\b/gi, 'Roumanie').replace(/\bOlanda\b/gi, 'Pays-Bas');
                        } else if (lang === 'nl') {
                            str = str.replace(/\bBelgia\b/gi, 'België').replace(/\bRomania\b|\bRomânia\b/gi, 'Roemenië').replace(/\bOlanda\b/gi, 'Nederland');
                        } else if (lang === 'en') {
                            str = str.replace(/\bBelgia\b/gi, 'Belgium').replace(/\bRomania\b|\bRomânia\b/gi, 'Romania').replace(/\bOlanda\b/gi, 'Netherlands');
                        }
                        return str;
                    };
                    const displayAddr = getLocalizedAddress(order.site_address || order.site_name);
                    
                    return (
                        <div className="bg-transparent rounded-2xl border-0 overflow-hidden mb-6 flex flex-col print:hidden">
                            <div className="px-1 py-2 flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                                <div className="font-extrabold text-slate-900 text-sm uppercase tracking-wide truncate">
                                    {displayAddr}
                                </div>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-inner w-full h-[220px]">
                                <MapView
                                    latitude={order.site_lat}
                                    longitude={order.site_lon}
                                    address={displayAddr}
                                    height="100%"
                                    zoom={15}
                                    markerType="pin"
                                />
                            </div>
                        </div>
                    );
                })()}

                {/* Embed the PDF with integrated Signature */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-6 w-full relative print:hidden">
                    <DevisView 
                        embeddedToken={token} 
                        signatureElement={
                            !confirmed ? (
                                <div className="w-full relative h-full flex flex-col">
                                    <div className="flex-1 flex flex-col">
                                        <SignaturePad onChange={setSignature} disabled={confirming} t={t} />
                                    </div>
                                    {!signature && (
                                        <p className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-1 absolute -bottom-6 left-0">
                                            <AlertCircle className="w-3 h-3" /> {t.signatureRequired}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full flex flex-col">
                                    <div className="w-full aspect-[3.5/1] border-2 border-emerald-200 bg-emerald-50/50 rounded-2xl flex items-center justify-center p-2">
                                        <img src={mode === 'final' ? order?.final_client_signature : order?.client_signature} alt="Signature" className="max-h-full object-contain" />
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-bold mt-2">
                                        Date: {new Date(mode === 'final' ? order?.final_confirmed_at : order?.confirmed_at).toLocaleString(lang === 'ro' ? 'ro-RO' : 'en-GB')}
                                    </div>
                                </div>
                            )
                        } 
                    />
                </div>

                {/* Confirm section (integrated immediately below PDF) */}
                {!confirmed && (
                    <div className="flex flex-col gap-3 mt-2 print:hidden w-full max-w-2xl mx-auto">
                        <label className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100 cursor-pointer group transition-colors hover:bg-blue-50">
                            <input
                                type="checkbox"
                                checked={checkedTerms}
                                onChange={e => setCheckedTerms(e.target.checked)}
                                disabled={confirming}
                                className="mt-0.5 w-5 h-5 rounded text-blue-600 focus:ring-blue-500 shadow-sm"
                            />
                            <span className="text-sm text-blue-900 font-bold group-hover:text-blue-950 transition-colors leading-relaxed">
                                {mode === 'final' ? t.termsFinal : t.terms}
                            </span>
                        </label>

                        {error && (
                            <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
                        )}

                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!canConfirm}
                            className={`w-full h-14 rounded-2xl text-white font-black text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                                canConfirm ? 'hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]' : 'opacity-40 cursor-not-allowed'
                            }`}
                            style={{ backgroundColor: primaryColor }}
                        >
                            {confirming
                                ? <><Loader2 className="w-5 h-5 animate-spin" /> {t.confirmingBtn}</>
                                : <><CheckCircle2 className="w-5 h-5" /> {t.confirmBtn}</>
                            }
                        </button>
                    </div>
                )}

                {/* Client Documents (Upload & List) */}
                <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print:hidden w-full max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-slate-500" />
                            {t.clientDocuments || 'Documents Client (Plans / Photos)'}
                        </h3>
                        <input type="file" ref={docInputRef} onChange={handleDocumentUpload} accept="image/*,application/pdf" className="hidden" multiple max="10" />
                        <button 
                            onClick={() => docInputRef.current?.click()}
                            disabled={isUploadingDoc}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                        >
                            {isUploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                            {t.addDocument || 'Ajouter un Document'}
                        </button>
                    </div>

                    {order?.client_documents?.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {order.client_documents.map((d, i) => (
                                <a key={i} href={d.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{d.filename}</p>
                                        <p className="text-[10px] text-slate-400">
                                            {new Date(d.uploaded_at).toLocaleDateString('ro-RO')}
                                        </p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-4">
                            {t.noDocuments || 'Aucun document chargé.'}
                        </p>
                    )}
                </div>

                {/* Invoice Download */}
                {order?.final_invoice_path && (
                    <div className="mt-6 print:hidden w-full max-w-2xl mx-auto">
                        <a 
                            href={order.final_invoice_path} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <FileText className="w-5 h-5" />
                            {t.finalInvoice || 'Facture finale (PDF)'}
                        </a>
                    </div>
                )}

                {/* Completion Photos */}
                {order?.completion_photos?.length > 0 && (
                    <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print:hidden w-full max-w-2xl mx-auto">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-slate-500" />
                            {t.completionPhotos || 'Photos de réalisation'} ({order.completion_photos.length})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {order.completion_photos.map((p, i) => (
                                <a key={i} href={p.photo_url} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <img src={p.photo_url} alt="Lucrare" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-center pb-8 mt-4">
                    <a href="https://www.getapp.ro" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors group">
                        <div className="flex items-center gap-2">
                            <span className="font-bold tracking-wide">Powered by</span>
                            <div className="bg-slate-800 px-3 py-2 rounded-xl shadow-md group-hover:bg-slate-900 transition-all group-hover:scale-105">
                                <img src="https://getapp.ro/logo_getapp_original.png" alt="GetApp" className="h-3.5 object-contain" />
                            </div>
                        </div>
                        <span className="font-extrabold tracking-widest text-[11px] uppercase">www.getapp.ro</span>
                    </a>
                </div>
            </div>
            {toast && (
                <div className="fixed bottom-4 right-4 z-[9999]">
                    <div className={`px-4 py-2 rounded-full shadow-lg text-[11px] font-bold uppercase tracking-wide border 
                        ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {toast.msg}
                    </div>
                </div>
            )}
        </div>
    )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useSearchParams } from 'react-router-dom'
import { FileText, CheckCircle2, ClipboardList, MapPin, Calendar, User, AlertCircle, Loader2, Pen, RotateCcw, Camera, Paperclip, X, ChevronLeft, ChevronRight, MessageSquare, Send, Trash2, Smile, Edit2, ShieldAlert, ExternalLink } from 'lucide-react'
import DocumentPreviewModal from '../../components/DocumentPreviewModal'
import api from '../../lib/api'
import MapView from '../../components/MapView'
import DevisView from '../admin/DevisView'
import AddressAutocomplete from '../../components/AddressAutocomplete'

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
        plannedDate: 'Planned Date',
        proposedDate: 'Requested Date',
        pendingValidationNotice: 'Pending validation by the Davide Chape planning team',
        confirmationFollowUpNote: 'Thank you for your trust! Your order has been registered with your requested date. Our planning team will contact you shortly to confirm and validate the final intervention date together.',
        plannedTime: 'Time',
        confirmOrder: 'Order Confirmation',
        confirmDesc: 'Fill in your details, apply your digital signature, and confirm.',
        confirmedByLabel: 'Confirmed by *',
        namePlaceholder: 'Full Name / Company',
        digitalSignature: 'Digital Signature',
        signatureRequired: 'Signature is required',
        acceptOffer: 'I confirm that I have read the quote and the requested date, and I accept this offer.',
        termsFinal: 'I have verified the executed work, including the attached photos, and I confirm that the work has been properly completed.',
        orAcceptWithout: 'or accept without signature:',
        terms: 'I have read and agree to all the requirements, terms, conditions, and the scheduled date specified in this work order.',
        confirmBtn: 'Confirm and Sign',
        confirmingBtn: 'Confirming...',
        confirmDateBtn: 'Confirm Date',
        dateConfirmedMsg: 'Date Confirmed',
        estimatedPrice: 'Estimated Price',
        finalInvoice: 'Final Invoice (PDF)',
        downloadPdf: 'Download PDF',
        completionPhotos: 'Completion Photos',
        signHere: 'Sign here with mouse or finger',
        clearSignature: 'Clear signature',
        loadingOrder: 'Loading order...',
        orderNotFound: 'Order not found',
        errorLoading: 'Could not access the order. Check your internet connection.',
        errorConfirming: 'Confirmation error. Try again.',
        updateNotification: 'Important update! The intervention date or estimated price has been modified. Please review the new information.',
        clientDocuments: 'Client Documents (Plans / Photos)',

        noDocuments: 'No documents uploaded.',
        orderCancelled: 'This order has been cancelled.',
        rescheduleTitle: 'Request another date',
        rescheduleDesc: 'Write your preferred date and reason below. We will contact you shortly to set a new appointment.',
        reschedulePlaceholder: 'E.g.: I would prefer August 15th, after 10:00...',
        rescheduleSubmit: 'Send Request',
        rescheduleSuccess: 'Request sent successfully!',
        reschedulePending: 'You requested a reschedule. Our team will contact you.',
        contactChatToReschedule: 'If you wish to modify this date, please contact us via chat.',
        addDocument: 'Add Documents / Plans / Photos',
        communication: 'COMMUNICATION',
        noMessages: 'No messages yet.',
        writeMessage: 'Write to Davide Chape...',
        you: 'You (Client)',
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
        plannedDate: 'Date de l\'intervention',
        proposedDate: 'Date souhaitée',
        pendingValidationNotice: 'En attente de validation par l\'équipe Davide Chape',
        confirmationFollowUpNote: 'Merci pour votre confiance ! Votre commande a bien été enregistrée avec votre date souhaitée. Notre équipe de planification prendra contact avec vous dans les plus brefs délais afin de valider ensemble la date définitive d\'intervention.',
        plannedTime: 'Heure',
        confirmOrder: 'Confirmation de commande',
        confirmDesc: 'Remplissez vos coordonnées, appliquez votre signature numérique et confirmez.',
        confirmedByLabel: 'Confirmé par *',
        namePlaceholder: 'Nom et prénom / Entreprise',
        digitalSignature: 'Signature numérique',
        signatureRequired: 'La signature est obligatoire',
        acceptOffer: "Je confirme avoir pris connaissance du devis, de la date d'intervention souhaitée et j'accepte cette offre.",
        orAcceptWithout: 'ou acceptez sans signature :',
        terms: "J'ai lu et j'accepte toutes les exigences, termes, conditions et la date d'intervention spécifiés dans ce bon de travail.",
        termsFinal: "J'ai vérifié les travaux exécutés, y compris les photos jointes, et je confirme que le travail a été correctement terminé.",
        confirmBtn: 'Confirmer et signer',
        confirmingBtn: 'Confirmation en cours...',
        confirmDateBtn: 'Confirmer la date',
        dateConfirmedMsg: 'Date confirmée',
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
        updateNotification: 'Mise à jour importante ! La date d\'intervention ou le devis a été modifié. Veuillez vérifier les nouvelles informations.',
        clientDocuments: 'Documents Client (Plans / Photos)',

        noDocuments: 'Aucun document chargé.',
        orderCancelled: 'Cette commande a été annulée.',
        rescheduleTitle: 'Demander une autre date',
        rescheduleDesc: 'Indiquez ci-dessous la date souhaitée et la raison. Nous vous contacterons rapidement pour convenir d\'un nouveau rendez-vous.',
        reschedulePlaceholder: 'Ex : Je préférerais le 15 août, après 10h00...',
        rescheduleSubmit: 'Envoyer la demande',
        rescheduleSuccess: 'Demande envoyée avec succès !',
        reschedulePending: 'Vous avez demandé une autre date. Notre équipe vous contactera.',
        contactChatToReschedule: 'Si vous souhaitez modifier cette date, veuillez nous contacter via le chat.',
        addDocument: 'Ajouter des Documents / Plans / Photos',
        communication: 'COMMUNICATION',
        noMessages: 'Aucun message pour le moment.',
        writeMessage: 'Écrivez à Davide Chape...',
        you: 'Vous (Client)',
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
        location: 'Ort',
        requirements: 'Anforderungen',
        volumes: 'Geschätzte Volumen',
        materials: 'Materialien',
        notes: 'Notizen',
        approxDate: 'Datum (Ungefähr)',
        plannedDate: 'Geplantes Datum',
        proposedDate: 'Wunschtermin',
        pendingValidationNotice: 'Vorbehaltlich der Bestätigung durch das Davide Chape Planungsteam',
        confirmationFollowUpNote: 'Vielen Dank für Ihr Vertrauen! Ihre Bestellung wurde mit Ihrem Wunschtermin erfasst. Unser Planungsteam wird sich in Kürze mit Ihnen in Verbindung setzen, um den endgültigen Termin gemeinsam abzustimmen.',
        plannedTime: 'Zeit',
        confirmOrder: 'Auftragsbestätigung',
        confirmDesc: 'Geben Sie Ihre Daten ein, fügen Sie Ihre digitale Unterschrift hinzu und bestätigen Sie.',
        confirmedByLabel: 'Bestätigt von *',
        namePlaceholder: 'Vor- und Nachname / Firma',
        digitalSignature: 'Digitale Unterschrift',
        signatureRequired: 'Unterschrift ist erforderlich',
        acceptOffer: 'Ich bestätige, dass ich das Angebot gelesen habe und nehme dieses Angebot an.',
        orAcceptWithout: 'oder ohne Unterschrift akzeptieren:',
        terms: 'Ich habe alle in diesem Arbeitsauftrag festgelegten Anforderungen, Bedingungen und Konditionen gelesen und stimme ihnen zu.',
        termsFinal: 'Ich habe die ausgeführten Arbeiten einschließlich der beigefügten Fotos überprüft und bestätige, dass die Arbeit ordnungsgemäß abgeschlossen wurde.',
        confirmBtn: 'Bestätigen und Unterschreiben',
        confirmingBtn: 'Bestätige...',
        confirmDateBtn: 'Datum bestätigen',
        dateConfirmedMsg: 'Datum bestätigt',
        estimatedPrice: 'Geschätzter Preis',
        finalInvoice: 'Endrechnung (PDF)',
        downloadPdf: 'PDF Herunterladen',
        completionPhotos: 'Abschlussfotos',
        signHere: 'Unterschreiben Sie hier mit der Maus oder dem Finger',
        clearSignature: 'Unterschrift löschen',
        loadingOrder: 'Lade Auftrag...',
        orderNotFound: 'Auftrag nicht gefunden',
        errorLoading: 'Konnte nicht auf den Auftrag zugreifen. Überprüfen Sie Ihre Internetverbindung.',
        errorConfirming: 'Bestätigungsfehler. Versuchen Sie es erneut.',
        updateNotification: 'Wichtiges Update! Das Eingriffsdatum oder das Angebot wurde geändert. Bitte überprüfen Sie die neuen Informationen.',
        orderCancelled: 'Dieser Auftrag wurde storniert.',
        rescheduleTitle: 'Anderes Datum anfragen',
        rescheduleDesc: 'Schreiben Sie unten Ihr bevorzugtes Datum und den Grund. Wir werden Sie kontaktieren.',
        reschedulePlaceholder: 'Bsp.: Ich bevorzuge den 15. August, nach 10:00...',
        rescheduleSubmit: 'Anfrage senden',
        rescheduleSuccess: 'Anfrage erfolgreich gesendet!',
        reschedulePending: 'Sie haben ein anderes Datum angefragt. Unser Team wird Sie kontaktieren.',
        contactChatToReschedule: 'Wenn Sie dieses Datum ändern möchten, kontaktieren Sie uns bitte über den Chat.',
        addDocument: 'Dokumente / Pläne / Fotos hinzufügen',
        communication: 'KOMMUNIKATION',
        noMessages: 'Noch keine Nachrichten.',
        writeMessage: 'Schreiben Sie an Davide Chape...',
        you: 'Sie (Kunde)',
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
        approxDate: 'Datum (Ongeveer)',
        plannedDate: 'Geplande datum',
        proposedDate: 'Gewenste datum',
        pendingValidationNotice: 'In afwachting van bevestiging door het planningsteam van Davide Chape',
        confirmationFollowUpNote: 'Bedankt voor uw vertrouwen! Uw bestelling is geregistreerd met uw gewenste datum. Ons planningsteam neemt spoedig contact met u op om samen de definitieve datum van de werken af te stemmen en te bevestigen.',
        plannedTime: 'Tijd',
        confirmOrder: 'Orderbevestiging',
        confirmDesc: 'Vul uw gegevens in, plaats uw digitale handtekening en bevestig.',
        confirmedByLabel: 'Bevestigd door *',
        namePlaceholder: 'Voor- en achternaam / Bedrijf',
        digitalSignature: 'Digitale handtekening',
        signatureRequired: 'Handtekening is verplicht',
        acceptOffer: 'Ik bevestig dat ik kennis heb genomen van de offerte en de gewenste datum, en ik accepteer dit aanbod.',
        orAcceptWithout: 'of accepteer zonder handtekening:',
        terms: 'Ik heb alle vereisten, voorwaarden en de geplande datum gespecificeerd in deze werkbon gelezen en ga hiermee akkoord.',
        termsFinal: 'Ik heb de uitgevoerde werkzaamheden, inclusief de bijgevoegde foto\'s, gecontroleerd en ik bevestig dat het werk naar behoren is voltooid.',
        confirmBtn: 'Bevestigen en ondertekenen',
        confirmingBtn: 'Bezig met bevestigen...',
        confirmDateBtn: 'Datum bevestigen',
        dateConfirmedMsg: 'Datum bevestigd',
        estimatedPrice: 'Geschatte prijs',
        finalInvoice: 'Eindfactuur (PDF)',
        downloadPdf: 'PDF downloaden',
        completionPhotos: "Voltooiingsfoto's",
        signHere: 'Teken hier met muis of vinger',
        clearSignature: 'Handtekening wissen',
        loadingOrder: 'Bestelling laden...',
        orderNotFound: 'Bestelling niet gevonden',
        errorLoading: 'Kan de bestelling niet openen. Controleer uw internetverbinding.',
        errorConfirming: 'Bevestigingsfout. Probeer het opnieuw.',
        orderCancelled: 'Deze bestelling is geannuleerd.',
        rescheduleTitle: 'Vraag een andere datum aan',
        rescheduleDesc: 'Schrijf hieronder uw voorkeursdatum en reden. Wij nemen zo snel mogelijk contact met u op.',
        reschedulePlaceholder: 'Bijv.: Ik geef de voorkeur aan 15 augustus, na 10:00...',
        rescheduleSubmit: 'Verzoek verzenden',
        rescheduleSuccess: 'Verzoek succesvol verzonden!',
        reschedulePending: 'U heeft om een andere datum gevraagd. Ons team neemt contact met u op.',
        updateNotification: 'Belangrijke update! De interventiedatum of de offerte is gewijzigd. Controleer de nieuwe informatie.',
        contactChatToReschedule: 'Als u deze datum wilt wijzigen, neem dan contact met ons op via de chat.',
        addDocument: 'Documenten / Plannen / Foto\'s toevoegen',
        communication: 'COMMUNICATIE',
        noMessages: 'Nog geen berichten.',
        writeMessage: 'Schrijf naar Davide Chape...',
        you: 'U (Klant)',
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
        proposedDate: 'Желаемая дата',
        pendingValidationNotice: 'Ожидает подтверждения командой планирования Davide Chape',
        confirmationFollowUpNote: 'Спасибо за доверие! Ваш заказ зарегистрирован с желаемой датой. Наша команда свяжется с вами в ближайшее время для согласования и утверждения окончательной даты.',
        confirmOrder: 'Подтверждение заказа',
        confirmDesc: 'Заполните свои данные, поставьте цифровую подпись и подтвердите.',
        confirmedByLabel: 'Подтверждено (кем) *',
        namePlaceholder: 'ФИО / Компания',
        digitalSignature: 'Цифровая подпись',
        signatureRequired: 'Подпись обязательна',
        acceptOffer: 'Я подтверждаю, что ознакомился с предложением и принимаю его.',
        orAcceptWithout: 'или примите без подписи:',
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
        errorConfirming: 'Ошибка подтверждения. Попробуйте снова.',
        orderCancelled: 'Этот заказ был отменен.',
        addDocument: 'Добавить документы / планы / фото',
        communication: 'СВЯЗЬ',
        noMessages: 'Нет сообщений.',
        writeMessage: 'Напишите Davide Chape...',
        you: 'Вы (Клиент)',
    }
}

// ─── Dynamic Terms Translation (Regex based) ──────────────────────────────────
const translateDynamic = (text, lang) => {
    if (!text) return text;
    // Don't translate if Romanian
    if (lang === 'ro') return text;

    let t = text.toString();
    
    const rules = [
        { regex: /montaj[ \-]*[sșş]ap[aăâ]/i, fr: 'Chape', nl: 'Chape', en: 'Chape' },
        { regex: /^[sșş]ap[aăâ]$/i, fr: 'Chape', nl: 'Chape', en: 'Chape' },
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
export default function WorkOrderConfirm({ hideMap = false }) {
    const { token } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    const urlLang = searchParams.get('lang')
    const isSeller = searchParams.get('role') === 'seller'
    const initialLang = (urlLang && ['fr', 'nl', 'en', 'de'].includes(urlLang)) ? urlLang : 'fr'
    const [lang, setLang] = useState(initialLang)
    const [sellerTargetLang, setSellerTargetLang] = useState(initialLang)
    const t = LANG_DICT[lang] || LANG_DICT['fr']
    
    const MODAL_T = {
        fr: {
            title: 'Confirmation de la date',
            desc: `Confirmez-vous cette date ou souhaitez-vous demander une autre date ?`,
            requestBtn: 'Demander une autre date',
            confirmBtn: 'Confirmer la date'
        },
        ro: {
            title: 'Confirmare Dată',
            desc: `Confirmați această dată sau doriți să solicitați altă dată?`,
            requestBtn: 'Solicită altă dată',
            confirmBtn: 'Confirmă data'
        },
        de: {
            title: 'Bestätigung des Datums',
            desc: `Bestätigen Sie dieses Datum oder möchten Sie ein anderes Datum anfragen?`,
            requestBtn: 'Anderes Datum anfragen',
            confirmBtn: 'Datum bestätigen'
        },
        nl: {
            title: 'Datum bevestigen',
            desc: `Bevestigt u deze datum of wilt u een andere datum aanvragen?`,
            requestBtn: 'Andere datum aanvragen',
            confirmBtn: 'Datum bevestigen'
        },
        en: {
            title: 'Date Confirmation',
            desc: `Do you confirm this date or wish to request another date?`,
            requestBtn: 'Request another date',
            confirmBtn: 'Confirm date'
        }
    };
    const mT = MODAL_T[lang] || MODAL_T.fr;
    
    const isIframe = searchParams.get('iframe') === 'true';

    useEffect(() => {
        if (isIframe) {
            const link = document.createElement('link');
            link.href = 'https://fonts.googleapis.com/css2?family=Inter';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
            
            const style = document.createElement('style');
            style.innerHTML = `
                body, html, #root, .min-h-screen { background: transparent !important; }
                * { font-family: 'Space Grotesk', sans-serif !important; }
                h1, h2, h3, h4, h5, h6 { font-weight: 700 !important; color: #202020 !important; }
                
                /* Ascunde partea de sus a header-ului daca e iframe */
                .w-full.py-5.px-6.border-b { display: none !important; }
                
                /* Suprascrie galbenul si albastrul cu F7CA31 */
                .bg-blue-600, .bg-blue-500, .bg-indigo-600 { background-color: #F7CA31 !important; color: #202020 !important; }
                .hover\\:bg-blue-700:hover, .hover\\:bg-blue-600:hover { background-color: #e5b927 !important; color: #202020 !important; }
                .text-blue-600, .text-blue-500 { color: #F7CA31 !important; }
                .border-blue-600, .border-blue-500 { border-color: #F7CA31 !important; }
                .ring-blue-600, .ring-blue-500 { --tw-ring-color: #F7CA31 !important; }
                
                /* Butoane mai putin rotunde */
                button { border-radius: 6px !important; }
                input, select { border-radius: 6px !important; }
            `;
            document.head.appendChild(style);
            return () => {
                document.head.removeChild(link);
                document.head.removeChild(style);
            };
        }
    }, [isIframe]);
    
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [confirmed, setConfirmed] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [showDateModal, setShowDateModal] = useState(false)
    const [checkedTerms, setCheckedTerms] = useState(true)
    const [confirmedByName, setConfirmedByName] = useState('')
    const [signature, setSignature] = useState(null)
    const [acceptedOffer, setAcceptedOffer] = useState(false)
    const [mode, setMode] = useState('quote')
    const [dateConfirmed, setDateConfirmed] = useState(false)
    const [confirmingDate, setConfirmingDate] = useState(false)
    const [lightboxImages, setLightboxImages] = useState([])
    const [lightboxIndex, setLightboxIndex] = useState(null)
    const [showRescheduleForm, setShowRescheduleForm] = useState(false)
    const [rescheduleReason, setRescheduleReason] = useState('')
    const [rescheduleDate, setRescheduleDate] = useState('')
    const [submittingReschedule, setSubmittingReschedule] = useState(false)
    const docInputRef = useRef(null)
    const [isUploadingDoc, setIsUploadingDoc] = useState(false)
    const [toast, setToast] = useState(null)
    
    // Address Edit
    const [isEditingAddress, setIsEditingAddress] = useState(false)
    const [editAddressData, setEditAddressData] = useState({ address: '', lat: null, lon: null })

    
    const translateItemName = (name, targetLang) => {
        if (!name) return name;
        if (targetLang === 'fr') return name; // e deja in franceza in DB
        
        const n = name.toLowerCase();
        
        if (targetLang === 'en') {
            if (n.includes('chape')) return name.replace(/chape/i, 'Screed');
            if (n.includes('isolation') || n.includes('pur') || n.includes('eps')) return name.replace(/isolation/i, 'Insulation');
            if (n.includes('transport')) return 'Transport';
            if (n.includes('pompage')) return 'Pumping';
            if (n.includes('supplément')) return name.replace(/supplément/i, 'Extra').replace(/épaisseur/i, 'thickness');
        }
        
        if (targetLang === 'nl') {
            if (n.includes('chape')) return name.replace(/chape/i, 'Chape'); // In olandeza se foloseste tot Chape
            if (n.includes('isolation') || n.includes('pur') || n.includes('eps')) return name.replace(/isolation/i, 'Isolatie');
            if (n.includes('transport')) return 'Transport';
            if (n.includes('pompage')) return 'Pompen';
            if (n.includes('supplément')) return name.replace(/supplément/i, 'Extra').replace(/épaisseur/i, 'dikte');
        }
        
        if (targetLang === 'ro') {
            if (n.includes('chape')) return name.replace(/chape/i, 'Șapă');
            if (n.includes('isolation') || n.includes('pur') || n.includes('eps')) return name.replace(/isolation/i, 'Izolație');
            if (n.includes('transport')) return 'Transport';
            if (n.includes('pompage')) return 'Pompare';
            if (n.includes('supplément')) return name.replace(/supplément/i, 'Supliment').replace(/épaisseur/i, 'grosime');
        }
        
        return name;
    };

    const handleSaveAddress = async () => {
        try {
            await api.patch(`/public/work-orders/${token}/address`, {
                site_address: editAddressData.address,
                site_latitude: editAddressData.lat,
                site_longitude: editAddressData.lon
            })
            setOrder(prev => ({
                ...prev,
                site_address: editAddressData.address,
                site_lat: editAddressData.lat,
                site_lon: editAddressData.lon
            }))
            setIsEditingAddress(false)
            showToast(translations[lang].addressUpdated || 'Address updated successfully.', 'success')
        } catch (err) {
            console.error(err)
            showToast(translations[lang].errorConfirming || 'Error updating address.', 'error')
        }
    }

    // Chat Client-Admin
    const [messages, setMessages] = useState([])
    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null)
    const [previewDocIndex, setPreviewDocIndex] = useState(null)
    const [chatMessage, setChatMessage] = useState("")
    const [sendingMessage, setSendingMessage] = useState(false)
    const [previewAttachment, setPreviewAttachment] = useState(null)
    const getImageUrl = (path) => {
        if (!path) return "";
        if (path.startsWith("http")) return path;
        return `https://davidechape.pontaj.app${path.startsWith("/") ? "" : "/"}${path}`;
    };
    const [lastReadTime, setLastReadTime] = useState(() => localStorage.getItem(`chat_last_read_${token}`) || null)
    const chatContainerRef = useRef(null)
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }
    useEffect(() => {
        // Prevent auto-scrolling on initial empty render
        if (messages.length > 0) {
            scrollToBottom()
        }
    }, [messages])

    // Keydown for lightbox
    useEffect(() => {
        if (lightboxIndex === null) return
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setLightboxIndex(null)
            if (e.key === 'ArrowLeft') setLightboxIndex(prev => prev > 0 ? prev - 1 : prev)
            if (e.key === 'ArrowRight' && lightboxImages.length > 0) {
                setLightboxIndex(prev => prev < lightboxImages.length - 1 ? prev + 1 : prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [lightboxIndex, lightboxImages])

    useEffect(() => {
        const load = async () => {
            try {
                const fetchUrl = urlLang ? `/public/work-orders/${token}?lang=${urlLang}` : `/public/work-orders/${token}`
                const res = await api.get(fetchUrl)
                const rawData = res.data
                const data = rawData.workOrderData ? { ...rawData.workOrderData, ...rawData } : rawData
                if (data.status === 'cancelled') {
                    setError(t.orderCancelled)
                    setLoading(false)
                    return
                }
                setOrder(data)
                if (data.client_name) setConfirmedByName(data.client_name)
                
                // If user didn't explicitly override language via URL, adopt the quote's saved language
                const resolvedClientLang = data.client_language || data.workOrderData?.client_language
                if (resolvedClientLang && ['fr', 'nl', 'en'].includes(resolvedClientLang)) {
                    setSellerTargetLang(resolvedClientLang);
                }
                if (!urlLang && resolvedClientLang && ['fr', 'nl', 'en', 'de', 'ro'].includes(resolvedClientLang)) {
                    setLang(resolvedClientLang);
                }
                
                const isFinal = data.status === 'completed' || data.final_confirmed_at;
                setMode(isFinal ? 'final' : 'quote');
                
                if (isFinal) {
                    if (data.final_confirmed_at) setConfirmed(true)
                } else {
                    if (data.confirmed_at) setConfirmed(true)
                }
                if (data.date_confirmed_at) {
                    setDateConfirmed(true)
                }
                
                try {
                    const msgRes = await api.get(`/public/work-orders/${token}/messages`)
                    setMessages(msgRes.data || [])
                } catch (e) {
                    console.error("Error loading messages", e)
                }
            } catch (err) {
                setError(err.response?.data?.detail || t.errorLoading)
            } finally {
                setLoading(false)
                setTimeout(() => {
                    if (window.location.hash === '#chat-section') {
                        const chatEl = document.getElementById('chat-section');
                        if (chatEl) {
                            chatEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }
                }, 300);
            }
        }
        load()
    }, [token, t.errorLoading, t.orderCancelled])

    // Auto-refresh polling: check for updates every 30 seconds
    const lastUpdatedRef = useRef(null)
    const orderRef = useRef(order)
    const [updateToast, setUpdateToast] = useState(null)
    const [needsDateConfirmation, setNeedsDateConfirmation] = useState(false)

    useEffect(() => {
        orderRef.current = order
    }, [order])

    useEffect(() => {
        if (!order) return
        lastUpdatedRef.current = order.updated_at || order.created_at
        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/public/work-orders/${token}`)
                const rawData = res.data
                const newData = rawData.workOrderData ? { ...rawData.workOrderData, ...rawData } : rawData
                if (newData.status === 'cancelled') {
                    setError(t.orderCancelled)
                    setOrder(null)
                    return
                }
                const newTimestamp = newData.updated_at || newData.created_at
                if (lastUpdatedRef.current && newTimestamp !== lastUpdatedRef.current) {
                    lastUpdatedRef.current = newTimestamp
                    
                    const currentOrder = orderRef.current
                    const hasMeaningfulChange = currentOrder && (
                        newData.status !== currentOrder.status ||
                        newData.start_date !== currentOrder.start_date ||
                        newData.start_time !== currentOrder.start_time ||
                        newData.estimated_price !== currentOrder.estimated_price ||
                        JSON.stringify(newData.prices) !== JSON.stringify(currentOrder.prices)
                    )

                    setOrder(newData)
                    
                    if (hasMeaningfulChange) {
                        const isFinal = newData.status === 'completed' || newData.final_confirmed_at;
                        setMode(isFinal ? 'final' : 'quote');
                        if (isFinal) {
                            setConfirmed(!!newData.final_confirmed_at)
                        } else {
                            setConfirmed(!!newData.confirmed_at)
                        }
                        setDateConfirmed(!!newData.date_confirmed_at)
                        
                        if (newData.start_date !== currentOrder.start_date && !newData.date_confirmed_at) {
                            setNeedsDateConfirmation(newData.start_date)
                        } else {
                            // Show update notification — stays until dismissed
                            setUpdateToast(t.updateNotification)
                        }
                    }
                }
                
                try {
                    const msgRes = await api.get(`/public/work-orders/${token}/messages`)
                    setMessages(prev => {
                        if (msgRes.data && JSON.stringify(msgRes.data) !== JSON.stringify(prev)) return msgRes.data;
                        return prev;
                    })
                } catch (e) {}
            } catch (e) {
                // Silent fail on polling
            }
        }, 15000)
        return () => clearInterval(interval)
    }, [order?.id, token, t.updateNotification])

    const handleSendMessage = async () => {
        if (!chatMessage.trim()) return;
        setSendingMessage(true);
        try {
            const payload = isSeller
                ? { message: chatMessage, role: 'seller', target_lang: sellerTargetLang }
                : { message: chatMessage };
            const res = await api.post(`/public/work-orders/${token}/messages`, payload);
            setMessages(prev => [...prev, res.data]);
            setChatMessage("");
            const now = new Date().toISOString();
            localStorage.setItem(`chat_last_read_${token}`, now);
            setLastReadTime(now);
        } catch (err) {
            console.error("Error sending message", err);
        } finally {
            setSendingMessage(false);
        }
    };

    const handleDeleteMessage = async (msgId) => {
        try {
            const deleteUrl = isSeller
                ? `/public/work-orders/${token}/messages/${msgId}?role=seller`
                : `/public/work-orders/${token}/messages/${msgId}`;
            await api.delete(deleteUrl);
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (err) {
            console.error("Error deleting message", err);
        }
    };

    const handleToggleReaction = async (msgId, emoji) => {
        try {
            const res = await api.post(`/public/work-orders/${token}/messages/${msgId}/react`, {
                emoji,
                role: isSeller ? 'seller' : 'client'
            })
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: res.data.reactions } : m))
            setShowEmojiPickerFor(null)
        } catch (err) {
            console.error("Error reacting to message", err);
        }
    }

    const handleConfirm = async () => {
        if (!checkedTerms || (!signature && !acceptedOffer)) return
        setConfirming(true)
        try {
            const res = await api.post(`/public/work-orders/${token}/confirm`, {
                confirmed_by_name: confirmedByName,
                client_signature: signature || 'accepted_without_signature',
                mode: mode,
                client_language: lang
            })
            setOrder(res.data)
            setConfirmed(true)
        } catch (err) {
            setError(err.response?.data?.detail || t.errorConfirming)
        } finally {
            setConfirming(false)
        }
    }

    const handleConfirmDate = async () => {
        setConfirmingDate(true)
        try {
            const res = await api.post(`/public/work-orders/${token}/confirm`, {
                mode: 'date',
                client_language: lang
            })
            setOrder(res.data)
            setDateConfirmed(true)
        } catch (err) {
            setError(err.response?.data?.detail || t.errorConfirming)
        } finally {
            setConfirmingDate(false)
        }
    }

    const handleReschedule = async () => {
        if (!rescheduleDate) {
            showToast(lang === 'ro' ? 'Vă rugăm să alegeți o dată!' : lang === 'fr' ? 'Veuillez choisir une date !' : lang === 'nl' ? 'Kies een datum!' : 'Please choose a date!', 'error')
            return
        }
        setSubmittingReschedule(true)
        try {
            const res = await api.post(`/public/work-orders/${token}/reschedule`, {
                requested_date: rescheduleDate,
                reason: rescheduleReason
            })
            setOrder(res.data)
            setShowDateModal(false)
            showToast(t.rescheduleSuccess, 'success')
        } catch (err) {
            setError(err.response?.data?.detail || t.errorConfirming)
        } finally {
            setSubmittingReschedule(false)
        }
    }

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

    const handleOpenChat = () => {
        const now = new Date().toISOString();
        localStorage.setItem(`chat_last_read_${token}`, now);
        setLastReadTime(now);
        
        const chatEl = document.getElementById('chat-section');
        if (chatEl) {
            chatEl.scrollIntoView({ behavior: 'smooth' });
        }
    }

    const markChatAsRead = () => {
        if (unreadClientCount > 0) {
            const now = new Date().toISOString();
            localStorage.setItem(`chat_last_read_${token}`, now);
            setLastReadTime(now);
        }
    }

    const unreadClientCount = messages.filter(m => (isSeller ? m.sender === 'client' : m.sender === 'admin') && (!lastReadTime || new Date(m.created_at) > new Date(lastReadTime))).length;

    const primaryColor = order?.org_primary_color || '#3b82f6'
    const orgTimezone = order?.org_timezone || 'Europe/Brussels'
    const canConfirm = checkedTerms && (!!signature || acceptedOffer) && !confirming

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F2F4F8] p-4">
            <div className="w-full max-w-[340px] rounded-[24px] bg-white/95 backdrop-blur-2xl border-[1.5px] border-slate-300/90 ring-1 ring-slate-900/[0.06] shadow-[0_24px_54px_-12px_rgba(15,23,42,0.16)] p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-sky-500/15 border border-sky-500/25 flex items-center justify-center mx-auto mb-3.5">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                </div>
                <p className="text-[14px] text-slate-700 font-semibold">{t.loadingOrder}</p>
            </div>
        </div>
    )

    if (error && !order) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F2F4F8] p-4">
            <div className="w-full max-w-[360px] rounded-[24px] bg-[#F2F4F8] backdrop-blur-3xl border-[1.5px] border-slate-300/95 ring-1 ring-slate-900/10 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.28)] p-3.5 text-center">
                <div className="rounded-[16px] bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-6">
                    <div className="w-12 h-12 bg-rose-500/15 border border-rose-500/25 rounded-full flex items-center justify-center mx-auto mb-3.5">
                        <AlertCircle className="w-6 h-6 text-rose-600" />
                    </div>
                    <h1 className="text-[17px] font-bold tracking-tight text-slate-900 leading-snug">
                        {error === t.orderCancelled ? error : t.orderNotFound}
                    </h1>
                    {error !== t.orderCancelled && (
                        <p className="text-[13.5px] text-slate-500 mt-1.5 leading-relaxed">
                            {error}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#F2F4F8]">
            {/* Apple HIG Frosted Glass Navigation Bar */}
            <div className="sticky top-0 z-30 w-full py-2.5 px-4 sm:py-3 sm:px-6 border-b border-slate-200/90 bg-white/90 backdrop-blur-2xl saturate-150 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {order?.org_logo || (order?.org_name || '').toLowerCase().includes('davide') ? (
                            <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                    src={(order?.org_name || '').toLowerCase().includes('davide') ? '/davide_logo.svg?v=anim30s' : order.org_logo}
                                    alt={order?.org_name || 'Davide Chape'}
                                    className="h-8 sm:h-9 w-auto object-contain shrink-0"
                                />
                                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/90 text-[11px] font-semibold text-slate-600 shrink-0">
                                    {t.workOrder}
                                </span>
                            </div>
                        ) : (
                            <>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
                                    style={{ backgroundColor: primaryColor }}>
                                    {order?.org_name?.charAt(0) || 'C'}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">{order?.org_name}</p>
                                    <p className="text-[11px] text-slate-500 font-medium">{t.workOrder}</p>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                        {/* Apple HIG Equal-Width Segmented Control (FR | NL | EN) — No (Vlaams) asymmetry */}
                        <div className="inline-flex items-center gap-0.5 bg-[#767680]/[0.12] p-0.5 rounded-full border border-slate-300/60">
                            {[
                                { code: 'fr', label: 'FR' },
                                { code: 'nl', label: 'NL' },
                                { code: 'en', label: 'EN' }
                            ].map(l => (
                                <button
                                    key={l.code}
                                    type="button"
                                    onClick={() => {
                                        setLang(l.code);
                                        setSearchParams(isSeller ? { lang: l.code, role: 'seller' } : { lang: l.code }, { replace: true });
                                    }}
                                    className={`min-w-[50px] sm:min-w-[54px] h-7 px-2.5 rounded-full text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        lang === l.code
                                            ? 'bg-white text-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.12),0_0_0_0.5px_rgba(15,23,42,0.08)]'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <img src={`https://flagcdn.com/w20/${l.code === 'en' ? 'gb' : l.code}.png`} alt={l.label} className="w-3.5 h-[10px] object-cover rounded-[2px] opacity-90 shrink-0" />
                                    <span>{l.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Uniform Apple HIG Circular Toolbar Buttons */}
                        <button 
                            type="button"
                            onClick={() => window.print()}
                            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/90 shadow-2xs transition-all cursor-pointer"
                            title={t.downloadPdf || 'PDF'}
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                        
                        <button 
                            type="button"
                            onClick={handleOpenChat}
                            className="relative flex items-center justify-center w-9 h-9 rounded-full bg-sky-500/15 hover:bg-sky-500/20 text-sky-600 border border-sky-500/25 shadow-2xs transition-all cursor-pointer"
                        >
                            <MessageSquare className="w-4 h-4" />
                            {unreadClientCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full border-2 border-white tabular-nums">
                                    {unreadClientCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                {isSeller && (
                    <div className="bg-emerald-700 text-white rounded-[20px] p-3.5 shadow-md border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 print:hidden">
                        <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse shrink-0"></span>
                            <div>
                                <p className="text-xs sm:text-sm font-bold tracking-tight">Link Davide Chape (Mode Vendeur)</p>
                                <p className="text-[11px] text-emerald-100">Vos messages dans le chat apparaissent en tant que Davide Chape et notifient le client par Email & WhatsApp.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenChat}
                            className="px-3.5 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 font-semibold text-xs rounded-full shadow-xs transition-colors shrink-0 cursor-pointer"
                        >
                            Ouvrir le Chat ↓
                        </button>
                    </div>
                )}

                {/* Apple HIG Equal-Height Paired Cards: Left = Status & Date Inset Grouped Card, Right = Location Map Card */}
                <div className={`grid gap-4 mb-5 items-stretch ${(!hideMap && (order?.site_name || order?.site_address || order?.site_lat)) ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
                    {/* Left Column: Apple HIG Inset Grouped Confirmation & Date Card */}
                    <div className="rounded-[22px] bg-white border-[1.5px] border-slate-200/95 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.08)] p-4 flex flex-col justify-between">
                        {/* 1. Order Confirmation Section */}
                        {confirmed && (
                            <div>
                                <div className="flex items-start gap-3">
                                    <span className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                                        <CheckCircle2 className="w-4.5 h-4.5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[14px] font-bold tracking-tight text-slate-900 leading-snug">{t.confirmed}</div>
                                        {order?.confirmed_at && mode === 'quote' && (
                                            <>
                                                <p className="text-slate-500 text-[12px] mt-0.5 tabular-nums">
                                                    {t.confirmedBy} <strong className="font-semibold text-slate-800">{order.confirmed_by_name}</strong> {t.onDate}{' '}
                                                    {new Date(order.confirmed_at).toLocaleString(lang === 'fr' ? 'fr-BE' : lang === 'nl' ? 'nl-BE' : 'en-GB', { timeZone: orgTimezone })}
                                                </p>
                                                {t.confirmationFollowUpNote && !dateConfirmed && !(order?.start_date && (order?.assigned_team_id || ['planning', 'in_progress', 'completed'].includes(order?.status))) && (
                                                    <p className="text-slate-600 text-[12px] mt-2 bg-slate-50 p-2.5 rounded-[12px] border border-slate-200/80 leading-relaxed">
                                                        {t.confirmationFollowUpNote}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                        {order?.final_confirmed_at && mode === 'final' && (
                                            <p className="text-slate-500 text-[12px] mt-0.5 tabular-nums">
                                                {t.confirmedBy} <strong className="font-semibold text-slate-800">{order.final_confirmed_by_name}</strong> {t.onDate}{' '}
                                                {new Date(order.final_confirmed_at).toLocaleString(lang === 'fr' ? 'fr-BE' : lang === 'nl' ? 'nl-BE' : 'en-GB', { timeZone: orgTimezone })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Hairline Divider */}
                        {confirmed && order?.start_date && mode === 'quote' && (
                            <div className="border-t border-slate-200/80 my-3" />
                        )}

                        {/* 2. Date Section */}
                        {order?.start_date && mode === 'quote' && (
                            <div className="flex items-start gap-3">
                                <span className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                    order.reschedule_requested
                                        ? 'bg-amber-500/15 border-amber-500/25 text-amber-600'
                                        : dateConfirmed
                                            ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-600'
                                            : 'bg-sky-500/15 border-sky-500/25 text-sky-600'
                                }`}>
                                    <Calendar className="w-4.5 h-4.5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[13px] font-semibold text-slate-500">
                                            {order.reschedule_requested ? t.reschedulePending : dateConfirmed ? t.dateConfirmedMsg : t.proposedDate}
                                        </span>
                                        {dateConfirmed && !order.reschedule_requested && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 text-[10.5px] font-semibold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Validée
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[16px] font-bold tracking-tight text-slate-900 tabular-nums mt-0.5">
                                        {new Date(order.start_date).toLocaleDateString(lang === 'fr' ? 'fr-BE' : lang === 'nl' ? 'nl-BE' : 'en-GB', { timeZone: orgTimezone })}
                                    </div>
                                    {!dateConfirmed && !order.reschedule_requested && (
                                        <p className="text-[11.5px] text-amber-800 bg-amber-500/10 border border-amber-500/20 rounded-[10px] px-2.5 py-1.5 mt-2 font-medium leading-snug">
                                            ℹ️ {t.pendingValidationNotice}
                                        </p>
                                    )}
                                    {dateConfirmed && order?.date_confirmed_at && !order.reschedule_requested && (
                                        <p className="text-emerald-600 text-[11.5px] font-medium mt-1 flex items-center gap-1 tabular-nums">
                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                            {t.onDate} {new Date(order.date_confirmed_at).toLocaleString(lang === 'fr' ? 'fr-BE' : lang === 'nl' ? 'nl-BE' : 'en-GB', { timeZone: orgTimezone })}
                                        </p>
                                    )}
                                    {!isSeller && !order.reschedule_requested && (() => {
                                        const clientConfirmedReady = Boolean(
                                            order?.reminder_confirmed_at ||
                                            order?.prices?.reminder_confirmed_at ||
                                            (Array.isArray(order?.date_history) && order.date_history.some(h => h && ['confirmed_by_client', 'confirmed_by_client_message', 'confirmed_manually'].includes(h.action)))
                                        );
                                        if (clientConfirmedReady) {
                                            return (
                                                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-xs font-bold">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                    <span>
                                                        {lang === 'nl'
                                                            ? 'Werf en datum bevestigd door u'
                                                            : lang === 'en'
                                                                ? 'Site readiness & date confirmed by you'
                                                                : 'Disponibilité du chantier confirmée par vous'}
                                                    </span>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="mt-2.5 flex flex-col gap-2">
                                                <button
                                                    type="button"
                                                    disabled={confirmingDate}
                                                    onClick={handleConfirmDate}
                                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                                                >
                                                    {confirmingDate ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                    )}
                                                    <span>
                                                        {lang === 'nl'
                                                            ? 'Bevestigen dat de werf klaar is op deze datum'
                                                            : lang === 'en'
                                                                ? 'Confirm that the site is ready for this date'
                                                                : 'Confirmer que le chantier est prêt pour cette date'}
                                                    </span>
                                                </button>
                                            </div>
                                        );
                                    })()}
                                    {!isSeller && order?.reschedule_requested && (
                                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 text-xs font-bold">
                                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                                            <span>
                                                {lang === 'nl'
                                                    ? 'Uw verzoek tot wijziging is ontvangen — in afwachting van bevestiging door ons team'
                                                    : lang === 'en'
                                                        ? 'Your change request was received — awaiting confirmation from our team'
                                                        : 'Votre demande de modification a été reçue — en attente de confirmation par notre équipe'}
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleOpenChat}
                                        className="text-slate-500 hover:text-sky-600 text-[11.5px] font-medium mt-2 flex items-center gap-1.5 text-left transition-colors cursor-pointer"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-sky-600" />
                                        <span>{t.contactChatToReschedule}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Apple HIG Framed Location Map Card */}
                    {!hideMap && (order?.site_name || order?.site_address || order?.site_lat) && (
                        <div className="h-full flex">
                            {(() => {
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
                                    <div className="rounded-[22px] bg-white border-[1.5px] border-slate-200/95 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.08)] p-3 w-full flex flex-col print:hidden">
                                        <div className="px-1 pb-2.5 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className="w-7 h-7 rounded-full bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-600 shrink-0">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                </span>
                                                {isEditingAddress ? (
                                                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/90 w-full z-50">
                                                        <div className="flex-1 relative z-50">
                                                            <AddressAutocomplete
                                                                value={editAddressData.address}
                                                                onChange={(val) => setEditAddressData(p => ({ ...p, address: val }))}
                                                                onSelect={({ address, lat, lon }) => setEditAddressData({ address, lat, lon })}
                                                                placeholder={t.location || 'Lieu'}
                                                                className="!bg-transparent !border-none !text-xs !py-1 !px-2 !shadow-none !h-7 !min-h-0"
                                                            />
                                                        </div>
                                                        <div className="flex shrink-0 gap-1 pr-1">
                                                            <button 
                                                                type="button"
                                                                onClick={handleSaveAddress}
                                                                className="w-6 h-6 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                                                                title="Enregistrer"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setIsEditingAddress(false)}
                                                                className="w-6 h-6 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                                                                title="Annuler"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="font-bold text-slate-900 text-[13px] tracking-tight truncate">
                                                        {displayAddr}
                                                    </span>
                                                )}
                                            </div>
                                            {!isEditingAddress && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditAddressData({ address: order.site_address || order.site_name || '', lat: order.site_lat, lon: order.site_lon });
                                                        setIsEditingAddress(true);
                                                    }}
                                                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                                    title="Modifier l'adresse"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="rounded-[15px] overflow-hidden border border-slate-200/90 w-full flex-1 min-h-[190px]">
                                            <MapView latitude={order.site_lat} longitude={order.site_lon} address={displayAddr} height="100%" zoom={15} markerType="pin" />
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Action Bar & Language Switcher Removed (moved to header) */}

                {/* Embed the PDF with integrated Signature */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-4 w-full relative print:hidden">
                    <DevisView 
                        key={order?.updated_at || order?.id || 'devis'}
                        embeddedToken={token}
                        lang={lang}
                        signatureElement={
                            isSeller ? null : !confirmed ? (
                                <div className="w-full relative flex flex-col">
                                    <SignaturePad onChange={setSignature} disabled={confirming} t={t} />
                                </div>
                            ) : (
                                <div className="w-full flex flex-col">
                                    <div className="w-full aspect-[3.5/1] border-2 border-emerald-200 bg-emerald-50/50 rounded-2xl flex flex-col items-center justify-center p-2 text-center">
                                        {(order?.final_client_signature === 'accepted_without_signature' || order?.client_signature === 'accepted_without_signature') ? (
                                            <>
                                                <span className="text-emerald-700 font-bold text-sm">Accepté en ligne</span>
                                                <span className="text-emerald-600 text-xs">(sans signature manuscrite)</span>
                                            </>
                                        ) : (
                                            <img src={mode === 'final' ? order?.final_client_signature : order?.client_signature} alt="Signature" className="max-h-full object-contain" />
                                        )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-bold mt-2">
                                        Date: {new Date(mode === 'final' ? order?.final_confirmed_at : order?.confirmed_at).toLocaleString(lang === 'fr' ? 'fr-BE' : lang === 'nl' ? 'nl-BE' : 'en-GB', { timeZone: orgTimezone })}
                                    </div>
                                </div>
                            )
                        } 
                    />

                    {/* Full-width compact confirmation bar for Client only */}
                    {!confirmed && !isSeller && (
                        <div className="px-5 sm:px-10 pb-6 pt-3 border-t border-slate-100 bg-slate-50/70 flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t.orAcceptWithout}</span>
                                {!signature && !acceptedOffer && (
                                    <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {t.signatureRequired}
                                    </span>
                                )}
                            </div>
                            <label className="w-full flex items-center gap-3 cursor-pointer select-none bg-white border border-slate-200 rounded-xl px-4 py-3 hover:bg-blue-50/50 hover:border-blue-300 transition-all shadow-sm">
                                <input
                                    type="checkbox"
                                    checked={acceptedOffer}
                                    onChange={e => setAcceptedOffer(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                                />
                                <span className="text-xs sm:text-sm font-semibold text-slate-700 leading-snug">{t.acceptOffer}</span>
                            </label>
                            {error && (
                                <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
                            )}
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={!canConfirm}
                                className={`w-full h-12 rounded-xl text-white font-black text-base shadow-md transition-all flex items-center justify-center gap-2 ${
                                    canConfirm ? 'hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]' : 'opacity-40 cursor-not-allowed'
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
                </div>

                {/* Client Documents (Upload & List) */}
                {(!isSeller || order?.client_documents?.length > 0) && (
                <div className="mt-6 print:hidden w-full max-w-2xl mx-auto">
                    <input type="file" ref={docInputRef} onChange={handleDocumentUpload} accept="image/*,application/pdf" className="hidden" multiple max="10" />
                    {order?.client_documents?.length > 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Paperclip className="w-4 h-4 text-slate-500" />
                                    {t.clientDocuments || 'Documents Client (Plans / Photos)'}
                                </h3>
                                {!isSeller && (
                                <button
                                    onClick={() => docInputRef.current?.click()}
                                    disabled={isUploadingDoc}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                                >
                                    {isUploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                                    {t.addDocument || 'Ajouter un Document'}
                                </button>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                {order.client_documents.map((d, i) => (
                                    <button 
                                        key={i} 
                                        type="button"
                                        onClick={() => setPreviewDocIndex(i)} 
                                        className="flex text-left items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors w-full"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-700 truncate">{d.filename}</p>
                                            <p className="text-[10px] text-slate-400">
                                                {new Date(d.uploaded_at).toLocaleDateString('ro-RO')}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : !isSeller ? (
                        <button
                            onClick={() => docInputRef.current?.click()}
                            disabled={isUploadingDoc}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 text-sm font-bold transition-all"
                        >
                            {isUploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                            {t.addDocument || 'Ajouter des Documents / Plans / Photos'}
                        </button>
                    ) : null}
                </div>
                )}

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
                                <button 
                                    key={i} 
                                    onClick={(e) => { 
                                        e.preventDefault(); 
                                        setLightboxImages(order.completion_photos);
                                        setLightboxIndex(i); 
                                    }}
                                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer block w-full"
                                >
                                    <img src={p.photo_url} alt="Lucrare" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chat Section */}
                <div id="chat-section" onMouseEnter={markChatAsRead} onTouchStart={markChatAsRead} className="mt-6 print:hidden w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                    {isSeller && (
                        <div className="bg-emerald-700 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse"></span>
                                <span>Mode Vendeur (Davide Chape) — Vous répondez au client en tant que Davide Chape</span>
                            </div>
                        </div>
                    )}
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${isSeller ? 'bg-emerald-100' : 'bg-blue-100'} flex items-center justify-center shrink-0`}>
                                <MessageSquare className={`w-4 h-4 ${isSeller ? 'text-emerald-600' : 'text-blue-600'}`} />
                            </div>
                            <h3 className="font-black text-slate-800 uppercase text-sm tracking-wider">
                                {t.communication || 'COMMUNICATION'}
                            </h3>
                        </div>
                        
                        {/* Apple HIG Equal-Width Language Segmented Control in Chat Header (FR | NL | EN) */}
                        <div className="inline-flex items-center gap-0.5 bg-[#767680]/[0.12] p-0.5 rounded-full border border-slate-300/60">
                            {[
                                { code: 'fr', label: 'FR' },
                                { code: 'nl', label: 'NL' },
                                { code: 'en', label: 'EN' }
                            ].map(l => (
                                <button
                                    key={l.code}
                                    type="button"
                                    onClick={() => {
                                        setLang(l.code);
                                        setSearchParams(isSeller ? { lang: l.code, role: 'seller' } : { lang: l.code }, { replace: true });
                                    }}
                                    className={`min-w-[52px] h-7 px-2.5 rounded-full text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        lang === l.code
                                            ? 'bg-white text-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.12),0_0_0_0.5px_rgba(15,23,42,0.08)]'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <img src={`https://flagcdn.com/w20/${l.code === 'en' ? 'gb' : l.code}.png`} alt={l.label} className="w-3.5 h-[10px] object-cover rounded-[2px] opacity-90 shrink-0" />
                                    <span>{l.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div ref={chatContainerRef} className="h-72 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                        {messages.length === 0 ? (
                            <div className="text-center text-slate-400 py-10 text-sm font-semibold">
                                {t.noMessages || 'No messages yet.'}
                            </div>
                        ) : (
                            messages.map(msg => {
                                const isOwn = isSeller ? msg.sender === 'admin' : msg.sender === 'client';
                                // Determine the message content to show based on language mapping
                                let displayMessage = msg.message;
                                if (!isSeller && !isOwn && msg.translations && msg.translations._target_lang !== 'none' && msg.translations[lang]) {
                                    // For client view: replace Davide Chape's message text with the client's selected language translation
                                    displayMessage = msg.translations[lang];
                                }
                                
                                return (
                                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative`}>
                                    <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm relative ${isOwn ? (isSeller ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-blue-600 text-white rounded-br-none') : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                                        {!isOwn && (
                                            <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-100">
                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-wide text-blue-700 uppercase">
                                                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                                    {isSeller ? (order?.client_name || 'Client') : 'Davide Chape'}
                                                </span>
                                            </div>
                                        )}
                                        {isOwn && (
                                            <div className="flex items-center justify-end gap-1 mb-1">
                                                <span className={`text-[10px] font-bold ${isSeller ? 'text-emerald-100' : 'text-blue-200'} uppercase tracking-wider`}>
                                                    {isSeller ? 'Davide Chape (Vendeur)' : (t.you || 'Vous (Client)')}
                                                </span>
                                            </div>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap">{displayMessage}</p>
                                        {isSeller && !isOwn && msg.translations?.ro && msg.translations.ro.trim().toLowerCase() !== (msg.message || '').trim().toLowerCase() && (
                                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-xs text-slate-500 italic">
                                                🌐 Traducere (RO): {msg.translations.ro}
                                            </div>
                                        )}
                                        {isSeller && isOwn && msg.translations && msg.translations._target_lang !== 'none' && (() => {
                                            const activeTarget = lang || msg.translations._target_lang || 'fr';
                                            const transVal = msg.translations[activeTarget] || (msg.translations._target_lang && msg.translations[msg.translations._target_lang]);
                                            if (!transVal || transVal.trim().toLowerCase() === (msg.message || '').trim().toLowerCase()) return null;
                                            const labelLang = (msg.translations[activeTarget] ? activeTarget : (msg.translations._target_lang || 'fr')).toUpperCase();
                                            return (
                                                <div className="mt-1.5 pt-1.5 border-t border-emerald-500/40 text-xs text-emerald-100 italic">
                                                    🌐 Traduction ({labelLang}): {transVal}
                                                </div>
                                            );
                                        })()}
                                        
                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="mt-2 flex flex-col gap-2">
                                                {msg.attachments.map((att, idx) => {
                                                    const url = (att.url || '').startsWith('http') ? att.url : `https://davidechape.pontaj.app${att.url.startsWith('/') ? '' : '/'}${att.url}`;
                                                    const attUrl = getImageUrl(att.url);
                                                    const isImage = att.type === 'image' || att.url.match(/\.(jpeg|jpg|gif|png)$/i);
                                                    const isPdf = att.url.match(/\.pdf$/i);
                                                    return (
                                                        <button 
                                                            key={idx} 
                                                            onClick={() => setPreviewAttachment({
                                                                url: attUrl,
                                                                name: att.name || 'Attachment',
                                                                isImage: isImage,
                                                                isPdf: isPdf,
                                                                isInternalUrl: !attUrl.startsWith('http') || attUrl.includes('davidechape.pontaj.app')
                                                            })}
                                                            className="flex items-center gap-2 bg-white/10 p-2 rounded-lg border border-white/20 hover:bg-white/20 transition-colors text-left"
                                                        >
                                                            {isImage ? (
                                                                <img src={attUrl} alt="attachment" className="max-w-[150px] sm:max-w-[200px] rounded border border-slate-200" />
                                                            ) : (
                                                                <>
                                                                    <FileText className="w-4 h-4" />
                                                                    <span className="text-sm font-medium truncate max-w-[150px]">{att.name || 'View File'}</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between mt-1 gap-4">
                                            <span className={`text-[9px] font-bold uppercase ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                                                {new Date(msg.created_at).toLocaleString('ro-RO')}
                                            </span>
                                            {isOwn && msg.id !== 'initial-req' && msg.id !== 'reschedule-req' && (
                                                <button 
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-blue-500 text-blue-200 hover:text-white"
                                                    title={lang === 'ro' ? 'Șterge mesaj' : 'Supprimer'}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Render Emojis */}
                                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                            <div className={`absolute -bottom-3 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-white border border-slate-200 rounded-full shadow-sm px-1.5 py-0.5 text-xs z-10 text-slate-800`}>
                                                {Object.entries(msg.reactions).map(([emoji, users]) => (
                                                    <button 
                                                        key={emoji} 
                                                        onClick={() => handleToggleReaction(msg.id, emoji)}
                                                        className={`hover:bg-slate-100 rounded-full px-1 ${users.includes('client') ? 'bg-blue-50' : ''}`}
                                                    >
                                                        {emoji} <span className="text-[10px] text-slate-500">{users.length > 1 ? users.length : ''}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Reaction Picker Popover */}
                                        {showEmojiPickerFor === msg.id && (
                                            <div className={`absolute -top-10 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-white rounded-lg shadow-lg border border-slate-200 p-1 z-20 text-slate-800`}>
                                                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(em => (
                                                    <button 
                                                        key={em} 
                                                        onClick={() => handleToggleReaction(msg.id, em)}
                                                        className="hover:bg-slate-100 rounded p-1 text-base transition-transform hover:scale-110"
                                                    >
                                                        {em}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Hover actions outside bubble */}
                                    <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : ''}`}>
                                        <button
                                            onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                                            className="p-1.5 rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-100"
                                        >
                                            <Smile className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )})
                        )}
                        {/* Scroll ref removed, using container scrollTop instead */}
                    </div>
                    <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
                        {isSeller && (
                            <select
                                value={sellerTargetLang}
                                onChange={e => setSellerTargetLang(e.target.value)}
                                className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl px-2.5 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shrink-0"
                                title="Langue de traduction pour le client"
                            >
                                <option value="fr">FR</option>
                                <option value="nl">NL</option>
                                <option value="en">EN</option>
                                <option value="none">Sans trad.</option>
                            </select>
                        )}
                        <input
                            type="text"
                            value={chatMessage}
                            onChange={e => setChatMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            placeholder={isSeller ? 'Répondre au client en tant que Davide Chape...' : (t.writeMessage || 'Écrivez à Davide Chape...')}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={sendingMessage || !chatMessage.trim()}
                            className={`w-11 h-11 shrink-0 rounded-xl ${isSeller ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white flex items-center justify-center disabled:opacity-50 transition-colors`}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>

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
            {toast && createPortal(
                <div className="fixed top-5 right-0 left-0 sm:left-auto sm:right-6 mx-4 sm:mx-0 z-[999999] flex justify-center sm:justify-end pointer-events-none animate-in slide-in-from-top-4 fade-in duration-200">
                    <div className="pointer-events-auto flex items-center gap-3 p-2 pr-3 rounded-full bg-[#F2F4F8] text-slate-900 backdrop-blur-2xl saturate-150 border-[1.5px] border-slate-300/95 ring-1 ring-slate-900/10 shadow-[0_22px_48px_-10px_rgba(15,23,42,0.34),0_6px_18px_-4px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] max-w-sm">
                        <span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                            toast.type === 'success'
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-600'
                        }`}>
                            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        </span>
                        <span className="text-[12.5px] font-semibold text-slate-900 leading-snug">
                            {toast.msg}
                        </span>
                    </div>
                </div>,
                document.body
            )}

            {/* Floating Chat Icon */}
            <button 
                onClick={handleOpenChat}
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center z-[9998] transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            >
                <MessageSquare className="w-6 h-6" />
                {unreadClientCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white tabular-nums">
                        {unreadClientCount}
                    </span>
                )}
            </button>
            {updateToast && createPortal(
                <div className="fixed inset-0 z-[99999] bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-[360px] rounded-[24px] bg-[#F2F4F8] text-slate-900 backdrop-blur-3xl saturate-150 border-[1.5px] border-slate-300/95 ring-1 ring-slate-900/10 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] p-3.5 text-center overflow-hidden">
                        <div className="rounded-[16px] bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-5">
                            <div className="w-12 h-12 bg-sky-500/15 border border-sky-500/25 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-3.5">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-[17px] tracking-tight text-slate-900 leading-snug">
                                {lang === 'ro' ? 'Actualizare Importantă' : lang === 'fr' ? 'Mise à jour importante' : lang === 'nl' ? 'Belangrijke Update' : 'Important Update'}
                            </h3>
                            <p className="text-slate-500 text-[13.5px] mt-1.5 leading-relaxed">
                                {updateToast}
                            </p>
                        </div>
                        <button 
                            type="button"
                            onClick={() => { setUpdateToast(null); window.location.reload(); }} 
                            className="w-full mt-3 h-10 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-[13.5px] rounded-[14px] transition-all shadow-sm shadow-sky-600/20 cursor-pointer"
                        >
                            {lang === 'ro' ? 'Am înțeles (Reîmprospătare)' : lang === 'fr' ? 'Compris (Actualiser)' : lang === 'nl' ? 'Begrepen (Vernieuwen)' : 'Understood (Refresh)'}
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {needsDateConfirmation && createPortal(
                <div className="fixed inset-0 z-[99999] bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-[360px] rounded-[24px] bg-[#F2F4F8] text-slate-900 backdrop-blur-3xl saturate-150 border-[1.5px] border-slate-300/95 ring-1 ring-slate-900/10 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] p-3.5 text-center overflow-hidden">
                        <div className="rounded-[16px] bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-5">
                            <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3.5">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-[17px] tracking-tight text-slate-900 leading-snug">
                                {lang === 'ro' ? 'Dată Nouă Propusă' : lang === 'fr' ? 'Nouvelle date proposée' : lang === 'nl' ? 'Nieuwe Voorgestelde Datum' : 'New Proposed Date'}
                            </h3>
                            <p className="text-slate-500 text-[13.5px] mt-1.5 leading-relaxed">
                                {lang === 'ro' ? 'Noua dată propusă este: ' : lang === 'fr' ? 'La nouvelle date proposée est : ' : lang === 'nl' ? 'De nieuwe voorgestelde datum is: ' : 'The new proposed date is: '}
                                <br/>
                                <strong className="text-emerald-700 text-[16px] font-bold tabular-nums inline-block mt-1">
                                    {new Date(needsDateConfirmation).toLocaleString(lang === 'fr' ? 'fr-BE' : lang === 'nl' ? 'nl-BE' : 'en-GB', { timeZone: orgTimezone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </strong>
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 mt-3">
                            <button 
                                type="button"
                                onClick={() => { setNeedsDateConfirmation(false); handleConfirmDate(); }} 
                                disabled={confirmingDate}
                                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[13.5px] rounded-[14px] transition-all shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {confirmingDate ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {lang === 'ro' ? 'Sunt de acord (Confirmă)' : lang === 'fr' ? 'Je suis d\'accord (Confirmer)' : lang === 'nl' ? 'Ik ga akkoord (Bevestigen)' : 'I agree (Confirm)'}
                            </button>
                            <button 
                                type="button"
                                onClick={() => { setNeedsDateConfirmation(false); setShowDateModal(true); }} 
                                className="w-full h-10 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300/90 font-semibold text-[13.5px] rounded-[14px] transition-all cursor-pointer"
                            >
                                {lang === 'ro' ? 'Propune o altă dată' : lang === 'fr' ? 'Proposer une autre date' : lang === 'nl' ? 'Stel een andere datum voor' : 'Propose another date'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            {/* Lightbox */}
            {lightboxIndex !== null && order?.completion_photos && createPortal(
                <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center">
                    <button 
                        type="button"
                        onClick={() => setLightboxIndex(null)}
                        className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-colors z-[100000] cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    {lightboxIndex > 0 && (
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev - 1) }}
                            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-colors z-[100000] cursor-pointer"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    
                    <img 
                        src={order.completion_photos[lightboxIndex]?.photo_url} 
                        alt="Lightbox" 
                        className="max-w-full max-h-full object-contain p-4 rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    
                    {lightboxIndex < order.completion_photos.length - 1 && (
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev + 1) }}
                            className="absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-colors z-[100000] cursor-pointer"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    )}
                </div>,
                document.body
            )}
            
            {/* Modal Confirmare Data — Apple HIG Sheet / Alert */}
            {showDateModal && createPortal(
                <div className="fixed inset-0 z-[99999] bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => { setShowDateModal(false); setShowRescheduleForm(false); }}>
                    <div className="w-full max-w-[380px] rounded-[24px] bg-[#F2F4F8] text-slate-900 backdrop-blur-3xl saturate-150 border-[1.5px] border-slate-300/95 ring-1 ring-slate-900/10 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] p-3.5 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="rounded-[16px] bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-5">
                            <button type="button" onClick={() => {setShowDateModal(false); setShowRescheduleForm(false); setRescheduleReason(''); setRescheduleDate('');}} className="absolute top-6 right-6 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                            <div className="w-12 h-12 bg-sky-500/15 border border-sky-500/25 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-3.5">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <h3 className="text-center font-bold text-[17px] tracking-tight text-slate-900 leading-snug">
                                {t.rescheduleTitle}
                            </h3>
                            <p className="text-center text-slate-500 text-[13px] mt-1.5 mb-4 leading-relaxed">
                                {t.rescheduleDesc}
                            </p>
                            <div className="mb-3 text-left">
                                <label className="block text-[12px] font-semibold text-slate-600 mb-1">
                                    {lang === 'ro' ? 'Data dorită *' : lang === 'fr' ? 'Date souhaitée *' : lang === 'nl' ? 'Gewenste datum *' : 'Desired date *'}
                                </label>
                                <input 
                                    type="date"
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-slate-50 border border-slate-300/90 rounded-[12px] px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                                />
                            </div>
                            <div className="text-left">
                                <label className="block text-[12px] font-semibold text-slate-600 mb-1">
                                    {lang === 'ro' ? 'Motiv / Observații (opțional)' : lang === 'fr' ? 'Raison / Remarques (facultatif)' : lang === 'nl' ? 'Reden / Opmerkingen (optioneel)' : 'Reason / Notes (optional)'}
                                </label>
                                <textarea
                                    value={rescheduleReason}
                                    onChange={(e) => setRescheduleReason(e.target.value)}
                                    placeholder={t.reschedulePlaceholder}
                                    className="w-full bg-slate-50 border border-slate-300/90 rounded-[12px] p-3 text-sm min-h-[76px] focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2.5 mt-3">
                            <button
                                type="button"
                                onClick={() => { setShowDateModal(false); setShowRescheduleForm(false); }}
                                className="flex-1 h-10 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300/90 font-semibold text-[13.5px] rounded-[14px] transition-all cursor-pointer"
                            >
                                {lang === 'ro' ? 'Anulează' : lang === 'fr' ? 'Annuler' : lang === 'nl' ? 'Annuleren' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                onClick={handleReschedule}
                                disabled={!rescheduleDate || submittingReschedule}
                                className="flex-1 h-10 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-[13.5px] rounded-[14px] transition-all shadow-sm shadow-sky-600/20 flex justify-center items-center gap-2 cursor-pointer"
                            >
                                {submittingReschedule ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {t.rescheduleSubmit}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            
            {previewAttachment && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewAttachment(null)}></div>
                    <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-3 truncate pr-4">
                                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <h3 className="font-semibold text-slate-800 truncate">
                                    {previewAttachment.name || 'Preview'}
                                </h3>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <a 
                                    href={previewAttachment.url} 
                                    download 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-2 font-medium text-sm"
                                >
                                    <span className="hidden sm:inline">Descarcă</span>
                                </a>
                                <button 
                                    onClick={() => setPreviewAttachment(null)}
                                    className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-red-500 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/50 min-h-[50vh]">
                            {previewAttachment.isImage ? (
                                <img 
                                    src={previewAttachment.url} 
                                    alt={previewAttachment.name} 
                                    className="max-w-full max-h-[70vh] object-contain rounded shadow-sm"
                                />
                            ) : previewAttachment.isPdf ? (
                                <iframe
                                    src={previewAttachment.url}
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
                </div>
            , document.body)}

            {previewDocIndex !== null && order?.client_documents && (
                <DocumentPreviewModal 
                    documents={order.client_documents} 
                    initialIndex={previewDocIndex}
                    onClose={() => setPreviewDocIndex(null)} 
                />
            )}
        </div>
    )
}

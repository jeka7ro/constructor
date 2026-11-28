import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { getPrice, buildQuoteItems } from '../../utils/pricingEngine';
import { Loader2, Printer, ArrowLeft, FileText, Mail, Phone, MapPin, User, Download, Share2, Copy, MessageCircle, X, Check } from 'lucide-react'
import api from '../../lib/api'
import { useTenantStore } from '../../store/tenantStore'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../store/uiStore'

const DEVIS_LANG = {
    fr: {
        devis: 'DEVIS', validDays: 'Valable 30 jours', date: 'Date :',
        client: 'CLIENT', chantier: 'CHANTIER / ADRESSE', surface: 'Surface', ep: 'Ép.',
        desc: 'DESCRIPTION', qty: 'QTÉ', unit: 'UNITÉ', pu: 'P.U. (€)', total: 'TOTAL (€)',
        totalLabel: 'TOTAL',
        condTitle: 'Conditions',
        condText: "Ce document est un devis estimatif. Les prix sont valables 30 jours à compter de la date d'émission. Pour confirmer, retournez ce devis signé avec la mention «Bon pour accord».",
        dateEst: "Date estimée d'intervention :",
        chapeBase: (cm) => `Pose de chape ${cm} cm`,
        chapeExtra: (cm) => `Épaisseur supplémentaire (${cm} cm)`,
        foil: 'Feuille de plastique (Visqueen)',
        mesh: 'Armature (Paillasse)',
        fiber: 'Fibre + Duramint',
        forfait: 'Forfait', travaux: 'Travaux selon devis',
        chapeHeader: 'Chape',
        isolationHeader: 'Isolation',
        subtotalChape: 'Sous-total Chape',
        subtotalIsolation: 'Sous-total Isolation',
        signClient: 'Cachet / Signature',
        purBase: (cm) => `Isolation PUR ${cm} cm`,
        aspiration: 'Aspiration',
        nivellement: 'Nivellement au laser',
        poncage: 'Ponçage de la mousse',
        protection: 'Protection au-dessus 1M',
        epsBase: (text) => `Isolation EPS (${text})`,
    },
    en: {
        devis: 'QUOTE', validDays: 'Valid 30 days', date: 'Date:',
        client: 'CLIENT', chantier: 'SITE / ADDRESS', surface: 'Surface', ep: 'Th.',
        desc: 'DESCRIPTION', qty: 'QTY', unit: 'UNIT', pu: 'U.P. (€)', total: 'TOTAL (€)',
        totalLabel: 'TOTAL',
        condTitle: 'Terms & Conditions',
        condText: 'This document is an estimate. Prices are valid for 30 days from the date of issue. To confirm, please return this quote signed with the mention «Bon pour accord».',
        dateEst: 'Estimated work date:',
        chapeBase: (cm) => `Chape ${cm} cm`,
        chapeExtra: (cm) => `Additional thickness (${cm} cm)`,
        foil: 'Plastic sheet (Visqueen)',
        mesh: 'Reinforcement mesh',
        fiber: 'Fibre + Duramint',
        forfait: 'Forfait', travaux: 'Works per quote',
        chapeHeader: 'Chape / Screed',
        isolationHeader: 'Insulation',
        subtotalChape: 'Subtotal Chape',
        subtotalIsolation: 'Subtotal Insulation',
        signClient: 'Stamp / Signature',
        purBase: (cm) => `PUR Insulation ${cm} cm`,
        aspiration: 'Aspiration',
        nivellement: 'Laser levelling',
        poncage: 'Foam sanding',
        protection: 'Protection above 1M',
        epsBase: (text) => `EPS Insulation (${text})`,
    },
    nl: {
        devis: 'OFFERTE', validDays: 'Geldig 30 dagen', date: 'Datum:',
        client: 'KLANT', chantier: 'WERF / ADRES', surface: 'Oppervlak', ep: 'Dikte',
        desc: 'OMSCHRIJVING', qty: 'AANTAL', unit: 'EENHEID', pu: 'E.P. (€)', total: 'TOTAAL (€)',
        totalLabel: 'TOTAAL',
        condTitle: 'Voorwaarden',
        condText: 'Dit document is een vrijblijvende offerte. Prijzen zijn 30 dagen geldig. Om te bevestigen, stuur deze offerte ondertekend terug met de vermelding «Bon pour accord».',
        dateEst: 'Geschatte werkdatum:',
        chapeBase: (cm) => `Dekvloer leggen ${cm} cm`,
        chapeExtra: (cm) => `Extra dikte (${cm} cm)`,
        foil: 'Plastiekfolie (Visqueen)',
        mesh: 'Wapeningsnet',
        fiber: 'Vezel + Duramint',
        forfait: 'Forfait', travaux: 'Werken volgens offerte',
        chapeHeader: 'Dekvloer (Chape)',
        isolationHeader: 'Isolatie',
        subtotalChape: 'Subtotaal Dekvloer',
        subtotalIsolation: 'Subtotaal Isolatie',
        signClient: 'Stempel / Handtekening',
        purBase: (cm) => `PUR Isolatie ${cm} cm`,
        aspiration: 'Aspiratie',
        nivellement: 'Laser nivellering',
        poncage: 'Schuimschuren',
        protection: 'Bescherming boven 1M',
        epsBase: (text) => `EPS Isolatie (${text})`,
    },
}

export default function DevisView({ embeddedToken, signatureElement, lang = 'fr', embedded = false }) {
    const { t } = useTranslation()
    const params = useParams()
    const id = params.id
    const token = embeddedToken || params.token
    const navigate = useNavigate()
    const { tenant } = useTenantStore()
    const [wo, setWo] = useState(null)
    const [proformaItems, setProformaItems] = useState(null)
    const [pricingSettings, setPricingSettings] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isDownloading, setIsDownloading] = useState(false)
    const [isSharing, setIsSharing] = useState(false)
    const [showShareSheet, setShowShareSheet] = useState(false)
    const [copiedLink, setCopiedLink] = useState(false)
    const [readyPdfFile, setReadyPdfFile] = useState(null)
    const [readyPdfBase64, setReadyPdfBase64] = useState(null)
    const [isSendingWaPdf, setIsSendingWaPdf] = useState(false)

    const generatePdfOpt = (renderWidth = 780) => {
        const docNum = wo?.quote_number || 'Devis'
        const cleanClient = (wo?.client_name || wo?.client?.name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')
        const filename = `${docNum}_${cleanClient}.pdf`
        return {
            filename,
            opt: {
                margin: [5, 6, 5, 6],
                filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowWidth: Math.max(960, renderWidth + 80),
                    scrollY: 0,
                    scrollX: 0
                },
                pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-avoid-break', '.break-inside-avoid'] },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }
        }
    }

    // Smart A4 PDF Generator:
    // - Clones #devis-print-sheet at desktop A4 width (780px) so mobile screens (<640px) never force 1-column stacking in the PDF.
    // - If content fits on 1 page (or is within ~20% where only the signature would spill to page 2), auto-scales to 1 single A4 page.
    // - If there are many items (>1380px tall), cleanly paginates across 2+ pages without splitting totals or signatures.
    const buildSmartDevisPdf = async ({ saveFile = false } = {}) => {
        const sourceEl = document.getElementById('devis-print-sheet')
        if (!sourceEl) throw new Error('Print sheet not found')
        const html2pdfModule = (await import('html2pdf.js')).default

        const baseWidth = 780
        // Printable A4 with [5,6,5,6]mm margins is 198mm x 287mm (ratio 1.4495 -> ~1130px tall at 780px width)
        const maxSinglePageHeightAtBase = 1115
        const maxAutoFitSinglePageHeight = 1380

        const wrapper = document.createElement('div')
        wrapper.style.position = 'fixed'
        wrapper.style.left = '-10000px'
        wrapper.style.top = '0'
        wrapper.style.width = `${baseWidth}px`
        wrapper.style.background = '#ffffff'
        wrapper.style.zIndex = '-9999'
        wrapper.style.pointerEvents = 'none'

        const clone = sourceEl.cloneNode(true)
        clone.style.width = `${baseWidth}px`
        clone.style.maxWidth = 'none'
        clone.style.margin = '0'
        clone.style.borderRadius = '0'
        clone.style.border = 'none'
        clone.style.boxShadow = 'none'
        wrapper.appendChild(clone)
        document.body.appendChild(wrapper)

        try {
            const measuredHeight = clone.scrollHeight || sourceEl.scrollHeight || 1000
            const shouldFitOnePage = measuredHeight <= maxAutoFitSinglePageHeight
            let finalRenderWidth = baseWidth

            if (shouldFitOnePage && measuredHeight > maxSinglePageHeightAtBase) {
                // Widen the offscreen A4 container proportionally so html2pdf scales both width and height uniformly onto Page 1
                finalRenderWidth = Math.ceil(measuredHeight * (198 / 283))
                wrapper.style.width = `${finalRenderWidth}px`
                clone.style.width = `${finalRenderWidth}px`
            }

            const { filename, opt } = generatePdfOpt(finalRenderWidth)
            let worker = html2pdfModule().set(opt).from(clone).toPdf()
            const pdf = await worker.get('pdf')

            if (shouldFitOnePage && pdf?.internal?.getNumberOfPages) {
                while (pdf.internal.getNumberOfPages() > 1) {
                    pdf.deletePage(pdf.internal.getNumberOfPages())
                }
            }

            if (saveFile) {
                pdf.save(filename)
            }

            const blob = pdf.output('blob')
            const file = new File([blob], filename, { type: 'application/pdf' })
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '')
                reader.readAsDataURL(blob)
            })

            setReadyPdfFile(file)
            if (base64) setReadyPdfBase64(base64)
            return { blob, file, base64, filename }
        } finally {
            if (wrapper.parentNode) {
                wrapper.parentNode.removeChild(wrapper)
            }
        }
    }

    // Pre-generate the actual PDF File in background as soon as DevisView finishes loading
    // so that tapping "Partager le PDF (Mon WhatsApp)" invokes navigator.share({ files: [readyPdfFile] }) in 0ms!
    useEffect(() => {
        if (loading || !wo || readyPdfFile) return
        let cancelled = false
        const timer = setTimeout(async () => {
            try {
                if (cancelled) return
                await buildSmartDevisPdf({ saveFile: false })
            } catch (e) {
                console.error('Background PDF pre-generation error:', e)
            }
        }, 300)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [loading, wo])

    const copyTextFallback = async (text) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text)
                return true
            }
        } catch (_) {}
        try {
            const ta = document.createElement('textarea')
            ta.value = text
            ta.style.position = 'fixed'
            ta.style.left = '-9999px'
            ta.style.top = '0'
            document.body.appendChild(ta)
            ta.focus()
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
            return true
        } catch (_) {
            return false
        }
    }

    const handleDownloadDevisPdf = async () => {
        if (isDownloading) return
        setIsDownloading(true)
        try {
            useUIStore.getState().showToast(t('work_order_detail.invoicing.generating_pdf', 'Téléchargement du PDF en cours...'), 'info')
            await buildSmartDevisPdf({ saveFile: true })
            useUIStore.getState().showToast(t('work_order_detail.invoicing.download_success', 'PDF téléchargé avec succès !'), 'success')
        } catch (err) {
            console.error('Download PDF error:', err)
            useUIStore.getState().showToast(t('work_order_detail.invoicing.download_error', 'Erreur lors du téléchargement du PDF.'), 'error')
        } finally {
            setIsDownloading(false)
        }
    }

    const getShareUrlAndTitle = () => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://davidechape.pontaj.app'
        const publicUrl = wo?.token ? `${origin}/confirm/${wo.token}` : (window.top?.location?.href || window.location.href)
        const docTitle = `Devis ${wo?.quote_number || ''}`.trim()
        const docText = `${docTitle}${wo?.client_name ? ` - ${wo.client_name}` : ''}`
        return { publicUrl, docTitle, docText }
    }

    const handleShareDevisPdf = async () => {
        const { publicUrl, docTitle, docText } = getShareUrlAndTitle()
        const topNav = (typeof window !== 'undefined' && window.top && window.top.navigator) ? window.top.navigator : navigator

        // 1. On HTTPS (secure context), invoke native iOS Share Sheet IMMEDIATELY (0ms delay so WebKit user gesture never expires)
        if (topNav && typeof topNav.share === 'function') {
            try {
                await topNav.share({
                    title: docTitle,
                    text: docText,
                    url: publicUrl
                })
                return
            } catch (err) {
                if (err?.name === 'AbortError') return
            }
        }

        // 2. On HTTP LAN or browsers without Web Share API, open Apple HIG Share Action Sheet
        setShowShareSheet(true)
    }



    useEffect(() => {
        const endpoint = token ? `/public/work-orders/${token}` : `/admin/work-orders/${id}`;
        let isMounted = true;
        const load = async () => {
            try {
                const woRes = await api.get(endpoint);
                const woData = woRes.data;
                let pricingPromise = Promise.resolve({ data: null });
                if (!token) {
                    const allowPref = !woData?.prices?.disable_preferential_pricing;
                    pricingPromise = api.get(`/admin/pricing-settings${(allowPref && woData.client_id) ? '?client_id=' + woData.client_id : ''}`).catch(err => {
                        console.error('Failed to load pricing settings:', err);
                        return { data: null };
                    });
                }
                const [pricingRes] = await Promise.all([pricingPromise]);
                if (isMounted) {
                    setWo(woData);
                    
                    if (woData.pricingSettings) {
                        // Folosim tarifele injectate de backend pe endpointul public (ținând cont de client preferențial)
                        setPricingSettings(woData.pricingSettings);
                    } else if (pricingRes.data) {
                        // Fallback pentru zona de admin
                        setPricingSettings(pricingRes.data);
                    }
                    
                    if (woData.proforma_data?.items) {
                        setProformaItems(woData.proforma_data.items);
                    }
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err);
                    setLoading(false);
                }
            }
        };
        load();
        return () => { isMounted = false; };
    }, [id, token]);

    useEffect(() => {
        if (wo) {
            const originalTitle = document.title;
            const devisNum = wo.quote_number || 'N/A';
            const dateStr = wo.approximate_date ? new Date(wo.approximate_date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
            const clientName = wo.client_name || wo.client?.company_name || wo.client?.first_name || 'Client';
            document.title = `Devis ${devisNum} - ${dateStr} - ${clientName}`;
            return () => { document.title = originalTitle }
        }
    }, [wo])

    useEffect(() => {
        if (!loading && window.location.hash === '#bottom') {
            setTimeout(() => {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
            }, 500);
        }
    }, [loading]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>
    if (error || !wo) return <div className="flex h-screen items-center justify-center font-bold text-red-600">{error || t('common.error', 'Erreur')}</div>

    const T = DEVIS_LANG[lang] || DEVIS_LANG['fr']
    const locale = lang === 'nl' ? 'nl-BE' : lang === 'en' ? 'en-GB' : 'fr-BE'

    // ── MOTOR UNIC DE CALCUL ──────────────────────────────────────────────────
    const isManualOverride = wo.proforma_data?.manual_override === true;
    
    let items, discountPct, discountAmount, netAfterDiscount, vatRate, vatAmount, totalGross;
    
    if (wo.proforma_data?.items?.length > 0 && isManualOverride) {
        items = wo.proforma_data.items;
        discountPct = wo.proforma_data.discountPct || 0;
        discountAmount = wo.proforma_data.discountAmount || 0;
        netAfterDiscount = items.reduce((s, i) => (i.isHeader || i.isSubtotal) ? s : s + (i.qty * i.price), 0);
        vatRate = wo.proforma_data.vatRate || 0;
        vatAmount = netAfterDiscount * (vatRate / 100);
        totalGross = netAfterDiscount + vatAmount;
    } else {
        const calcResult = buildQuoteItems(wo, pricingSettings);
        
        // Filtrăm discount-urile din lista de items (le afișăm separat)
        const nonDiscountItems = calcResult.items.filter(i => i.type !== 'discount');
        
        // Traduceri FR/NL/EN pentru deviz client
        items = nonDiscountItems.map(item => {
            if (item.isHeader) {
                let headerLabel = item.headerLabel;
                if (item.category === 'chape' || /chape/i.test(item.headerLabel)) {
                    headerLabel = T.chapeHeader || 'Chape';
                } else if (item.category === 'isolation' || /isolation/i.test(item.headerLabel)) {
                    headerLabel = T.isolationHeader || 'Isolation';
                }
                return { ...item, headerLabel };
            }
            if (item.isSubtotal) {
                let subtotalLabel = item.subtotalLabel;
                if (item.category === 'chape' || /chape/i.test(item.subtotalLabel)) {
                    subtotalLabel = T.subtotalChape || 'Sous-total Chape';
                } else if (item.category === 'isolation' || /isolation/i.test(item.subtotalLabel)) {
                    subtotalLabel = T.subtotalIsolation || 'Sous-total Isolation';
                }
                return { ...item, subtotalLabel };
            }
            let desc = item.desc;
            if (desc) {
                const isChapeBase = item.type === 'chape' && /Base/i.test(desc);
                const isChapeExtra = item.type === 'chape' && /Épaisseur Extra|Grosime Extra/i.test(desc);
                
                if (isChapeBase) {
                    const thick = parseFloat(item.thickness || 5);
                    const chapeNumStr = item.isMultipleChape ? ` ${item.chapeIndex}` : '';
                    if (lang === 'nl') desc = `Dekvloer leggen${chapeNumStr} ${thick} cm`;
                    else if (lang === 'en') desc = `Chape${chapeNumStr} ${thick} cm`;
                    else desc = `Pose de chape${chapeNumStr} ${thick} cm`;
                } else if (isChapeExtra) {
                    const extraMatch = desc.match(/\((\d+(?:\.\d+)?)\s*cm\)/i);
                    const cm = extraMatch ? extraMatch[1] : '';
                    const chapeNumStr = item.isMultipleChape ? ` (Chape ${item.chapeIndex})` : '';
                    if (lang === 'nl') desc = `Extra dikte${chapeNumStr} (${cm} cm)`;
                    else if (lang === 'en') desc = `Additional thickness${chapeNumStr} (${cm} cm)`;
                    else desc = `Épaisseur supplémentaire${chapeNumStr} (${cm} cm)`;
                } else {
                    if (/Feuille de plastique/i.test(desc)) desc = T.foil;
                    if (/Armature/i.test(desc)) desc = T.mesh;
                    if (/Fibre \+ Duramint/i.test(desc)) desc = T.fiber;
                    const purMatch = desc.match(/Isolation PUR(?:\s+(\d+))?\s*\((\d+(?:\.\d+)?)\s*cm\)/i);
                    if (purMatch) {
                        const pNum = purMatch[1] ? ` ${purMatch[1]}` : '';
                        const pThick = purMatch[2];
                        if (lang === 'nl') desc = `PUR Isolatie${pNum} ${pThick} cm`;
                        else if (lang === 'en') desc = `PUR Insulation${pNum} ${pThick} cm`;
                        else desc = `Isolation PUR${pNum} ${pThick} cm`;
                    }
                    if (/^Aspiration/i.test(desc)) desc = T.aspiration;
                    if (/^Nivellement/i.test(desc)) desc = T.nivellement;
                    if (/^Pon[cç]age/i.test(desc)) desc = T.poncage;
                    if (/^Protection/i.test(desc)) desc = T.protection;
                    const epsMatch = desc.match(/Isolation EPS(?:\s+(\d+))?\s*\(([^)]+)\)/i);
                    if (epsMatch) {
                        const eNum = epsMatch[1] ? ` ${epsMatch[1]}` : '';
                        const eText = epsMatch[2];
                        if (lang === 'nl') desc = `EPS Isolatie${eNum} (${eText})`;
                        else if (lang === 'en') desc = `EPS Insulation${eNum} (${eText})`;
                        else desc = `Isolation EPS${eNum} (${eText})`;
                    }
                    if (/^Transport/i.test(desc)) desc = 'Transport / Déplacement';
                    if (/^Forfait$/i.test(desc)) desc = T.forfait || 'Forfait';
                    if (/Ajustement/i.test(desc)) desc = 'Forfait minimum chantier';
                }
            }
            return { ...item, desc };
        });
        
        discountPct = calcResult.breakdown.globalDiscountPct;
        const discountItems = calcResult.items.filter(i => i.type === 'discount');
        discountAmount = discountItems.reduce((s, i) => s + Math.abs(i.qty * i.price), 0);
        netAfterDiscount = calcResult.net;
        vatRate = calcResult.vatRate;
        vatAmount = calcResult.vatAmount;
        totalGross = calcResult.totalGross;
    }


    const devisNum = wo.quote_number || '—'
    const dateStr = wo.approximate_date ? new Date(wo.approximate_date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')
    const primaryColor = tenant?.primary_color || '#0a9ccd'

    const isInIframe = typeof window !== 'undefined' && window.self !== window.top

    return (
        <div className={(embeddedToken || embedded) ? '' : 'min-h-screen bg-slate-100 print:bg-white'}>
            {!token && !embedded && (
                <div className="print:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                        {!isInIframe && (
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                aria-label="Retour"
                                title="Retour"
                                className="w-8 h-8 sm:w-auto sm:h-9 px-0 sm:px-3 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors shrink-0 whitespace-nowrap"
                            >
                                <ArrowLeft className="w-4 h-4 shrink-0" />
                                <span className="hidden sm:inline">Retour</span>
                            </button>
                        )}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-extrabold text-slate-800 text-xs sm:text-sm tabular-nums truncate">{devisNum}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5 shrink-0">
                        {/* Mobile: ONE single clean Apple Action button to avoid toolbar crowding */}
                        <button
                            type="button"
                            onClick={() => setShowShareSheet(true)}
                            aria-label="Actions & Partage PDF"
                            title="Actions & Partage PDF"
                            className="sm:hidden w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-xs inline-flex items-center justify-center transition-transform active:scale-95 shrink-0 cursor-pointer"
                        >
                            <Share2 className="w-4.5 h-4.5 shrink-0" />
                        </button>

                        {/* Desktop: Full Action Toolbar */}
                        <div className="hidden sm:flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={handleDownloadDevisPdf}
                                disabled={isDownloading}
                                aria-label={t('work_order_detail.invoicing.download_pdf', 'Télécharger PDF')}
                                title={t('work_order_detail.invoicing.download_pdf', 'Télécharger PDF')}
                                className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200/90 font-bold rounded-full text-sm shadow-2xs inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
                            >
                                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Download className="w-4 h-4 shrink-0" />}
                                <span>{t('work_order_detail.invoicing.download_pdf', 'Télécharger PDF')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowShareSheet(true)}
                                aria-label={t('common.share', 'Partager PDF')}
                                title={t('common.share', 'Partager PDF')}
                                className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200/90 font-bold rounded-full text-sm shadow-2xs inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                                <Share2 className="w-4 h-4 shrink-0" />
                                <span>{t('common.share', 'Partager')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        const res = await api.get(`/admin/work-orders/${id}`);
                                        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://davidechape.pontaj.app';
                                        await api.post(`/admin/work-orders/${id}/send-email`, { proforma_url: `${origin}/public/proforma/${res.data.token}` });
                                        useUIStore.getState().showToast(t('common.email_sent', 'Email envoyé avec succès !'), 'success');
                                    } catch (err) {
                                        useUIStore.getState().showToast(t('common.email_error', "Erreur lors de l'envoi de l'email."), 'error');
                                    }
                                }}
                                aria-label={t('common.send_email', 'Envoyer par e-mail')}
                                title={t('common.send_email', 'Envoyer par e-mail')}
                                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-sm shadow-xs inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                                <Mail className="w-4 h-4 shrink-0" />
                                <span>{t('common.send_email', 'Envoyer par e-mail')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => window.print()}
                                aria-label="Imprimer / PDF"
                                title="Imprimer / PDF"
                                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-sm shadow-xs inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                                <Printer className="w-4 h-4 shrink-0" />
                                <span>Imprimer / PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className={`print:p-0 max-w-[860px] mx-auto ${token ? 'p-0' : 'p-2.5 sm:p-6'}`}>
                <div id="devis-print-sheet" className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                    <div className="px-4 pt-4 pb-3.5 sm:px-8 sm:pt-7 sm:pb-4 print:px-8 print:pt-6">
                        <div className="flex flex-row justify-between items-start gap-3 sm:gap-4">
                            <div className="min-w-0">
                                {tenant?.logo_url ? (<img src={tenant.logo_url} alt="Logo" className="h-9 sm:h-12 print:h-12 object-contain mb-1 sm:mb-1.5" />) : (<div className="text-lg sm:text-2xl font-black text-slate-800">{tenant?.name || 'Davide Chape'}</div>)}
                                <div className="text-[10.5px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
                                    {tenant?.address && <div>{tenant.address}</div>}
                                    {tenant?.vat_number && <div>N° TVA: {tenant.vat_number}</div>}
                                    {tenant?.phone && <div>Tél: {tenant.phone}</div>}
                                    {tenant?.email && <div>{tenant.email}</div>}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-xs sm:text-sm text-slate-700 font-extrabold uppercase tracking-wider">{T.devis}</div>
                                <div className="text-xs sm:text-sm text-slate-500 font-bold mt-0.5 uppercase tracking-wider whitespace-nowrap">N° {devisNum}</div>
                                <div className="mt-1.5 sm:mt-2 text-[10.5px] sm:text-xs text-slate-500 space-y-0.5 whitespace-nowrap">
                                    <div>{T.date} <strong>{dateStr}</strong></div>
                                    <div>{T.validDays}</div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 sm:mt-4 h-0.5 rounded-full" style={{ backgroundColor: primaryColor + '50' }} />
                        {/* Always 2 columns side-by-side (CLIENT left, CHANTIER / ADRESSE right) so mobile & PDF never waste horizontal space */}
                        <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2.5 sm:gap-5">
                            <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-100 min-w-0">
                                <div className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{T.client}</div>
                                <div className="font-bold text-xs sm:text-sm text-slate-800 break-words flex items-center gap-1.5 sm:gap-2">
                                    <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                                        <User className="w-2.5 h-2.5" style={{ color: '#F7CA31' }} />
                                    </div>
                                    <span className="min-w-0 break-words">
                                        {wo.client_id ? (
                                            <a href={`/admin/clients/${wo.client_id}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors print:text-slate-800 text-inherit">
                                                {wo.client_name || '—'}
                                            </a>
                                        ) : (
                                            wo.client_name || '—'
                                        )}
                                    </span>
                                </div>
                                {(wo.client_phone || wo.client?.phone) && (
                                    <div className="text-[11px] sm:text-xs text-slate-600 mt-1.5 flex items-center gap-1.5 sm:gap-2">
                                        <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                                            <Phone className="w-2.5 h-2.5" style={{ color: '#F7CA31' }} />
                                        </div>
                                        <span className="truncate">{wo.client_phone || wo.client?.phone}</span>
                                    </div>
                                )}
                                {wo.client?.address && (
                                    <div className="text-[11px] sm:text-xs text-slate-600 mt-1 flex items-center gap-1.5 sm:gap-2 break-words">
                                        <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                                            <MapPin className="w-2.5 h-2.5" style={{ color: '#F7CA31' }} />
                                        </div>
                                        <span className="min-w-0 break-words">{wo.client.address}</span>
                                    </div>
                                )}
                                {wo.client_cui && <div className="text-[10.5px] sm:text-xs text-slate-400 mt-1">N° TVA: {wo.client_cui}</div>}
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-100 min-w-0">
                                <div className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{T.chantier}</div>
                                <div className="text-xs sm:text-sm text-slate-700 flex items-center gap-1.5 sm:gap-2">
                                    <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                                        <MapPin className="w-2.5 h-2.5" style={{ color: '#F7CA31' }} />
                                    </div>
                                    <span className="min-w-0 break-words">{wo.site_address || '—'}</span>
                                </div>
                                {wo.client_email && (
                                    <div className="text-[11px] sm:text-xs text-slate-600 mt-1.5 flex items-center gap-1.5 sm:gap-2 break-all">
                                        <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                                            <Mail className="w-2.5 h-2.5" style={{ color: '#F7CA31' }} />
                                        </div>
                                        <span className="min-w-0 break-all">{wo.client_email}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="pb-5 sm:pb-7 print:px-8">
                        <div className="w-full">
                            <div className="px-3 sm:px-8 space-y-1.5 pb-1.5 print:px-0">
                                <div className="grid grid-cols-12 gap-2 sm:gap-4 px-2 sm:px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <div className="col-span-5">{T.desc}</div>
                                    <div className="col-span-2 text-center">{T.qty}</div>
                                    <div className="col-span-1 text-center">{T.unit}</div>
                                    <div className="col-span-2 text-right">{T.pu}</div>
                                    <div className="col-span-2 text-right">{T.total}</div>
                                </div>
                                {items.map((item, i) => (
                                     item.isHeader ? (
                                         <div key={i} className="grid grid-cols-12 gap-3 sm:gap-4 px-3.5 sm:px-5 py-2 bg-slate-900 rounded-xl items-center break-inside-avoid pdf-avoid-break mt-3 first:mt-0 shadow-xs">
                                             <div className="col-span-12 font-black text-[11.5px] uppercase tracking-wider" style={{ color: '#F7CA31' }}>{item.headerLabel}</div>
                                         </div>
                                     ) : item.isSubtotal ? (
                                        <div key={i} className="grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-5 py-2 bg-slate-100/80 rounded-xl border border-slate-200/80 items-center break-inside-avoid pdf-avoid-break my-1 font-bold">
                                            <div className="col-span-9 sm:col-span-10 text-right pr-2 text-slate-600 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                                {item.subtotalLabel} :
                                            </div>
                                            <div className="col-span-3 sm:col-span-2 text-right text-slate-900 text-xs sm:text-sm font-black whitespace-nowrap">
                                                {(item.subtotalAmount || 0).toFixed(2)} €
                                            </div>
                                        </div>
                                    ) : (
                                    <div key={i} className="grid grid-cols-12 gap-2 sm:gap-4 px-2.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50 rounded-xl border border-slate-100 items-center break-inside-avoid pdf-avoid-break">
                                        <div className="col-span-5 text-slate-700 font-medium text-xs sm:text-sm">{item.desc}</div>
                                        <div className="col-span-2 text-center text-slate-600 font-medium text-xs sm:text-sm tabular-nums">{item.qty}</div>
                                        <div className="col-span-1 text-center text-slate-500 font-bold text-[9px] sm:text-[10px] uppercase">{item.unit}</div>
                                        <div className="col-span-2 text-right text-slate-600 text-xs sm:text-sm tabular-nums whitespace-nowrap">{item.price.toFixed(2)}</div>
                                        <div className="col-span-2 text-right font-bold text-slate-800 text-xs sm:text-sm tabular-nums whitespace-nowrap">{(item.qty * item.price).toFixed(2)}</div>
                                    </div>
                                    )
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end mt-4 px-4 sm:px-8 print:px-0 break-inside-avoid pdf-avoid-break">
                            <div className="w-64 sm:w-72 space-y-0.5 text-sm">
                                {discountAmount > 0 && (
                                    <div className="flex justify-between gap-2 py-1 px-3.5 font-bold text-emerald-600">
                                        <span>{discountPct > 0 ? `Remise Chape (${discountPct}%)` : 'Remise Chape'}</span>
                                        <span className="whitespace-nowrap tabular-nums">- {discountAmount.toFixed(2)} €</span>
                                    </div>
                                )}
                                <div className="flex justify-between gap-2 py-1 px-3.5 text-slate-600 font-bold">
                                    <span>Total Net</span>
                                    <span className="whitespace-nowrap tabular-nums">{netAfterDiscount.toFixed(2)} €</span>
                                </div>
                                {vatRate > 0 ? (
                                    <div className="flex justify-between gap-2 py-1 px-3.5 text-slate-600 font-bold">
                                        <span>TVA ({vatRate}%)</span>
                                        <span className="whitespace-nowrap tabular-nums">{vatAmount.toFixed(2)} €</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between gap-2 py-1 px-3.5 text-slate-400 text-xs italic">
                                        <span>TVA non appliquée</span>
                                        <span className="whitespace-nowrap tabular-nums">0.00 €</span>
                                    </div>
                                )}
                                <div className="flex justify-between gap-2 py-2.5 px-4 rounded-xl mt-1.5 font-black text-base bg-slate-900" style={{ color: '#F7CA31' }}>
                                    <span>{T.totalLabel}</span>
                                    <span className="whitespace-nowrap tabular-nums">{totalGross.toFixed(2)} €</span>
                                </div>
                            </div>
                        </div>
                        <div className="break-inside-avoid pdf-avoid-break">
                            <div className="mt-5 pt-4 px-4 sm:px-8 print:px-0 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
                                {wo.approximate_date && (
                                    <div className="mb-2.5 flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                                        <span className="font-bold text-slate-500">{T.dateEst}</span>
                                        <span className="font-black text-slate-800">
                                            {new Date(wo.approximate_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                                <p className="font-bold text-slate-500 mb-0.5">{T.condTitle}</p>
                                <p className="text-[11px] sm:text-xs">{T.condText}</p>
                            </div>
                            <div className="mt-5 px-4 sm:px-8 print:px-0 grid grid-cols-2 gap-5 sm:gap-8">
                                <div className="flex flex-col">
                                    <div className="min-h-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                        {wo?.client_name || wo?.client?.company_name || wo?.client?.first_name || T.signClient}
                                    </div>
                                    {signatureElement ? (
                                        <div className="w-full">
                                            {signatureElement}
                                        </div>
                                    ) : (wo?.final_client_signature || wo?.client_signature) ? (
                                        <div className="w-full flex flex-col">
                                            <div className="w-full aspect-[3.8/1] border-2 border-emerald-200 bg-emerald-50/50 rounded-2xl flex flex-col items-center justify-center p-2 text-center">
                                                {(wo.final_client_signature === 'accepted_without_signature' || wo.client_signature === 'accepted_without_signature') ? (
                                                    <>
                                                        <span className="text-emerald-700 font-bold text-sm">Accepté en ligne</span>
                                                        <span className="text-emerald-600 text-xs">(sans signature manuscrite)</span>
                                                    </>
                                                ) : (
                                                    <img src={wo.final_client_signature || wo.client_signature} alt="Signature" className="max-h-full object-contain" />
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-bold mt-1.5">
                                                Date: {new Date(wo.final_confirmed_at || wo.confirmed_at).toLocaleString('fr-BE')}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full">
                                            <div className="w-full aspect-[3.8/1] border-2 border-dashed border-slate-200 rounded-2xl"></div>
                                            <div className="text-[10px] text-slate-400 mt-1.5">Date: _______________</div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <div className="min-h-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{tenant?.name || 'Davide Chape'}</div>
                                    <div className="w-full">
                                        <div className="w-full aspect-[3.8/1] border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center p-2">
                                            {tenant?.logo_url ? <img src={tenant.logo_url} alt="Logo" className="h-4/5 object-contain opacity-40" /> : <span className="text-slate-300 text-xs font-bold">Cachet / Signature</span>}
                                        </div>
                                        <div className="text-[10px] text-transparent mt-1.5 pointer-events-none select-none">Spacer</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showShareSheet && createPortal(
                <div
                    className="print:hidden fixed inset-0 z-[99999] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3.5"
                    onClick={() => setShowShareSheet(false)}
                >
                    <div
                        className="w-full max-w-[360px] rounded-[24px] bg-[#F2F4F8] text-slate-900 border border-slate-300/90 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.45)] p-3.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-1.5 pb-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                                    <FileText className="w-4.5 h-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-[15px] font-black text-slate-900 truncate leading-tight">
                                        Actions · {devisNum}
                                    </h4>
                                    <p className="text-[11.5px] font-semibold text-slate-500 truncate">
                                        {wo?.client_name || 'Devis PDF'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowShareSheet(false)}
                                aria-label="Fermer"
                                className="w-9 h-9 rounded-full bg-white border border-slate-200/90 text-slate-600 flex items-center justify-center shadow-2xs cursor-pointer shrink-0"
                            >
                                <X className="w-4.5 h-4.5" />
                            </button>
                        </div>

                        <div className="rounded-[18px] bg-white border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                            {/* 1. Partager le fichier PDF depuis mon téléphone (Mon WhatsApp / AirDrop / Mail / Fichiers) */}
                            <button
                                type="button"
                                disabled={isSharing}
                                onClick={async () => {
                                    if (isSharing) return
                                    try {
                                        const topNav = (typeof window !== 'undefined' && window.top && window.top.navigator) ? window.top.navigator : navigator
                                        // A. On HTTPS (or browsers supporting Web Share API with files): open native iOS Share Sheet with the pre-generated PDF file in 0ms!
                                        if (readyPdfFile && topNav && typeof topNav.canShare === 'function' && topNav.canShare({ files: [readyPdfFile] })) {
                                            await topNav.share({
                                                files: [readyPdfFile],
                                                title: readyPdfFile.name
                                            })
                                            setShowShareSheet(false)
                                            return
                                        }

                                        // B. If PDF wasn't pre-generated yet or on HTTP LAN (where iOS disables navigator.share):
                                        setIsSharing(true)
                                        const docNum = wo?.quote_number || 'Devis'
                                        const cleanClient = (wo?.client_name || wo?.client?.name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')
                                        let filename = `${docNum}_${cleanClient}.pdf`
                                        let b64 = readyPdfBase64
                                        if (!b64) {
                                            const built = await buildSmartDevisPdf({ saveFile: false })
                                            b64 = built.base64
                                            filename = built.filename
                                            if (topNav && typeof topNav.canShare === 'function' && topNav.canShare({ files: [built.file] })) {
                                                await topNav.share({ files: [built.file], title: built.filename })
                                                setShowShareSheet(false)
                                                return
                                            }
                                        }

                                        // C. On HTTP LAN (http://192.168.x.x where iOS blocks navigator.share): cache raw PDF on backend and open in native iOS PDF Viewer
                                        const cacheRes = await api.post(`/admin/work-orders/${id}/cache-raw-pdf`, {
                                            pdf_base64: b64,
                                            filename
                                        })
                                        const apiBase = (api.defaults.baseURL || '/api').replace(/\/api\/?$/, '')
                                        const rawPdfUrl = `${apiBase}${cacheRes.data.raw_pdf_url}`
                                        setShowShareSheet(false)
                                        window.open(rawPdfUrl, '_blank')
                                    } catch (err) {
                                        if (err?.name !== 'AbortError') {
                                            console.error('Direct PDF share error:', err)
                                            void handleDownloadDevisPdf()
                                        }
                                    } finally {
                                        setIsSharing(false)
                                    }
                                }}
                                className="w-full px-3.5 py-3 flex items-center gap-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer disabled:opacity-55"
                            >
                                <div className="w-9.5 h-9.5 rounded-xl bg-emerald-500/12 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                    {isSharing ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Share2 className="w-4.5 h-4.5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13.5px] font-extrabold text-slate-900 leading-snug">
                                        Partager le PDF (Mon WhatsApp)
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-500 truncate">
                                        Envoyer {devisNum}.pdf à n'importe quel contact
                                    </div>
                                </div>
                            </button>

                            {/* 2. Envoyer automatiquement au client (WhatsApp Système Davide Chape) */}
                            <button
                                type="button"
                                disabled={isSendingWaPdf}
                                onClick={async () => {
                                    if (isSendingWaPdf) return
                                    setIsSendingWaPdf(true)
                                    try {
                                        const { publicUrl } = getShareUrlAndTitle()
                                        const docNum = wo?.quote_number || 'Devis'
                                        const cleanClient = (wo?.client_name || wo?.client?.name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')
                                        let filename = `${docNum}_${cleanClient}.pdf`
                                        let b64 = readyPdfBase64
                                        if (!b64) {
                                            const built = await buildSmartDevisPdf({ saveFile: false })
                                            b64 = built.base64
                                            filename = built.filename
                                        }
                                        useUIStore.getState().showToast('Envoi automatique du PDF au client...', 'info')
                                        await api.post(`/admin/work-orders/${id}/send-whatsapp-pdf`, {
                                            pdf_base64: b64,
                                            filename,
                                            signing_url: publicUrl
                                        })
                                        useUIStore.getState().showToast('Devis PDF envoyé au client sur WhatsApp !', 'success')
                                        setShowShareSheet(false)
                                    } catch (err) {
                                        console.error('WhatsApp PDF send error:', err)
                                        useUIStore.getState().showToast(err?.response?.data?.detail || "Erreur lors de l'envoi du PDF sur WhatsApp.", 'error')
                                    } finally {
                                        setIsSendingWaPdf(false)
                                    }
                                }}
                                className="w-full px-3.5 py-3 flex items-center gap-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer disabled:opacity-55"
                            >
                                <div className="w-9.5 h-9.5 rounded-xl bg-teal-500/12 text-teal-600 border border-teal-500/20 flex items-center justify-center shrink-0">
                                    {isSendingWaPdf ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <MessageCircle className="w-4.5 h-4.5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13.5px] font-extrabold text-slate-900 leading-snug">
                                        Envoyer au client (WhatsApp Auto)
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-500 truncate">
                                        {wo?.client_phone || wo?.client?.phone ? `Envoi direct par le système au ${wo.client_phone || wo.client?.phone}` : `Envoi automatique au numéro du client`}
                                    </div>
                                </div>
                            </button>

                            {/* 3. Envoyer par e-mail (Système) */}
                            <button
                                type="button"
                                onClick={async () => {
                                    setShowShareSheet(false)
                                    try {
                                        const res = await api.get(`/admin/work-orders/${id}`)
                                        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://davidechape.pontaj.app'
                                        await api.post(`/admin/work-orders/${id}/send-email`, { proforma_url: `${origin}/public/proforma/${res.data.token}` })
                                        useUIStore.getState().showToast(t('common.email_sent', 'Email envoyé avec succès !'), 'success')
                                    } catch (err) {
                                        useUIStore.getState().showToast(t('common.email_error', "Erreur lors de l'envoi de l'email."), 'error')
                                    }
                                }}
                                className="w-full px-3.5 py-3 flex items-center gap-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <div className="w-9.5 h-9.5 rounded-xl bg-blue-500/12 text-blue-600 border border-blue-500/20 flex items-center justify-center shrink-0">
                                    <Mail className="w-4.5 h-4.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13.5px] font-extrabold text-slate-900 leading-snug">
                                        {t('common.send_email', 'Envoyer par e-mail au client')}
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-500 truncate">
                                        {wo?.client_email || 'Envoyer le devis officiel par e-mail'}
                                    </div>
                                </div>
                            </button>

                            {/* 3. Télécharger le fichier PDF */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowShareSheet(false)
                                    void handleDownloadDevisPdf()
                                }}
                                className="w-full px-3.5 py-3 flex items-center gap-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <div className="w-9.5 h-9.5 rounded-xl bg-purple-500/12 text-purple-600 border border-purple-500/20 flex items-center justify-center shrink-0">
                                    <Download className="w-4.5 h-4.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13.5px] font-extrabold text-slate-900 leading-snug">
                                        Télécharger le PDF
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-500 truncate">
                                        Enregistrer {devisNum}.pdf sur l'appareil
                                    </div>
                                </div>
                            </button>

                            {/* 4. Imprimer / PDF */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowShareSheet(false)
                                    setTimeout(() => window.print(), 150)
                                }}
                                className="w-full px-3.5 py-3 flex items-center gap-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <div className="w-9.5 h-9.5 rounded-xl bg-teal-500/12 text-teal-600 border border-teal-500/20 flex items-center justify-center shrink-0">
                                    <Printer className="w-4.5 h-4.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13.5px] font-extrabold text-slate-900 leading-snug">
                                        Imprimer / PDF
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-500 truncate">
                                        Ouvrir l'aperçu d'impression
                                    </div>
                                </div>
                            </button>

                            {/* 5. Copier le lien du devis */}
                            <button
                                type="button"
                                onClick={async () => {
                                    const { publicUrl } = getShareUrlAndTitle()
                                    await copyTextFallback(publicUrl)
                                    setCopiedLink(true)
                                    useUIStore.getState().showToast(t('quotes.link_copied', 'Lien copié !'), 'success')
                                    setTimeout(() => {
                                        setCopiedLink(false)
                                        setShowShareSheet(false)
                                    }, 700)
                                }}
                                className="w-full px-3.5 py-3 flex items-center gap-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <div className="w-9.5 h-9.5 rounded-xl bg-amber-500/12 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
                                    {copiedLink ? <Check className="w-4.5 h-4.5 text-emerald-600" /> : <Copy className="w-4.5 h-4.5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13.5px] font-extrabold text-slate-900 leading-snug">
                                        {copiedLink ? 'Lien copié !' : 'Copier le lien du devis'}
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-500 truncate">
                                        Copier le lien de confirmation client
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <style>{`@media print { @page { margin: 1cm; size: A4; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
        </div>
    )
}

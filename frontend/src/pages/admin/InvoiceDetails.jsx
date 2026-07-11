import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, FileText, Download, Printer, User, Receipt, MapPin, Loader2, CreditCard, Save, Send, Trash2, Link, Building2, Phone, Mail, CalendarDays, CheckCircle2, Calendar } from 'lucide-react'
import api from '../../lib/api'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function InvoiceDetails() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [wo, setWo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('proforma')
    const [toastMessage, setToastMessage] = useState(null)
    const [isSendingToBilltobox, setIsSendingToBilltobox] = useState(false)

    const showToast = (msg) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 3000)
    }

    useEffect(() => {
        const fetchWo = async () => {
            try {
                const res = await api.get(`/admin/work-orders/${id}`)
                setWo(res.data)
                // Citeste ?tab= din URL daca exista (de la WorkOrderDetail navigate)
                const urlTab = new URLSearchParams(window.location.search).get('tab')
                if (urlTab === 'invoice' || urlTab === 'proforma') {
                    setActiveTab(urlTab)
                } else if (res.data.final_invoice_path) {
                    setActiveTab('invoice')
                } else if (res.data.proforma_path) {
                    setActiveTab(res.data.is_invoiced ? 'invoice' : 'proforma')
                }
            } catch (err) {
                console.error("Error fetching work order:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchWo()
    }, [id])

    useEffect(() => {
        if (wo) {
            const originalTitle = document.title;
            const num = activeTab === 'invoice' ? (wo.invoice_number || 'N/A') : (wo.quote_number || 'N/A');
            const dateStr = new Date(wo.proforma_issued_at || wo.approximate_date || Date.now()).toLocaleDateString('fr-FR');
            const cName = wo.client_name || wo.client?.company_name || wo.client?.first_name || 'Client';
            const typeStr = activeTab === 'invoice' ? 'Facture' : 'Devis';
            document.title = `${typeStr} ${num} - ${dateStr} - ${cName}`;
            
            return () => {
                document.title = originalTitle;
            }
        }
    }, [wo, activeTab])

    const handleMarkInvoiced = async () => {
        try {
            await api.patch(`/admin/work-orders/${wo.id}/invoice-status`, { is_invoiced: true })
            setWo(prev => ({ ...prev, is_invoiced: true, invoiced_at: new Date().toISOString() }))
            setActiveTab('invoice')
            showToast('La facture a été émise avec succès. Le numéro de facture a été généré.')
        } catch (error) {
            console.error('Failed to update invoice status:', error)
            showToast('Une erreur est survenue lors de l’émission de la facture.')
        }
    }

    const handleSendToBilltobox = async () => {
        try {
            setIsSendingToBilltobox(true)
            const res = await api.post(`/admin/work-orders/${wo.id}/billtobox`)
            setWo(prev => ({ ...prev, billtobox_status: res.data.status }))
            showToast('La facture a été envoyée avec succès à Billtobox !')
        } catch (error) {
            console.error('Failed to send invoice to Billtobox:', error)
            const msg = error.response?.data?.detail || 'Une erreur est survenue lors de l’envoi de la facture.'
            showToast(msg)
            setWo(prev => ({ ...prev, billtobox_status: 'error', billtobox_error: msg }))
        } finally {
            setIsSendingToBilltobox(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!wo) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-slate-800">{t('invoicing_details.not_found', 'Le travail n\'a pas été trouvé')}</h2>
                <button onClick={() => navigate('/admin/invoicing')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">{t('invoicing_details.back_to_invoicing', 'Retour à la facturation')}</button>
            </div>
        )
    }

    const pdfPath = wo.final_invoice_path || wo.proforma_path
    const isGenerated = !!pdfPath

    const clientData = wo.proforma_data || {}
    let items = clientData.items || []
    
    if (items.length === 0) {
        items = [{
            qty: 1,
            price: parseFloat(wo.estimated_price?.toString().replace(/[^0-9.]/g, '') || '0')
        }]
    }

    // Total DEVIS (estimatif — din proforma_data)
    const subtotal = items.reduce((sum, it) => sum + (it.qty * it.price), 0)
    const discountVal = (subtotal * (clientData.discount || 0)) / 100
    const netTotal = subtotal - discountVal
    
    // Configurare automată a cotelor TVA din setările de preț (wo.prices)
    let defaultVatRate = 21;
    const clientType = clientData.client_type || wo.client_type || 'fizica';
    const workType = wo.work_type || 'new';
    
    if (wo.prices?.vat_type !== undefined) {
        defaultVatRate = parseFloat(wo.prices.vat_type);
    } else if (clientType === 'juridica' || clientType === 'pj') {
        defaultVatRate = parseFloat(wo.prices?.vat_legal_entity ?? 0);
    } else {
        if (workType === 'repair') {
            defaultVatRate = parseFloat(wo.prices?.vat_physical_repair ?? 6);
        } else {
            defaultVatRate = parseFloat(wo.prices?.vat_physical_new ?? 21);
        }
    }
    
    const vatRate = clientData.useVat !== false ? parseFloat(clientData.vatRate ?? wo.prices?.vat_rate ?? defaultVatRate) : 0;
    const devisTotalWithVat = netTotal * (1 + vatRate / 100)

    // Total FACTURA (real — pe baza suprafetelor reale introduse de sef echipa)
    const realSurf  = parseFloat(wo.actual_surface_m2 || 0)
    const realThick = parseFloat(wo.actual_thickness_cm || 0)
    let invoiceTotal = 0
    let hasRealData = false
    if (realSurf > 0 && wo.volumes?.length > 0) {
        hasRealData = true
        const stdThick = parseFloat(wo.prices?.standard_thickness || 5)
        const extraThick = Math.max(0, realThick - stdThick)
        invoiceTotal += realSurf * parseFloat(wo.prices?.base || 12.5)
        invoiceTotal += extraThick * realSurf * parseFloat(wo.prices?.extra_thickness_price_per_cm || wo.prices?.extra || 1.25)
        const vol = wo.volumes[0]
        if (vol?.has_foil) invoiceTotal += realSurf * parseFloat(wo.prices?.foil || 1.2)
        if (vol?.has_mesh) invoiceTotal += realSurf * parseFloat(wo.prices?.mesh || 2.5)
        if (vol?.has_fiber) invoiceTotal += realSurf * parseFloat(wo.prices?.fiber || (realSurf <= 200 ? 2.5 : 2.0))
        if (wo.prices?.surface_thresholds) {
            wo.prices.surface_thresholds.forEach(t => {
                if (realSurf >= parseFloat(t.min_sqm || 0) && realSurf < parseFloat(t.max_sqm || 999999))
                    invoiceTotal += parseFloat(t.extra_charge || 0)
            })
        }
    }
    const invoiceTotalWithVat = invoiceTotal * (1 + vatRate / 100)
    const clientDisplayName = clientData.clientName || wo.client_name || wo.client?.company_name || (wo.client?.first_name ? `${wo.client.first_name} ${wo.client.last_name || ''}`.trim() : null)

    const getIframeSrc = () => {
        if (activeTab === 'invoice') return `${window.location.origin}/proforma/${wo.id}?type=invoice`
        return `${window.location.origin}/admin/quotes/${wo.id}/pdf`
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto h-[calc(100vh-64px)] flex flex-col">
            <div className="flex items-center gap-4 mb-6 shrink-0">
                <button 
                    onClick={() => navigate('/admin/invoicing')}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-500" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-6 h-6 text-slate-800 dark:text-slate-200" />
                        {t('invoicing_details.title', 'Détails Fiscaux')}: {clientDisplayName || wo.title || t('invoicing.no_title', 'Sans titre')}
                    </h1>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                        {wo.is_invoiced ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase tracking-wider border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {t('invoicing.status_invoiced', 'Facturé')}
                            </span>
                        ) : wo.is_quote && wo.status === 'planning' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase tracking-wider border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Devis Planifié
                            </span>
                        ) : wo.proforma_path ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 uppercase tracking-wider border border-blue-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                {t('invoicing.status_proforma', 'Proforma Émise')}
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                {t('invoicing.status_notinvoiced', 'Non Facturé')}
                            </span>
                        )}
                        <span className="text-slate-500 font-medium">#{wo.id}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {wo.token && (
                        <button
                            onClick={() => {
                                const clientLink = wo.is_invoiced 
                                    ? `${window.location.origin}/public/proforma/${wo.token}?type=invoice`
                                    : `${window.location.origin}/confirm/${wo.token}`;
                                navigator.clipboard.writeText(clientLink)
                                showToast(t('quotes.link_copied', 'Le lien du client a été copié dans le presse-papiers !'));
                            }}
                            className="flex items-center gap-2 px-4 h-9 rounded-full bg-blue-100 text-blue-700 text-sm font-bold hover:bg-blue-200 transition-colors shadow-sm shrink-0"
                            title={wo.is_invoiced ? t('quotes.copy_link_invoice', 'Copier le lien de la facture') : t('quotes.copy_link_desc', 'Envoyer ce lien au client pour signature')}
                        >
                            <Link className="w-3.5 h-3.5" />
                            {t('quotes.copy_link', 'Copier le lien client')}
                        </button>
                    )}
                    {wo.is_quote && (
                        <button
                            onClick={() => navigate(`/admin/quotes/${wo.id}/pdf`)}
                            className="flex items-center gap-2 px-4 h-9 rounded-full bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm shrink-0"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Devis PDF
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                {/* Left side - Fiscal Details */}
                <div className="w-full lg:w-[450px] shrink-0 flex flex-col gap-6 overflow-y-auto pb-8 pr-2 custom-scrollbar">
                    {/* Client Info */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                            <User className="w-4 h-4" /> {t('invoicing_details.client_data', 'Données Client')}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{t('invoicing_details.name_company', 'Nom / Entreprise')}</p>
                                <p className="font-semibold text-slate-900 dark:text-white">{clientData.clientName || clientData.client_name || wo.client_name || wo.client?.company_name || (wo.client?.first_name ? `${wo.client.first_name} ${wo.client.last_name}` : null) || t('invoicing_details.unspecified', 'Non spécifié')}</p>
                            </div>
                            {(clientData.client_type === 'juridica' || wo.client_type === 'juridica') && (clientData.client_company_vat || wo.client_company_vat || wo.client?.company_vat) && (
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t('invoicing_details.cui_vat', 'N° TVA')}</p>
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">{clientData.client_company_vat || wo.client_company_vat || wo.client?.company_vat}</p>
                                </div>
                            )}
                            {(clientData.client_address || wo.client_address || wo.client?.company_address || wo.site_address) && (
                                <div className="flex gap-2 text-slate-600 dark:text-slate-400">
                                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientData.client_address || wo.client_address || wo.client?.company_address || wo.site_address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm leading-snug text-blue-600 hover:underline"
                                    >
                                        {clientData.client_address || wo.client_address || wo.client?.company_address || wo.site_address}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Invoice + Devis Info */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                            <Receipt className="w-4 h-4" /> DÉTAILS D'ÉMISSION
                        </h3>
                        <div className="flex flex-col gap-3">
                            {/* Devis */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 whitespace-nowrap">N° Devis</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{wo.quote_number || clientData.quoteNumber || clientData.quote_number || 'EST 0840'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Date Devis</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">
                                        {wo.proforma_issued_at ? new Date(wo.proforma_issued_at).toLocaleDateString('fr-FR') : ''}
                                    </p>
                                </div>
                            </div>
                            {/* Separator */}
                            {wo.is_invoiced && <div className="border-t border-slate-100 dark:border-slate-700" />}
                            {/* Facture */}
                            {wo.is_invoiced && (
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-0.5">N° Facture</p>
                                        <p className="font-bold text-emerald-700 dark:text-emerald-400">{wo.invoice_number || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-0.5">Date Facture</p>
                                        <p className="font-bold text-emerald-700 dark:text-emerald-400">
                                            {wo.invoiced_at ? new Date(wo.invoiced_at).toLocaleDateString('fr-FR') : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Totals Preview */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
                            RÉSUMÉ FINANCIER
                        </h3>
                        <div className="space-y-3">
                            {/* DEVIS (estimatif) */}
                            <div className="flex justify-between items-center text-sm text-slate-500">
                                <span className="font-medium">Devis (estimatif):</span>
                                <span className="font-bold">€ {devisTotalWithVat > 0 ? devisTotalWithVat.toFixed(2) : netTotal.toFixed(2)}</span>
                            </div>
                            {/* FACTURE (real) — afisat doar daca exista date reale */}
                            {hasRealData && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-emerald-700">Facture (réel):</span>
                                    <span className="font-bold text-emerald-700">€ {invoiceTotalWithVat.toFixed(2)}</span>
                                </div>
                            )}
                            {discountVal > 0 && (
                                <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                                    <span>Remise ({clientData.discount}%):</span>
                                    <span>- € {discountVal.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">TOTAL NET À PAYER:</span>
                                <span className="text-xl font-black text-emerald-700">
                                    € {hasRealData && wo.is_invoiced ? invoiceTotalWithVat.toFixed(2) : (devisTotalWithVat > 0 ? devisTotalWithVat.toFixed(2) : netTotal.toFixed(2))}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - PDF Viewer */}
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
                    {wo.is_quote ? (
                        /* DEVIS — afișează PDF-ul devisului direct în iframe */
                        <iframe
                            src={`/admin/quotes/${wo.id}/pdf`}
                            className="w-full h-full border-none"
                            title="Devis PDF"
                        />
                    ) : isGenerated ? (
                        <div className="flex flex-col h-full w-full">
                            <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 p-3 px-6 flex justify-between items-center shrink-0">
                                {wo.is_invoiced ? (
                                    <div className="bg-white dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex gap-1">
                                        <button
                                            onClick={() => setActiveTab('proforma')}
                                            className={`px-5 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === 'proforma' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            {t('invoicing.devis', 'DEVIS')}
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('invoice')}
                                            className={`px-5 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === 'invoice' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            {t('invoicing.facture', 'FACTURE')}
                                        </button>
                                    </div>
                                ) : <div />}
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => {
                                            const iframe = document.getElementById('invoice-iframe');
                                            if (iframe) {
                                                iframe.contentWindow.focus();
                                                iframe.contentWindow.print();
                                            }
                                        }} 
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full shadow-sm font-bold text-sm transition-transform hover:scale-105"
                                    >
                                        <Printer className="w-4 h-4" />
                                        {t('invoicing.print_pdf', 'Imprimer le PDF')}
                                    </button>
                                    {!wo.is_invoiced && !wo.is_quote && wo.proforma_path && (
                                        <button
                                            onClick={handleMarkInvoiced}
                                            className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm shrink-0 transition-transform hover:scale-105"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            {t('invoicing.issue_invoice', 'Émettre la Facture')}
                                        </button>
                                    )}
                                    {wo.is_invoiced && (
                                        <button
                                            onClick={handleSendToBilltobox}
                                            disabled={isSendingToBilltobox || wo.billtobox_status === 'sent'}
                                            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold shadow-sm shrink-0 transition-transform hover:scale-105 ${wo.billtobox_status === 'sent' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'}`}
                                        >
                                            {isSendingToBilltobox ? <Loader2 className="w-4 h-4 animate-spin" /> : (wo.billtobox_status === 'sent' ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />)}
                                            {wo.billtobox_status === 'sent' ? t('invoicing.sent_to_billtobox', 'Envoyé à Billtobox') : t('invoicing.send_to_billtobox', 'Envoyer à Billtobox')}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <iframe 
                                id="invoice-iframe"
                                src={getIframeSrc()} 
                                className="w-full flex-1 border-none bg-slate-100 dark:bg-slate-900"
                                title="Invoice PDF"
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8 text-center bg-slate-50 dark:bg-slate-900/50">
                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 border border-slate-200">
                                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">{t('invoicing_details.no_document_issued', 'Aucun document émis')}</h3>
                            <p className="max-w-md text-sm leading-relaxed">
                                {t('invoicing_details.no_document_desc', 'La facture ou la proforma n\'a pas encore été générée. Utilisez le bouton d\'aperçu et d\'émission sur la page d\'administration pour créer le document.')}
                            </p>
                            <button 
                                onClick={() => navigate('/admin/invoicing')}
                                className="mt-6 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                {t('invoicing_details.back_to_generation', 'Retour à la génération')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[9999] bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="font-bold text-sm">{toastMessage}</span>
                </div>
            )}
        </div>
    )
}

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    FileText, Search, ExternalLink, FileOutput, CheckCircle2, CircleDot, AlertTriangle,
    Loader2, X, User, Copy, Clock, Pencil, MoreVertical, XCircle, CalendarDays, Send,
    RefreshCw, FileSpreadsheet, ShieldCheck, Building2, Download, FileCode, Euro, Users
} from 'lucide-react'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'
import ProformaView from './ProformaView'
import SearchableSelect from '../../components/SearchableSelect'
import AddressAutocomplete from '../../components/AddressAutocomplete'
import { buildQuoteItems } from '../../utils/priceCalculator'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

import i18n from '../../i18n'

const toLocalISO = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0]
}

const _orderFinancialsMemo = new Map()

function computeOrderFinancials(wo, pricingSettings) {
    const cacheKey = `${wo.id}:${wo.updated_at || ''}:${wo.is_invoiced ? 1 : 0}:${pricingSettings ? 'ps' : 'nops'}`
    if (_orderFinancialsMemo.has(cacheKey)) {
        return _orderFinancialsMemo.get(cacheKey)
    }
    const p = wo.prices || {}
    const pdata = wo.proforma_data || {}
    let net = 0
    let vatRate = 0

    // 1. Check saved proforma_data.items
    const pRaw = pdata.items
    if (Array.isArray(pRaw) && pRaw.length > 0) {
        const d0 = String(pRaw[0].desc || '').toLowerCase().trim()
        const isPlaceholder = pRaw.length === 1 && (
            pRaw[0].id === 'default' ||
            d0.includes('conform deviz') ||
            d0.includes('manoper') ||
            d0 === 'chape' || d0 === 'sapa'
        )
        if (!isPlaceholder) {
            const totalItems = pRaw
                .filter(i => !i.isHeader && !i.isSubtotal)
                .reduce((s, i) => s + (parseFloat(i.qty ?? 1) * parseFloat(i.price || 0)), 0)
            const discount = parseFloat(p.discount || 0)
            net = Math.max(0, totalItems - discount)
        }
    }

    // 2. Fallback: buildQuoteItems
    if (net <= 0 && Array.isArray(wo.volumes) && wo.volumes.length > 0) {
        try {
            const calc = buildQuoteItems(wo, pricingSettings, {
                isInvoice: Boolean(wo.is_invoiced),
                useInvoiceData: Boolean(wo.is_invoiced)
            })
            if (calc && calc.net > 0) {
                net = parseFloat(calc.net) || 0
            }
        } catch {
            // fallback below
        }
    }

    // 3. Fallback: computed_total / estimated_price
    if (net <= 0) {
        const rawEst = String(wo.estimated_price || '0').replace(/[^0-9.]/g, '')
        net = parseFloat(wo.computed_total) || parseFloat(rawEst) || 0
    }

    // VAT determination
    const useVat = pdata.useVat !== undefined ? pdata.useVat : (p.useVat !== false)
    if (useVat !== false) {
        if (pdata.vatRate !== undefined && pdata.vatRate !== null) {
            vatRate = parseFloat(pdata.vatRate) || 0
        } else if (p.vat_type !== undefined && p.vat_type !== null) {
            vatRate = parseFloat(p.vat_type) || 0
        } else if (wo.client_type === 'pj' || wo.client_type === 'juridica') {
            vatRate = 0
        } else {
            vatRate = wo.work_type === 'repair' ? 6 : 21
        }
    }

    const vatAmount = net * (vatRate / 100)
    const gross = net + vatAmount

    // Extract VAT / CBE number for Peppol
    const rawVat = String(
        pdata.client_company_vat ||
        wo.client_company_vat ||
        wo.client_cui ||
        wo.client_company_reg_number ||
        ''
    ).trim()

    const cleanDigits = rawVat.replace(/[^0-9A-Za-z]/g, '').toUpperCase()
    const isB2B = wo.client_type === 'pj' || wo.client_type === 'juridica' || Boolean(cleanDigits)
    const peppolEndpoint = cleanDigits
        ? (cleanDigits.startsWith('BE') ? `0208:${cleanDigits.replace(/^BE/, '')}` : `9956:${cleanDigits}`)
        : null

    const finResult = {
        net: Number(net.toFixed(2)),
        vatRate,
        vatAmount: Number(vatAmount.toFixed(2)),
        gross: Number(gross.toFixed(2)),
        rawVat,
        isB2B,
        peppolEndpoint,
        isPeppolReady: Boolean(cleanDigits)
    }
    _orderFinancialsMemo.set(cacheKey, finResult)
    return finResult
}

const ActionMenu = ({ wo, onEdit, onMarkInvoiced, onStorno, onCopyLink, copiedToken, onSendToBilltobox, onDownloadPeppolXml, onPreviewPdf }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = React.useRef(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    const toggle = (e) => {
        e.stopPropagation();
        if (!isOpen) {
            const rect = btnRef.current.getBoundingClientRect();
            setCoords({ top: rect.bottom, left: rect.right - 240 }); 
        }
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleScrollOrClick = () => setIsOpen(false);
        if (isOpen) {
            window.addEventListener('click', handleScrollOrClick);
            window.addEventListener('scroll', handleScrollOrClick, true);
        }
        return () => {
            window.removeEventListener('click', handleScrollOrClick);
            window.removeEventListener('scroll', handleScrollOrClick, true);
        };
    }, [isOpen]);

    return (
        <>
            <button 
                ref={btnRef} 
                onClick={toggle} 
                className="w-9 h-9 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors border border-slate-200/90 dark:border-slate-700 shadow-2xs cursor-pointer"
                title={t('invoicing.menu_actions', 'Menu Actions')}
            >
                <MoreVertical className="w-4 h-4" />
            </button>
            {isOpen && createPortal(
                <div 
                    className="fixed z-[99999] w-60 bg-white dark:bg-slate-900 rounded-[18px] shadow-2xl border border-slate-200/90 dark:border-slate-700 py-2 flex flex-col gap-0.5"
                    style={{ top: coords.top + 6, left: Math.max(12, coords.left) }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        onClick={() => { navigate(`/admin/invoices/${wo.id}`); setIsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-[14px] font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                        <FileText className="w-4 h-4 text-[color:var(--tenant-bg)]" />
                        {t('invoicing.open_invoice_view', 'Ouvrir Devis / Facture')}
                    </button>

                    {wo.proforma_path ? (
                        <>
                            <button 
                                onClick={() => { onPreviewPdf({ url: (wo.is_quote || !wo.is_invoiced) ? `/admin/quotes/${wo.id}/pdf` : wo.proforma_path, wo }); setIsOpen(false); }}
                                className="w-full text-left px-4 py-2 text-[14px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                            >
                                <FileOutput className="w-4 h-4 text-slate-400" />
                                {t('invoicing.view_pdf', 'Télécharger / Voir PDF')}
                            </button>
                            <button 
                                onClick={() => { onEdit(wo); setIsOpen(false); }}
                                className="w-full text-left px-4 py-2 text-[14px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                            >
                                <Pencil className="w-4 h-4 text-slate-400" />
                                {t('invoicing.edit_doc', 'Éditer le Document')}
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => { onEdit(wo); setIsOpen(false); }}
                            className="w-full text-left px-4 py-2 text-[14px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                        >
                            <FileOutput className="w-4 h-4 text-slate-400" />
                            {t('invoicing.generate_proforma', 'Générer la Proforma')}
                        </button>
                    )}

                    <button
                        onClick={() => { onCopyLink(wo); setIsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-[14px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                        {copiedToken === wo.token ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        {t('invoicing.copy_link', 'Copier le Lien Client')}
                    </button>

                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                    <button
                        onClick={() => { onSendToBilltobox(wo.id); setIsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-[14px] font-bold text-[color:var(--tenant-bg)] hover:bg-blue-50/70 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                        <Send className="w-4 h-4" />
                        {wo.billtobox_status === 'sent'
                            ? t('invoicing.resend_billtobox', 'Retransmettre Peppol / Billtobox')
                            : t('invoicing.send_billtobox', 'Transmettre Peppol / Billtobox')}
                    </button>

                    <button
                        onClick={() => { onDownloadPeppolXml(wo); setIsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-[14px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                        <FileCode className="w-4 h-4 text-indigo-500" />
                        {t('invoicing.download_ubl', 'Télécharger XML Peppol (UBL 2.1)')}
                    </button>
                    
                    {!wo.is_invoiced ? (
                        <button 
                            onClick={() => { onMarkInvoiced(wo.id); setIsOpen(false); }}
                            className="w-full text-left px-4 py-2 text-[14px] text-emerald-600 hover:bg-emerald-50 flex items-center gap-2.5 border-t border-slate-100 dark:border-slate-800 mt-1 pt-2 font-bold"
                        >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            {t('invoicing.mark_invoiced', 'Émettre la Facture')}
                        </button>
                    ) : (
                        <button
                            onClick={() => { onStorno(wo.id); setIsOpen(false); }}
                            className="w-full text-left px-4 py-2 text-[14px] font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 border-t border-slate-100 dark:border-slate-800 mt-1 pt-2"
                        >
                            <XCircle className="w-4 h-4 text-red-500" />
                            {t('invoicing.storno', 'Annuler la Facture (Storno)')}
                        </button>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                    <button 
                        onClick={() => { navigate(`/admin/work-orders/${wo.id}`); setIsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-[13.5px] font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                        {t('invoicing.view_details', 'Voir la Fiche Chantier')}
                    </button>
                </div>,
                document.body
            )}
        </>
    );
};

let _invoicingMemoryCache = {
    workOrders: (typeof window !== 'undefined' && window.__adminInvoiceOrdersCache) || null,
    clients: (typeof window !== 'undefined' && window.__adminClientsCache) || null,
    pricingSettings: (typeof window !== 'undefined' && window.__adminPricingSettingsCache) || null,
    lastUpdated: ''
}

export default function InvoicingManagement() {
    const { t } = useTranslation()
    const navigate = useNavigate()

    const [toast, setToast] = useState(null)
    const showToast = (msg, type = 'error') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const [workOrders, setWorkOrders] = useState(() => (typeof window !== 'undefined' && window.__adminInvoiceOrdersCache) || _invoicingMemoryCache.workOrders || [])
    const [clients, setClients] = useState(() => (typeof window !== 'undefined' && window.__adminClientsCache) || _invoicingMemoryCache.clients || [])
    const [loading, setLoading] = useState(() => !((typeof window !== 'undefined' && window.__adminInvoiceOrdersCache) || _invoicingMemoryCache.workOrders))
    const [previewWo, setPreviewWo] = useState(null)
    const [generatingId, setGeneratingId] = useState(null)
    const [copiedToken, setCopiedToken] = useState(null)
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
    const [isSearchingVies, setIsSearchingVies] = useState(false)
    const [selectedTeams, setSelectedTeams] = useState([])   // array de team names
    const [statusFilter, setStatusFilter] = useState(null)    // null | 'unfactured' | 'proforma' | 'invoiced' | 'quote'
    const [peppolFilter, setPeppolFilter] = useState('all')   // 'all' | 'sent' | 'unsent' | 'error' | 'b2b'
    const [activePreset, setActivePreset] = useState('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [lastUpdated, setLastUpdated] = useState(() => _invoicingMemoryCache.lastUpdated || '')
    const [proformaConfig, setProformaConfig] = useState({ 
        useVat: true, 
        discountPct: 0, 
        items: [],
        client_mode: 'existing',
        client_id: '',
        client_type: 'fizica',
        client_country: 'RO',
        client_company_vat: '',
        client_company_reg_number: '',
        client_phone: '',
        client_email: '',
        client_address: ''
    })

    const [pricingSettings, setPricingSettings] = useState(() => (typeof window !== 'undefined' && window.__adminPricingSettingsCache) || _invoicingMemoryCache.pricingSettings || null)

    const calculateItems = (wo, config, pSettings) => {
        const ps = pSettings || pricingSettings;
        const tFunc = i18n.getFixedT(config.lang);
        
        if (config.useAutoCalc) {
            const calcRes = buildQuoteItems(wo, ps, {
                isInvoice: true,
                useInvoiceData: true,
                surface: config.surface,
                thickness: config.thickness
            });
            const validItems = (calcRes.items || []).filter(i => i.type !== 'discount' && !i.isHeader && !i.isSubtotal).map((it, idx) => ({
                id: it.id || `${Date.now()}-${idx}`,
                desc: it.desc,
                qty: it.qty,
                price: it.price
            }));
            if (validItems.length > 0) return validItems;
        }

        // Mode forfetar / Fallback
        const priceRaw = parseFloat(wo.estimated_price?.replace(/[^0-9.]/g, '') || '0');
        return [{
            id: Date.now().toString(),
            desc: `${tFunc('proforma.items.custom_work', 'Travaux selon devis')} (${wo.title || tFunc('proforma.items.labor_materials', 'Main-d\'œuvre et matériaux')})`,
            qty: 1,
            price: priceRaw > 0 ? priceRaw : 0
        }];
    };

    const handleOpenPreview = async (wo) => {
        let activePs = pricingSettings;
        if (wo.client_id) {
            try {
                const psRes = await api.get(`/admin/pricing-settings?client_id=${wo.client_id}`);
                if (psRes.data) {
                    activePs = psRes.data;
                    setPricingSettings(activePs);
                }
            } catch (e) {
                console.error("Error fetching client pricing settings:", e);
            }
        }

        if (wo.proforma_data) {
            let data = { ...wo.proforma_data };
            let shouldUseFallback = !data.items || data.items.length === 0;
            if (data.items?.length === 1 && (String(data.items[0].id).includes('default') || String(data.items[0].desc).includes('Lucrări conform deviz') || String(data.items[0].desc).includes('Manoperă') || String(data.items[0].desc).toLowerCase() === 'chape')) {
                shouldUseFallback = true;
            }
            if (shouldUseFallback) {
                data.items = calculateItems(wo, data, activePs);
            }
            setProformaConfig(data);
            setPreviewWo(wo);
            return;
        }

        const titleLower = (wo.title || '').toLowerCase();
        const isAuto = wo.work_type === 'sapa_mecanizata' || wo.work_type === 'isoflex' || titleLower.includes('isoflex') || (!wo.estimated_price && (wo.actual_surface_m2 > 0 || wo.surface_m2 > 0));
        
        let extractedSurface = 0;
        let extractedThickness = 0;
        let hasFoil = false;
        let hasMesh = false;
        let hasSapa = false;

        if (wo.volumes && Array.isArray(wo.volumes)) {
            wo.volumes.forEach(vol => {
                const surface = parseFloat(vol.quantity) || 0;
                const thickness = parseFloat(vol.thickness) || 0;
                const labelSafe = (vol.label || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if ((labelSafe.includes('sapa') || labelSafe.includes('chape')) && surface > 0) {
                    extractedSurface += surface;
                    if (thickness > extractedThickness) extractedThickness = thickness;
                    if (vol.has_foil) hasFoil = true;
                    if (vol.has_mesh) hasMesh = true;
                    hasSapa = true;
                }
            });
        }

        // Prioritate absolută datelor reale confirmate de băieți / șeful de șantier din teren
        const realSurface = parseFloat(wo.actual_surface_m2) || 0;
        const realThickness = parseFloat(wo.actual_thickness_cm) || 0;

        const surfaceForAuto = realSurface > 0 ? realSurface : (extractedSurface > 0 ? extractedSurface : parseFloat(wo.surface_m2 || 0));
        const thicknessForAuto = realThickness > 0 ? realThickness : (extractedThickness > 0 ? extractedThickness : parseFloat(wo.thickness_cm || 5));

        const cDetailsParts = [];
        if (wo.client_email) cDetailsParts.push(wo.client_email);
        if (wo.client_phone) cDetailsParts.push(wo.client_phone);
        if (wo.client_cui || wo.client_company_vat) cDetailsParts.push(`VAT: ${wo.client_cui || wo.client_company_vat}`);
        if (wo.client_reg_com) cDetailsParts.push(`Reg: ${wo.client_reg_com}`);
        if (wo.client_address) cDetailsParts.push(wo.client_address);

        const config = {
            clientName: wo.client_name || '',
            clientDetails: cDetailsParts.join('\n'),
            useVat: wo.client_type === 'fizica',
            discountPct: 0,
            lang: localStorage.getItem('proformaLang') || wo.client_language || localStorage.getItem('i18nextLng') || 'fr',
            useAutoCalc: isAuto,
            surface: surfaceForAuto,
            thickness: thicknessForAuto,
            hasFoilFromVol: hasFoil,
            hasMeshFromVol: hasMesh,
            hasSapaFromVol: hasSapa,
            client_mode: wo.client_id ? 'existing' : 'new',
            client_id: wo.client_id || '',
            client_type: wo.client_type || 'fizica',
            client_country: wo.client_country || 'RO',
            client_company_vat: wo.client_cui || wo.client_company_vat || '',
            client_company_reg_number: wo.client_reg_com || '',
            client_phone: wo.client_phone || '',
            client_email: wo.client_email || '',
            client_address: wo.client_address || ''
        };
        
        // Ensure initial items use correct lang and pricing
        config.items = calculateItems(wo, config, activePs);
        
        setProformaConfig(config);
        setPreviewWo(wo);
    }

    const applyPreset = (presetKey) => {
        const now = new Date()
        let start = new Date(now)
        let end = new Date(now)

        if (presetKey === 'all') {
            setActivePreset('all')
            setDateFrom('')
            setDateTo('')
            return
        } else if (presetKey === 'today') {
            // start & end = today
        } else if (presetKey === 'last_7') {
            start.setDate(now.getDate() - 7)
        } else if (presetKey === 'last_30') {
            start.setDate(now.getDate() - 30)
        } else if (presetKey === 'current_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1)
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        } else if (presetKey === 'prev_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            end = new Date(now.getFullYear(), now.getMonth(), 0)
        } else if (presetKey === 'current_year') {
            start = new Date(now.getFullYear(), 0, 1)
            end = new Date(now.getFullYear(), 11, 31)
        }

        setActivePreset(presetKey)
        setDateFrom(toLocalISO(start))
        setDateTo(toLocalISO(end))
    }

    const fetchOrdersAndClients = async (isBackground = false) => {
        const hasCache = Boolean((typeof window !== 'undefined' && window.__adminInvoiceOrdersCache) || _invoicingMemoryCache.workOrders)
        if (!isBackground && !hasCache) setLoading(true)
        try {
            const [woRes, clRes, psRes] = await Promise.all([
                api.get('/admin/work-orders?limit=1000&invoice_mode=true'),
                api.get('/admin/clients'),
                api.get('/admin/pricing-settings').catch(() => ({ data: null }))
            ])
            const wos = Array.isArray(woRes.data) ? woRes.data : (woRes.data?.items || woRes.data || [])
            const cls = Array.isArray(clRes.data) ? clRes.data : (clRes.data?.items || [])
            const ps = psRes.data || (typeof window !== 'undefined' && window.__adminPricingSettingsCache) || _invoicingMemoryCache.pricingSettings || null
            const nowStr = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

            _invoicingMemoryCache = { workOrders: wos, clients: cls, pricingSettings: ps, lastUpdated: nowStr }
            if (typeof window !== 'undefined') {
                window.__adminInvoiceOrdersCache = wos
                window.__adminClientsCache = cls
                if (ps) window.__adminPricingSettingsCache = ps
            }
            setWorkOrders(wos)
            setClients(cls)
            if (ps) setPricingSettings(ps)
            setLastUpdated(nowStr)
        } catch (error) {
            console.error('Error fetching data for invoicing:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrdersAndClients()
    }, [])

    const handleViesSearch = async () => {
        const vatNum = proformaConfig.client_company_vat?.replace(/[^0-9A-Za-z]/g, '');
        if (!vatNum) return;
        setIsSearchingVies(true);
        try {
            const country = proformaConfig.client_country || 'RO';
            const res = await api.get(`/admin/clients/vies/${country}/${vatNum}`);
            if (res.data) {
                setProformaConfig(p => ({
                    ...p,
                    clientName: res.data.name || p.clientName,
                    client_address: res.data.address || p.client_address
                }));
            }
        } catch (error) {
            console.error('VIES Error:', error);
            showToast(t('clients.vies_error', 'L\'entreprise n\'a pas été trouvée ou le service VIES est indisponible. Vérifiez le code TVA.'), 'error');
        } finally {
            setIsSearchingVies(false);
        }
    }

    const confirmGeneration = async () => {
        if (!previewWo) return
        const woId = previewWo.id
        setGeneratingId(woId)
        try {
            const res = await api.post(`/admin/work-orders/${woId}/generate-proforma`, proformaConfig)
            if (res.data.proforma_path) {
                setWorkOrders(prev => prev.map(wo => 
                    wo.id === woId ? { 
                        ...wo, 
                        proforma_path: res.data.proforma_path, 
                        proforma_issued_at: new Date().toISOString()
                    } : wo
                ))
            }
            showToast(t('invoicing.proforma_generated_success', 'Proforma générée avec succès !'), 'success')
            setPreviewWo(null)
            navigate(`/admin/invoices/${woId}`)
        } catch (error) {
            console.error('Failed to generate proforma:', error)
            showToast(t('invoicing.proforma_generation_error', 'Une erreur est survenue lors de la génération de la proforma.'), 'error')
        } finally {
            setGeneratingId(null)
        }
    }

    const handleMarkInvoiced = async (woId) => {
        try {
            await api.patch(`/admin/work-orders/${woId}/invoice-status`, { is_invoiced: true })
            setWorkOrders(prev => prev.map(wo => 
                wo.id === woId ? { ...wo, is_invoiced: true, invoiced_at: new Date().toISOString() } : wo
            ))
            showToast(t('invoicing.mark_invoiced_success', 'Le travail a été marqué comme facturé !'), 'success')
        } catch (error) {
            console.error('Failed to update invoice status:', error)
            showToast(t('invoicing.mark_invoiced_error', 'Une erreur est survenue.'), 'error')
        }
    }

    const handleStornoInvoice = async (woId) => {
        try {
            await api.patch(`/admin/work-orders/${woId}/invoice-status`, { is_invoiced: false })
            setWorkOrders(prev => prev.map(wo => 
                wo.id === woId ? { ...wo, is_invoiced: false } : wo
            ))
            showToast(t('invoicing.storno_success', 'La facture a été annulée (Storno) et est revenue au stade de Proforma.'), 'success')
        } catch (error) {
            console.error('Failed to storno invoice status:', error)
            showToast(t('invoicing.storno_error', 'Une erreur est survenue lors de l\'annulation de la facture.'), 'error')
        }
    }

    const handleCopyLink = (wo) => {
        if (wo.token) {
            const link = `${window.location.origin}/public/proforma/${wo.token}`;
            navigator.clipboard.writeText(link);
            setCopiedToken(wo.token);
            setTimeout(() => setCopiedToken(null), 2000);
            showToast(t('invoicing.link_copied', 'Lien copié dans le presse-papiers !'), 'success');
        } else {
            showToast(t('invoicing.token_unavailable', 'Jeton indisponible pour ce travail.'), 'error');
        }
    };

    const handleSendToBilltobox = async (woId) => {
        try {
            setWorkOrders(prev => prev.map(wo => 
                wo.id === woId ? { ...wo, billtobox_status: 'pending' } : wo
            ))
            showToast(t('invoicing.sending_billtobox', 'Transmitere factură UBL în Peppol / Billtobox...'), 'success')
            
            const res = await api.post(`/admin/work-orders/${woId}/billtobox`)
            
            setWorkOrders(prev => prev.map(wo => 
                wo.id === woId ? {
                    ...wo,
                    is_invoiced: true,
                    billtobox_status: res.data.status || 'sent',
                    billtobox_sent_at: res.data.sent_at || new Date().toISOString(),
                    billtobox_error: null
                } : wo
            ))
            showToast(t('invoicing.billtobox_success', 'Factura a fost transmisă cu succes în Peppol / Billtobox !'), 'success')
        } catch (error) {
            console.error('Failed to send invoice to Billtobox:', error)
            const msg = error.response?.data?.detail || t('invoicing.billtobox_error', 'Eroare la transmiterea în Peppol / Billtobox.')
            showToast(msg, 'error')
            
            setWorkOrders(prev => prev.map(wo => 
                wo.id === woId ? { ...wo, billtobox_status: 'error', billtobox_error: msg } : wo
            ))
        }
    }

    const handleDownloadPeppolXml = async (wo) => {
        try {
            const res = await api.get(`/admin/work-orders/${wo.id}/peppol-xml`, { responseType: 'blob' })
            const docNum = wo.invoice_number || wo.quote_number || String(wo.id || '').slice(0, 8).toUpperCase()
            const blob = new Blob([res.data], { type: 'application/xml' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Peppol_UBL_BIS3_${docNum}.xml`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            showToast(`XML Peppol UBL (${docNum}) descărcat cu succes!`, 'success')
        } catch (err) {
            console.error('Error downloading Peppol XML:', err)
            showToast('Eroare la generarea fișierului XML Peppol UBL.', 'error')
        }
    }

    // Pre-calculate financials & Peppol metadata for every work order
    const enrichedOrders = useMemo(() => {
        return workOrders.map(wo => {
            const fin = computeOrderFinancials(wo, pricingSettings)
            const rawDate = (wo.invoiced_at || wo.start_date || wo.deadline_date || wo.approximate_date || wo.created_at || '').split('T')[0]
            return {
                ...wo,
                _fin: fin,
                _effectiveDate: rawDate
            }
        })
    }, [workOrders, pricingSettings])

    // Filter by Date Period first (so KPIs reflect the selected period!)
    const periodOrders = useMemo(() => {
        if (!dateFrom && !dateTo) return enrichedOrders
        const startStr = dateFrom ? dateFrom.replace(/-/g, '') : '00000000'
        const endStr = dateTo ? dateTo.replace(/-/g, '') : '99999999'
        return enrichedOrders.filter(wo => {
            if (!wo._effectiveDate) return false
            const d = wo._effectiveDate.replace(/-/g, '')
            return d >= startStr && d <= endStr
        })
    }, [enrichedOrders, dateFrom, dateTo])

    // Compute Period KPIs
    const kpiStats = useMemo(() => {
        let totalNet = 0
        let totalGross = 0
        let toInvoiceCount = 0
        let toInvoiceNet = 0
        let invoicedCount = 0
        let invoicedNet = 0
        let peppolSentCount = 0
        let peppolSentNet = 0
        let peppolUnsentCount = 0
        let peppolUnsentNet = 0
        let peppolErrorCount = 0
        let b2bMissingVatCount = 0

        periodOrders.forEach(wo => {
            const net = wo._fin.net || 0
            const gross = wo._fin.gross || 0
            totalNet += net
            totalGross += gross

            if (wo.is_invoiced) {
                invoicedCount++
                invoicedNet += net
            } else {
                toInvoiceCount++
                toInvoiceNet += net
            }

            if (wo.billtobox_status === 'sent') {
                peppolSentCount++
                peppolSentNet += net
            } else if (wo.billtobox_status === 'error') {
                peppolErrorCount++
                peppolUnsentCount++
                peppolUnsentNet += net
            } else {
                peppolUnsentCount++
                peppolUnsentNet += net
            }

            if (wo._fin.isB2B && !wo._fin.isPeppolReady) {
                b2bMissingVatCount++
            }
        })

        return {
            totalCount: periodOrders.length,
            totalNet: Math.round(totalNet),
            totalGross: Math.round(totalGross),
            avgNet: periodOrders.length > 0 ? Math.round(totalNet / periodOrders.length) : 0,
            toInvoiceCount,
            toInvoiceNet: Math.round(toInvoiceNet),
            invoicedCount,
            invoicedNet: Math.round(invoicedNet),
            peppolSentCount,
            peppolSentNet: Math.round(peppolSentNet),
            peppolUnsentCount,
            peppolUnsentNet: Math.round(peppolUnsentNet),
            peppolErrorCount,
            b2bMissingVatCount
        }
    }, [periodOrders])

    const allTeamNames = useMemo(() => [...new Set(periodOrders.map(w => w.assigned_team_name).filter(Boolean))], [periodOrders])
    const toggleTeam = (name) => setSelectedTeams(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name])

    const STATUS_FILTERS = [
        { key: 'invoiced', label: t('invoicing.status_invoiced', 'Facturate'), count: kpiStats.invoicedCount },
        { key: 'proforma', label: 'Proformă / Devis PDF', count: periodOrders.filter(w => w.proforma_path).length },
        { key: 'unfactured', label: t('invoicing.status_notinvoiced', 'Nefacturate'), count: kpiStats.toInvoiceCount },
        { key: 'quote', label: 'Devis Planificat', count: periodOrders.filter(w => w.is_quote && w.status === 'planning').length },
    ]

    const PEPPOL_FILTERS = [
        { key: 'all', label: 'Toate Peppol', icon: ShieldCheck, iconClass: 'text-indigo-500' },
        { key: 'sent', label: `Trimise Peppol (${kpiStats.peppolSentCount})`, icon: CheckCircle2, iconClass: 'text-emerald-500' },
        { key: 'unsent', label: `Netrimise (${kpiStats.peppolUnsentCount})`, icon: Clock, iconClass: 'text-amber-500' },
        { key: 'error', label: `Erori (${kpiStats.peppolErrorCount})`, icon: AlertTriangle, iconClass: 'text-rose-500' },
        { key: 'b2b', label: 'Clienți B2B (TVA/BCE)', icon: Building2, iconClass: 'text-indigo-500' }
    ]

    const filteredOrders = useMemo(() => {
        return periodOrders.filter(wo => {
            if (selectedTeams.length > 0 && !selectedTeams.includes(wo.assigned_team_name)) return false
            if (statusFilter === 'unfactured' && wo.is_invoiced) return false
            if (statusFilter === 'proforma' && !wo.proforma_path) return false
            if (statusFilter === 'invoiced' && !wo.is_invoiced) return false
            if (statusFilter === 'quote' && !(wo.is_quote && wo.status === 'planning')) return false

            if (peppolFilter === 'sent' && wo.billtobox_status !== 'sent') return false
            if (peppolFilter === 'unsent' && wo.billtobox_status === 'sent') return false
            if (peppolFilter === 'error' && wo.billtobox_status !== 'error') return false
            if (peppolFilter === 'b2b' && !wo._fin.isB2B) return false

            return true
        })
    }, [periodOrders, selectedTeams, statusFilter, peppolFilter])

    const handleExportCSV = () => {
        const headers = ['Nr Document', 'Data', 'Client', 'Tip Client', 'Cod TVA / BCE', 'Peppol Endpoint', 'Adresa', 'Echipa', 'Valoare HT (EUR)', 'TVA (%)', 'Total TTC (EUR)', 'Status Factura', 'Status Peppol / Billtobox', 'Data Transmiterii Peppol']
        const rows = filteredOrders.map(wo => [
            wo.invoice_number || wo.quote_number || `#${String(wo.id || '').slice(0, 6).toUpperCase()}`,
            wo._effectiveDate || '',
            `"${String(wo.client_name || '').replace(/"/g, '""')}"`,
            wo._fin.isB2B ? 'B2B' : 'B2C',
            `"${wo._fin.rawVat || ''}"`,
            `"${wo._fin.peppolEndpoint || ''}"`,
            `"${String(wo.site_address || wo.site_name || '').replace(/"/g, '""')}"`,
            `"${String(wo.assigned_team_name || '').replace(/"/g, '""')}"`,
            wo._fin.net.toFixed(2),
            wo._fin.vatRate,
            wo._fin.gross.toFixed(2),
            wo.is_invoiced ? 'FACTURAT' : (wo.proforma_path ? 'PROFORMA' : 'NEFACTURAT'),
            wo.billtobox_status === 'sent' ? 'TRIMIS PEPPOL' : (wo.billtobox_status === 'error' ? 'EROARE PEPPOL' : 'NETRIMIS'),
            wo.billtobox_sent_at ? new Date(wo.billtobox_sent_at).toLocaleString('ro-RO') : ''
        ])
        const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const a = document.createElement('a')
        a.href = encodeURI(csv)
        a.download = `facturare_peppol_${dateFrom || 'toate'}_${dateTo || 'toate'}.csv`
        a.click()
    }

    const columns = [
        {
            key: 'date',
            label: t('invoicing.col_doc_date', 'Document / Dată'),
            sortable: true,
            sortValue: (wo) => wo._effectiveDate || '',
            render: (wo) => {
                const docNum = wo.invoice_number || wo.quote_number || `#${String(wo.id || '').slice(0, 6).toUpperCase()}`
                return (
                    <div className="flex flex-col gap-0.5 whitespace-nowrap">
                        <button
                            onClick={() => navigate(`/admin/invoices/${wo.id}`)}
                            className="font-black text-[14.5px] text-slate-900 dark:text-white hover:text-[color:var(--tenant-bg)] text-left tabular-nums tracking-tight cursor-pointer"
                        >
                            #{docNum.replace(/^#/, '')}
                        </button>
                        <span className="text-[12.5px] text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                            {wo._effectiveDate ? new Date(wo._effectiveDate).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                        </span>
                        {wo.assigned_team_name && (
                            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold text-slate-600 dark:text-slate-400 mt-0.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: wo.assigned_team_color || '#2563EB' }} />
                                {wo.assigned_team_name}
                            </span>
                        )}
                    </div>
                )
            }
        },
        {
            key: 'client',
            label: t('invoicing.col_client', 'Client & TVA / BCE (Peppol)'),
            sortable: true,
            sortValue: (wo) => (wo.client_name || '').toLowerCase(),
            render: (wo) => (
                <div className="flex flex-col max-w-sm">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button 
                            onClick={() => navigate(`/admin/invoices/${wo.id}`)}
                            className="font-extrabold text-slate-900 hover:text-[color:var(--tenant-bg)] dark:text-white transition-colors text-left text-[14.5px] cursor-pointer truncate" 
                            title={wo.client_name || t('invoicing.no_client', 'Sans Client')}
                        >
                            {wo.client_name || t('invoicing.no_client', 'Sans Client')}
                        </button>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase whitespace-nowrap ${
                            wo._fin.isB2B
                                ? 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                            {wo._fin.isB2B ? 'B2B' : 'B2C'}
                        </span>
                        {wo._fin.rawVat ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums border border-slate-200/80 dark:border-slate-700 whitespace-nowrap">
                                TVA: {wo._fin.rawVat}
                            </span>
                        ) : wo._fin.isB2B ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                Lipsă CUI / TVA
                            </span>
                        ) : null}
                    </div>
                    <span className="text-[12.5px] font-medium text-slate-500 truncate mt-0.5" title={wo.site_name || wo.site_address}>
                        {wo.site_name || wo.site_address || t('invoicing.no_address', 'Sans adresse')}
                    </span>
                </div>
            )
        },
        {
            key: 'details',
            label: t('invoicing.col_details', 'Suprafață / Grosime'),
            sortable: true,
            sortValue: (wo) => parseFloat(wo.volumes?.[0]?.quantity || wo.surface_m2 || 0),
            render: (wo) => {
                const vol = wo.volumes?.[0]
                const estSurf = parseFloat(vol?.quantity || wo.surface_m2 || 0)
                const estThick = parseFloat(vol?.thickness || wo.thickness_cm || 0)
                const realSurf = parseFloat(wo.actual_surface_m2 || 0)
                const realThick = parseFloat(wo.actual_thickness_cm || 0)

                if (!estSurf && !realSurf) return <span className="text-slate-400">—</span>

                return (
                    <div className="flex flex-col gap-0.5 tabular-nums whitespace-nowrap">
                        <div className="flex items-baseline gap-1.5">
                            {estSurf > 0 && <span className="font-black text-slate-900 dark:text-slate-100 text-[14.5px] whitespace-nowrap">{estSurf} m²</span>}
                            {estThick > 0 && <span className="text-[13px] font-semibold text-slate-500 whitespace-nowrap">· {estThick} cm</span>}
                        </div>
                        {(realSurf > 0 || realThick > 0) && (
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-[10.5px] font-black text-emerald-600 uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-50">Réel</span>
                                {realSurf > 0 && <span className="text-[13px] font-extrabold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{realSurf} m²</span>}
                                {realThick > 0 && <span className="text-[12px] font-semibold text-emerald-600 whitespace-nowrap">· {realThick} cm</span>}
                            </div>
                        )}
                    </div>
                )
            }
        },
        {
            key: 'price',
            label: t('invoicing.col_price', 'Valoare (€ HT / TTC)'),
            sortable: true,
            sortValue: (wo) => wo._fin?.net || 0,
            render: (wo) => {
                const { net, vatRate, gross } = wo._fin
                return (
                    <div className="tabular-nums whitespace-nowrap">
                        <div className="text-[15.5px] font-black text-slate-900 dark:text-white leading-tight">
                            {net > 0 ? `${net.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'}
                            <span className="text-[11.5px] font-bold text-slate-400 ml-1">HT</span>
                        </div>
                        {net > 0 && (
                            <div className="text-[12px] font-semibold text-slate-500 mt-0.5">
                                TTC ({vatRate}%): <strong className="text-slate-700 dark:text-slate-300">{gross.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
                            </div>
                        )}
                    </div>
                )
            }
        },
        {
            key: 'status',
            label: t('invoicing.col_status', 'Status Factură'),
            sortable: true,
            sortValue: (wo) => wo.is_invoiced ? 3 : wo.proforma_path ? 2 : wo.confirmed_at ? 1 : 0,
            render: (wo) => {
                const confirmedBadge = wo.confirmed_at ? (
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-emerald-600 mt-1 whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Confirmé client
                    </span>
                ) : null

                if (wo.is_invoiced) {
                    return (
                        <div className="flex flex-col items-start">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12.5px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 whitespace-nowrap">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                {t('invoicing.status_invoiced', 'Facturé')}
                            </span>
                            {confirmedBadge}
                        </div>
                    )
                }
                if (wo.proforma_path) {
                    return (
                        <div className="flex flex-col items-start">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12.5px] font-extrabold bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/25 whitespace-nowrap">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                {t('invoicing.status_proforma', 'Proforma Émise')}
                            </span>
                            {confirmedBadge}
                        </div>
                    )
                }
                if (wo.is_quote && wo.status === 'planning') {
                    return (
                        <div className="flex flex-col items-start">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12.5px] font-extrabold bg-purple-500/12 text-purple-700 dark:text-purple-300 border border-purple-500/25 whitespace-nowrap">
                                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                                Devis Planifié
                            </span>
                            {confirmedBadge}
                        </div>
                    )
                }
                return (
                    <div className="flex flex-col items-start">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12.5px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/80 whitespace-nowrap">
                            <CircleDot className="w-3.5 h-3.5 shrink-0" />
                            {t('invoicing.status_notinvoiced', 'Non facturé')}
                        </span>
                        {confirmedBadge}
                    </div>
                )
            }
        },
        {
            key: 'peppol',
            label: 'Peppol / Billtobox (SPV Belgia)',
            sortable: true,
            sortValue: (wo) => wo.billtobox_status === 'sent' ? 3 : wo.billtobox_status === 'error' ? 2 : wo.billtobox_status === 'pending' ? 1 : 0,
            render: (wo) => {
                const status = wo.billtobox_status || 'none'
                const sentAt = wo.billtobox_sent_at ? new Date(wo.billtobox_sent_at).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null

                return (
                    <div className="flex flex-col gap-1 min-w-[215px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {status === 'sent' ? (
                                <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 whitespace-nowrap">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    Trimis în Peppol
                                </span>
                            ) : status === 'pending' ? (
                                <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-extrabold bg-amber-500/15 text-amber-700 border border-amber-500/25 whitespace-nowrap">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                    Se transmite...
                                </span>
                            ) : status === 'error' ? (
                                <span
                                    className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-extrabold bg-rose-500/15 text-rose-700 border border-rose-500/25 whitespace-nowrap"
                                    title={wo.billtobox_error || 'Eroare transmitere'}
                                >
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    Eroare Peppol
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 whitespace-nowrap">
                                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                                    Netrimis Peppol
                                </span>
                            )}

                            {/* 1-Click Peppol Send & UBL XML Download (identical h-8 height) */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleSendToBilltobox(wo.id) }}
                                    disabled={status === 'pending'}
                                    className={`h-8 px-2.5 rounded-full text-[12px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                                        status === 'sent'
                                            ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90'
                                            : 'bg-[color:var(--tenant-bg)] hover:brightness-95 text-white'
                                    }`}
                                    title={status === 'sent' ? 'Retransmite factura în Peppol / Billtobox' : 'Transmite factura acum în Peppol / Billtobox (e-FFF UBL)'}
                                >
                                    <Send className="w-3 h-3" />
                                    {status === 'sent' ? 'Retrimite' : 'Trimite'}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDownloadPeppolXml(wo) }}
                                    className="h-8 px-2.5 rounded-full text-[12px] font-extrabold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/90 flex items-center gap-1 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                                    title="Descarcă fișierul XML Peppol BIS 3.0 (e-FFF UBL 2.1 Belgia)"
                                >
                                    <FileCode className="w-3.5 h-3.5" />
                                    UBL
                                </button>
                            </div>
                        </div>

                        {/* Secondary line: Sent timestamp, error message, or Peppol Endpoint ID */}
                        {status === 'sent' && sentAt ? (
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                Transmis: {sentAt} {wo._fin.peppolEndpoint ? `• ID ${wo._fin.peppolEndpoint}` : ''}
                            </span>
                        ) : status === 'error' && wo.billtobox_error ? (
                            <span className="text-[11.5px] font-semibold text-rose-600 truncate max-w-[230px]" title={wo.billtobox_error}>
                                {wo.billtobox_error}
                            </span>
                        ) : wo._fin.peppolEndpoint ? (
                            <span className="text-[11.5px] font-semibold text-slate-500 tabular-nums">
                                Endpoint Peppol: <strong className="text-slate-700 dark:text-slate-300">{wo._fin.peppolEndpoint}</strong>
                            </span>
                        ) : (
                            <span className="text-[11.5px] font-medium text-slate-400">
                                Standard UBL BIS 3.0 (e-FFF)
                            </span>
                        )}
                    </div>
                )
            }
        },
        {
            key: 'actions',
            label: t('invoicing.col_actions', 'Acțiuni'),
            render: (wo) => (
                <div className="flex items-center justify-end gap-1.5 pr-1">
                    {!wo.is_invoiced && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleMarkInvoiced(wo.id) }}
                            className="h-8.5 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-extrabold flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                            title="Emite Factura Fiscală"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Facturează
                        </button>
                    )}
                    <ActionMenu 
                        wo={wo} 
                        onEdit={handleOpenPreview} 
                        onMarkInvoiced={handleMarkInvoiced} 
                        onStorno={handleStornoInvoice}
                        onCopyLink={handleCopyLink}
                        copiedToken={copiedToken}
                        onSendToBilltobox={handleSendToBilltobox}
                        onDownloadPeppolXml={handleDownloadPeppolXml}
                        onPreviewPdf={setPdfPreviewUrl}
                    />
                </div>
            )
        }
    ]

    const handleUpdateItem = (id, field, value) => {
        setProformaConfig(p => ({
            ...p,
            items: p.items.map(it => it.id === id ? { ...it, [field]: value } : it)
        }))
    }

    const handleAddItem = () => {
        setProformaConfig(p => ({
            ...p,
            items: [...p.items, { id: Date.now().toString(), desc: t('invoicing.new_item_default', 'Nouveau matériel/service'), qty: 1, price: 0 }]
        }))
    }

    const handleRemoveItem = (id) => {
        setProformaConfig(p => ({
            ...p,
            items: p.items.filter(it => it.id !== id)
        }))
    }

    return (
        <div className="w-full space-y-4">
            {/* ── 1. HEADER DISPATCH LIVE (Apple HIG uniform height controls) ─────────── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-[24px] font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                            {t('nav.invoicing', 'Facturation, Proformas & Peppol (Belgique)')}
                        </h1>
                        <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[13px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </span>
                        <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12.5px] font-extrabold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Peppol BIS 3.0 / e-FFF (BE0785292895)
                        </span>
                    </div>
                    <p className="text-[13.5px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                        {t('invoicing.page_desc', 'Gestiunea facturilor, proformelor și evidența transmiterii electronice în rețeaua Peppol / Billtobox Belgia')}
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {lastUpdated && (
                        <span className="text-[13px] font-semibold text-slate-400 mr-1 tabular-nums">
                            Actualizat: {lastUpdated}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={fetchOrdersAndClients}
                        className="h-10 px-4 rounded-full bg-white hover:bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[13.5px] font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                    >
                        <RefreshCw className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                        <span>Reîncarcă</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="h-10 px-4 rounded-full bg-[color:var(--tenant-bg)] hover:brightness-95 text-white text-[13.5px] font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                    >
                        <FileSpreadsheet className="w-4 h-4 shrink-0" />
                        <span>Export CSV & Peppol</span>
                    </button>
                </div>
            </div>

            {/* ── 2. PERIOD & TEAM FILTER BAR (all pills & pickers identical h-[42px] outer / h-8 inner) ── */}
            <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] border border-slate-200/90 dark:border-slate-800 p-3.5 space-y-2.5">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
                    {/* Period Preset Pills (p-1 + border + h-8 = exact 42px outer height, single row) */}
                    <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700 flex-nowrap overflow-x-auto hide-scrollbar">
                        {[
                            { id: 'all', label: 'Toate' },
                            { id: 'today', label: 'Astăzi' },
                            { id: 'last_7', label: '7 Zile' },
                            { id: 'last_30', label: '30 Zile' },
                            { id: 'current_month', label: 'Luna Curentă' },
                            { id: 'prev_month', label: 'Luna Trecută' },
                            { id: 'current_year', label: 'Anul Curent' }
                        ].map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => applyPreset(p.id)}
                                className={`h-8 px-3 rounded-full text-[13px] font-bold inline-flex items-center justify-center transition-all whitespace-nowrap cursor-pointer ${
                                    activePreset === p.id
                                        ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/70'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom Date Range Pickers (exact h-[42px]) */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-full px-3.5 h-[42px]">
                            <CalendarDays className="w-4 h-4 text-[color:var(--tenant-bg)] shrink-0" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setActivePreset('custom') }}
                                className="ui-date-input bg-transparent text-[13px] font-bold text-slate-800 dark:text-slate-200 outline-none tabular-nums"
                            />
                            <span className="text-slate-400 font-bold">–</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setActivePreset('custom') }}
                                className="ui-date-input bg-transparent text-[13px] font-bold text-slate-800 dark:text-slate-200 outline-none tabular-nums"
                            />
                            {(dateFrom || dateTo) && (
                                <button
                                    type="button"
                                    onClick={() => applyPreset('all')}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
                                    title="Resetează perioada"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Team Filter Pills */}
                {allTeamNames.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-400 mr-1.5 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> Echipe:
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedTeams([])}
                            className={`h-8 px-3.5 rounded-full text-[13px] font-bold inline-flex items-center justify-center transition-all cursor-pointer ${
                                selectedTeams.length === 0
                                    ? 'bg-[color:var(--tenant-bg)] text-white shadow-2xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                            Toate Echipele
                        </button>
                        {allTeamNames.map(name => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => toggleTeam(name)}
                                className={`h-8 px-3.5 rounded-full text-[13px] font-bold inline-flex items-center justify-center transition-all cursor-pointer border ${
                                    selectedTeams.includes(name)
                                        ? 'bg-[color:var(--tenant-bg)] text-white border-transparent shadow-2xs'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── 3. 6 INTERACTIVE FINANCIAL & PEPPOL KPI CARDS (p-5 rounded-[20px], zero default selection border) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
                {/* KPI 1: Total Value & Documents — Neutral border like all other cards */}
                <div
                    onClick={() => { setStatusFilter(null); setPeppolFilter('all') }}
                    className="bg-white dark:bg-slate-900 p-5 rounded-[20px] border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer transition-all"
                >
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">Valoare Totală (HT)</p>
                        <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--tenant-bg)]" />
                    </div>
                    <p className="text-[25px] font-black text-slate-950 dark:text-slate-100 leading-none tabular-nums my-2 whitespace-nowrap">
                        {kpiStats.totalNet.toLocaleString('fr-FR')} <span className="text-[14px] font-bold text-slate-400">€</span>
                    </p>
                    <div className="flex items-center justify-between text-[12px] font-bold text-slate-500 tabular-nums">
                        <span>{kpiStats.totalCount} documente</span>
                        <span className="text-[color:var(--tenant-bg)]">TTC: {kpiStats.totalGross.toLocaleString('fr-FR')} €</span>
                    </div>
                </div>

                {/* KPI 2: To Invoice / Proformas */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'unfactured' ? null : 'unfactured')}
                    className={`bg-white dark:bg-slate-900 p-5 rounded-[20px] border shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer transition-all ${
                        statusFilter === 'unfactured'
                            ? 'border-[color:var(--tenant-bg)] ring-1 ring-sky-500/20'
                            : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">De Facturat</p>
                        <span className="text-[12.5px] font-extrabold text-amber-600 tabular-nums">{kpiStats.toInvoiceNet.toLocaleString('fr-FR')} €</span>
                    </div>
                    <p className="text-[25px] font-black text-slate-950 dark:text-slate-100 leading-none tabular-nums my-2">
                        {kpiStats.toInvoiceCount} <span className="text-[14px] font-semibold text-slate-400">lucrări</span>
                    </p>
                    <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-extrabold bg-amber-500/15 text-amber-700 border border-amber-500/25">
                            În așteptare factură
                        </span>
                    </div>
                </div>

                {/* KPI 3: Invoiced */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'invoiced' ? null : 'invoiced')}
                    className={`bg-white dark:bg-slate-900 p-5 rounded-[20px] border shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer transition-all ${
                        statusFilter === 'invoiced'
                            ? 'border-[color:var(--tenant-bg)] ring-1 ring-sky-500/20'
                            : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">Facturi Emise</p>
                        <span className="text-[12.5px] font-extrabold text-emerald-600 tabular-nums">{kpiStats.invoicedNet.toLocaleString('fr-FR')} €</span>
                    </div>
                    <p className="text-[25px] font-black text-slate-950 dark:text-slate-100 leading-none tabular-nums my-2">
                        {kpiStats.invoicedCount} <span className="text-[14px] font-semibold text-slate-400">facturi</span>
                    </p>
                    <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-extrabold bg-emerald-500/15 text-emerald-700 border border-emerald-500/25">
                            Facturate fiscal
                        </span>
                    </div>
                </div>

                {/* KPI 4: Peppol / Billtobox Sent */}
                <div
                    onClick={() => setPeppolFilter(peppolFilter === 'sent' ? 'all' : 'sent')}
                    className={`bg-white dark:bg-slate-900 p-5 rounded-[20px] border shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer transition-all ${
                        peppolFilter === 'sent'
                            ? 'border-[color:var(--tenant-bg)] ring-1 ring-sky-500/20'
                            : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">Trimise Peppol</p>
                        <span className="text-[12.5px] font-extrabold text-emerald-600 tabular-nums">{kpiStats.peppolSentNet.toLocaleString('fr-FR')} €</span>
                    </div>
                    <p className="text-[25px] font-black text-slate-950 dark:text-slate-100 leading-none tabular-nums my-2">
                        {kpiStats.peppolSentCount} <span className="text-[14px] font-semibold text-slate-400">transmise</span>
                    </p>
                    <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-extrabold bg-emerald-500/15 text-emerald-700 border border-emerald-500/25">
                            <ShieldCheck className="w-3.5 h-3.5" /> Billtobox / e-FFF OK
                        </span>
                    </div>
                </div>

                {/* KPI 5: Peppol Pending / Unsent */}
                <div
                    onClick={() => setPeppolFilter(peppolFilter === 'unsent' ? 'all' : 'unsent')}
                    className={`bg-white dark:bg-slate-900 p-5 rounded-[20px] border shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer transition-all ${
                        peppolFilter === 'unsent'
                            ? 'border-[color:var(--tenant-bg)] ring-1 ring-sky-500/20'
                            : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">Netrimise Peppol</p>
                        <span className="text-[12.5px] font-extrabold text-sky-600 tabular-nums">{kpiStats.peppolUnsentNet.toLocaleString('fr-FR')} €</span>
                    </div>
                    <p className="text-[25px] font-black text-slate-950 dark:text-slate-100 leading-none tabular-nums my-2">
                        {kpiStats.peppolUnsentCount} <span className="text-[14px] font-semibold text-slate-400">netrimise</span>
                    </p>
                    <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-extrabold bg-sky-500/12 text-sky-700 border border-sky-500/25">
                            Pregătite UBL BIS 3.0
                        </span>
                    </div>
                </div>

                {/* KPI 6: Peppol Errors / B2B Check */}
                <div
                    onClick={() => setPeppolFilter(peppolFilter === 'error' ? 'all' : (kpiStats.peppolErrorCount > 0 ? 'error' : 'b2b'))}
                    className={`bg-white dark:bg-slate-900 p-5 rounded-[20px] border shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer transition-all ${
                        peppolFilter === 'error' || peppolFilter === 'b2b'
                            ? 'border-[color:var(--tenant-bg)] ring-1 ring-sky-500/20'
                            : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">Erori / Verificare TVA</p>
                        <span className={`w-2.5 h-2.5 rounded-full ${kpiStats.peppolErrorCount > 0 ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                    </div>
                    <p className="text-[25px] font-black text-slate-950 dark:text-slate-100 leading-none tabular-nums my-2">
                        {kpiStats.peppolErrorCount} <span className="text-[14px] font-semibold text-slate-400">erori</span>
                    </p>
                    <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-extrabold bg-indigo-500/12 text-indigo-700 border border-indigo-500/25">
                            {kpiStats.b2bMissingVatCount > 0 ? `${kpiStats.b2bMissingVatCount} B2B fără CUI/TVA` : 'Toți clienții validați'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── 4. UNIFIED TABLE CONTAINER WITH DOCUMENT & PEPPOL FILTER PILLS (identical p-1 + h-8 = 42px outer height) ───── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[20px] shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col">
                <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                    {/* Left: Document Status Pills */}
                    <div className="inline-flex flex-nowrap overflow-x-auto hide-scrollbar items-center gap-1 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setStatusFilter(null)}
                            className={`h-8 px-3 rounded-full text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                                !statusFilter
                                    ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                    : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-white'
                            }`}
                        >
                            <span>{t('common.all', 'Toate')}</span>
                            <span className="opacity-85 tabular-nums">({periodOrders.length})</span>
                        </button>
                        {STATUS_FILTERS.map(sf => (
                            <button
                                key={sf.key}
                                type="button"
                                onClick={() => setStatusFilter(prev => prev === sf.key ? null : sf.key)}
                                className={`h-8 px-3 rounded-full text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                                    statusFilter === sf.key
                                        ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                        : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-white'
                                }`}
                            >
                                <span>{sf.label}</span>
                                <span className="opacity-80 tabular-nums">{sf.count}</span>
                            </button>
                        ))}
                    </div>

                    {/* Right: Dedicated Peppol (SPV Belgia) Filter Pills — stylized Lucide vector icons, identical h-8 height */}
                    <div className="inline-flex flex-nowrap overflow-x-auto hide-scrollbar items-center gap-1 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700">
                        {PEPPOL_FILTERS.map(pf => {
                            const IconComp = pf.icon
                            const isActive = peppolFilter === pf.key
                            return (
                                <button
                                    key={pf.key}
                                    type="button"
                                    onClick={() => setPeppolFilter(pf.key)}
                                    className={`h-8 px-3 rounded-full text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                                        isActive
                                            ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-white'
                                    }`}
                                >
                                    {IconComp && <IconComp className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : pf.iconClass}`} />}
                                    <span>{pf.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
                <DataTable 
                    data={filteredOrders}
                    columns={columns}
                    loading={loading}
                    searchable
                    searchPlaceholder={t('invoicing.search', 'Caută după factură, deviz, client, CUI/TVA sau adresă...')}
                    defaultSortKey="date"
                    defaultSortDir="desc"
                />
            </div>

            {/* FULL PAGE PREVIEW MODAL */}
            {previewWo && createPortal(
                <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-100 dark:bg-slate-950">
                    {/* Header */}
                    <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 shrink-0 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setPreviewWo(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t('invoicing.preview_title', 'APERÇU PROFORMA')}</h2>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{previewWo.client_name || t('invoicing.no_client', 'Sans Client')}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setPreviewWo(null)}
                                className="px-6 py-2.5 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                {t('invoicing.cancel', 'Annuler')}
                            </button>
                            <button 
                                onClick={confirmGeneration}
                                disabled={generatingId === previewWo.id}
                                className="px-6 py-2.5 rounded-full font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                            >
                                {generatingId === previewWo.id ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> ...</>
                                ) : (
                                    <><CheckCircle2 className="w-5 h-5" /> {t('invoicing.confirm_issue', 'Confirmer et Émettre')}</>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {/* Body */}
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        {/* Left sidebar - Settings */}
                        <div className="w-full md:w-[350px] bg-white border-r border-slate-200 p-4 flex flex-col gap-3 overflow-y-auto shrink-0 z-20 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">{t('invoicing.settings_title', 'Paramètres Proforma')}</h3>
                                
                                {/* Deviz Info */}
                                <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('invoicing.initial_quote', 'Détails du Devis initial')}</p>
                                    <div className="text-[11px] text-slate-700 font-medium space-y-0.5">
                                        <p className="line-clamp-1" title={previewWo.title}>{previewWo.title}</p>
                                        <p className="text-slate-500">
                                            {t('invoicing.surface', 'Surface')}: {
                                                previewWo.actual_surface_m2 ? previewWo.actual_surface_m2 : 
                                                previewWo.surface_m2 ? previewWo.surface_m2 : 
                                                (() => {
                                                    if (previewWo.volumes && Array.isArray(previewWo.volumes)) {
                                                        const surfVol = previewWo.volumes.find(v => v.unit === 'm²' || v.unit === 'm2' || v.label?.toLowerCase().includes('suprafa'));
                                                        if (surfVol) return parseFloat(surfVol.quantity) || '-';
                                                    }
                                                    return '-';
                                                })()
                                            } m²
                                        </p>
                                        <p className="text-slate-500">{t('invoicing.gross_price', 'Prix Brut :')} {previewWo.estimated_price ? parseFloat(previewWo.estimated_price.replace(/[^0-9.]/g, '')).toFixed(2) : '0.00'} €</p>
                                    </div>
                                </div>

                                {/* Client Selection */}
                                <div className="space-y-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('invoicing.client_billing', 'Données de Facturation Client')}</p>
                                    
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <div className="flex gap-0.5 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-full">
                                            {[['existing', t('proforma.client_mode.existing', 'Existant')], ['new', t('proforma.client_mode.new', 'Nouveau')]].map(([m, label]) => (
                                                <button key={m} type="button" onClick={() => setProformaConfig(p => ({ ...p, client_mode: m }))}
                                                    className={`px-2 h-5 rounded-full text-[10px] font-bold transition-all ${proformaConfig.client_mode === m ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                        {proformaConfig.client_mode === 'new' && (
                                            <div className="flex gap-0.5 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-full">
                                                {[['fizica', t('proforma.client_type.individual', 'Particulier')], ['juridica', t('proforma.client_type.company', 'Entreprise')]].map(([m, label]) => (
                                                    <button key={m} type="button" onClick={() => setProformaConfig(p => ({ ...p, client_type: m }))}
                                                        className={`px-2 h-5 rounded-full text-[10px] font-bold transition-all ${proformaConfig.client_type === m ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {proformaConfig.client_mode === 'existing' ? (
                                        <div className="space-y-1.5">
                                            <div>
                                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('proforma.select_client', 'Sélectionner Client')}</label>
                                                <SearchableSelect
                                                    value={proformaConfig.client_id}
                                                    onChange={id => {
                                                        const cl = clients.find(c => c.id === id);
                                                        if (cl) {
                                                            const details = [cl.address, cl.company_vat ? `CIF: ${cl.company_vat}` : null, cl.email, cl.phone].filter(Boolean).join('\n');
                                                            setProformaConfig(p => ({
                                                                ...p,
                                                                client_id: id,
                                                                clientName: cl.name,
                                                                clientDetails: details,
                                                                client_email: cl.email || '',
                                                                client_phone: cl.phone || '',
                                                                client_address: cl.address || ''
                                                            }));
                                                        } else {
                                                            setProformaConfig(p => ({ ...p, client_id: id }));
                                                        }
                                                    }}
                                                    options={clients.map(c => ({ value: c.id, label: c.name }))}
                                                    placeholder={t('proforma.search_client', 'Rechercher un client...')}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {proformaConfig.client_type === 'juridica' && (
                                                <div className="flex gap-1 items-end">
                                                    <div className="flex-1">
                                                        <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('proforma.cui_vat', 'CUI / VAT (VIES)')}</label>
                                                        <input type="text" value={proformaConfig.client_company_vat} onChange={e => setProformaConfig(p => ({ ...p, client_company_vat: e.target.value.toUpperCase() }))} className="w-full px-2 py-1 h-7 text-[11px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none uppercase" placeholder="RO123456" />
                                                    </div>
                                                    <button type="button" onClick={handleViesSearch} disabled={isSearchingVies || !proformaConfig.client_company_vat} className="h-7 px-2 bg-blue-50 text-blue-600 rounded border border-blue-100 hover:bg-blue-100 disabled:opacity-50 flex items-center justify-center shrink-0">
                                                        {isSearchingVies ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <div>
                                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{proformaConfig.client_type === 'juridica' ? t('proforma.company_name', 'Nom de l\'entreprise *') : t('proforma.client_name', 'Nom du client *')}</label>
                                                <input type="text" value={proformaConfig.clientName || ''} onChange={e => setProformaConfig(p => ({ ...p, clientName: e.target.value }))} className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('proforma.address_google', 'Adresse (Google)')}</label>
                                                <AddressAutocomplete
                                                    value={proformaConfig.client_address || ''}
                                                    onChange={(val) => {
                                                        const details = [val, proformaConfig.client_company_vat ? `CIF: ${proformaConfig.client_company_vat}` : null].filter(Boolean).join('\n');
                                                        setProformaConfig(p => ({ ...p, client_address: val, clientDetails: details }))
                                                    }}
                                                    onSelect={({ address }) => {
                                                        const details = [address, proformaConfig.client_company_vat ? `CIF: ${proformaConfig.client_company_vat}` : null].filter(Boolean).join('\n');
                                                        setProformaConfig(p => ({ ...p, client_address: address, clientDetails: details }))
                                                    }}
                                                    placeholder={t('proforma.search_address', 'Rechercher l\'adresse...')}
                                                    className="w-full px-2 py-1 h-7 text-[11px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-2">
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.client_details', 'Détails (Adresse, TVA, Email)')}</label>
                                        <textarea 
                                            value={proformaConfig.clientDetails || ''} 
                                            onChange={e => setProformaConfig(p => ({ ...p, clientDetails: e.target.value }))} 
                                            rows={3}
                                            className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Language selection */}
                                <div className="space-y-1.5 mb-3">
                                    <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.proforma_lang', 'Langue Proforma')}</label>
                                    <select 
                                        value={proformaConfig.lang}
                                        onChange={(e) => {
                                            const newLang = e.target.value;
                                            localStorage.setItem('proformaLang', newLang);
                                            const newConfig = { ...proformaConfig, lang: newLang };
                                            newConfig.items = calculateItems(previewWo, newConfig);
                                            setProformaConfig(newConfig);
                                        }}
                                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none"
                                    >
                                        <option value="ro">Roumain</option>
                                        <option value="fr">Français</option>
                                        <option value="en">Anglais</option>
                                        <option value="de">Allemand</option>
                                        <option value="nl">Néerlandais</option>
                                    </select>
                                </div>

                                {/* Calculation Mode */}
                                <div className="space-y-1.5 mb-3">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('invoicing.calc_mode', 'Mode de Calcul (Détails/Devis)')}</p>
                                    <label className="flex items-center gap-1.5 p-1.5 border border-slate-200 rounded cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={proformaConfig.useAutoCalc}
                                            onChange={(e) => {
                                                const newConfig = { ...proformaConfig, useAutoCalc: e.target.checked };
                                                newConfig.items = calculateItems(previewWo, newConfig);
                                                setProformaConfig(newConfig);
                                            }}
                                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-[10px] font-bold text-slate-700">{t('invoicing.detailed_calc', 'Calcul Détaillé (Chape / Matériaux)')}</span>
                                    </label>

                                    {proformaConfig.useAutoCalc && (
                                        <div className="flex gap-2 mt-1.5">
                                            <div className="flex-1">
                                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.surface', 'Surface')} (m²)</label>
                                                <input 
                                                    type="number" 
                                                    value={proformaConfig.surface}
                                                    onChange={(e) => {
                                                        const newConfig = { ...proformaConfig, surface: parseFloat(e.target.value) || 0 };
                                                        newConfig.items = calculateItems(previewWo, newConfig);
                                                        setProformaConfig(newConfig);
                                                    }}
                                                    className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.thickness', 'Épaisseur (cm)')}</label>
                                                <input 
                                                    type="number" 
                                                    value={proformaConfig.thickness}
                                                    onChange={(e) => {
                                                        const newConfig = { ...proformaConfig, thickness: parseFloat(e.target.value) || 0 };
                                                        newConfig.items = calculateItems(previewWo, newConfig);
                                                        setProformaConfig(newConfig);
                                                    }}
                                                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Editor Options */}
                                <div className="space-y-2 mb-3">
                                    <label className="flex items-center gap-1.5 p-1.5 border border-slate-200 rounded cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={proformaConfig.useVat}
                                            onChange={(e) => setProformaConfig(p => ({ ...p, useVat: e.target.checked }))}
                                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-[10px] font-bold text-slate-700">{t('invoicing.apply_vat', 'Appliquer la TVA (Selon le régime)')}</span>
                                    </label>

                                    <div>
                                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{t('invoicing.discount', 'Remise (%)')}</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min="0" max="100"
                                                value={proformaConfig.discountPct}
                                                onChange={(e) => setProformaConfig(p => ({ ...p, discountPct: Number(e.target.value) }))}
                                                className="w-full pl-2 pr-6 py-1 text-[11px] bg-white border border-slate-200 rounded text-slate-900 font-bold focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Editor */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('invoicing.materials_services', 'Matériaux / Services')}</h3>
                                        <button 
                                            onClick={handleAddItem}
                                            className="text-[9px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                                        >
                                            {t('invoicing.add_row', '+ Ajouter une ligne')}
                                        </button>
                                    </div>

                                    <div className="space-y-1.5">
                                        {proformaConfig.items.map((item, idx) => (
                                            <div key={item.id} className="p-2 bg-slate-50 border border-slate-200 rounded relative group">
                                                <button 
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    className="absolute -top-1 -right-1 bg-red-100 text-red-600 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                                <div className="space-y-1.5">
                                                    <div>
                                                        <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.desc', 'Description')}</label>
                                                        <input 
                                                            type="text" 
                                                            value={item.desc}
                                                            onChange={(e) => handleUpdateItem(item.id, 'desc', e.target.value)}
                                                            className="w-full px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.qty', 'Quantité')}</label>
                                                            <input 
                                                                type="number" 
                                                                min="0.01" step="0.01"
                                                                value={item.qty}
                                                                onChange={(e) => handleUpdateItem(item.id, 'qty', Number(e.target.value))}
                                                                className="w-full px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.unit_price', 'Prix Unitaire (€)')}</label>
                                                            <input 
                                                                type="number" 
                                                                min="0" step="0.01"
                                                                value={item.price}
                                                                onChange={(e) => handleUpdateItem(item.id, 'price', Number(e.target.value))}
                                                                className="w-full px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right area - Live Preview */}
                        <div className="flex-1 bg-slate-200 dark:bg-slate-900 overflow-y-auto p-4 md:p-8 flex justify-center">
                            <div className="w-full max-w-[800px] h-max bg-white shadow-xl rounded-xl border border-slate-200 overflow-hidden shrink-0">
                                    <ProformaView workOrderData={previewWo} config={proformaConfig} />
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}

            {toast && (
                <div className="fixed top-20 right-4 z-[9999] animate-in slide-in-from-top-4">
                    <div className={`px-4 py-2 rounded-full shadow-lg text-[11px] font-bold uppercase tracking-wide border 
                        ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {toast.msg}
                    </div>
                </div>
            )}
            {pdfPreviewUrl && createPortal(
                <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-100 dark:bg-slate-950">
                    <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 shrink-0 shadow-sm">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                {t('work_order_detail.pdf_preview', 'APERÇU DU DEVIS')}
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            {(!pdfPreviewUrl.wo?.is_invoiced && (pdfPreviewUrl.wo?.proforma_path || pdfPreviewUrl.wo?.is_quote)) && (
                                <button
                                    onClick={() => {
                                        handleMarkInvoiced(pdfPreviewUrl.wo.id);
                                        setPdfPreviewUrl(null);
                                    }}
                                    className="px-6 py-2.5 rounded-full font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    {t('work_order_detail.invoicing.issue_invoice', 'Émettre la Facture')}
                                </button>
                            )}
                            {pdfPreviewUrl.wo?.is_invoiced && (
                                <button
                                    onClick={() => {
                                        handleSendToBilltobox(pdfPreviewUrl.wo.id);
                                        setPdfPreviewUrl(null);
                                    }}
                                    disabled={pdfPreviewUrl.wo?.billtobox_status === 'sent' || pdfPreviewUrl.wo?.billtobox_status === 'pending'}
                                    className={`px-6 py-2.5 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 ${pdfPreviewUrl.wo?.billtobox_status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'}`}
                                >
                                    {pdfPreviewUrl.wo?.billtobox_status === 'pending' ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (pdfPreviewUrl.wo?.billtobox_status === 'sent' ? <CheckCircle2 className="w-5 h-5" /> : <Send className="w-5 h-5" />)}
                                    {pdfPreviewUrl.wo?.billtobox_status === 'sent' ? t('invoicing.sent_to_billtobox', 'Envoyé à Billtobox') : t('invoicing.send_to_billtobox', 'Envoyer à Billtobox')}
                                </button>
                            )}
                            <button 
                                onClick={() => setPdfPreviewUrl(null)}
                                className="px-6 py-2.5 rounded-full font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                            >
                                {t('common.close', 'Fermer')}
                            </button>
                        </div>
                    </div>
                    <iframe
                        src={pdfPreviewUrl.url}
                        className="w-full flex-1 border-none bg-slate-100"
                        title="Document Preview"
                    />
                </div>,
                document.body
            )}
        </div>
    )
}

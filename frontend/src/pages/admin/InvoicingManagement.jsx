import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    FileText, Search, ExternalLink, FileOutput, CheckCircle2, CircleDot, AlertTriangle, Loader2, X, User, Copy, Clock, Pencil, MoreVertical, XCircle, CalendarDays, Send
} from 'lucide-react'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'
import ProformaView from './ProformaView'
import SearchableSelect from '../../components/SearchableSelect'
import AddressAutocomplete from '../../components/AddressAutocomplete'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

import i18n from '../../i18n'

const ActionMenu = ({ wo, onEdit, onMarkInvoiced, onStorno, onCopyLink, copiedToken, onSendToBilltobox, onPreviewPdf }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = React.useRef(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    const toggle = (e) => {
        e.stopPropagation();
        if (!isOpen) {
            const rect = btnRef.current.getBoundingClientRect();
            setCoords({ top: rect.bottom, left: rect.right - 220 }); 
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
                className="p-1.5 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors border border-slate-200 shadow-sm"
                title={t('invoicing.menu_actions', 'Meniu Acțiuni')}
            >
                <MoreVertical className="w-4 h-4" />
            </button>
            {isOpen && createPortal(
                <div 
                    className="fixed z-50 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 flex flex-col gap-0.5"
                    style={{ top: coords.top + 4, left: coords.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {wo.proforma_path ? (
                        <>
                            <button 
                                onClick={() => { onPreviewPdf(wo.proforma_path); setIsOpen(false); }}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <FileOutput className="w-4 h-4 text-slate-400" />
                                {t('invoicing.view_pdf', 'Descarcă / Vezi PDF')}
                            </button>
                            <button 
                                onClick={() => { onEdit(wo); setIsOpen(false); }}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <Pencil className="w-4 h-4 text-slate-400" />
                                {t('invoicing.edit_doc', 'Editează Document')}
                            </button>
                            <button
                                onClick={() => { onCopyLink(wo); setIsOpen(false); }}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                {copiedToken === wo.token ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                {t('invoicing.copy_link', 'Copiază Link Client')}
                            </button>

                            {wo.is_invoiced && (
                                <>
                                    <button
                                        onClick={() => { onSendToBilltobox(wo.id); setIsOpen(false); }}
                                        className="w-full text-left px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 border-t border-slate-100 mt-1 pt-2"
                                    >
                                        {wo.billtobox_status === 'sent' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Send className="w-4 h-4 text-emerald-500" />}
                                        {wo.billtobox_status === 'sent' ? 'Retrimite la Billtobox' : 'Trimite la Billtobox'}
                                    </button>
                                    <button
                                        onClick={() => { onStorno(wo.id); setIsOpen(false); }}
                                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100 mt-1 pt-2"
                                    >
                                        <XCircle className="w-4 h-4 text-red-500" />
                                        {t('invoicing.storno', 'Storno / Anulează Factura')}
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <button 
                            onClick={() => { onEdit(wo); setIsOpen(false); }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                            <FileOutput className="w-4 h-4 text-slate-400" />
                            {t('invoicing.generate_proforma', 'Generează Proformă')}
                        </button>
                    )}
                    
                    {!wo.is_invoiced && (
                        <button 
                            onClick={() => { onMarkInvoiced(wo.id); setIsOpen(false); }}
                            className="w-full text-left px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 border-t border-slate-100 mt-1 pt-2 font-bold"
                        >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            {t('invoicing.mark_invoiced', 'Emite Factură Fiscală')}
                        </button>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>
                    <button 
                        onClick={() => { navigate(`/admin/work-orders/${wo.id}`); setIsOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 flex items-center gap-2"
                    >
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                        {t('invoicing.view_details', 'Vezi Detalii Lucrare')}
                    </button>
                </div>,
                document.body
            )}
        </>
    );
};

export default function InvoicingManagement() {
    const { t } = useTranslation()
    const navigate = useNavigate()

    const [toast, setToast] = useState(null)
    const showToast = (msg, type = 'error') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const [workOrders, setWorkOrders] = useState([])
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [previewWo, setPreviewWo] = useState(null)
    const [generatingId, setGeneratingId] = useState(null)
    const [copiedToken, setCopiedToken] = useState(null)
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
    const [isSearchingVies, setIsSearchingVies] = useState(false)
    const [selectedTeams, setSelectedTeams] = useState([])   // array de team names
    const [statusFilter, setStatusFilter] = useState(null)    // null | 'unfactured' | 'proforma' | 'invoiced' | 'quote'
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

    const calculateItems = (wo, config) => {
        // get a fixed translation function for the desired language
        const tFunc = i18n.getFixedT(config.lang);
        
        let items = [];
        const surfaceForAuto = parseFloat(config.surface || 0);
        const extraThickForAuto = Math.max(0, parseFloat(config.thickness || 5) - 5);
        
        if (config.useAutoCalc) {
            items.push({ id: Date.now().toString() + '-base', desc: tFunc('proforma.items.base', 'Șapă de bază (≤5cm)'), qty: surfaceForAuto, price: parseFloat(wo.prices?.base || 12.5) });
            
            if (extraThickForAuto > 0) {
                const unitPriceExtra = parseFloat(wo.prices?.extra || 1.25);
                items.push({ 
                    id: Date.now().toString() + '-extra', 
                    desc: `${tFunc('proforma.items.extra', 'Grosime extra (>5cm)')} (${extraThickForAuto} cm)`, 
                    qty: surfaceForAuto, 
                    price: extraThickForAuto * unitPriceExtra 
                });
            }
            if (wo.has_foil || wo.actual_has_foil || config.hasFoilFromVol) {
                items.push({ id: Date.now().toString() + '-foil', desc: tFunc('proforma.items.foil', 'Folie plastic'), qty: surfaceForAuto, price: parseFloat(wo.prices?.foil || 1.2) });
            }
            if (wo.has_mesh || wo.actual_has_mesh || config.hasMeshFromVol) {
                items.push({ id: Date.now().toString() + '-mesh', desc: tFunc('proforma.items.mesh', 'Plasă metalică'), qty: surfaceForAuto, price: parseFloat(wo.prices?.mesh || 2.5) });
            }
            if (wo.has_fiber || wo.actual_has_fiber || config.hasSapaFromVol) { // Include fiber for sapa, matching WorkOrderDetail
                items.push({ id: Date.now().toString() + '-fiber', desc: tFunc('proforma.items.fiber', 'Fibre'), qty: surfaceForAuto, price: parseFloat(wo.prices?.fiber || (surfaceForAuto <= 200 ? 2.5 : 2.0)) });
            }
        } else {
            let totalSum = surfaceForAuto * parseFloat(wo.prices?.base || 12.5);
            if (extraThickForAuto > 0) {
                totalSum += extraThickForAuto * parseFloat(wo.prices?.extra || 1.25) * surfaceForAuto;
            }
            if (wo.has_foil || wo.actual_has_foil || config.hasFoilFromVol) {
                totalSum += surfaceForAuto * parseFloat(wo.prices?.foil || 1.2);
            }
            if (wo.has_mesh || wo.actual_has_mesh || config.hasMeshFromVol) {
                totalSum += surfaceForAuto * parseFloat(wo.prices?.mesh || 2.5);
            }
            if (wo.has_fiber || wo.actual_has_fiber || config.hasSapaFromVol) {
                totalSum += surfaceForAuto * parseFloat(wo.prices?.fiber || (surfaceForAuto <= 200 ? 2.5 : 2.0));
            }

            const priceRaw = parseFloat(wo.estimated_price?.replace(/[^0-9.]/g, '') || '0');
            const finalPrice = priceRaw > 0 ? priceRaw : totalSum;

            items.push({
                id: Date.now().toString(),
                desc: `${tFunc('proforma.items.custom_work', 'Lucrări conform deviz')} (${wo.title || tFunc('proforma.items.labor_materials', 'Manoperă și materiale')})`,
                qty: 1,
                price: finalPrice
            });
        }
        return items;
    };

    const handleOpenPreview = (wo) => {
        if (wo.proforma_data) {
            let data = { ...wo.proforma_data };
            let shouldUseFallback = !data.items || data.items.length === 0;
            if (data.items?.length === 1 && (String(data.items[0].id).includes('default') || String(data.items[0].desc).includes('Lucrări conform deviz') || String(data.items[0].desc).includes('Manoperă'))) {
                shouldUseFallback = true;
            }
            if (shouldUseFallback) {
                data.items = calculateItems(wo, data);
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
                if (labelSafe.includes('sapa') && surface > 0) {
                    extractedSurface += surface;
                    if (thickness > extractedThickness) extractedThickness = thickness;
                    if (vol.has_foil) hasFoil = true;
                    if (vol.has_mesh) hasMesh = true;
                    hasSapa = true;
                }
            });
        }

        const surfaceForAuto = extractedSurface > 0 ? extractedSurface : parseFloat(wo.actual_surface_m2 || wo.surface_m2 || 0);
        const thicknessForAuto = extractedThickness > 0 ? extractedThickness : parseFloat(wo.actual_thickness_cm || wo.thickness_cm || 5);

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
            lang: localStorage.getItem('proformaLang') || wo.client_language || localStorage.getItem('i18nextLng') || 'ro',
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
        
        // Ensure initial items use correct lang
        config.items = calculateItems(wo, config);
        
        setProformaConfig(config);
        setPreviewWo(wo);
    }

    const fetchOrdersAndClients = async () => {
        setLoading(true)
        try {
            const [woRes, clRes] = await Promise.all([
                api.get('/admin/work-orders?limit=200'),
                api.get('/admin/clients')
            ])
            // Backend returns is_quote=False orders + is_quote=True with status=planning
            setWorkOrders(Array.isArray(woRes.data) ? woRes.data : (woRes.data?.items || woRes.data || []))
            setClients(Array.isArray(clRes.data) ? clRes.data : (clRes.data?.items || []))
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
            showToast(t('clients.vies_error', 'Firma nu a fost găsită sau serviciul VIES este indisponibil. Verificați codul TVA.'), 'error');
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
            showToast('Proforma a fost generată cu succes!', 'success')
            setPreviewWo(null)
            navigate(`/admin/invoices/${woId}`)
        } catch (error) {
            console.error('Failed to generate proforma:', error)
            showToast('A apărut o eroare la generarea proformei.', 'error')
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
            showToast(t('invoicing.mark_invoiced_success', 'Lucrarea a fost marcată ca facturată!'), 'success')
        } catch (error) {
            console.error('Failed to update invoice status:', error)
            showToast(t('invoicing.mark_invoiced_error', 'A apărut o eroare.'), 'error')
        }
    }

    const handleStornoInvoice = async (woId) => {
        try {
            await api.patch(`/admin/work-orders/${woId}/invoice-status`, { is_invoiced: false })
            setWorkOrders(prev => prev.map(wo => 
                wo.id === woId ? { ...wo, is_invoiced: false } : wo
            ))
            showToast('Factura a fost anulată (Storno) și a revenit la stadiul de Proformă.', 'success')
        } catch (error) {
            console.error('Failed to storno invoice status:', error)
            showToast('A apărut o eroare la anularea facturii.', 'error')
        }
    }

    const handleCopyLink = (wo) => {
        if (wo.token) {
            const link = `${window.location.origin}/public/proforma/${wo.token}`;
            navigator.clipboard.writeText(link);
            setCopiedToken(wo.token);
            setTimeout(() => setCopiedToken(null), 2000);
            showToast('Link copiat în clipboard!', 'success');
        } else {
            showToast("Token indisponibil pentru această lucrare.", 'error');
        }
    };

    const handleSendToBilltobox = async (woId) => {
        try {
            setWorkOrders(prev => prev.map(wo => 
                wo.id === woId ? { ...wo, billtobox_status: 'pending' } : wo
            ))
            showToast('Se trimite factura către Billtobox...', 'success')
            
            const res = await api.post(`/admin/work-orders/${woId}/billtobox`)
            
            setWorkOrders(prev => prev.map(wo => 
                wo.id === woId ? { ...wo, billtobox_status: res.data.status } : wo
            ))
            showToast('Factura a fost trimisă cu succes către Billtobox!', 'success')
        } catch (error) {
            console.error('Failed to send invoice to Billtobox:', error)
            const msg = error.response?.data?.detail || 'A apărut o eroare la trimiterea facturii.'
            showToast(msg, 'error')
            
            setWorkOrders(prev => prev.map(wo => 
                wo.id === woId ? { ...wo, billtobox_status: 'error', billtobox_error: msg } : wo
            ))
        }
    }

    const columns = [
        {
            key: 'date',
            label: t('invoicing.col_date', 'Date'),
            className: 'w-[10%]',
            render: (wo) => (
                <div className="flex flex-col gap-0.5">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {wo.start_date ? new Date(wo.start_date).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : (i18n.language === 'fr' ? 'fr-FR' : (i18n.language === 'de' ? 'de-DE' : 'ro-RO'))) : '-'}
                    </span>
                    {wo.assigned_team_name && (
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 leading-tight">
                            {wo.assigned_team_name}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'client',
            label: t('invoicing.col_client', 'Client & Adresă'),
            className: 'w-[35%]',
            render: (wo) => (
                <div className="flex flex-col">
                    <button 
                        onClick={() => navigate(`/admin/invoices/${wo.id}`)}
                        className="font-bold text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 line-clamp-1 transition-colors text-left text-[14px]" 
                        title={wo.client_name || t('invoicing.no_client', 'Fără Client')}
                    >
                        {wo.client_name || t('invoicing.no_client', 'Fără Client')}
                    </button>
                    <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5" title={wo.site_name || wo.site_address}>{wo.site_name || wo.site_address || t('invoicing.no_address', 'Fără adresă')}</span>
                </div>
            )
        },
        {
            key: 'details',
            label: t('invoicing.col_details', 'Suprafată / Grosime'),
            render: (wo) => {
                const vol = wo.volumes?.[0]
                const estSurf = parseFloat(vol?.quantity || wo.surface_m2 || 0)
                const estThick = parseFloat(vol?.thickness || wo.thickness_cm || 0)
                const realSurf = parseFloat(wo.actual_surface_m2 || 0)
                const realThick = parseFloat(wo.actual_thickness_cm || 0)

                if (!estSurf && !realSurf) return <span className="text-slate-400">-</span>

                return (
                    <div className="flex flex-col gap-0.5">
                        {/* Estimatif */}
                        <div className="flex items-baseline gap-1">
                            {estSurf > 0 && <span className="font-bold text-slate-800 dark:text-slate-200 text-[13px]">{estSurf} m²</span>}
                            {estThick > 0 && <span className="text-[11px] text-slate-500">{estThick} cm</span>}
                        </div>
                        {/* Real */}
                        {(realSurf > 0 || realThick > 0) && (
                            <div className="flex items-baseline gap-1">
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Réel</span>
                                {realSurf > 0 && <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">{realSurf} m²</span>}
                                {realThick > 0 && <span className="text-[11px] text-emerald-600">{realThick} cm</span>}
                            </div>
                        )}
                    </div>
                )
            }
        },
        {
            key: 'price',
            label: t('invoicing.col_price', 'Preț Estimat'),
            render: (wo) => {
                let autoNet = 0;
                let isAuto = false;
                (wo.volumes || []).forEach(vol => {
                    const surface = parseFloat(vol.quantity) || 0;
                    const thickness = parseFloat(vol.thickness) || 0;
                    const labelSafe = (vol.label || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (labelSafe.includes('sapa') && surface > 0) {
                        isAuto = true;
                        const extraThickness = Math.max(0, thickness - 5);
                        autoNet += parseFloat(wo.prices?.base || 12.5) * surface;
                        autoNet += extraThickness * parseFloat(wo.prices?.extra || 1.25) * surface;
                        autoNet += vol.has_foil ? parseFloat(wo.prices?.foil || 1.2) * surface : 0;
                        autoNet += vol.has_mesh ? parseFloat(wo.prices?.mesh || 2.5) * surface : 0;
                        const fiberRate = parseFloat(wo.prices?.fiber || (surface <= 200 ? 2.5 : 2.0));
                        autoNet += vol.has_fiber ? surface * fiberRate : 0;
                    }
                });

                const displayPrice = isAuto ? autoNet.toFixed(2) : (wo.estimated_price ? parseFloat(wo.estimated_price.toString().replace(/[^0-9.]/g, '')).toFixed(2) : null);

                return (
                    <div className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">
                        {displayPrice ? `${displayPrice} €` : '-'}
                    </div>
                );
            }
        },
        {
            key: 'status',
            label: t('invoicing.col_status', 'Status'),
            render: (wo) => {
                if (wo.is_quote && wo.status === 'planning') {
                    return (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 whitespace-nowrap w-fit shrink-0">
                            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                            Devis Planifié
                        </span>
                    )
                }
                if (wo.is_invoiced) {
                    return (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 whitespace-nowrap w-fit shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            {t('invoicing.status_invoiced', 'Facturat')}
                        </span>
                    )
                }
                if (wo.proforma_path) {
                    return (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-600 w-fit shrink-0">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex flex-col items-start leading-[1.1]">
                                {t('invoicing.status_proforma', 'Proformă Emisă').split(' ').map((word, i) => (
                                    <span key={i}>{word}</span>
                                ))}
                            </span>
                        </span>
                    )
                }
                return (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap w-fit shrink-0">
                        <CircleDot className="w-3.5 h-3.5 shrink-0" />
                        {t('invoicing.status_notinvoiced', 'Nefacturat')}
                    </span>
                )
            }
        },
        {
            key: 'actions',
            label: t('invoicing.col_actions', 'Acțiuni'),
            render: (wo) => (
                <div className="flex justify-end pr-2">
                    <ActionMenu 
                        wo={wo} 
                        onEdit={handleOpenPreview} 
                        onMarkInvoiced={handleMarkInvoiced} 
                        onStorno={handleStornoInvoice}
                        onCopyLink={handleCopyLink}
                        copiedToken={copiedToken}
                        onSendToBilltobox={handleSendToBilltobox}
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
            items: [...p.items, { id: Date.now().toString(), desc: 'Material/Serviciu nou', qty: 1, price: 0 }]
        }))
    }

    const handleRemoveItem = (id) => {
        setProformaConfig(p => ({
            ...p,
            items: p.items.filter(it => it.id !== id)
        }))
    }

    // Filtrare dupa echipa si status
    const allTeamNames = [...new Set(workOrders.map(w => w.assigned_team_name).filter(Boolean))]
    const toggleTeam = (name) => setSelectedTeams(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name])
    const STATUS_FILTERS = [
        { key: 'unfactured', label: 'Non Facturé', color: 'slate' },
        { key: 'proforma', label: 'Devis PDF', color: 'blue' },
        { key: 'invoiced', label: 'Facturé', color: 'emerald' },
        { key: 'quote', label: 'Devis Planifié', color: 'violet' },
    ]
    const filteredOrders = workOrders.filter(wo => {
        if (selectedTeams.length > 0 && !selectedTeams.includes(wo.assigned_team_name)) return false
        if (statusFilter === 'unfactured' && (wo.is_invoiced || wo.proforma_path || (wo.is_quote && wo.status === 'planning'))) return false
        if (statusFilter === 'proforma' && !wo.proforma_path) return false
        if (statusFilter === 'invoiced' && !wo.is_invoiced) return false
        if (statusFilter === 'quote' && !(wo.is_quote && wo.status === 'planning')) return false
        return true
    })

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                    {t('nav.invoicing', 'Facturation & Proformas')}
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-1">{t('invoicing.page_desc', 'Gestion des factures, devis et paiements')}</p>
            </div>

            {/* Filtre rapide — stil consistent cu restul aplicatiei */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Filtre Status */}
                {STATUS_FILTERS.map(sf => (
                    <button key={sf.key}
                        onClick={() => setStatusFilter(prev => prev === sf.key ? null : sf.key)}
                        className={`h-8 px-3 rounded-xl text-xs font-bold border transition-all ${
                            statusFilter === sf.key
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:text-blue-600'
                        }`}>
                        {sf.label}
                    </button>
                ))}
                {/* Separator */}
                {allTeamNames.length > 0 && <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />}
                {/* Filtre Echipe */}
                {allTeamNames.map(name => (
                    <button key={name}
                        onClick={() => toggleTeam(name)}
                        className={`h-8 px-3 rounded-xl text-xs font-bold border transition-all ${
                            selectedTeams.includes(name)
                                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-300 hover:text-violet-600'
                        }`}>
                        {name}
                    </button>
                ))}
                {/* Reset */}
                {(selectedTeams.length > 0 || statusFilter) && (
                    <button onClick={() => { setSelectedTeams([]); setStatusFilter(null) }}
                        className="h-8 px-3 rounded-xl text-xs font-bold text-red-500 border border-red-200 hover:bg-red-50 transition-all">
                        ✕ Reset
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 border-0 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <DataTable 
                    data={filteredOrders}
                    columns={columns}
                    loading={loading}
                    searchable
                    searchPlaceholder={t('invoicing.search', 'Caută factură/client...')}
                    defaultSortKey="start_date"
                    defaultSortDir="desc"
                />
            </div>

            {/* FULL PAGE PREVIEW MODAL */}
            {previewWo && createPortal(
                <div className="fixed inset-0 z-[100] flex flex-col bg-slate-100 dark:bg-slate-950">
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
                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t('invoicing.preview_title', 'PREVIZUALIZARE PROFORMĂ')}</h2>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{previewWo.client_name || t('invoicing.no_client', 'Fără Client')}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setPreviewWo(null)}
                                className="px-6 py-2.5 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                {t('invoicing.cancel', 'Anulează')}
                            </button>
                            <button 
                                onClick={confirmGeneration}
                                disabled={generatingId === previewWo.id}
                                className="px-6 py-2.5 rounded-full font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                            >
                                {generatingId === previewWo.id ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> ...</>
                                ) : (
                                    <><CheckCircle2 className="w-5 h-5" /> {t('invoicing.confirm_issue', 'Confirmă și Emite')}</>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {/* Body */}
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        {/* Left sidebar - Settings */}
                        <div className="w-full md:w-[350px] bg-white border-r border-slate-200 p-4 flex flex-col gap-3 overflow-y-auto shrink-0 z-20 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">{t('invoicing.settings_title', 'Setări Proformă')}</h3>
                                
                                {/* Deviz Info */}
                                <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('invoicing.initial_quote', 'Detalii Deviz inițial')}</p>
                                    <div className="text-[11px] text-slate-700 font-medium space-y-0.5">
                                        <p className="line-clamp-1" title={previewWo.title}>{previewWo.title}</p>
                                        <p className="text-slate-500">
                                            {t('invoicing.surface', 'Suprafață')}: {
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
                                        <p className="text-slate-500">Preț Brut: {previewWo.estimated_price ? parseFloat(previewWo.estimated_price.replace(/[^0-9.]/g, '')).toFixed(2) : '0.00'} €</p>
                                    </div>
                                </div>

                                {/* Client Selection */}
                                <div className="space-y-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('invoicing.client_billing', 'Date Facturare Client')}</p>
                                    
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <div className="flex gap-0.5 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-full">
                                            {[['existing', t('proforma.client_mode.existing', 'Existent')], ['new', t('proforma.client_mode.new', 'Nou')]].map(([m, label]) => (
                                                <button key={m} type="button" onClick={() => setProformaConfig(p => ({ ...p, client_mode: m }))}
                                                    className={`px-2 h-5 rounded-full text-[10px] font-bold transition-all ${proformaConfig.client_mode === m ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                        {proformaConfig.client_mode === 'new' && (
                                            <div className="flex gap-0.5 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-full">
                                                {[['fizica', t('proforma.client_type.individual', 'Fizică')], ['juridica', t('proforma.client_type.company', 'Juridică')]].map(([m, label]) => (
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
                                                    placeholder={t('proforma.search_client', 'Caută client...')}
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
                                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{proformaConfig.client_type === 'juridica' ? t('proforma.company_name', 'Nume Companie *') : t('proforma.client_name', 'Nume Client *')}</label>
                                                <input type="text" value={proformaConfig.clientName || ''} onChange={e => setProformaConfig(p => ({ ...p, clientName: e.target.value }))} className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('proforma.address_google', 'Adresă (Google)')}</label>
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
                                                    placeholder={t('proforma.search_address', 'Caută adresa...')}
                                                    className="w-full px-2 py-1 h-7 text-[11px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-2">
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.client_details', 'Detalii (Adresă, CIF, Email)')}</label>
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
                                    <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.proforma_lang', 'Limba Proformă')}</label>
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
                                        <option value="ro">🇷🇴 Română</option>
                                        <option value="fr">🇫🇷 Franceză</option>
                                        <option value="en">🇬🇧 Engleză</option>
                                        <option value="de">🇩🇪 Germană</option>
                                        <option value="nl">🇳🇱 Olandeză</option>
                                    </select>
                                </div>

                                {/* Calculation Mode */}
                                <div className="space-y-1.5 mb-3">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('invoicing.calc_mode', 'Mod Calcul (Detalii/Deviz)')}</p>
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
                                        <span className="text-[10px] font-bold text-slate-700">{t('invoicing.detailed_calc', 'Calcul Detaliat (Șapă / Materiale)')}</span>
                                    </label>

                                    {proformaConfig.useAutoCalc && (
                                        <div className="flex gap-2 mt-1.5">
                                            <div className="flex-1">
                                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.surface', 'Suprafață')} (m²)</label>
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
                                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.thickness', 'Grosime (cm)')}</label>
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
                                        <span className="text-[10px] font-bold text-slate-700">{t('invoicing.apply_vat', 'Aplică TVA (Conform regim)')}</span>
                                    </label>

                                    <div>
                                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{t('invoicing.discount', 'Discount (%)')}</label>
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
                                        <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('invoicing.materials_services', 'Materiale / Servicii')}</h3>
                                        <button 
                                            onClick={handleAddItem}
                                            className="text-[9px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                                        >
                                            {t('invoicing.add_row', '+ Adaugă rând')}
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
                                                        <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.desc', 'Descriere')}</label>
                                                        <input 
                                                            type="text" 
                                                            value={item.desc}
                                                            onChange={(e) => handleUpdateItem(item.id, 'desc', e.target.value)}
                                                            className="w-full px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.qty', 'Cantitate')}</label>
                                                            <input 
                                                                type="number" 
                                                                min="0.01" step="0.01"
                                                                value={item.qty}
                                                                onChange={(e) => handleUpdateItem(item.id, 'qty', Number(e.target.value))}
                                                                className="w-full px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded focus:border-blue-500 outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('invoicing.unit_price', 'Preț Unitar (€)')}</label>
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
                <div className="fixed bottom-4 right-4 z-[9999]">
                    <div className={`px-4 py-2 rounded-full shadow-lg text-[11px] font-bold uppercase tracking-wide border 
                        ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {toast.msg}
                    </div>
                </div>
            )}
            {pdfPreviewUrl && createPortal(
                <div className="fixed inset-0 z-[100] flex flex-col bg-slate-100 dark:bg-slate-950">
                    <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 shrink-0 shadow-sm">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                {t('work_order_detail.pdf_preview', 'PREVIZUALIZARE DEVIZ')}
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setPdfPreviewUrl(null)}
                                className="px-6 py-2.5 rounded-full font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                            >
                                {t('common.close', 'Fermer')}
                            </button>
                        </div>
                    </div>
                    <iframe
                        src={pdfPreviewUrl}
                        className="w-full flex-1 border-none bg-slate-100"
                        title="Document Preview"
                    />
                </div>,
                document.body
            )}
        </div>
    )
}

import React, { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Loader2, Printer } from 'lucide-react'
import api from '../../lib/api'
import { useTenantStore } from '../../store/tenantStore'
import { useTranslation } from 'react-i18next'
import i18nGlobal from '../../i18n'

export default function ProformaView({ workOrderData = null, config = null }) {
    const { t, i18n } = useTranslation()
    const { id } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const { tenant } = useTenantStore()
    const searchParams = new URLSearchParams(location.search)
    const typeParam = searchParams.get('type')
    
    const [wo, setWo] = useState(workOrderData)
    const [loading, setLoading] = useState(!workOrderData)
    const [viewMode, setViewMode] = useState(typeParam || 'proforma')

    useEffect(() => {
        if (wo && !typeParam) {
            setViewMode(wo.is_invoiced ? 'invoice' : 'proforma')
        }
    }, [wo, typeParam])

    const isInvoiceView = viewMode === 'invoice'
    
    // Switch language based on config if provided
    useEffect(() => {
        if (config?.lang && i18n.language !== config.lang) {
            i18n.changeLanguage(config.lang)
        }
    }, [config?.lang, i18n])
    
    // Translation helper specifically for Proforma (bypass hook state with global)
    const tL = (key) => {
        const tFunc = config?.lang ? i18nGlobal.getFixedT(config.lang) : t;
        return tFunc(`proforma.${key}`, {
            defaultValue: {
                'proforma': 'FACTURE PROFORMA',
                'date': 'Date :',
                'due': 'Échéance :',
                'to': 'À l\'attention de',
                'address': 'Chantier / Adresse',
                'desc': 'Description Services / Matériaux',
                'qty': 'Quantité',
                'price': 'Prix Unitaire',
                'total': 'Total Net (HTVA)',
                'subtotal': 'Sous-total',
                'base': 'Base de calcul',
                'vat': 'TVA',
                'grand_total': 'TOTAL À PAYER',
                'supplier': 'FOURNISSEUR',
                'client_none': 'Sans Client',
                'invoice_title': 'FACTURE',
                'note': 'Ceci est une facture proforma. Les produits et services seront fournis après confirmation du paiement ou selon le contrat en vigueur.'
            }[key] || key
        })
    }

    useEffect(() => {
        if (workOrderData) {
            setWo(workOrderData)
            setLoading(false)
            return
        }
        if (!id) return
        const loadWorkOrder = async () => {
            try {
                const res = await api.get(`/admin/work-orders/${id}`)
                setWo(res.data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        loadWorkOrder()
    }, [id, workOrderData])

    const pData = config || wo?.proforma_data || null
    
    // Make sure we update i18n when pData.lang changes
    useEffect(() => {
        if (pData?.lang && pData.lang !== i18n.language) {
            i18n.changeLanguage(pData.lang);
        }
    }, [pData?.lang, i18n]);

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
    if (!wo) return <div className="flex h-full items-center justify-center font-bold text-red-600">{t('common.not_found', 'Commande introuvable.')}</div>

    // Fiscal logic
    const isBelgium = tenant?.country === 'BE'
    const primaryColor = tenant?.primary_color || '#2563eb'
    
    // Apply config or defaults from DB
    const useVat = pData?.useVat ?? wo?.prices?.useVat ?? true
    let defaultVatRate = isBelgium ? 21 : 19;
    
    // Auto-calcul TVA bazat pe status client / lucrare din wo.prices
    const clientType = wo.client_type || 'fizica';
    const workType = wo.work_type || 'new';
    if (wo?.prices?.vat_type !== undefined) {
        defaultVatRate = parseFloat(wo.prices.vat_type);
    } else if (clientType === 'juridica') {
        defaultVatRate = parseFloat(wo.prices?.vat_legal_entity ?? 0);
    } else {
        if (workType === 'repair') {
            defaultVatRate = parseFloat(wo.prices?.vat_physical_repair ?? 6);
        } else {
            defaultVatRate = parseFloat(wo.prices?.vat_physical_new ?? 21);
        }
    }
    
    const vatRate = useVat ? (pData?.vatRate !== undefined ? parseFloat(pData.vatRate) : defaultVatRate) : 0
    const discountPct = pData?.discountPct || 0
    
    // Custom Client Fields
    const cName = pData?.clientName !== undefined ? pData.clientName : wo.client_name
    let cDetails = pData?.clientDetails !== undefined ? pData.clientDetails : wo.client_email

    // Retroactively patch old invoices that only saved the email in clientDetails
    if (!cDetails || cDetails === wo.client_email) {
        const parts = [];
        if (wo.client_email) parts.push(wo.client_email);
        
        const cui = wo.client_cui || wo.client_company_vat || wo.client?.cui || wo.client?.company_vat;
        if (cui) parts.push(`N° TVA: ${cui}`);
        
        const reg = wo.client_reg_com || wo.client?.reg_com || wo.client?.company_reg_number;
        if (reg) parts.push(`Reg: ${reg}`);
        
        const addr = wo.client_address || wo.client?.address || wo.client?.company_address || wo.site_address;
        if (addr) parts.push(addr);
        
        cDetails = parts.join('\n');
    }

    // ─── REGULA DE BAZA: Devis = cantitati estimative, Factura = cantitati reale ───
    const activePrices = isInvoiceView && wo.prices?.invoice ? wo.prices.invoice : (wo.prices || {});
    let defaultFallbackItems = []
    
    if (wo.volumes && wo.volumes.length > 0) {
        wo.volumes.forEach((vol, idx) => {
            const isChape = vol.label?.toLowerCase()?.includes('sapa') || /[sșş]ap[aăâ]/i.test(vol.label || '') || /chape/i.test(vol.label || '')
            
            // FACTURA foloseste valorile reale introduse de seful de echipa
            // DEVIS foloseste valorile estimative din deviz
            const estSurface = parseFloat(vol.quantity || 0)
            const estThick   = parseFloat(vol.thickness || 0)
            const realSurface = isInvoiceView && wo.actual_surface_m2 > 0 ? parseFloat(wo.actual_surface_m2) : estSurface
            const realThick   = isInvoiceView && wo.actual_thickness_cm > 0 ? parseFloat(wo.actual_thickness_cm) : estThick

            const surfaceForAuto = realSurface
            const thickForAuto   = realThick
            
            if (surfaceForAuto > 0) {
                if (isChape) {
                    const stdThick = parseFloat(activePrices.standard_thickness || 5)
                    const extraThickForAuto = Math.max(0, thickForAuto - stdThick)
                    
                    defaultFallbackItems.push({
                        id: `base_${idx}`,
                        desc: `Pose de chape ${Math.min(thickForAuto, stdThick)} cm`,
                        qty: surfaceForAuto,
                        price: parseFloat(activePrices.base || 12.5)
                    });
                    
                    if (extraThickForAuto > 0) {
                        defaultFallbackItems.push({
                            id: `extra_${idx}`,
                            desc: `Épaisseur supplémentaire (${extraThickForAuto} cm)`,
                            qty: surfaceForAuto,
                            price: extraThickForAuto * parseFloat(activePrices.extra_thickness_price_per_cm || activePrices.extra || 1.25)
                        });
                    }
                    
                    if (vol.has_foil) {
                        defaultFallbackItems.push({
                            id: `foil_${idx}`,
                            desc: `Feuille de plastique (Visqueen)`,
                            qty: surfaceForAuto,
                            price: parseFloat(activePrices.foil || 1.2)
                        });
                    }
                    
                    if (vol.has_mesh) {
                        defaultFallbackItems.push({
                            id: `mesh_${idx}`,
                            desc: `Armature (Paillasse)`,
                            qty: surfaceForAuto,
                            price: parseFloat(activePrices.mesh || 2.5)
                        });
                    }
                    
                    if (vol.has_fiber || vol.has_duramint) {
                        defaultFallbackItems.push({
                            id: `fiber_${idx}`,
                            desc: `Fibre + Duramint`,
                            qty: surfaceForAuto,
                            price: parseFloat(activePrices.fiber || (surfaceForAuto <= 200 ? 2.5 : 2.0))
                        });
                    }

                    // Seuil de surface — calcul intern ASCUNS (nu apare ca linie in PDF)
                    // Se adauga la totalul final prin hiddenExtra (mai jos)
                } else {
                    defaultFallbackItems.push({
                        id: `vol_${idx}`,
                        desc: vol.label || `Volume ${idx+1}`,
                        qty: surfaceForAuto,
                        price: parseFloat(wo.estimated_price?.replace(/[^0-9.]/g, '') || '0') / (estSurface || 1)
                    });
                }
            }

        });
    }

    // Fallback if no volumes
    if (defaultFallbackItems.length === 0) {
        const isSapaGeneral = wo.work_type === 'sapa_mecanizata' || (wo.title || '').toLowerCase().includes('isoflex') || (parseFloat(wo.surface_m2 || 0) > 0 && !parseFloat(wo.estimated_price?.replace(/[^0-9.]/g, '') || '0'));
        if (isSapaGeneral) {
            const surfaceForAuto = parseFloat(isInvoiceView && wo.actual_surface_m2 > 0 ? wo.actual_surface_m2 : (wo.surface_m2 || 0));
            const thickForAuto = parseFloat(isInvoiceView && wo.actual_thickness_cm > 0 ? wo.actual_thickness_cm : (wo.thickness_cm || 5));
            if (surfaceForAuto > 0) {
                const stdThick = parseFloat(activePrices.standard_thickness || 5);
                const extraThickForAuto = Math.max(0, thickForAuto - stdThick);
                
                defaultFallbackItems.push({ id: 'base_gen', desc: `Pose de chape ${Math.min(thickForAuto, stdThick)} cm`, qty: surfaceForAuto, price: parseFloat(activePrices.base || 12.5) });
                if (extraThickForAuto > 0) {
                    defaultFallbackItems.push({ id: 'extra_gen', desc: `Épaisseur supplémentaire (${extraThickForAuto} cm)`, qty: surfaceForAuto, price: extraThickForAuto * parseFloat(activePrices.extra_thickness_price_per_cm || activePrices.extra || 1.25) });
                }
                if (wo.has_foil || wo.actual_has_foil) {
                    defaultFallbackItems.push({ id: 'foil_gen', desc: `Feuille de plastique (Visqueen)`, qty: surfaceForAuto, price: parseFloat(activePrices.foil || 1.2) });
                }
                if (wo.has_mesh || wo.actual_has_mesh) {
                    defaultFallbackItems.push({ id: 'mesh_gen', desc: `Armature (Paillasse)`, qty: surfaceForAuto, price: parseFloat(activePrices.mesh || 2.5) });
                }
                if (wo.has_fiber || wo.actual_has_fiber || wo.has_duramint || wo.actual_has_duramint) {
                    defaultFallbackItems.push({ id: 'fiber_gen', desc: `Fibre + Duramint`, qty: surfaceForAuto, price: parseFloat(activePrices.fiber || (surfaceForAuto <= 200 ? 2.5 : 2.0)) });
                }
            }
        } else {
            defaultFallbackItems = [{
                id: 'default',
                desc: `${tL('items.custom_work') || 'Travaux selon devis'} (${wo.title || tL('items.labor_materials') || 'Main-d\'œuvre et matériaux'})`,
                qty: 1,
                price: parseFloat(wo.estimated_price?.replace(/[^0-9.]/g, '') || '0')
            }];
        }
    }

    // Items array from config or default fallback
    let shouldUseFallback = !pData?.items || pData.items.length === 0;
    if (pData?.items?.length === 1) {
        const descLower = String(pData.items[0].desc || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (pData.items[0].id === 'default' || 
            descLower.includes('conform deviz') || 
            descLower.includes('manoper') || 
            descLower === 'chape' ||
            descLower === 'sapa' ||
            descLower.startsWith('sapa') ||
            descLower.startsWith('chape')) {
            shouldUseFallback = true;
        }
    }

    // Try translating items on the fly if desc isn't hardcoded or uses translation keys
    const items = !shouldUseFallback ? pData.items.map(item => {
        let newDesc = item.desc;
        const match = newDesc?.match(/^(proforma\.items\.[a-zA-Z0-9_]+)(.*)$/);
        if (match) {
            const keyPart = match[1].replace('proforma.', '');
            newDesc = tL(keyPart) + match[2];
        } else if (newDesc) {
            const dLower = newDesc.toLowerCase().trim();
            const lang = pData?.lang || tenant?.invoice_language || 'fr';
            if (lang === 'fr' || i18n.language === 'fr') {
                const normalizedDesc = newDesc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                
                if (normalizedDesc === 'sapa') {
                    newDesc = 'Chape';
                } else if (normalizedDesc === 'manopera') {
                    newDesc = "Main-d'œuvre";
                } else if (normalizedDesc === 'sapa + manopera') {
                    newDesc = "Chape + Main-d'œuvre";
                } else {
                    newDesc = newDesc.replace(/[sșş]ap[aăâ]/gi, 'Chape');
                    newDesc = newDesc.replace(/manoper[aăâ]/gi, "Main-d'œuvre");
                }
            }
        }
        return { ...item, desc: newDesc };
    }) : defaultFallbackItems

    // Calcul seuil de surface — adaugat ca linie in deviz
    if (activePrices.surface_thresholds && Array.isArray(activePrices.surface_thresholds)) {
        const surfCheck = isInvoiceView && wo.actual_surface_m2 > 0 ? parseFloat(wo.actual_surface_m2) : parseFloat(wo.volumes?.[0]?.quantity || 0)
        activePrices.surface_thresholds.forEach(thresh => {
            const minS = parseFloat(thresh.min_sqm || 0)
            const maxS = parseFloat(thresh.max_sqm || 999999)
            if (surfCheck >= minS && surfCheck <= maxS) {
                const charge = parseFloat(thresh.extra_charge || 0)
                if (charge > 0) {
                    items.push({
                        id: `threshold_${minS}`,
                        desc: 'Forfait',
                        qty: 1,
                        unit: 'Forfait',
                        price: charge
                    })
                }
            }
        })
    }

    const priceRaw = items.reduce((acc, item) => acc + (item.qty * item.price), 0)
    const activeDiscountPct = parseFloat(activePrices.discount_pct || discountPct || 0)
    const discountAmount = (priceRaw * (activeDiscountPct / 100)) + parseFloat(activePrices.discount || 0)
    const subtotal = priceRaw - discountAmount
    const vatAmount = subtotal * (vatRate / 100)
    const totalAmount = subtotal + vatAmount

    return (
        <div className="w-full min-h-full font-sans bg-slate-50 print:bg-white p-4 md:p-8">

            <div className="max-w-[800px] mx-auto bg-white p-8 md:p-12 shadow-sm rounded-xl border border-slate-200 print:shadow-none print:border-none print:p-0">
                {/* Header Top: Logo and Invoice Title */}
                <div className="flex justify-between items-center bg-slate-50/70 border border-slate-100 rounded-2xl px-6 py-4 mb-6 print:bg-transparent print:border-none print:p-0">
                    <div>
                        {tenant?.logo_url ? (
                            <img src={tenant.logo_url} alt="Logo" className="h-12 object-contain" />
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <h1 className="text-2xl font-extrabold text-slate-800">{tenant?.name || 'Davide Chape'}</h1>
                                <span className="text-base font-bold text-slate-400">(SRL)</span>
                            </div>
                        )}
                    </div>
                    <div className="text-right flex items-center gap-6">
                        <div className="text-right">
                            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest leading-tight">
                                {isInvoiceView ? (
                                    tL('invoice_title') === 'invoice_title' ? 'FACTURE' : tL('invoice_title')
                                ) : (
                                    tL('proforma')
                                )}
                            </h2>
                            <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-wider whitespace-nowrap">
                                N° {isInvoiceView ? (wo.invoice_number || 'INV 0840') : (wo.quote_number || 'EST 0840')}
                            </p>
                        </div>
                        <div className="text-sm text-slate-500 flex flex-col gap-1 items-end border-l border-slate-200 pl-6">
                            <p className="bg-white/60 px-2 py-0.5 rounded-md border border-slate-200/50">{tL('date')} <strong>{new Date(wo.proforma_issued_at || Date.now()).toLocaleDateString('ro-RO')}</strong></p>
                            {isInvoiceView && (
                                <p className="bg-white/60 px-2 py-0.5 rounded-md border border-slate-200/50">{tL('due')} <strong>{new Date(new Date(wo.proforma_issued_at || Date.now()).getTime() + 86400000*14).toLocaleDateString('ro-RO')}</strong></p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Header Middle: Supplier and Client Details (Same Row, Identical Cards) */}
                <div className="flex gap-6 mb-8">
                    <div className="flex-1 bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 print:border-none print:shadow-none print:p-0 print:pr-4">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{tL('supplier')}</h3>
                        <p className="font-bold text-slate-800 text-base mb-1">{tenant?.name || 'Davide Chape SRL'}</p>
                        <div className="text-sm text-slate-600 leading-snug">
                            <p>TVA: BE 0785.292.895</p>
                            <p>Gemeentehuisstraat 27/5, 1740 Ternat</p>
                            <p>Flandre, Belgique</p>
                        </div>
                    </div>
                    <div className="flex-1 bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 text-right print:border-none print:shadow-none print:p-0 print:pl-4">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">À L'ATTENTION DE</h3>
                        <p className="font-bold text-slate-800 text-base mb-1">{cName || tL('client_none')}</p>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-snug">{cDetails}</p>
                    </div>
                </div>

                <div className="space-y-2 mb-12">
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <div className="col-span-5">{tL('desc')}</div>
                        <div className={isInvoiceView ? "col-span-1 text-center" : "col-span-2 text-center"}>{tL('qty')}</div>
                        <div className="col-span-1 text-center">{tL('unit', 'UNITÉ')}</div>
                        <div className="col-span-2 text-right">{tL('price')}</div>
                        {isInvoiceView && <div className="col-span-1 text-right">TVA</div>}
                        <div className="col-span-2 text-right">{isInvoiceView ? tL('subtotal_eur', 'Sous-total (EUR)') : tL('amount', 'Montant')}</div>
                    </div>
                    {items.map((item, idx) => (
                        <div key={item.id || idx} className="grid grid-cols-12 gap-4 px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 items-center break-inside-avoid">
                            <div className="col-span-5">
                                <p className="font-medium text-slate-800 text-sm">{item.desc}</p>
                                {idx === 0 && (wo.site_name || wo.site_address) && (
                                    <div className="mt-2 text-xs text-slate-500">
                                        <span className="font-semibold">{tL('address')} (Chantier):</span>{' '}
                                        {wo.site_name && <span>{wo.site_name}</span>}
                                        {wo.site_name && wo.site_address && <span> - </span>}
                                        {wo.site_address && <span>{wo.site_address}</span>}
                                    </div>
                                )}
                            </div>
                            <div className={isInvoiceView ? "col-span-1 text-center text-slate-600 font-medium text-sm" : "col-span-2 text-center text-slate-600 font-medium text-sm"}>{item.qty}</div>
                            <div className="col-span-1 text-center text-slate-500 font-bold text-[10px] uppercase">{item.unit || 'm²'}</div>
                            <div className="col-span-2 text-right text-slate-600 text-sm">{Number(item.price).toFixed(2)}</div>
                            {isInvoiceView && <div className="col-span-1 text-right text-slate-600 text-sm">{vatRate > 0 ? `${vatRate}%` : '0,0%'}</div>}
                            <div className="col-span-2 text-right font-bold text-slate-800 text-sm">{(item.qty * item.price).toFixed(2)}</div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end mb-12">
                    <div className="w-[450px] print:w-[350px]">
                        {isInvoiceView ? (
                            <>
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-slate-800 text-sm">{tL('subtotal', 'Sous-total :')}</span>
                                    <span className="font-bold text-slate-800 whitespace-nowrap text-sm">{priceRaw.toFixed(2)} EUR</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between mb-2 text-green-600">
                                        <span className="font-bold text-sm">{activeDiscountPct > 0 ? `Remise (${activeDiscountPct}%)` : 'Remise (Discount)'}</span>
                                        <span className="font-bold whitespace-nowrap">- {discountAmount.toFixed(2)} EUR</span>
                                    </div>
                                )}
                                {useVat && vatRate > 0 ? (
                                    <div className="flex justify-between mb-6">
                                        <span className="font-bold text-slate-800 text-sm">{tL('vat_rate', 'TVA {{rate}}% :').replace('{{rate}}', vatRate)}</span>
                                        <span className="font-bold text-slate-800 whitespace-nowrap text-sm">{vatAmount.toFixed(2)} EUR</span>
                                    </div>
                                ) : (
                                    <div className="mb-6">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-slate-800 text-sm">{tL('vat_0_auto', 'TVA 0,0% Autoliquidation :')}</span>
                                            <div className="flex gap-12 items-center">
                                                <span className="font-bold text-slate-800 whitespace-nowrap text-sm">{subtotal.toFixed(2)} EUR</span>
                                                <span className="font-bold text-slate-800 whitespace-nowrap text-sm">0,00 EUR</span>
                                            </div>
                                        </div>
                                        <span className="text-sm text-slate-500 block w-full">{tL('autoliquidation', 'Autoliquidation')}</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between mb-2 text-green-600">
                                        <span className="font-bold text-sm">{activeDiscountPct > 0 ? `Remise (${activeDiscountPct}%)` : 'Remise (Discount)'}</span>
                                        <span className="font-bold whitespace-nowrap">- {discountAmount.toFixed(2)} EUR</span>
                                    </div>
                                )}
                            </>
                        )}
                        <div className="flex justify-between py-3 px-4 rounded-xl mt-2 font-black text-white text-base" style={{ backgroundColor: primaryColor }}>
                            <span>{tL('total_label', 'Total :')}</span>
                            <span>{totalAmount.toFixed(2)} EUR</span>
                        </div>
                    </div>
                </div>

                {/* Info Bancaires & Commentaires */}
                <div className="flex flex-col gap-4 mb-8">
                    {isInvoiceView && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden print:rounded-none">
                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-sm font-normal text-slate-700 print:bg-slate-100">{tL('bank_info', 'Informations bancaires')}</div>
                            <div className="p-4 text-sm text-slate-700 leading-relaxed">
                                <p>{tenant?.name || 'DAVIDE CHAPE'}</p>
                                <p>IBAN: BE46363221149936 | BIC: BBRUBEBB</p>
                                <p>IBAN: BE97733069599449 | BIC: KREDBEBB</p>
                                <br/>
                                <p>{tL('payment_ref', 'Référence de Paiement :')} <span className="font-medium">{isInvoiceView ? (wo.invoice_number || '') : (wo.quote_number || '')}</span></p>
                            </div>
                        </div>
                    )}
                    
                    <div className={`${isInvoiceView ? 'border border-slate-200 rounded-xl overflow-hidden print:rounded-none' : ''}`}>
                        {isInvoiceView && <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-sm font-normal text-slate-700 print:bg-slate-100">{tL('comments', 'Commentaires')}</div>}
                        <div className={`${isInvoiceView ? 'p-4' : 'pt-2'} text-sm text-slate-700 leading-relaxed text-justify`}>
                            {isInvoiceView ? (
                                tL('invoice_comment', 'Autoliquidation : en l’absence de contestation par écrit, dans un délai d’un mois à compter de la réception de la facture, le client est présumé reconnaître qu’il est un assujetti tenu au dépôt de déclarations périodiques. Si cette condition n’est pas remplie, le client endossera, par rapport à cette condition, la responsabilité quant au paiement de la taxe, des intérêts et des amendes dus (nouvel article 20, §3 AR n° 1).')
                            ) : (
                                <>
                                    <p className="font-medium mb-1">{tL('quote_comment_1', 'Le devis total exclut la TVA :')}</p>
                                    <p>{tL('quote_comment_2', 'pour les nouvelles constructions TVA 21%')}</p>
                                    <p>{tL('quote_comment_3', 'pour les renouvellements TVA 6%')}</p>
                                    <p>{tL('quote_comment_4', 'pour les entreprises disposant de numéros de TVA, autoliquidation et TVA non appliquée')}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-sm text-slate-600 mt-auto pt-8 border-t border-slate-100">
                    <p className="mb-1 uppercase">{tenant?.name || 'DAVIDE CHAPE'}, Gemeentehuisstraat 27/5, 1740, Ternat, Flandre, Belgique</p>
                    <p className="mb-1">TVA: BE0785292895</p>
                    <p>Téléphone: 0493.37.07.77 | Email: info@davidechape.be</p>
                </div>
            </div>

        </div>
    )
}

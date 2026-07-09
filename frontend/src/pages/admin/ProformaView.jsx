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
                'proforma': 'Factură Proformă',
                'date': 'Data:',
                'due': 'Scadență:',
                'to': 'Către',
                'address': 'Șantier / Locație',
                'desc': 'Descriere Servicii / Materiale',
                'qty': 'Cantitate',
                'price': 'Preț Unitar',
                'total': 'Total (Net)',
                'subtotal': 'Subtotal Brut',
                'base': 'Bază de calcul',
                'vat': 'TVA',
                'grand_total': 'TOTAL NET DE PLATĂ',
                'note': 'Aceasta este o factură proformă. Produsele și serviciile vor fi prestate după confirmarea plății sau conform contractului în vigoare.'
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
    if (!wo) return <div className="flex h-full items-center justify-center font-bold text-red-600">Comanda nu a fost găsită.</div>

    // Fiscal logic
    const isBelgium = tenant?.country === 'BE'
    
    // Apply config or defaults from DB
    const useVat = pData?.useVat ?? wo?.prices?.useVat ?? true
    let defaultVatRate = isBelgium ? 21 : 19;
    
    // Auto-calcul TVA bazat pe status client / lucrare din wo.prices
    const clientType = wo.client_type || 'fizica';
    const workType = wo.work_type || 'new';
    if (clientType === 'juridica') {
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
    let defaultFallbackItems = []
    
    if (wo.volumes && wo.volumes.length > 0) {
        wo.volumes.forEach((vol, idx) => {
            const isChape = vol.label?.toLowerCase()?.includes('sapa') || /[sșş]ap[aăâ]/i.test(vol.label || '')
            
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
                    const stdThick = parseFloat(wo.prices?.standard_thickness || 5)
                    const extraThickForAuto = Math.max(0, thickForAuto - stdThick)
                    
                    defaultFallbackItems.push({
                        id: `base_${idx}`,
                        desc: `Pose de chape ${Math.min(thickForAuto, stdThick)} cm`,
                        qty: surfaceForAuto,
                        price: parseFloat(wo.prices?.base || 12.5)
                    });
                    
                    if (extraThickForAuto > 0) {
                        defaultFallbackItems.push({
                            id: `extra_${idx}`,
                            desc: `Épaisseur supplémentaire (${extraThickForAuto} cm)`,
                            qty: surfaceForAuto,
                            price: extraThickForAuto * parseFloat(wo.prices?.extra_thickness_price_per_cm || wo.prices?.extra || 1.25)
                        });
                    }
                    
                    if (vol.has_foil) {
                        defaultFallbackItems.push({
                            id: `foil_${idx}`,
                            desc: `Feuille de plastique (Visqueen)`,
                            qty: surfaceForAuto,
                            price: parseFloat(wo.prices?.foil || 1.2)
                        });
                    }
                    
                    if (vol.has_mesh) {
                        defaultFallbackItems.push({
                            id: `mesh_${idx}`,
                            desc: `Armature (Paillasse)`,
                            qty: surfaceForAuto,
                            price: parseFloat(wo.prices?.mesh || 2.5)
                        });
                    }
                    
                    if (vol.has_fiber) {
                        defaultFallbackItems.push({
                            id: `fiber_${idx}`,
                            desc: `Fibre + Duramint`,
                            qty: surfaceForAuto,
                            price: parseFloat(wo.prices?.fiber || (surfaceForAuto <= 200 ? 2.5 : 2.0))
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
        defaultFallbackItems = [{
            id: 'default',
            desc: `${tL('items.custom_work') || 'Lucrări conform deviz'} (${wo.title || tL('items.labor_materials') || 'Manoperă și materiale'})`,
            qty: 1,
            price: parseFloat(wo.estimated_price?.replace(/[^0-9.]/g, '') || '0')
        }]
    }

    // Items array from config or default fallback
    let shouldUseFallback = !pData?.items || pData.items.length === 0;
    if (pData?.items?.length === 1 && (pData.items[0].id === 'default' || String(pData.items[0].desc).includes('Lucrări conform deviz') || String(pData.items[0].desc).includes('Manoperă'))) {
        shouldUseFallback = true;
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

    // Calcul seuil de surface — ascuns din linii, adaugat la total
    let hiddenExtra = 0
    if (wo.prices?.surface_thresholds && Array.isArray(wo.prices.surface_thresholds)) {
        const surfCheck = isInvoiceView && wo.actual_surface_m2 > 0 ? parseFloat(wo.actual_surface_m2) : parseFloat(wo.volumes?.[0]?.quantity || 0)
        wo.prices.surface_thresholds.forEach(thresh => {
            const minS = parseFloat(thresh.min_sqm || 0)
            const maxS = parseFloat(thresh.max_sqm || 999999)
            if (surfCheck >= minS && surfCheck < maxS) {
                hiddenExtra += parseFloat(thresh.extra_charge || 0)
            }
        })
    }

    const priceRaw = items.reduce((acc, item) => acc + (item.qty * item.price), 0) + hiddenExtra
    const discountAmount = (priceRaw * (discountPct / 100)) + parseFloat(wo.prices?.discount || 0)
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
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">FURNIZORI</h3>
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

                <table className="w-full mb-12 table-fixed">
                    <thead>
                        <tr className="border-b-2 border-slate-200">
                            <th className="py-3 pr-4 text-left text-xs font-bold text-slate-500 uppercase w-[55%]">{tL('desc')}</th>
                            <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase w-[15%]">{tL('qty')}</th>
                            <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase w-[15%]">{tL('price')}</th>
                            {isInvoiceView && <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase w-[10%]">TVA</th>}
                            <th className="py-3 pl-4 text-right text-xs font-bold text-slate-500 uppercase w-[15%]">{isInvoiceView ? 'Sous-total (EUR)' : 'Montant'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id || idx} className="border-b border-slate-100">
                                <td className="py-4 pr-4 align-top">
                                    <p className="font-medium text-slate-800">{item.desc}</p>
                                    {idx === 0 && (wo.site_name || wo.site_address) && (
                                        <div className="mt-2 text-sm text-slate-500">
                                            <span className="font-semibold">{tL('address')} (Chantier):</span>{' '}
                                            {wo.site_name && <span>{wo.site_name}</span>}
                                            {wo.site_name && wo.site_address && <span> - </span>}
                                            {wo.site_address && <span>{wo.site_address}</span>}
                                        </div>
                                    )}
                                </td>
                                <td className="py-4 px-4 text-center text-slate-600 align-top">{item.qty}</td>
                                <td className="py-4 px-4 text-right text-slate-600 whitespace-nowrap align-top">{Number(item.price).toFixed(2)}</td>
                                {isInvoiceView && <td className="py-4 px-4 text-right text-slate-600 whitespace-nowrap align-top">{vatRate > 0 ? `${vatRate}%` : '0,0%'}</td>}
                                <td className="py-4 pl-4 text-right font-medium text-slate-800 whitespace-nowrap align-top">{(item.qty * item.price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end mb-12">
                    <div className="w-[450px] print:w-[350px]">
                        {isInvoiceView ? (
                            <>
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-slate-800 text-sm">Sous-total:</span>
                                    <span className="font-bold text-slate-800 whitespace-nowrap text-sm">{priceRaw.toFixed(2)} EUR</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between mb-2 text-green-600">
                                        <span className="font-bold text-sm">{discountPct > 0 ? `Remise (${discountPct}%)` : 'Remise (Discount)'}</span>
                                        <span className="font-bold whitespace-nowrap">- {discountAmount.toFixed(2)} EUR</span>
                                    </div>
                                )}
                                {useVat && vatRate > 0 ? (
                                    <div className="flex justify-between mb-6">
                                        <span className="font-bold text-slate-800 text-sm">TVA {vatRate}%:</span>
                                        <span className="font-bold text-slate-800 whitespace-nowrap text-sm">{vatAmount.toFixed(2)} EUR</span>
                                    </div>
                                ) : (
                                    <div className="mb-6">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-slate-800 text-sm">TVA 0,0% Autoliquidation:</span>
                                            <div className="flex gap-12 items-center">
                                                <span className="font-bold text-slate-800 whitespace-nowrap text-sm">{subtotal.toFixed(2)} EUR</span>
                                                <span className="font-bold text-slate-800 whitespace-nowrap text-sm">0,00 EUR</span>
                                            </div>
                                        </div>
                                        <span className="text-sm text-slate-500 block w-full">Autoliquidation</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between mb-2 text-green-600">
                                        <span className="font-bold text-sm">{discountPct > 0 ? `Remise (${discountPct}%)` : 'Remise (Discount)'}</span>
                                        <span className="font-bold whitespace-nowrap">- {discountAmount.toFixed(2)} EUR</span>
                                    </div>
                                )}
                            </>
                        )}
                        <div className={`flex justify-between pt-4 ${isInvoiceView ? 'border-t border-slate-200' : ''}`}>
                            <span className="font-bold text-slate-800 text-base">Total:</span>
                            <span className="font-bold text-slate-800 whitespace-nowrap text-base">{totalAmount.toFixed(2)} EUR</span>
                        </div>
                    </div>
                </div>

                {/* Info Bancaires & Commentaires */}
                <div className="flex flex-col gap-4 mb-8">
                    {isInvoiceView && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden print:rounded-none">
                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-sm font-normal text-slate-700 print:bg-slate-100">Informations bancaires</div>
                            <div className="p-4 text-sm text-slate-700 leading-relaxed">
                                <p>{tenant?.name || 'DAVIDE CHAPE'}</p>
                                <p>IBAN: BE46363221149936 | BIC: BBRUBEBB</p>
                                <p>IBAN: BE97733069599449 | BIC: KREDBEBB</p>
                                <br/>
                                <p>Référence de Paiement: <span className="font-medium">{isInvoiceView ? (wo.invoice_number || '') : (wo.quote_number || '')}</span></p>
                            </div>
                        </div>
                    )}
                    
                    <div className={`${isInvoiceView ? 'border border-slate-200 rounded-xl overflow-hidden print:rounded-none' : ''}`}>
                        {isInvoiceView && <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-sm font-normal text-slate-700 print:bg-slate-100">Commentaires</div>}
                        <div className={`${isInvoiceView ? 'p-4' : 'pt-2'} text-sm text-slate-700 leading-relaxed text-justify`}>
                            {isInvoiceView ? (
                                'Autoliquidation : en l’absence de contestation par écrit, dans un délai d’un mois à compter de la réception de la facture, le client est présumé reconnaître qu’il est un assujetti tenu au dépôt de déclarations périodiques. Si cette condition n’est pas remplie, le client endossera, par rapport à cette condition, la responsabilité quant au paiement de la taxe, des intérêts et des amendes dus (nouvel article 20, §3 AR n° 1).'
                            ) : (
                                <>
                                    <p className="font-medium mb-1">Le devis total exclut la TVA :</p>
                                    <p>pour les nouvelles constructions TVA 21%</p>
                                    <p>pour les renouvellements TVA 6%</p>
                                    <p>pour les entreprises disposant de numéros de TVA, autoliquidation et TVA non appliquée</p>
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

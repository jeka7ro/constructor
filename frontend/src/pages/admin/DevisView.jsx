import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, Printer, ArrowLeft, FileText } from 'lucide-react'
import api from '../../lib/api'
import { useTenantStore } from '../../store/tenantStore'
import { useTranslation } from 'react-i18next'

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
        forfait: 'forfait', travaux: 'Travaux selon devis',
        signClient: 'Cachet / Signature',
    },
    en: {
        devis: 'QUOTE', validDays: 'Valid 30 days', date: 'Date:',
        client: 'CLIENT', chantier: 'SITE / ADDRESS', surface: 'Surface', ep: 'Th.',
        desc: 'DESCRIPTION', qty: 'QTY', unit: 'UNIT', pu: 'U.P. (€)', total: 'TOTAL (€)',
        totalLabel: 'TOTAL',
        condTitle: 'Terms & Conditions',
        condText: 'This document is an estimate. Prices are valid for 30 days from the date of issue. To confirm, please return this quote signed with the mention «Bon pour accord».',
        dateEst: 'Estimated work date:',
        chapeBase: (cm) => `Screed installation ${cm} cm`,
        chapeExtra: (cm) => `Additional thickness (${cm} cm)`,
        foil: 'Plastic sheet (Visqueen)',
        mesh: 'Reinforcement mesh',
        fiber: 'Fibre + Duramint',
        forfait: 'lump sum', travaux: 'Works per quote',
        signClient: 'Stamp / Signature',
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
        forfait: 'forfait', travaux: 'Werken volgens offerte',
        signClient: 'Stempel / Handtekening',
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
    const [proformaItems, setProformaItems] = useState(null) // items din proforma_data (tarife corecte)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const endpoint = token ? `/public/work-orders/${token}` : `/admin/work-orders/${id}`;
        api.get(endpoint)
            .then(res => {
                setWo(res.data)
                // Dacă are proforma_data cu items valide, le folosim
                const pItems = res.data?.proforma_data?.items
                if (pItems && pItems.length > 0) {
                    const descLower = String(pItems[0].desc || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
                    const isPlaceholder = pItems.length === 1 && 
                        (pItems[0].id === 'default' || 
                         descLower.includes('conform deviz') || 
                         descLower.includes('manoper') ||
                         descLower === 'chape' ||
                         descLower === 'sapa' ||
                         descLower.match(/sapa|chape/i) ||
                         descLower.startsWith('sapa') ||
                         descLower.startsWith('chape'))
                    if (!isPlaceholder) setProformaItems(pItems)
                }
            })
            .catch(err => { console.error(err); setError(t('devis.not_found', 'Devis introuvable.')) })
            .finally(() => setLoading(false))
    }, [id, token])

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

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>
    if (error || !wo) return <div className="flex h-screen items-center justify-center font-bold text-red-600">{error || t('common.error', 'Erreur')}</div>

    const T = DEVIS_LANG[lang] || DEVIS_LANG['fr']
    const locale = lang === 'nl' ? 'nl-BE' : lang === 'en' ? 'en-GB' : 'fr-BE'

    const buildItems = () => {
        // PRIORITATE: proforma_data.items (prețuri din pagina de tarife, inclusiv prețuri preferențiale)
        if (proformaItems) {
            return proformaItems.map(item => {
                let newDesc = item.desc || '';
                const lang = tenant?.invoice_language || 'fr';
                if (lang === 'fr' || i18nGlobal.language === 'fr') {
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
                return {
                    desc: newDesc,
                    qty: parseFloat(item.qty || 1),
                    unit: item.unit || 'm²',
                    price: parseFloat(item.price || 0)
                }
            })
        }
        
        // FALLBACK: calcul din grosimi (folosit doar dacă proforma_data lipsește)
        const items = []
        if (wo.volumes && wo.volumes.length > 0) {
            wo.volumes.forEach((vol, idx) => {
                const isChape = vol.label?.toLowerCase()?.includes('sapa') || /[sșş]ap[aăâ]/i.test(vol.label || '') || /chape/i.test(vol.label || '')
                const surface = parseFloat(vol.quantity || 0)
                const thick = parseFloat(vol.thickness || 0)
                
                if (surface > 0) {
                    if (isChape) {
                        const stdThick = parseFloat(wo.prices?.standard_thickness || 5)
                        const extraThick = Math.max(0, thick - stdThick)
                        
                        items.push({ desc: T.chapeBase(Math.min(thick, stdThick)), qty: surface, unit: 'm²', price: parseFloat(wo.prices?.base || 12.5) })
                        if (extraThick > 0) {
                            items.push({ desc: T.chapeExtra(extraThick), qty: surface, unit: 'm²', price: extraThick * parseFloat(wo.prices?.extra_thickness_price_per_cm || wo.prices?.extra || 1.25) })
                        }
                        if (vol.has_foil) items.push({ desc: T.foil, qty: surface, unit: 'm²', price: parseFloat(wo.prices?.foil || 1.2) })
                        if (vol.has_mesh) items.push({ desc: T.mesh, qty: surface, unit: 'm²', price: parseFloat(wo.prices?.mesh || 2.5) })
                        if (vol.has_fiber || vol.has_duramint) items.push({ desc: T.fiber, qty: surface, unit: 'm²', price: parseFloat(wo.prices?.fiber || (surface <= 200 ? 2.5 : 2.0)) })
                    } else {
                        items.push({ desc: vol.label || `Volume ${idx + 1}`, qty: surface, unit: 'm²', price: parseFloat(wo.estimated_price?.replace(/[^0-9.]/g, '') || '0') / (surface || 1) })
                    }
                }
            })
        }

        if (items.length === 0) {
            const isSapaGeneral = wo.work_type === 'sapa_mecanizata' || (wo.title || '').toLowerCase().includes('isoflex') || (parseFloat(wo.surface_m2 || 0) > 0 && !parseFloat(wo.estimated_price?.replace(/[^0-9.]/g, '') || '0'));
            if (isSapaGeneral) {
                const surface = parseFloat(wo.surface_m2 || 0);
                const thick = parseFloat(wo.thickness_cm || 5);
                if (surface > 0) {
                    const stdThick = parseFloat(wo.prices?.standard_thickness || 5);
                    const extraThick = Math.max(0, thick - stdThick);
                    
                    items.push({ desc: T.chapeBase(Math.min(thick, stdThick)), qty: surface, unit: 'm²', price: parseFloat(wo.prices?.base || 12.5) });
                    if (extraThick > 0) items.push({ desc: T.chapeExtra(extraThick), qty: surface, unit: 'm²', price: extraThick * parseFloat(wo.prices?.extra_thickness_price_per_cm || wo.prices?.extra || 1.25) });
                    if (wo.has_foil || wo.actual_has_foil) items.push({ desc: T.foil, qty: surface, unit: 'm²', price: parseFloat(wo.prices?.foil || 1.2) });
                    if (wo.has_mesh || wo.actual_has_mesh) items.push({ desc: T.mesh, qty: surface, unit: 'm²', price: parseFloat(wo.prices?.mesh || 2.5) });
                    if (wo.has_fiber || wo.actual_has_fiber || wo.has_duramint || wo.actual_has_duramint) items.push({ desc: T.fiber, qty: surface, unit: 'm²', price: parseFloat(wo.prices?.fiber || (surface <= 200 ? 2.5 : 2.0)) });
                }
            }
            if (items.length === 0) {
                items.push({ desc: wo.title || T.travaux, qty: 1, unit: T.forfait, price: parseFloat(wo.estimated_price?.replace(/[^0-9.]/g, '') || '0') })
            }
        }
        
        return items
    }

    const items = buildItems()
    
    // Calcul seuil de surface
    if (wo.prices?.surface_thresholds && Array.isArray(wo.prices.surface_thresholds)) {
        const surfCheck = parseFloat(wo.volumes?.[0]?.quantity || wo.surface_m2 || 0)
        wo.prices.surface_thresholds.forEach(thresh => {
            const minS = parseFloat(thresh.min_sqm || 0)
            const maxS = parseFloat(thresh.max_sqm || 999999)
            if (surfCheck >= minS && surfCheck <= maxS) {
                const charge = parseFloat(thresh.extra_charge || 0)
                if (charge > 0) {
                    items.push({
                        desc: t('devis.flat_rate', 'Forfait'),
                        qty: 1,
                        unit: t('devis.flat_rate_unit', 'Forfait'),
                        price: charge
                    })
                }
            }
        })
    }

    const totalNet = items.reduce((s, i) => s + i.qty * i.price, 0)
    const discountAmount = parseFloat(wo.prices?.discount || 0)
    const netAfterDiscount = totalNet - discountAmount
    
    let vatRate = 0
    let vatEnabled = wo.prices?.useVat !== false // Default true unless explicitly false
    if (vatEnabled) {
        if (wo.prices?.vat_type !== undefined) {
            vatRate = parseFloat(wo.prices.vat_type)
        } else if (wo.client_type === 'pj' || wo.client_type === 'juridica') {
            vatRate = 0 // Entreprise
        } else {
            vatRate = wo.work_type === 'repair' ? 6 : 21 // Particulier
        }
    }
    
    const vatAmount = netAfterDiscount * (vatRate / 100)
    const totalGross = netAfterDiscount + vatAmount

    const devisNum = wo.quote_number || 'EST 0840'
    const dateStr = wo.approximate_date ? new Date(wo.approximate_date).toLocaleDateString(locale) : new Date().toLocaleDateString(locale)
    const primaryColor = tenant?.primary_color || '#059669'

    return (
        <div className={(embeddedToken || embedded) ? '' : 'min-h-screen bg-slate-100 print:bg-white'}>
            {!token && !embedded && (
                <div className="print:hidden sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium text-sm transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Retour
                    </button>
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-700 text-sm">{devisNum}</span>
                    </div>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow transition-colors">
                        <Printer className="w-4 h-4" /> Imprimer / PDF
                    </button>
                </div>
            )}
            <div className={`print:p-0 max-w-[860px] mx-auto ${token ? 'p-0' : 'p-4 sm:p-6'}`}>
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                    <div className="px-5 pt-6 pb-6 sm:px-10 sm:pt-10 print:px-8 print:pt-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div>
                                {tenant?.logo_url ? (<img src={tenant.logo_url} alt="Logo" className="h-14 object-contain mb-2" />) : (<div className="text-2xl font-black text-slate-800">{tenant?.name || 'Davide Chape'}</div>)}
                                <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    {tenant?.address && <div>{tenant.address}</div>}
                                    {tenant?.vat_number && <div>N° TVA: {tenant.vat_number}</div>}
                                    {tenant?.phone && <div>Tél: {tenant.phone}</div>}
                                    {tenant?.email && <div>{tenant.email}</div>}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-slate-700 font-bold uppercase tracking-wider">{T.devis}</div>
                                <div className="text-sm text-slate-500 font-bold mt-0.5 uppercase tracking-wider">N° {devisNum}</div>
                                <div className="mt-3 text-xs text-slate-500 space-y-0.5">
                                    <div>{T.date} <strong>{dateStr}</strong></div>
                                    <div>{T.validDays}</div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 h-0.5 rounded-full" style={{ backgroundColor: primaryColor + '50' }} />
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{T.client}</div>
                                <div className="font-bold text-slate-800 break-words">{wo.client_name || '—'}</div>
                                {wo.client_email && <div className="text-xs text-slate-500 mt-1 break-all">{wo.client_email}</div>}
                                {wo.client_cui && <div className="text-xs text-slate-400 mt-1">N° TVA: {wo.client_cui}</div>}
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{T.chantier}</div>
                                <div className="text-sm text-slate-700">{wo.site_address || '—'}</div>
                                {wo.volumes?.[0]?.quantity && (
                                    <div className="text-xs text-slate-500 mt-2">{T.surface}: <strong>{wo.volumes[0].quantity} m²</strong>{wo.volumes[0].thickness && <> · {T.ep}: <strong>{wo.volumes[0].thickness} cm</strong></>}</div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="pb-8 sm:pb-10 print:px-8">
                        <div className="w-full overflow-x-auto print:overflow-visible">
                            <div className="min-w-[500px] px-5 sm:px-10 space-y-2 pb-2 print:px-0">
                                <div className="grid grid-cols-12 gap-3 sm:gap-4 px-2 sm:px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <div className="col-span-5">{T.desc}</div>
                                    <div className="col-span-2 text-center">{T.qty}</div>
                                    <div className="col-span-1 text-center">{T.unit}</div>
                                    <div className="col-span-2 text-right">{T.pu}</div>
                                    <div className="col-span-2 text-right">{T.total}</div>
                                </div>
                                {items.map((item, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 rounded-2xl border border-slate-100 items-center break-inside-avoid">
                                        <div className="col-span-5 text-slate-700 font-medium text-xs sm:text-sm">{item.desc}</div>
                                        <div className="col-span-2 text-center text-slate-600 font-medium text-sm">{item.qty}</div>
                                        <div className="col-span-1 text-center text-slate-500 font-bold text-[10px] uppercase">{item.unit}</div>
                                        <div className="col-span-2 text-right text-slate-600 text-sm">{item.price.toFixed(2)}</div>
                                        <div className="col-span-2 text-right font-bold text-slate-800 text-sm">{(item.qty * item.price).toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end mt-6 px-5 sm:px-10 print:px-0">
                            <div className="w-72 space-y-1 text-sm">
                                {discountAmount > 0 && (
                                    <div className="flex justify-between py-1 px-4 font-bold text-emerald-600">
                                        <span>Remise (Discount)</span>
                                        <span>- {discountAmount.toFixed(2)} €</span>
                                    </div>
                                )}
                                <div className="flex justify-between py-1 px-4 text-slate-600 font-bold">
                                    <span>Total Net (HTVA)</span>
                                    <span>{netAfterDiscount.toFixed(2)} €</span>
                                </div>
                                {vatEnabled ? (
                                    <div className="flex justify-between py-1 px-4 text-slate-600 font-bold">
                                        <span>TVA ({vatRate}%)</span>
                                        <span>{vatAmount.toFixed(2)} €</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between py-1 px-4 text-slate-400 text-xs italic">
                                        <span>TVA non appliquée</span>
                                        <span>0.00 €</span>
                                    </div>
                                )}
                                <div className="flex justify-between py-3 px-4 rounded-xl mt-2 font-black text-white text-base" style={{ backgroundColor: primaryColor }}>
                                    <span>{T.totalLabel} (TVAC)</span>
                                    <span>{totalGross.toFixed(2)} €</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-10 pt-6 px-5 sm:px-10 print:px-0 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
                            {wo.approximate_date && (
                                <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
                                    <span className="font-bold text-slate-500">{T.dateEst}</span>
                                    <span className="font-black text-slate-800">
                                        {new Date(wo.approximate_date).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            )}
                            <p className="font-bold text-slate-500 mb-1">{T.condTitle}</p>
                            <p>{T.condText}</p>
                        </div>
                        <div className="mt-10 grid grid-cols-2 gap-10">
                            <div className="flex flex-col">
                                <div className="min-h-[2.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    {wo?.client_name || wo?.client?.company_name || wo?.client?.first_name || T.signClient}
                                </div>
                                {signatureElement ? (
                                    <div className="w-full">
                                        {signatureElement}
                                    </div>
                                ) : (wo?.final_client_signature || wo?.client_signature) ? (
                                    <div className="w-full flex flex-col">
                                        <div className="w-full aspect-[3.5/1] border-2 border-emerald-200 bg-emerald-50/50 rounded-2xl flex items-center justify-center p-2">
                                            <img src={wo.final_client_signature || wo.client_signature} alt="Signature" className="max-h-full object-contain" />
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold mt-2">
                                            Date: {new Date(wo.final_confirmed_at || wo.confirmed_at).toLocaleString('fr-BE')}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full">
                                        <div className="w-full aspect-[3.5/1] border-2 border-dashed border-slate-200 rounded-2xl"></div>
                                        <div className="text-[10px] text-slate-400 mt-2">Date: _______________</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <div className="min-h-[2.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{tenant?.name || 'Davide Chape'}</div>
                                <div className="w-full">
                                    <div className="w-full aspect-[3.5/1] border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center p-2">
                                        {tenant?.logo_url ? <img src={tenant.logo_url} alt="Logo" className="h-4/5 object-contain opacity-40" /> : <span className="text-slate-300 text-xs font-bold">Cachet / Signature</span>}
                                    </div>
                                    <div className="text-[10px] text-transparent mt-2 pointer-events-none select-none">Spacer</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`@media print { @page { margin: 1cm; size: A4; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
        </div>
    )
}

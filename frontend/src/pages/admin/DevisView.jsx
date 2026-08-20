import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPrice, buildQuoteItems } from '../../utils/pricingEngine';
import { Loader2, Printer, ArrowLeft, FileText, Mail } from 'lucide-react'
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
        forfait: 'lump sum', travaux: 'Works per quote',
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
        forfait: 'forfait', travaux: 'Werken volgens offerte',
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



    useEffect(() => {
        const endpoint = token ? `/public/work-orders/${token}` : `/admin/work-orders/${id}`;
        let isMounted = true;
        const load = async () => {
            try {
                const woRes = await api.get(endpoint);
                const woData = woRes.data;
                let pricingPromise = Promise.resolve({ data: null });
                if (!token) {
                    pricingPromise = api.get(`/admin/pricing-settings${woData.client_id ? '?client_id=' + woData.client_id : ''}`).catch(err => {
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
        netAfterDiscount = items.reduce((s, i) => i.isHeader ? s : s + (i.qty * i.price), 0);
        vatRate = wo.proforma_data.vatRate || 0;
        vatAmount = netAfterDiscount * (vatRate / 100);
        totalGross = netAfterDiscount + vatAmount;
    } else {
        const calcResult = buildQuoteItems(wo, pricingSettings);
        
        // Filtrăm discount-urile din lista de items (le afișăm separat)
        const nonDiscountItems = calcResult.items.filter(i => i.type !== 'discount');
        
        // Traduceri FR/NL/EN pentru deviz client
        items = nonDiscountItems.map(item => {
            let desc = item.desc;
            if (desc) {
                desc = desc.replace(/Chape - Baz[aăâ]/gi, T.chapeBase ? T.chapeBase(5).replace(/\s*\d+\s*cm/, '') : 'Pose de chape');
                const extraMatch = desc.match(/Grosime Extra\s*\((\d+)\s*cm\)/i);
                if (extraMatch) desc = T.chapeExtra(extraMatch[1]);
                if (/Feuille de plastique/i.test(desc)) desc = T.foil;
                if (/Armature/i.test(desc)) desc = T.mesh;
                if (/Fibre \+ Duramint/i.test(desc)) desc = T.fiber;
                const purMatch = desc.match(/Isolation PUR\s*\((\d+)\s*cm\)/i);
                if (purMatch) desc = T.purBase(purMatch[1]);
                if (/^Aspiration$/i.test(desc)) desc = T.aspiration;
                if (/Nivellement/i.test(desc)) desc = T.nivellement;
                if (/Pon[cç]age/i.test(desc)) desc = T.poncage;
                if (/Protection/i.test(desc)) desc = T.protection;
                const epsMatch = desc.match(/Isolation EPS\s*\(([^)]+)\)/i);
                if (epsMatch) desc = T.epsBase(epsMatch[1]);
                if (/^Transport/i.test(desc)) desc = 'Transport / Déplacement';
                if (/^Forfait$/i.test(desc)) desc = T.forfait || 'Forfait';
                if (/Ajustement/i.test(desc)) desc = 'Forfait minimum chantier';
                
                // Adăugăm grosimea la Chape base
                const chapeSurf = (wo.volumes || []).find(v => /chape|[sșş]ap/i.test(v.label || ''));
                if (/Pose de chape|Dekvloer|^Chape\b/i.test(desc) && chapeSurf) {
                    const thick = parseFloat(chapeSurf.thickness || 5);
                    desc = T.chapeBase(thick);
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


    const devisNum = wo.quote_number || 'DEV 0905'
    const dateStr = wo.approximate_date ? new Date(wo.approximate_date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')
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
                    
                    <button onClick={async () => {
                        try {
                            const res = await api.get(`/admin/work-orders/${id}`);
                            await api.post(`/admin/work-orders/${id}/send-email`, { proforma_url: `https://davidechape.pontaj.app/public/proforma/${res.data.token}` });
                            alert('Email trimis cu succes!');
                        } catch (err) {
                            alert('Eroare la trimiterea emailului.');
                        }
                    }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow transition-colors">
                        <Mail className="w-4 h-4" />
                        Trimite Email
                    </button>

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
                        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6">
                            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{T.client}</div>
                                <div className="font-bold text-slate-800 break-words">
                                    {wo.client_id ? (
                                        <a href={`/admin/clients/${wo.client_id}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors print:text-slate-800 text-inherit">
                                            {wo.client_name || '—'}
                                        </a>
                                    ) : (
                                        wo.client_name || '—'
                                    )}
                                </div>
                                {wo.client_email && <div className="text-xs text-slate-500 mt-1 break-all">{wo.client_email}</div>}
                                {(wo.client_phone || wo.client?.phone) && <div className="text-xs text-slate-500 mt-1">{wo.client_phone || wo.client?.phone}</div>}
                                {wo.client?.address && <div className="text-xs text-slate-500 mt-1 break-words">{wo.client.address}</div>}
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
                        <div className="w-full">
                            <div className="px-3 sm:px-10 space-y-2 pb-2 print:px-0">
                                <div className="grid grid-cols-12 gap-3 sm:gap-4 px-2 sm:px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <div className="col-span-5">{T.desc}</div>
                                    <div className="col-span-2 text-center">{T.qty}</div>
                                    <div className="col-span-1 text-center">{T.unit}</div>
                                    <div className="col-span-2 text-right">{T.pu}</div>
                                    <div className="col-span-2 text-right">{T.total}</div>
                                </div>
                                {items.map((item, i) => (
                                    item.isHeader ? (
                                        <div key={i} className="grid grid-cols-12 gap-3 sm:gap-4 px-4 sm:px-5 py-2 bg-slate-200/60 rounded-xl border border-slate-200 items-center break-inside-avoid mt-3 first:mt-0">
                                            <div className="col-span-12 text-slate-700 font-black text-[11px] uppercase tracking-widest">{item.headerLabel}</div>
                                        </div>
                                    ) : (
                                    <div key={i} className="grid grid-cols-12 gap-2 sm:gap-4 px-2 sm:px-5 py-3 sm:py-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 items-center break-inside-avoid">
                                        <div className="col-span-5 text-slate-700 font-medium text-xs sm:text-sm">{item.desc}</div>
                                        <div className="col-span-2 text-center text-slate-600 font-medium text-xs sm:text-sm">{item.qty}</div>
                                        <div className="col-span-1 text-center text-slate-500 font-bold text-[9px] sm:text-[10px] uppercase">{item.unit}</div>
                                        <div className="col-span-2 text-right text-slate-600 text-xs sm:text-sm">{item.price.toFixed(2)}</div>
                                        <div className="col-span-2 text-right font-bold text-slate-800 text-xs sm:text-sm">{(item.qty * item.price).toFixed(2)}</div>
                                    </div>
                                    )
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end mt-6 px-5 sm:px-10 print:px-0">
                            <div className="w-72 space-y-1 text-sm">
                                {discountAmount > 0 && (
                                    <div className="flex justify-between gap-2 py-1 px-4 font-bold text-emerald-600">
                                        <span>{discountPct > 0 ? `Remise Chape (${discountPct}%)` : 'Remise Chape'}</span>
                                        <span className="whitespace-nowrap">- {discountAmount.toFixed(2)} €</span>
                                    </div>
                                )}
                                <div className="flex justify-between gap-2 py-1 px-4 text-slate-600 font-bold">
                                    <span>Total Net (HTVA)</span>
                                    <span className="whitespace-nowrap">{netAfterDiscount.toFixed(2)} €</span>
                                </div>
                                {vatRate > 0 ? (
                                    <div className="flex justify-between gap-2 py-1 px-4 text-slate-600 font-bold">
                                        <span>TVA ({vatRate}%)</span>
                                        <span className="whitespace-nowrap">{vatAmount.toFixed(2)} €</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between gap-2 py-1 px-4 text-slate-400 text-xs italic">
                                        <span>TVA non appliquée</span>
                                        <span className="whitespace-nowrap">0.00 €</span>
                                    </div>
                                )}
                                <div className="flex justify-between gap-2 py-3 px-4 rounded-xl mt-2 font-black text-white text-base" style={{ backgroundColor: primaryColor }}>
                                    <span>{T.totalLabel} (TVAC)</span>
                                    <span className="whitespace-nowrap">{totalGross.toFixed(2)} €</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-10 pt-6 px-5 sm:px-10 print:px-0 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
                            {wo.approximate_date && (
                                <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
                                    <span className="font-bold text-slate-500">{T.dateEst}</span>
                                    <span className="font-black text-slate-800">
                                        {new Date(wo.approximate_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            )}
                            <p className="font-bold text-slate-500 mb-1">{T.condTitle}</p>
                            <p>{T.condText}</p>
                        </div>
                        <div className="mt-10 px-5 sm:px-10 print:px-0 grid grid-cols-2 gap-10">
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
                                        <div className="w-full aspect-[3.5/1] border-2 border-emerald-200 bg-emerald-50/50 rounded-2xl flex flex-col items-center justify-center p-2 text-center">
                                            {(wo.final_client_signature === 'accepted_without_signature' || wo.client_signature === 'accepted_without_signature') ? (
                                                <>
                                                    <span className="text-emerald-700 font-bold text-sm">Accepté en ligne</span>
                                                    <span className="text-emerald-600 text-xs">(sans signature manuscrite)</span>
                                                </>
                                            ) : (
                                                <img src={wo.final_client_signature || wo.client_signature} alt="Signature" className="max-h-full object-contain" />
                                            )}
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

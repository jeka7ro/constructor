import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPrice } from '../../utils/pricingEngine';
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
        epsBase: (m3) => `Isolation EPS (${m3} m³)`,
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
        epsBase: (m3) => `EPS Insulation (${m3} m³)`,
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
        epsBase: (m3) => `EPS Isolatie (${m3} m³)`,
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
                    if (pricingRes.data) {
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

    const buildItems = () => {
        // PRIORITATE: proforma_data.items (prețuri din pagina de tarife, inclusiv prețuri preferențiale)
        if (proformaItems) {
            const parsedItems = proformaItems.map(item => {
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
                
                // Do not append km to PDF. Ensure we don't display 0.00 transport lines.
                // We will handle filtering out 0 price transport lines after the map.

                return {
                    desc: newDesc,
                    qty: parseFloat(item.qty || 1),
                    unit: item.unit || 'm²',
                    price: parseFloat(item.price || 0)
                }
            }).filter(item => {
                // Remove Transport if price is 0
                if (item.desc && (item.desc.toLowerCase().includes('transport') || item.desc.toLowerCase().includes('déplacement'))) {
                    return item.price > 0;
                }
                return true;
            });
            
            const hasTransport = parsedItems.some(i => i.desc?.toLowerCase().includes('transport') || i.desc?.toLowerCase().includes('déplacement'));
            if (!hasTransport) {
                let truckCost = parseFloat(wo.prices?.truck_cost || 0);
                const distKm = parseFloat(wo.prices?.distance_km || 0);
                
                if (truckCost <= 0 && pricingSettings && distKm > 0) {
                    const truckFlat = parseFloat(pricingSettings.truck_extra_price_flat || 0);
                    const distThreshold = parseFloat(pricingSettings.truck_distance_threshold_km || 50);
                    const surfThreshold = parseFloat(pricingSettings.truck_surface_threshold_free_sqm || 500);
                    const totalSurface = parseFloat(wo.volumes?.[0]?.quantity || wo.surface_m2 || 0);
                    if (truckFlat > 0 && distKm > distThreshold && totalSurface <= surfThreshold) {
                        truckCost = truckFlat;
                    }
                }
                if (truckCost > 0) {
                    parsedItems.push({
                        desc: `Transport`,
                        qty: 1,
                        unit: T.forfait,
                        price: truckCost
                    });
                }
            }
            return parsedItems;
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
                        // Section header for Chape
                        if (items.length === 0 || !items[items.length - 1]?.isHeader) {
                            items.push({ isHeader: true, headerLabel: 'CHAPE' });
                        }
                        const stdThick = parseFloat(wo.prices?.standard_thickness || 5)
                        const extraThick = Math.max(0, thick - stdThick)
                        
                        items.push({ desc: T.chapeBase(Math.min(thick, stdThick)), qty: surface, unit: 'm²', price: getPrice(wo.prices?.base, surface <= 200 ? pricingSettings?.base_price_sqm : pricingSettings?.base_price_sqm_large, 12.5) })
                        if (extraThick > 0) {
                            // Match computeChapeTotal: use extra_large when surface > extra_threshold
                            let extraRate;
                            if (wo.prices?.extra_large !== undefined && wo.prices?.extra_threshold !== undefined) {
                                extraRate = surface > parseFloat(wo.prices.extra_threshold) ? parseFloat(wo.prices.extra_large) : parseFloat(wo.prices?.extra ?? 1.25);
                            } else {
                                extraRate = getPrice(wo.prices?.extra ?? wo.prices?.extra_thickness_price_per_cm, surface <= 200 ? pricingSettings?.extra_thickness_price_per_cm : pricingSettings?.extra_thickness_price_per_cm_large, 1.25);
                            }
                            items.push({ desc: T.chapeExtra(extraThick), qty: surface, unit: 'm²', price: extraThick * extraRate })
                        }
                        if (vol.has_foil) items.push({ desc: T.foil, qty: surface, unit: 'm²', price: getPrice(wo.prices?.foil, pricingSettings?.plastic_foil_price_sqm, 1.2) })
                        if (vol.has_mesh) items.push({ desc: T.mesh, qty: surface, unit: 'm²', price: getPrice(wo.prices?.mesh, pricingSettings?.metal_mesh_price_sqm, 2.5) })
                        if (vol.has_fiber || vol.has_duramint) items.push({ desc: T.fiber, qty: surface, unit: 'm²', price: getPrice(wo.prices?.fiber, surface <= 200 ? pricingSettings?.fiber_price_sqm : pricingSettings?.fiber_price_sqm_large, surface <= 200 ? 2.5 : 2.0) })
                    } else if (/isolation\s*pur/i.test(vol.label || '')) {
                        // Section header for Isolation PUR
                        items.push({ isHeader: true, headerLabel: 'ISOLATION PUR' });
                        // ── Isolation PUR ──
                        const p = wo.prices || {};
                        const purThick = parseFloat(vol.thickness || 3);
                        let purBase = parseFloat(p.pur_base_price_3cm || 13.95);
                        if (purThick > 3 && purThick <= 10) purBase += (purThick - 3) * parseFloat(p.pur_step_price_up_to_10cm || 1.65);
                        else if (purThick > 10) {
                            purBase += 7 * parseFloat(p.pur_step_price_up_to_10cm || 1.65);
                            purBase += (purThick - 10) * parseFloat(p.pur_extra_price_above_10cm || 2.10);
                        }
                        if (surface > 100) purBase += Math.floor((surface - 100) / 100) * parseFloat(p.pur_surface_discount_step || -0.50);
                        purBase = Math.max(0, purBase);
                        
                        items.push({ desc: T.purBase(purThick), qty: surface, unit: 'm²', price: purBase });
                        if (vol.pur_aspiration) items.push({ desc: T.aspiration, qty: surface, unit: 'm²', price: parseFloat(p.pur_opt_aspiration || 2.00) });
                        if (vol.pur_niveller) items.push({ desc: T.nivellement, qty: surface, unit: 'm²', price: parseFloat(p.pur_opt_niveller || 4.25) });
                        if (vol.pur_poncage) items.push({ desc: T.poncage, qty: surface, unit: 'm²', price: parseFloat(p.pur_opt_poncage || 1.50) });
                        if (vol.pur_protection) items.push({ desc: T.protection, qty: surface, unit: 'm²', price: parseFloat(p.pur_opt_protection || 1.50) });
                        
                        const purDiscountPct = parseFloat(p.pur_discount_pct || 0);
                        if (purDiscountPct > 0) {
                            let totalPurGross = items
                                .filter(item => item.desc?.includes('PUR') || item.desc === T.aspiration || item.desc === T.nivellement || item.desc === T.poncage || item.desc === T.protection)
                                .reduce((sum, item) => sum + (item.qty * item.price), 0);
                            
                            items.push({
                                desc: `Remise PUR (${purDiscountPct}%)`,
                                qty: 1,
                                unit: T.forfait,
                                price: -(totalPurGross * purDiscountPct / 100)
                            });
                        }
                    } else if (/isolation\s*eps/i.test(vol.label || '')) {
                        // Section header for Isolation EPS
                        items.push({ isHeader: true, headerLabel: 'ISOLATION EPS' });
                        // ── Isolation EPS ──
                        const epsVol = parseFloat(vol.volume_m3 || (surface * parseFloat(vol.thickness || 1) / 100));
                        const tiers = wo.prices?.eps_volume_thresholds || [
                            { max_m3: 10, price_flat: 1495 }, { max_m3: 20, price_per_m3: 160 },
                            { max_m3: 40, price_per_m3: 155 }, { max_m3: 99999, price_per_m3: 150 }
                        ];
                        let epsPrice = 0;
                        if (wo.prices?.custom_eps_price_flat !== undefined && wo.prices.custom_eps_price_flat !== null && !isNaN(wo.prices.custom_eps_price_flat)) {
                            epsPrice = parseFloat(wo.prices.custom_eps_price_flat);
                        } else if (wo.prices?.custom_eps_price_per_m3 !== undefined && wo.prices.custom_eps_price_per_m3 !== null && !isNaN(wo.prices.custom_eps_price_per_m3)) {
                            epsPrice = epsVol * parseFloat(wo.prices.custom_eps_price_per_m3);
                        } else {
                            for (const tier of tiers) {
                                if (epsVol <= parseFloat(tier.max_m3 || 99999)) {
                                    epsPrice = tier.price_flat ? parseFloat(tier.price_flat) : epsVol * parseFloat(tier.price_per_m3 || 150);
                                    break;
                                }
                            }
                        }
                        items.push({ desc: T.epsBase(epsVol.toFixed(2)), qty: 1, unit: T.forfait, price: epsPrice });
                        
                        const epsDiscountPct = parseFloat(wo.prices?.eps_discount_pct || 0);
                        if (epsDiscountPct > 0) {
                            items.push({
                                desc: `Remise EPS (${epsDiscountPct}%)`,
                                qty: 1,
                                unit: T.forfait,
                                price: -(epsPrice * epsDiscountPct / 100)
                            });
                        }
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
                    
                    items.push({ desc: T.chapeBase(Math.min(thick, stdThick)), qty: surface, unit: 'm²', price: getPrice(wo.prices?.base, surface <= 200 ? pricingSettings?.base_price_sqm : pricingSettings?.base_price_sqm_large, 12.5) });
                    if (extraThick > 0) {
                        let extraRate;
                        if (wo.prices?.extra_large !== undefined && wo.prices?.extra_threshold !== undefined) {
                            extraRate = surface > parseFloat(wo.prices.extra_threshold) ? parseFloat(wo.prices.extra_large) : parseFloat(wo.prices?.extra ?? 1.25);
                        } else {
                            extraRate = getPrice(wo.prices?.extra ?? wo.prices?.extra_thickness_price_per_cm, surface <= 200 ? pricingSettings?.extra_thickness_price_per_cm : pricingSettings?.extra_thickness_price_per_cm_large, 1.25);
                        }
                        items.push({ desc: T.chapeExtra(extraThick), qty: surface, unit: 'm²', price: extraThick * extraRate });
                    }
                    if (wo.has_foil || wo.actual_has_foil) items.push({ desc: T.foil, qty: surface, unit: 'm²', price: getPrice(wo.prices?.foil, pricingSettings?.plastic_foil_price_sqm, 1.2) });
                    if (wo.has_mesh || wo.actual_has_mesh) items.push({ desc: T.mesh, qty: surface, unit: 'm²', price: getPrice(wo.prices?.mesh, pricingSettings?.metal_mesh_price_sqm, 2.5) });
                    if (wo.has_fiber || wo.actual_has_fiber || wo.has_duramint || wo.actual_has_duramint) items.push({ desc: T.fiber, qty: surface, unit: 'm²', price: getPrice(wo.prices?.fiber, surface <= 200 ? pricingSettings?.fiber_price_sqm : pricingSettings?.fiber_price_sqm_large, surface <= 200 ? 2.5 : 2.0) });
                }
            }
            if (items.length === 0) {
                items.push({ desc: wo.title || T.travaux, qty: 1, unit: T.forfait, price: parseFloat(wo.estimated_price?.replace(/[^0-9.]/g, '') || '0') })
            }
        }
        
        // Add Transport (Frais de déplacement)
        let truckCost = parseFloat(wo.prices?.truck_cost || 0);
        
        // Regulă strictă: Folosim EXCLUSIV distanța unică (one-way) calculată la crearea devizului
        const actualDistKm = parseFloat(wo.prices?.distance_km || 0);
        if (truckCost <= 0 && pricingSettings && actualDistKm > 0) {
            const truckFlat = parseFloat(pricingSettings.truck_extra_price_flat || 0);
            const distThreshold = parseFloat(pricingSettings.truck_distance_threshold_km || 50);
            const surfThreshold = parseFloat(pricingSettings.truck_surface_threshold_free_sqm || 500);
            const totalSurface = parseFloat(wo.volumes?.[0]?.quantity || wo.surface_m2 || 0);
            if (truckFlat > 0 && actualDistKm > distThreshold && totalSurface <= surfThreshold) {
                truckCost = truckFlat;
            }
        }
        if (truckCost > 0) {
            items.push({
                desc: `Transport${actualDistKm > 0 ? ` (${Math.round(actualDistKm)} km)` : ''}`,
                qty: 1,
                unit: T.forfait,
                price: truckCost
            });
        }
        
        return items
    }

    const items = buildItems()
    
    // Calcul seuil de surface (Forfait)
    let forfaitItem = null;
    const surfCheck = parseFloat(wo.volumes?.[0]?.quantity || wo.surface_m2 || 0);
    
    if (wo.prices?.custom_threshold !== undefined && wo.prices?.custom_threshold !== null && wo.prices?.custom_threshold !== '') {
        const charge = parseFloat(wo.prices.custom_threshold) || 0;
        if (charge > 0) {
            forfaitItem = {
                desc: t('devis.flat_rate', 'Forfait'),
                qty: 1,
                unit: t('devis.flat_rate_unit', 'Forfait'),
                price: charge
            };
        }
    } else if (wo.prices?.surface_thresholds && Array.isArray(wo.prices.surface_thresholds)) {
        const match = wo.prices.surface_thresholds.find(thresh => {
            const minS = parseFloat(thresh.min_sqm || 0);
            const maxS = parseFloat(thresh.max_sqm || 999999);
            return surfCheck >= minS && surfCheck <= maxS;
        });
        if (match) {
            const charge = parseFloat(match.extra_charge || 0);
            if (charge > 0) {
                forfaitItem = {
                    desc: t('devis.flat_rate', 'Forfait'),
                    qty: 1,
                    unit: t('devis.flat_rate_unit', 'Forfait'),
                    price: charge
                };
            }
        }
    }

    if (forfaitItem) {
        // Insert right before any non-CHAPE header to keep it in the CHAPE group
        const insertIndex = items.findIndex(item => item.isHeader && item.headerLabel !== 'CHAPE');
        if (insertIndex !== -1) {
            items.splice(insertIndex, 0, forfaitItem);
        } else {
            items.push(forfaitItem);
        }
    }

    const totalNet = items.filter(i => !i.isHeader).reduce((s, i) => s + i.qty * i.price, 0)
    
    const isChapeItem = (desc) => {
        const d = (desc || '').toLowerCase();
        return !d.includes('eps') && !d.includes('pur') && !d.includes('isolation') && !d.includes('ponçage') && !d.includes('aspiration') && !d.includes('nivellement') && !d.includes('protection');
    };
    
    const chapeTotalGross = items.filter(i => !i.isHeader && isChapeItem(i.desc)).reduce((s, i) => s + i.qty * i.price, 0);
    
    const discountPct = parseFloat(wo.prices?.discount_pct || 0)
    const discountAmount = (chapeTotalGross * discountPct) / 100
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
                                <div className="font-bold text-slate-800 break-words">{wo.client_name || '—'}</div>
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
                                {vatEnabled ? (
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

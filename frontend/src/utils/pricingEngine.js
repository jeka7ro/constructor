/**
 * MOTOR UNIC DE CALCUL — Singura Sursă de Adevăr pentru Frontend.
 * 
 * Această funcție alimentează: ecranul (WorkOrderDetail), PDF-ul (ProformaView),
 * devizul client (DevisView), și Analytics.
 * 
 * REGULI:
 * - Toate prețurile vin din pricingSettings (Pagina de Tarife), inclusiv clienți preferențiali
 * - TVA se determină automat: construcție nouă/veche × fizică/juridică
 * - Valoarea 0 EUR este validă (clienți preferențiali) — nu se forțează la etalon
 * - Dacă manual_override este true, nu se recalculează automat
 */

/**
 * Helper: extrage preț din pricing settings cu fallback.
 * Acceptă 0 ca valoare validă (clienți preferențiali).
 */
const getVal = (pricing, key, defaultVal) => {
    if (!pricing) return defaultVal;
    const v = pricing[key];
    if (v !== undefined && v !== null && v !== '') return parseFloat(v);
    return defaultVal;
};

/**
 * Construiește lista completă de itemi și totaluri pentru un work order.
 * 
 * @param {Object} wo - Work Order complet din API (volumes, client_type, work_type, prices etc.)
 * @param {Object} pricingSettings - Tarife din GET /admin/pricing-settings?client_id=...
 * @param {Object} [options] - Opțiuni suplimentare
 * @param {boolean} [options.useInvoiceData] - Dacă true, folosește datele reale (actual_surface_m2 etc.)
 * @returns {{ items: Array, net: number, vatRate: number, vatAmount: number, totalGross: number, breakdown: Object }}
 */
export const buildQuoteItems = (wo, pricingSettings, options = {}) => {
    const woP = wo.prices ? { ...wo.prices } : {};
    
    // Mapare shorthand din online deviz -> full names
    const fieldMap = {
        'base': 'base_price_sqm',
        'base_large': 'base_price_sqm_large',
        'base_threshold': 'base_large_threshold_sqm',
        'extra': 'extra_thickness_price_per_cm',
        'extra_large': 'extra_thickness_price_per_cm_large',
        'extra_threshold': 'extra_thickness_large_threshold_sqm',
        'standard_thickness': 'standard_thickness_cm',
        'foil': 'plastic_foil_price_sqm',
        'mesh': 'metal_mesh_price_sqm',
        'fiber': 'fiber_price_sqm',
        'fiber_large': 'fiber_price_sqm_large',
        'fiber_threshold': 'fiber_large_threshold_sqm',
    };
    for (const [short, full] of Object.entries(fieldMap)) {
        if (woP[short] !== undefined && woP[full] === undefined) {
            woP[full] = woP[short];
        }
    }

    // Sursa Universală de Adevăr: Prioritate snapshot (woP), fallback la etalon (pricingSettings)
    const ps = { ...(pricingSettings || {}) };
    for (const key in woP) {
        if (woP[key] !== undefined && woP[key] !== null && woP[key] !== '') {
            ps[key] = woP[key];
        }
    }
    
    // ── Mapare câmpuri pricing settings → format intern ──
    const baseRate = getVal(ps, 'base_price_sqm', 12.5);
    const baseLargeRate = getVal(ps, 'base_price_sqm_large', baseRate);
    const baseLargeThreshold = getVal(ps, 'base_large_threshold_sqm', 200);
    const standardThickness = getVal(ps, 'standard_thickness_cm', 5);
    const extraRate = getVal(ps, 'extra_thickness_price_per_cm', 1.25);
    const extraLargeRate = getVal(ps, 'extra_thickness_price_per_cm_large', extraRate);
    const extraLargeThreshold = getVal(ps, 'extra_thickness_large_threshold_sqm', 200);
    const foilRate = getVal(ps, 'plastic_foil_price_sqm', 1.2);
    const meshRate = getVal(ps, 'metal_mesh_price_sqm', 2.5);
    const fiberRate = getVal(ps, 'fiber_price_sqm', 2.5);
    const fiberLargeRate = getVal(ps, 'fiber_price_sqm_large', fiberRate);
    const fiberLargeThreshold = getVal(ps, 'fiber_large_threshold_sqm', 200);
    
    // ── Iterez volumes[] ──
    const volumes = wo.volumes || [];
    let totalChapeSurface = 0;
    let chapeCount = 0;
    let purCount = 0;
    let epsCount = 0;
    
    // Prima trecere: calculez suprafața totală de chape (pentru threshold-uri) și număr tipurile
    volumes.forEach(vol => {
        const label = (vol.label || '');
        const labelNorm = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const isPUR = /isolation\s*pur/i.test(labelNorm);
        const isEPS = /isolation\s*eps/i.test(labelNorm);
        const isChape = /chape|[s\u0219\u015f]ap[a\u0103\u00e2]/i.test(label) || (!isPUR && !isEPS && label);
        if (isChape) {
            totalChapeSurface += parseFloat(vol.quantity || 0);
            chapeCount++;
        } else if (isPUR) {
            purCount++;
        } else if (isEPS) {
            epsCount++;
        }
    });
    
    // A doua trecere: construiesc items pe categorii (Chape, Isolation, etc.)
    let chapeIdx = 0;
    let purIdx = 0;
    let epsIdx = 0;

    const chapeItems = [];
    const isolationItems = [];
    const otherItems = [];

    volumes.forEach((vol, idx) => {
        const label = vol.label || '';
        const labelNorm = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const surface = parseFloat(vol.quantity || 0);
        const thickness = parseFloat(vol.thickness || 0);
        
        if (surface <= 0) return;
        
        const isPUR = /isolation\s*pur/i.test(labelNorm);
        const isEPS = /isolation\s*eps/i.test(labelNorm);
        const isChape = /chape|[s\u0219\u015f]ap[a\u0103\u00e2]/i.test(label) || (!isPUR && !isEPS && label);
        
        if (isChape) {
            chapeIdx++;
            const chapeLabel = chapeCount > 1 ? `Chape ${chapeIdx}` : `Chape`;
            // ── CHAPE ──
            const effectiveBaseRate = totalChapeSurface > baseLargeThreshold ? baseLargeRate : baseRate;
            const effectiveExtraRate = totalChapeSurface > extraLargeThreshold ? extraLargeRate : extraRate;
            const effectiveFiberRate = totalChapeSurface > fiberLargeThreshold ? fiberLargeRate : fiberRate;
            const extraThick = Math.max(0, thickness - standardThickness);
            
            chapeItems.push({ 
                id: `chape_base_${idx}`, 
                type: 'chape', 
                desc: `${chapeLabel} - Base`, 
                qty: surface, 
                unit: 'm²', 
                price: effectiveBaseRate,
                thickness: thickness,
                chapeIndex: chapeIdx,
                isMultipleChape: chapeCount > 1
            });
            
            if (extraThick > 0) {
                chapeItems.push({ 
                    id: `chape_extra_${idx}`, 
                    type: 'chape', 
                    desc: `${chapeLabel} - Épaisseur Extra (${extraThick} cm)`, 
                    qty: surface, 
                    unit: 'm²', 
                    price: extraThick * effectiveExtraRate,
                    chapeIndex: chapeIdx,
                    isMultipleChape: chapeCount > 1
                });
            }
            if (vol.has_foil) {
                chapeItems.push({ 
                    id: `chape_foil_${idx}`, 
                    type: 'chape', 
                    desc: chapeCount > 1 ? `Feuille de plastique (${chapeLabel})` : `Feuille de plastique (Visqueen)`, 
                    qty: surface, 
                    unit: 'm²', 
                    price: foilRate,
                    chapeIndex: chapeIdx
                });
            }
            if (vol.has_mesh) {
                chapeItems.push({ 
                    id: `chape_mesh_${idx}`, 
                    type: 'chape', 
                    desc: chapeCount > 1 ? `Armature (Paillasse - ${chapeLabel})` : `Armature (Paillasse)`, 
                    qty: surface, 
                    unit: 'm²', 
                    price: meshRate,
                    chapeIndex: chapeIdx
                });
            }
            if (vol.has_fiber || vol.has_duramint) {
                chapeItems.push({ 
                    id: `chape_fiber_${idx}`, 
                    type: 'chape', 
                    desc: chapeCount > 1 ? `Fibre / Duramint (${chapeLabel})` : `Fibre / Duramint`, 
                    qty: surface, 
                    unit: 'm²', 
                    price: effectiveFiberRate,
                    chapeIndex: chapeIdx
                });
            }
            
        } else if (isPUR) {
            purIdx++;
            const purLabel = purCount > 1 ? `Isolation PUR ${purIdx}` : `Isolation PUR`;
            let purBase = getVal(ps, 'pur_base_price_3cm', 13.95);
            if (thickness > 3 && thickness <= 10) {
                purBase += (thickness - 3) * getVal(ps, 'pur_step_price_up_to_10cm', 1.65);
            } else if (thickness > 10) {
                purBase += 7 * getVal(ps, 'pur_step_price_up_to_10cm', 1.65);
                purBase += (thickness - 10) * getVal(ps, 'pur_extra_price_above_10cm', 2.10);
            }
            if (surface > 100) {
                purBase += Math.floor((surface - 100) / 100) * getVal(ps, 'pur_surface_discount_step', -0.50);
            }
            purBase = Math.max(0, purBase);
            
            isolationItems.push({ 
                id: `pur_base_${idx}`, 
                type: 'pur', 
                desc: `${purLabel} (${thickness} cm)`, 
                qty: surface, 
                unit: 'm²', 
                price: purBase,
                purIndex: purIdx,
                isMultiplePur: purCount > 1
            });
            
            if (vol.pur_aspiration) isolationItems.push({ id: `pur_aspiration_${idx}`, type: 'pur', desc: purCount > 1 ? `Aspiration (${purLabel})` : `Aspiration`, qty: surface, unit: 'm²', price: getVal(ps, 'pur_opt_aspiration', 2.00) });
            if (vol.pur_niveller) isolationItems.push({ id: `pur_niveller_${idx}`, type: 'pur', desc: purCount > 1 ? `Nivellement au laser (${purLabel})` : `Nivellement au laser`, qty: surface, unit: 'm²', price: getVal(ps, 'pur_opt_niveller', 4.25) });
            if (vol.pur_poncage) isolationItems.push({ id: `pur_poncage_${idx}`, type: 'pur', desc: purCount > 1 ? `Pon\u00e7age de la mousse (${purLabel})` : `Pon\u00e7age de la mousse`, qty: surface, unit: 'm²', price: getVal(ps, 'pur_opt_poncage', 1.50) });
            if (vol.pur_protection) isolationItems.push({ id: `pur_protection_${idx}`, type: 'pur', desc: purCount > 1 ? `Protection au-dessus 1M (${purLabel})` : `Protection au-dessus 1M`, qty: surface, unit: 'm²', price: getVal(ps, 'pur_opt_protection', 1.50) });
            
        } else if (isEPS) {
            epsIdx++;
            const epsLabel = epsCount > 1 ? `Isolation EPS ${epsIdx}` : `Isolation EPS`;
            const epsVol = parseFloat(vol.volume_m3 || (surface * (thickness || 1) / 100));
            let epsPrice = 0;
            
            // Prioritate: wo.prices (snapshot per deviz) → pricingSettings (Tarife)
            const woP = wo.prices || {};
            const customFlat = woP.custom_eps_price_flat !== undefined && woP.custom_eps_price_flat !== null
                ? woP.custom_eps_price_flat : ps.custom_eps_price_flat;
            const customPerM3 = woP.custom_eps_price_per_m3 !== undefined && woP.custom_eps_price_per_m3 !== null
                ? woP.custom_eps_price_per_m3 : ps.custom_eps_price_per_m3;
            
            if (customFlat !== undefined && customFlat !== null && customFlat !== '' && !isNaN(customFlat)) {
                epsPrice = parseFloat(customFlat);
            } else if (customPerM3 !== undefined && customPerM3 !== null && customPerM3 !== '' && !isNaN(customPerM3)) {
                epsPrice = epsVol * parseFloat(customPerM3);
            } else {
                const tiers = woP.eps_volume_thresholds || ps.eps_volume_thresholds || [
                    { max_m3: 10, price_flat: 1495 }, { max_m3: 20, price_per_m3: 160 },
                    { max_m3: 40, price_per_m3: 155 }, { max_m3: 99999, price_per_m3: 150 }
                ];
                for (const tier of [...tiers].sort((a, b) => parseFloat(a.max_m3 || 99999) - parseFloat(b.max_m3 || 99999))) {
                    if (epsVol <= parseFloat(tier.max_m3 || 99999)) {
                        if (tier.price_flat !== undefined && tier.price_flat !== null && tier.price_flat !== '') {
                            epsPrice = parseFloat(tier.price_flat);
                        } else {
                            epsPrice = epsVol * parseFloat(tier.price_per_m3 || 150);
                        }
                        break;
                    }
                }
            }

            // Allow custom surface multiplier
            if (woP.custom_eps_price_per_m2 !== undefined && woP.custom_eps_price_per_m2 !== null && woP.custom_eps_price_per_m2 !== '' && !isNaN(woP.custom_eps_price_per_m2)) {
                epsPrice = surface * parseFloat(woP.custom_eps_price_per_m2);
                isolationItems.push({ id: `eps_${idx}`, type: 'eps', desc: `${epsLabel} (${parseFloat(vol.thickness || 1)} cm)`, qty: surface, unit: 'm²', price: parseFloat(woP.custom_eps_price_per_m2), epsIndex: epsIdx, isMultipleEps: epsCount > 1 });
            } else if (ps.custom_eps_price_per_m2 !== undefined && ps.custom_eps_price_per_m2 !== null && ps.custom_eps_price_per_m2 !== '' && !isNaN(ps.custom_eps_price_per_m2) && (woP.custom_eps_price_per_m2 === undefined || woP.custom_eps_price_per_m2 === null)) {
                epsPrice = surface * parseFloat(ps.custom_eps_price_per_m2);
                isolationItems.push({ id: `eps_${idx}`, type: 'eps', desc: `${epsLabel} (${parseFloat(vol.thickness || 1)} cm)`, qty: surface, unit: 'm²', price: parseFloat(ps.custom_eps_price_per_m2), epsIndex: epsIdx, isMultipleEps: epsCount > 1 });
            } else {
                isolationItems.push({ id: `eps_${idx}`, type: 'eps', desc: `${epsLabel} (${surface} m², ${parseFloat(vol.thickness || 1)} cm)`, qty: 1, unit: 'forfait', price: epsPrice, epsIndex: epsIdx, isMultipleEps: epsCount > 1 });
            }
        } else {
            otherItems.push({ id: `vol_${idx}`, type: 'other', desc: label || `Volume ${idx + 1}`, qty: surface, unit: 'm\u00b2', price: 0 });
        }
    });
    
    // ── Seuil de Surface (Forfait) ──
    // Se adaugă direct în chapeItems (imediat după Fibre / Duramint pentru Chape)
    if (totalChapeSurface > 0) {
        // Prioritate: 1. wo.prices.custom_threshold (override per deviz)
        //             2. wo.prices.surface_thresholds (snapshot salvat la creare)
        //             3. ps.surface_thresholds (din Tarife)
        const woP = wo.prices || {};
        const customThreshold = woP.custom_threshold !== undefined && woP.custom_threshold !== null && woP.custom_threshold !== ''
            ? woP.custom_threshold
            : ps.custom_threshold;
        
        if (customThreshold !== undefined && customThreshold !== null && customThreshold !== '') {
            const charge = parseFloat(customThreshold) || 0;
            if (charge > 0) chapeItems.push({ id: 'threshold', type: 'chape', desc: 'Forfait', qty: 1, unit: 'Forfait', price: charge });
        } else {
            const thresholds = woP.surface_thresholds || ps.surface_thresholds || [];
            thresholds.forEach(thresh => {
                const minS = parseFloat(thresh.min_sqm || 0);
                const maxS = parseFloat(thresh.max_sqm || 999999);
                if (totalChapeSurface >= minS && totalChapeSurface <= maxS) {
                    const charge = parseFloat(thresh.extra_charge || 0);
                    if (charge > 0) chapeItems.push({ id: `threshold_${minS}`, type: 'chape', desc: 'Forfait', qty: 1, unit: 'Forfait', price: charge });
                }
            });
        }
    }

    // ── Transport ──
    const distKm = parseFloat((wo.prices || {}).distance_km || 0);
    let truckCost = parseFloat((wo.prices || {}).truck_cost || 0);
    
    if (truckCost <= 0 && distKm > 0 && totalChapeSurface > 0) {
        const truckFlat = getVal(ps, 'truck_extra_price_flat', 0);
        const distThreshold = getVal(ps, 'truck_distance_threshold_km', 50);
        const surfThreshold = getVal(ps, 'truck_surface_threshold_free_sqm', 500);
        if (truckFlat > 0 && distKm > distThreshold && totalChapeSurface <= surfThreshold) truckCost = truckFlat;
    }
    const transportItems = [];
    if (truckCost > 0) {
        transportItems.push({ id: 'transport', type: 'transport', desc: `Transport${distKm > 0 ? ` (${Math.round(distKm)} km)` : ''}`, qty: 1, unit: 'Forfait', price: truckCost });
    }

    // PUR minimum execution price
    const purGrossBeforeMin = isolationItems.filter(i => i.type === 'pur').reduce((s, i) => s + i.qty * i.price, 0);
    const woDisc = wo.prices || {};
    const purDiscountPct = parseFloat(woDisc.pur_discount_pct !== undefined && woDisc.pur_discount_pct !== null ? woDisc.pur_discount_pct : getVal(ps, 'pur_discount_pct', 0));
    const purDiscount = purGrossBeforeMin * (purDiscountPct / 100);
    const purMinPrice = getVal(ps, 'pur_minimum_execution_price', 1375);
    const purNetBeforeMin = purGrossBeforeMin - purDiscount;
    if (purGrossBeforeMin > 0 && purNetBeforeMin < purMinPrice) {
        isolationItems.push({ id: 'pur_min_adj', type: 'pur', desc: `Ajustement minimum PUR`, qty: 1, unit: 'forfait', price: purMinPrice - purNetBeforeMin });
    }

    // ── Facturare Minimă (Preferențiali) ──
    const minThreshold = getVal(ps, 'min_invoice_threshold_sqm', 0);
    const currentChapeSum = chapeItems.reduce((s, i) => s + i.qty * i.price, 0);
    const currentIsoSum = isolationItems.reduce((s, i) => s + i.qty * i.price, 0);
    const currentTransportSum = transportItems.reduce((s, i) => s + i.qty * i.price, 0);
    const subtotalBeforeMin = currentChapeSum + currentIsoSum + currentTransportSum;
    
    if (minThreshold > 0 && totalChapeSurface > 0) {
        const fixedUnder = getVal(ps, 'min_invoice_fixed_price_under', 0);
        const minOver = getVal(ps, 'min_invoice_min_price_over', 0);
        if (totalChapeSurface <= minThreshold && fixedUnder > 0 && subtotalBeforeMin !== fixedUnder) {
            chapeItems.push({ id: 'min_invoice_adj', type: 'chape', desc: 'Ajustement prix minimum chantier', qty: 1, unit: 'Forfait', price: fixedUnder - subtotalBeforeMin });
        } else if (totalChapeSurface > minThreshold && minOver > 0 && subtotalBeforeMin < minOver) {
            chapeItems.push({ id: 'min_invoice_adj', type: 'chape', desc: 'Ajustement prix minimum chantier', qty: 1, unit: 'Forfait', price: minOver - subtotalBeforeMin });
        }
    }

    // ── Subtotaluri pe categorii ──
    const chapeSubtotal = chapeItems.reduce((s, i) => s + (i.qty * i.price), 0);
    const isolationSubtotal = isolationItems.reduce((s, i) => s + (i.qty * i.price), 0);

    const hasChape = chapeItems.length > 0;
    const hasIsolation = isolationItems.length > 0;
    const shouldShowChapeSubtotal = hasChape && (hasIsolation || chapeCount > 1);
    const shouldShowIsolationSubtotal = hasIsolation && (hasChape || (purCount + epsCount > 1));

    // ── Discounts ──
    const chapeGross = chapeSubtotal + (truckCost > 0 ? truckCost : 0);
    const purGross = isolationItems.filter(i => i.type === 'pur').reduce((s, i) => s + i.qty * i.price, 0);
    const epsGross = isolationItems.filter(i => i.type === 'eps').reduce((s, i) => s + i.qty * i.price, 0);
    
    const globalDiscountPct = parseFloat(woDisc.discount_pct !== undefined && woDisc.discount_pct !== null ? woDisc.discount_pct : getVal(ps, 'discount_pct', 0));
    const epsDiscountPct = parseFloat(woDisc.eps_discount_pct !== undefined && woDisc.eps_discount_pct !== null ? woDisc.eps_discount_pct : getVal(ps, 'eps_discount_pct', 0));

    const chapeDiscount = chapeGross * (globalDiscountPct / 100);
    const epsDiscount = epsGross * (epsDiscountPct / 100);
    
    const discountItems = [];
    if (globalDiscountPct > 0 && chapeDiscount > 0) discountItems.push({ id: 'discount_chape', type: 'discount', desc: `Remise Chape (${globalDiscountPct}%)`, qty: 1, unit: 'forfait', price: -chapeDiscount });
    if (purDiscountPct > 0 && purDiscount > 0) discountItems.push({ id: 'discount_pur', type: 'discount', desc: `Remise PUR (${purDiscountPct}%)`, qty: 1, unit: 'forfait', price: -purDiscount });
    if (epsDiscountPct > 0 && epsDiscount > 0) discountItems.push({ id: 'discount_eps', type: 'discount', desc: `Remise EPS (${epsDiscountPct}%)`, qty: 1, unit: 'forfait', price: -epsDiscount });

    // ── Asamblare Items Finale ──
    const items = [
        ...(shouldShowChapeSubtotal ? [{ id: 'header_chape', isHeader: true, category: 'chape', headerLabel: 'Chape' }] : []),
        ...chapeItems,
        ...(shouldShowChapeSubtotal ? [{ id: 'subtotal_chape', isSubtotal: true, category: 'chape', subtotalLabel: 'Sous-total Chape', subtotalAmount: chapeSubtotal, qty: 0, price: 0 }] : []),
        ...(shouldShowIsolationSubtotal ? [{ id: 'header_isolation', isHeader: true, category: 'isolation', headerLabel: 'Isolation' }] : []),
        ...isolationItems,
        ...(shouldShowIsolationSubtotal ? [{ id: 'subtotal_isolation', isSubtotal: true, category: 'isolation', subtotalLabel: 'Sous-total Isolation', subtotalAmount: isolationSubtotal, qty: 0, price: 0 }] : []),
        ...otherItems,
        ...transportItems,
        ...discountItems
    ];

    // ── NET ──
    const net = items.reduce((s, i) => (i.isHeader || i.isSubtotal) ? s : s + i.qty * i.price, 0);
    
    // ── TVA ──
    const clientType = wo.client_type || 'fizica';
    const workType = wo.work_type || 'new';
    let vatRate = 21;
    
    if ((wo.prices || {}).vat_type !== undefined) {
        vatRate = parseFloat(wo.prices.vat_type);
    } else if (clientType === 'juridica') {
        vatRate = getVal(ps, 'vat_legal_entity', 0);
    } else {
        vatRate = workType === 'repair' ? getVal(ps, 'vat_physical_repair', 6) : getVal(ps, 'vat_physical_new', 21);
    }
    
    const useVat = (wo.prices || {}).useVat !== false;
    const effectiveVatRate = useVat ? vatRate : 0;
    const vatAmount = net * (effectiveVatRate / 100);
    
    return {
        items,
        net,
        vatRate: effectiveVatRate,
        vatAmount,
        totalGross: net + vatAmount,
        breakdown: { chapeGross, purGross, epsGross, globalDiscountPct, chapeDiscount, purDiscountPct, purDiscount, epsDiscountPct, epsDiscount, truckCost, distKm, totalChapeSurface }
    };
};

/**
 * Helper: extrage preț cu fallback.
 * Acceptă 0 ca valoare validă (clienți preferențiali).
 */
export const getPrice = (woPrice, etalonPrice, defaultPrice) => {
    if (woPrice !== undefined && woPrice !== null && woPrice !== '') return parseFloat(woPrice);
    if (etalonPrice !== undefined && etalonPrice !== null && etalonPrice !== '') return parseFloat(etalonPrice);
    return defaultPrice;
};

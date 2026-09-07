/**
 * SURSĂ UNICĂ DE CALCUL — buildQuoteItems()
 * 
 * Toate componentele (DevisView, ProformaView, QuotesManagement, WorkOrderDetail)
 * importă ACEASTĂ funcție. Zero duplicare.
 * 
 * Prețurile vin din wo.prices (copiate din Pagina de Tarife la crearea devizului).
 * pricingSettings e folosit DOAR ca fallback dacă wo.prices nu are un câmp.
 */

// Helper: ia prețul din wo.prices, fallback la pricingSettings, apoi default
const getPrice = (woPrice, psPrice, fallback) => {
    if (woPrice !== undefined && woPrice !== null && woPrice !== '') return parseFloat(woPrice);
    if (psPrice !== undefined && psPrice !== null && psPrice !== '') return parseFloat(psPrice);
    return fallback;
};

/**
 * Construiește lista completă de items[] pentru un deviz/factură
 * 
 * @param {Object} wo - WorkOrder complet (cu volumes, prices, route_distance_km etc.)
 * @param {Object} pricingSettings - Setările globale din pagina de Tarife (fallback)
 * @param {Object} options - { lang: 'fr', isInvoice: false }
 * @returns {{ items: Array, totalNet: number, discountPct: number, discountAmount: number, 
 *             netAfterDiscount: number, vatRate: number, vatAmount: number, totalGross: number }}
 */
export function buildQuoteItems(wo, pricingSettings, options = {}) {
    const p = wo.prices || {};
    const chapeItems = [];
    const isolationItems = [];
    const genericItems = [];
    let chapeCount = 0;
    let purCount = 0;
    let epsCount = 0;
    
    // ── VOLUMES → ITEMS ──────────────────────────────────────────────────────
    if (wo.volumes && wo.volumes.length > 0) {
        wo.volumes.forEach((vol) => {
            const labelLower = (vol.label || '').toLowerCase();
            const isChape = labelLower.includes('sapa') || /[sșş]ap[aăâ]/i.test(vol.label || '') || /chape/i.test(vol.label || '');
            const surface = parseFloat(vol.quantity || 0);
            const thick = parseFloat(vol.thickness || 0);
            
            if (surface <= 0) return;
            
            if (isChape) {
                chapeCount++;
                const stdThick = parseFloat(p.standard_thickness || 5);
                const extraThick = Math.max(0, thick - stdThick);
                
                // Base
                chapeItems.push({
                    id: 'chape_base', isChape: true,
                    desc: `Pose de chape ${Math.min(thick, stdThick)} cm`,
                    qty: surface, unit: 'm²',
                    price: getPrice(p.base, pricingSettings?.base_price_sqm, 12.5)
                });
                
                // Extra grosime — logica identică cu computeChapeTotal
                if (extraThick > 0) {
                    let extraRate;
                    if (p.extra_large !== undefined && p.extra_threshold !== undefined) {
                        extraRate = surface > parseFloat(p.extra_threshold)
                            ? parseFloat(p.extra_large)
                            : parseFloat(p.extra || 1.25);
                    } else {
                        extraRate = getPrice(
                            p.extra ?? p.extra_thickness_price_per_cm,
                            surface <= 200 ? pricingSettings?.extra_thickness_price_per_cm : pricingSettings?.extra_thickness_price_per_cm_large,
                            1.25
                        );
                    }
                    chapeItems.push({
                        id: 'chape_extra', isChape: true,
                        desc: `Épaisseur supplémentaire (${extraThick} cm)`,
                        qty: surface, unit: 'm²',
                        price: extraThick * extraRate
                    });
                }
                
                // Folie
                if (vol.has_foil) {
                    chapeItems.push({
                        id: 'foil', isChape: true,
                        desc: 'Feuille de plastique (Visqueen)',
                        qty: surface, unit: 'm²',
                        price: getPrice(p.foil, pricingSettings?.plastic_foil_price_sqm, 1.2)
                    });
                }
                
                // Plasa metalica
                if (vol.has_mesh) {
                    chapeItems.push({
                        id: 'mesh', isChape: true,
                        desc: 'Armature (Paillasse)',
                        qty: surface, unit: 'm²',
                        price: getPrice(p.mesh, pricingSettings?.metal_mesh_price_sqm, 2.5)
                    });
                }
                
                // Fibra + Duramint
                if (vol.has_fiber || vol.has_duramint) {
                    let fiberRate;
                    if (p.fiber_large !== undefined && p.fiber_threshold !== undefined) {
                        fiberRate = surface > parseFloat(p.fiber_threshold) ? parseFloat(p.fiber_large) : parseFloat(p.fiber || 2.5);
                    } else {
                        fiberRate = getPrice(p.fiber, surface <= 200 ? pricingSettings?.fiber_price_sqm : pricingSettings?.fiber_price_sqm_large, surface <= 200 ? 2.5 : 2.0);
                    }
                    chapeItems.push({
                        id: 'fiber', isChape: true,
                        desc: 'Fibre + Duramint',
                        qty: surface, unit: 'm²',
                        price: fiberRate
                    });
                }
                
            } else if (/isolation\s*pur/i.test(vol.label || '')) {
                purCount++;
                // ── ISOLATION PUR ──
                const purThick = parseFloat(vol.thickness || 3);
                let purBase = parseFloat(p.pur_base_price_3cm || 13.95);
                if (purThick > 3 && purThick <= 10) {
                    purBase += (purThick - 3) * parseFloat(p.pur_step_price_up_to_10cm || 1.65);
                } else if (purThick > 10) {
                    purBase += 7 * parseFloat(p.pur_step_price_up_to_10cm || 1.65);
                    purBase += (purThick - 10) * parseFloat(p.pur_extra_price_above_10cm || 2.10);
                }
                if (surface > 100) {
                    purBase += Math.floor((surface - 100) / 100) * parseFloat(p.pur_surface_discount_step || -0.50);
                }
                purBase = Math.max(0, purBase);
                
                isolationItems.push({ id: 'pur_base', desc: `Isolation PUR ${purThick} cm`, qty: surface, unit: 'm²', price: purBase });
                if (vol.pur_aspiration) isolationItems.push({ id: 'pur_aspiration', desc: 'Aspiration', qty: surface, unit: 'm²', price: parseFloat(p.pur_opt_aspiration || 2.00) });
                if (vol.pur_niveller) isolationItems.push({ id: 'pur_niveller', desc: 'Nivellement au laser', qty: surface, unit: 'm²', price: parseFloat(p.pur_opt_niveller || 4.25) });
                if (vol.pur_poncage) isolationItems.push({ id: 'pur_poncage', desc: 'Ponçage', qty: surface, unit: 'm²', price: parseFloat(p.pur_opt_poncage || 1.50) });
                if (vol.pur_protection) isolationItems.push({ id: 'pur_protection', desc: 'Protection', qty: surface, unit: 'm²', price: parseFloat(p.pur_opt_protection || 1.50) });
                
                const purDiscountPct = parseFloat(p.pur_discount_pct || 0);
                if (purDiscountPct > 0) {
                    const totalPurGross = isolationItems
                        .filter(i => i.id?.startsWith('pur_'))
                        .reduce((sum, i) => sum + (i.qty * i.price), 0);
                    isolationItems.push({ id: 'pur_discount', desc: `Remise PUR (${purDiscountPct}%)`, qty: 1, unit: 'Forfait', price: -(totalPurGross * purDiscountPct / 100) });
                }
                
            } else if (/isolation\s*eps/i.test(vol.label || '')) {
                epsCount++;
                // ── ISOLATION EPS ──
                const epsVol = parseFloat(vol.volume_m3 || (surface * parseFloat(vol.thickness || 1) / 100));
                let epsPrice = 0;
                
                if (p.custom_eps_price_flat != null && p.custom_eps_price_flat !== '' && !isNaN(p.custom_eps_price_flat)) {
                    epsPrice = parseFloat(p.custom_eps_price_flat);
                } else if (p.custom_eps_price_per_m3 != null && p.custom_eps_price_per_m3 !== '' && !isNaN(p.custom_eps_price_per_m3)) {
                    epsPrice = epsVol * parseFloat(p.custom_eps_price_per_m3);
                } else {
                    const tiers = p.eps_volume_thresholds || [
                        { max_m3: 10, price_flat: 1495 }, { max_m3: 20, price_per_m3: 160 },
                        { max_m3: 40, price_per_m3: 155 }, { max_m3: 99999, price_per_m3: 150 }
                    ];
                    for (const tier of tiers) {
                        if (epsVol <= parseFloat(tier.max_m3 || 99999)) {
                            epsPrice = tier.price_flat ? parseFloat(tier.price_flat) : epsVol * parseFloat(tier.price_per_m3 || 150);
                            break;
                        }
                    }
                }
                
                // Allow custom surface multiplier
                if (p.custom_eps_price_per_m2 != null && p.custom_eps_price_per_m2 !== '' && !isNaN(p.custom_eps_price_per_m2)) {
                    epsPrice = surface * parseFloat(p.custom_eps_price_per_m2);
                    isolationItems.push({ id: 'eps_base', desc: `Isolation EPS (${parseFloat(vol.thickness || 1)} cm)`, qty: surface, unit: 'm²', price: parseFloat(p.custom_eps_price_per_m2) });
                } else {
                    isolationItems.push({ id: 'eps_base', desc: `Isolation EPS (${surface} m², ${parseFloat(vol.thickness || 1)} cm)`, qty: 1, unit: 'Forfait', price: epsPrice });
                }
                
                const epsDiscountPct = parseFloat(p.eps_discount_pct || 0);
                if (epsDiscountPct > 0) {
                    isolationItems.push({ id: 'eps_discount', desc: `Remise EPS (${epsDiscountPct}%)`, qty: 1, unit: 'Forfait', price: -(epsPrice * epsDiscountPct / 100) });
                }
                
            } else {
                // Volum generic
                genericItems.push({ id: 'generic', desc: vol.label || 'Volume', qty: surface, unit: 'm²', price: parseFloat(wo.estimated_price || 0) / (surface || 1) });
            }
        });
    }
    
    // ── SEUIL DE SURFACE (Forfait) ──
    // Se adaugă direct în chapeItems (imediat după Fibre / Duramint)
    const surfCheck = parseFloat(wo.volumes?.[0]?.quantity || wo.surface_m2 || 0);
    let thresholdCharge = 0;
    
    if (p.custom_threshold !== undefined && p.custom_threshold !== null && p.custom_threshold !== '') {
        thresholdCharge = parseFloat(p.custom_threshold) || 0;
    } else {
        const thresholds = (p.surface_thresholds && Array.isArray(p.surface_thresholds))
            ? p.surface_thresholds
            : (pricingSettings?.surface_thresholds && Array.isArray(pricingSettings.surface_thresholds) ? pricingSettings.surface_thresholds : null);
        if (thresholds) {
            const match = thresholds.find(t =>
                surfCheck >= parseFloat(t.min_sqm || 0) && surfCheck <= parseFloat(t.max_sqm || 999999)
            );
            if (match) thresholdCharge = parseFloat(match.extra_charge || 0);
        }
    }
    
    if (thresholdCharge > 0) {
        chapeItems.push({ id: 'threshold', isChape: true, desc: 'Forfait', qty: 1, unit: 'Forfait', price: thresholdCharge });
    }
    
    // ── TRANSPORT ─────────────────────────────────────────────────────────────
    let truckCost = parseFloat(p.truck_cost || 0);
    const distKm = parseFloat(p.distance_km || 0);
    
    if (truckCost <= 0 && pricingSettings && distKm > 0) {
        const truckFlat = parseFloat(pricingSettings.truck_extra_price_flat || 0);
        const distThreshold = parseFloat(pricingSettings.truck_distance_threshold_km || 50);
        const surfThreshold = parseFloat(pricingSettings.truck_surface_threshold_free_sqm || 500);
        
        if (truckFlat > 0 && distKm > distThreshold && surfCheck <= surfThreshold) {
            truckCost = truckFlat;
        }
    }
    
    const transportItems = [];
    if (truckCost > 0) {
        transportItems.push({
            id: 'transport', isChape: true,
            desc: `Transport${distKm > 0 ? ` (${Math.round(distKm)} km)` : ''}`,
            qty: 1, unit: 'Forfait',
            price: truckCost
        });
    }

    // ── Subtotaluri pe categorii ──
    const chapeSubtotal = chapeItems.reduce((s, i) => s + (i.qty * i.price), 0);
    const isolationSubtotal = isolationItems.reduce((s, i) => s + (i.qty * i.price), 0);

    const hasChape = chapeItems.length > 0;
    const hasIsolation = isolationItems.length > 0;
    const shouldShowChapeSubtotal = hasChape && (hasIsolation || chapeCount > 1);
    const shouldShowIsolationSubtotal = hasIsolation && (hasChape || (purCount + epsCount > 1));

    // ── FACTURARE MINIMĂ (Preferențiali) ──────────────────────────────────────
    const currentTotalNetForMin = chapeSubtotal + isolationSubtotal + (truckCost > 0 ? truckCost : 0) + genericItems.reduce((s, i) => s + i.qty * i.price, 0);
    const minThreshold = parseFloat(p.min_invoice_threshold_sqm || 0);
    const minAdjItems = [];
    
    if (minThreshold > 0) {
        const fixedUnder = parseFloat(p.min_invoice_fixed_price_under || 0);
        const minOver = parseFloat(p.min_invoice_min_price_over || 0);
        
        if (surfCheck <= minThreshold && fixedUnder > 0) {
            if (currentTotalNetForMin !== fixedUnder) {
                minAdjItems.push({
                    id: 'min_invoice_adj',
                    isChape: true,
                    desc: 'Ajustare preț minim șantier',
                    qty: 1,
                    unit: 'Forfait',
                    price: fixedUnder - currentTotalNetForMin
                });
            }
        } else if (surfCheck > minThreshold && minOver > 0) {
            if (currentTotalNetForMin < minOver) {
                minAdjItems.push({
                    id: 'min_invoice_adj',
                    isChape: true,
                    desc: 'Ajustare preț minim șantier',
                    qty: 1,
                    unit: 'Forfait',
                    price: minOver - currentTotalNetForMin
                });
            }
        }
    }

    const items = [
        ...(shouldShowChapeSubtotal ? [{ id: 'header_chape', isHeader: true, category: 'chape', headerLabel: 'Chape' }] : []),
        ...chapeItems,
        ...(shouldShowChapeSubtotal ? [{ id: 'subtotal_chape', isSubtotal: true, category: 'chape', subtotalLabel: 'Sous-total Chape', subtotalAmount: chapeSubtotal, qty: 0, price: 0 }] : []),
        ...(shouldShowIsolationSubtotal ? [{ id: 'header_isolation', isHeader: true, category: 'isolation', headerLabel: 'Isolation' }] : []),
        ...isolationItems,
        ...(shouldShowIsolationSubtotal ? [{ id: 'subtotal_isolation', isSubtotal: true, category: 'isolation', subtotalLabel: 'Sous-total Isolation', subtotalAmount: isolationSubtotal, qty: 0, price: 0 }] : []),
        ...genericItems,
        ...transportItems,
        ...minAdjItems
    ];
    
    // ── TOTALE ────────────────────────────────────────────────────────────────
    const totalNet = items.reduce((s, i) => {
        if (i.isHeader || i.isSubtotal) return s;
        return s + (i.qty * i.price);
    }, 0);
    
    // Discount: se aplică pe chape items (base+extra+foil+mesh+fiber+threshold+transport)
    // NU pe PUR/EPS — identic cu computeChapeTotal (linia 974 WorkOrderDetail)
    const isChapeItem = (item) => {
        if (item.isHeader || item.isSubtotal) return false;
        const d = (item.desc || '').toLowerCase();
        return !d.includes('eps') && !d.includes('pur') && !d.includes('isolation') &&
               !d.includes('ponçage') && !d.includes('aspiration') && !d.includes('nivellement') && !d.includes('protection');
    };
    
    const chapeTotalGross = items.filter(i => isChapeItem(i)).reduce((s, i) => s + (i.qty * i.price), 0);
    const discountPct = parseFloat(p.discount_pct || 0);
    const discountAmount = (chapeTotalGross * discountPct) / 100;
    const netAfterDiscount = totalNet - discountAmount;
    
    // ── TVA ───────────────────────────────────────────────────────────────────
    let vatRate = 0;
    if (p.useVat !== false) {
        if (p.vat_type !== undefined) {
            vatRate = parseFloat(p.vat_type);
        } else if (wo.client_type === 'pj' || wo.client_type === 'juridica') {
            vatRate = 0;
        } else {
            vatRate = wo.work_type === 'repair' ? 6 : 21;
        }
    }
    
    const vatAmount = netAfterDiscount * (vatRate / 100);
    const totalGross = netAfterDiscount + vatAmount;
    
    return {
        items,
        totalNet,
        chapeTotalGross,
        discountPct,
        discountAmount,
        netAfterDiscount,
        vatRate,
        vatAmount,
        totalGross
    };
}

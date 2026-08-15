import re

with open("frontend/src/pages/admin/WorkOrderDetail.jsx", "r") as f:
    content = f.read()

# We need to find the Calculation Réel section
old_real = """    // Calculation Réel — pe baza datelor introduse de șeful de echipă
    const realSurface   = parseFloat(wo.actual_surface_m2)   || 0;
    const realThickness = parseFloat(wo.actual_thickness_cm) || 0;
    const realChapeFlags = wo.prices?.invoice ? {
        has_foil: wo.prices.invoice.has_foil,
        has_mesh: wo.prices.invoice.has_mesh,
        has_fiber: wo.prices.invoice.has_fiber,
        has_duramint: wo.prices.invoice.has_duramint
    } : chapeFlags;
    const realCalc = hasRealData
        ? computeChapeTotal(realSurface, realThickness, realChapeFlags, wo.prices?.invoice || wo.prices)
        : null;
    const realVat   = realCalc ? realCalc.net * vatRate : 0;
    const realGross = realCalc ? realCalc.net + realVat : 0;"""

new_real = """    // Calculation Réel — pe baza datelor introduse de șeful de echipă
    const realSurface   = parseFloat(wo.actual_surface_m2)   || 0;
    const realThickness = parseFloat(wo.actual_thickness_cm) || 0;
    const realChapeFlags = wo.prices?.invoice ? {
        has_foil: wo.prices.invoice.has_foil,
        has_mesh: wo.prices.invoice.has_mesh,
        has_fiber: wo.prices.invoice.has_fiber,
        has_duramint: wo.prices.invoice.has_duramint
    } : chapeFlags;
    
    let realCalc = null;
    let realPurOpts = { aspiration: 0, niveller: 0, poncage: 0, protection: 0 };
    if (hasRealData) {
        realCalc = { base: 0, extra: 0, foil: 0, mesh: 0, fiber: 0, threshold: 0, truck_cost: 0, discount: 0, net: 0, discountPct: 0, isoPurBase: 0, isoPurOpt: 0, isoEpsBase: 0, purDiscount: 0, purDiscountPct: 0, epsDiscount: 0, epsDiscountPct: 0, extraThick: 0 };
        
        const invoicePrices = { ...(wo.prices || {}), ...(wo.prices?.invoice || {}) };
        
        (wo.volumes || []).forEach(vol => {
            const surface = realSurface > 0 ? realSurface : (parseFloat(vol.quantity) || 0);
            const thickness = realThickness > 0 ? realThickness : (parseFloat(vol.thickness) || 0);
            const labelSafe = (vol.label || '').toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
            
            if (/chape|[sșş]ap[aăâ]/i.test(labelSafe) && surface > 0) {
                const c = computeChapeTotal(surface, thickness, realChapeFlags, invoicePrices);
                realCalc.extraThick = c.extraThick;
                realCalc.base  += c.base;
                realCalc.extra += c.extra;
                realCalc.foil  += c.foil;
                realCalc.mesh  += c.mesh;
                realCalc.fiber += c.fiber;
                realCalc.threshold += c.threshold;
                realCalc.truck_cost += c.truck_cost;
                realCalc.discount += c.discount;
                realCalc.discountPct = c.discountPct;
                realCalc.net   += c.net;
            } else if (/isolation\\s*pur/i.test(labelSafe) && surface > 0) {
                let purBase = parseFloat(invoicePrices.pur_base_price_3cm || 13.95);
                if (isoPurThick > 3 && isoPurThick <= 10) {
                    purBase += (isoPurThick - 3) * parseFloat(invoicePrices.pur_step_price_up_to_10cm || 1.65);
                } else if (isoPurThick > 10) {
                    purBase += 7 * parseFloat(invoicePrices.pur_step_price_up_to_10cm || 1.65);
                    purBase += (isoPurThick - 10) * parseFloat(invoicePrices.pur_extra_price_above_10cm || 2.10);
                }
                if (surface > 100) {
                    purBase += Math.floor((surface - 100) / 100) * parseFloat(invoicePrices.pur_surface_discount_step || -0.50);
                }
                purBase = Math.max(0, purBase);
                const isoPurBaseCost = purBase * surface;
                realCalc.isoPurBase += isoPurBaseCost;
                
                let thisPurTotal = isoPurBaseCost;
                
                if (vol.pur_aspiration) {
                    let cost = parseFloat(invoicePrices.pur_opt_aspiration || 2.00) * surface;
                    realCalc.isoPurOpt += cost;
                    realPurOpts.aspiration += cost;
                    thisPurTotal += cost;
                }
                if (vol.pur_niveller) {
                    let cost = parseFloat(invoicePrices.pur_opt_niveller || 4.25) * surface;
                    realCalc.isoPurOpt += cost;
                    realPurOpts.niveller += cost;
                    thisPurTotal += cost;
                }
                if (vol.pur_poncage) {
                    let cost = parseFloat(invoicePrices.pur_opt_poncage || 1.50) * surface;
                    realCalc.isoPurOpt += cost;
                    realPurOpts.poncage += cost;
                    thisPurTotal += cost;
                }
                if (vol.pur_protection) {
                    let cost = parseFloat(invoicePrices.pur_opt_protection || 1.50) * surface;
                    realCalc.isoPurOpt += cost;
                    realPurOpts.protection += cost;
                    thisPurTotal += cost;
                }
                let purDiscountPct = parseFloat(invoicePrices.pur_discount_pct || 0);
                let netPur = thisPurTotal * (1 - purDiscountPct / 100);
                realCalc.purDiscount = thisPurTotal * (purDiscountPct / 100);
                realCalc.purDiscountPct = purDiscountPct;
                realCalc.net += netPur;
            } else if (/isolation\\s*eps/i.test(labelSafe) && surface > 0) {
                let epsVol = (surface * (thickness || 1)) / 100;
                const epsTiers = invoicePrices.eps_volume_thresholds || [
                    { max_m3: 10, price_flat: 1495 },
                    { max_m3: 20, price_per_m3: 160 },
                    { max_m3: 40, price_per_m3: 155 },
                    { max_m3: 99999, price_per_m3: 150 }
                ];
                let epsPrice = 0;
                for (let tier of epsTiers) {
                    if (epsVol <= parseFloat(tier.max_m3 || 99999)) {
                        if (tier.price_flat) epsPrice = parseFloat(tier.price_flat);
                        else epsPrice = epsVol * parseFloat(tier.price_per_m3 || 150);
                        break;
                    }
                }
                if (invoicePrices.custom_eps_price_flat !== undefined && invoicePrices.custom_eps_price_flat !== null) {
                    epsPrice = parseFloat(invoicePrices.custom_eps_price_flat);
                } else if (invoicePrices.custom_eps_price_per_m3 !== undefined && invoicePrices.custom_eps_price_per_m3 !== null) {
                    epsPrice = epsVol * parseFloat(invoicePrices.custom_eps_price_per_m3);
                }

                realCalc.isoEpsBase += epsPrice;
                let epsDiscountPct = parseFloat(invoicePrices.eps_discount_pct || 0);
                let netEps = epsPrice * (1 - epsDiscountPct / 100);
                realCalc.epsDiscount = epsPrice * (epsDiscountPct / 100);
                realCalc.epsDiscountPct = epsDiscountPct;
                realCalc.net += netEps;
            }
        });
        
        // If there are no volumes at all, fallback to a general calculation
        if ((wo.volumes || []).length === 0 && realSurface > 0) {
            const c = computeChapeTotal(realSurface, realThickness, realChapeFlags, invoicePrices);
            realCalc.extraThick = c.extraThick;
            realCalc.base  += c.base;
            realCalc.extra += c.extra;
            realCalc.foil  += c.foil;
            realCalc.mesh  += c.mesh;
            realCalc.fiber += c.fiber;
            realCalc.threshold += c.threshold;
            realCalc.truck_cost += c.truck_cost;
            realCalc.discount += c.discount;
            realCalc.discountPct = c.discountPct;
            realCalc.net   += c.net;
        }
    }

    const realVat   = realCalc ? realCalc.net * vatRate : 0;
    const realGross = realCalc ? realCalc.net + realVat : 0;"""

content = content.replace(old_real, new_real)

# Now find the rendering logic for realCalc inside the UI and replace it to show PUR/EPS
old_render = """                                    {realCalc.fiber > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                            <span className="font-medium">{t('work_order_detail.invoicing.fiber', 'Fibres / Duramint')}</span>
                                            <span className="text-right tabular-nums">
                                                {realSurface} m² × {(wo.prices?.fiber_large !== undefined ? (realSurface > parseFloat(wo.prices.fiber_threshold) ? parseFloat(wo.prices.fiber_large) : parseFloat(wo.prices.fiber)) : parseFloat(wo.prices?.fiber || 2.5)).toFixed(2)} = <b>{realCalc.fiber.toFixed(2)}&nbsp;EUR</b>
                                            </span>
                                        </div>
                                    )}
                                    {realCalc.threshold > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                                            <span className="font-medium">{t('work_order_detail.invoicing.threshold', 'Forfait')}</span>
                                            <span className="text-right tabular-nums">+ <b>{realCalc.threshold.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realCalc.discount > 0 && (
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                                            <span className="font-medium">{t('work_order_detail.invoicing.discount', 'Remise (Discount)')} ({realCalc.discountPct}%)</span>
                                            <span className="text-right tabular-nums">- <b>{realCalc.discount.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-3" />
                                    <div className="flex justify-between text-base font-black text-slate-900 dark:text-white">"""

new_render = """                                    {realCalc.fiber > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                            <span className="font-medium">{t('work_order_detail.invoicing.fiber', 'Fibres / Duramint')}</span>
                                            <span className="text-right tabular-nums">
                                                {realSurface} m² × {(wo.prices?.fiber_large !== undefined ? (realSurface > parseFloat(wo.prices.fiber_threshold) ? parseFloat(wo.prices.fiber_large) : parseFloat(wo.prices.fiber)) : parseFloat(wo.prices?.fiber || 2.5)).toFixed(2)} = <b>{realCalc.fiber.toFixed(2)}&nbsp;EUR</b>
                                            </span>
                                        </div>
                                    )}
                                    
                                    {realCalc.isoPurBase > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <span className="font-medium">Isolation PUR</span>
                                            <span className="text-right tabular-nums"><b>{realCalc.isoPurBase.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realPurOpts.aspiration > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span className="font-medium">↳ Aspiration</span>
                                            <span className="text-right tabular-nums"><b>{realPurOpts.aspiration.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realPurOpts.niveller > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span className="font-medium">↳ Nivellement au laser</span>
                                            <span className="text-right tabular-nums"><b>{realPurOpts.niveller.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realPurOpts.poncage > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span className="font-medium">↳ Ponçage de la mousse</span>
                                            <span className="text-right tabular-nums"><b>{realPurOpts.poncage.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realPurOpts.protection > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span className="font-medium">↳ Protection au-dessus 1M</span>
                                            <span className="text-right tabular-nums"><b>{realPurOpts.protection.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realCalc.purDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                                            <span className="font-medium">{t('work_order_detail.invoicing.discount_pur', 'Remise PUR')} ({realCalc.purDiscountPct}%)</span>
                                            <span className="text-right tabular-nums">- <b>{realCalc.purDiscount.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realCalc.isoEpsBase > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <span className="font-medium">Isolation EPS</span>
                                            <span className="text-right tabular-nums"><b>{realCalc.isoEpsBase.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realCalc.epsDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                                            <span className="font-medium">{t('work_order_detail.invoicing.discount_eps', 'Remise EPS')} ({realCalc.epsDiscountPct}%)</span>
                                            <span className="text-right tabular-nums">- <b>{realCalc.epsDiscount.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    
                                    {realCalc.threshold > 0 && (
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                                            <span className="font-medium">{t('work_order_detail.invoicing.threshold', 'Forfait')}</span>
                                            <span className="text-right tabular-nums">+ <b>{realCalc.threshold.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realCalc.discount > 0 && (
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                                            <span className="font-medium">{t('work_order_detail.invoicing.discount', 'Remise (Discount)')} ({realCalc.discountPct}%)</span>
                                            <span className="text-right tabular-nums">- <b>{realCalc.discount.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    {realCalc.truck_cost > 0 && (
                                        <div className={`flex justify-between font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 ${realCalc.truck_cost > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                            <span className="font-medium">{t('work_order_detail.invoicing.transport', 'Transport')}</span>
                                            <span className="text-right tabular-nums">{realCalc.truck_cost > 0 ? `+ ` : ''}<b>{realCalc.truck_cost.toFixed(2)}&nbsp;EUR</b></span>
                                        </div>
                                    )}
                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-3" />
                                    <div className="flex justify-between text-base font-black text-slate-900 dark:text-white">"""

content = content.replace(old_render, new_render)

with open("frontend/src/pages/admin/WorkOrderDetail.jsx", "w") as f:
    f.write(content)


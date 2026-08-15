import re

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace newCalc logic
newcalc_pattern = re.compile(r'// Calcul nou estimat\s*const newCalc = computeChapeTotal\(surface, thickness, calcEditForm, newPrices\);', re.DOTALL)

newcalc_replacement = r'''// Calcul nou estimat
            const totalChapeSurface = (calcEditForm.chapes || []).reduce((sum, c) => sum + (parseFloat(c.surface) || 0), 0);
            
            // Compute base totals without threshold and truck cost
            const chapeTotals = (calcEditForm.chapes || []).map(c => {
                return computeChapeTotal(parseFloat(c.surface) || 0, parseFloat(c.thickness) || 0, c, newPrices);
            });
            
            let totalNet = chapeTotals.reduce((sum, c) => sum + (c.base + c.extra + c.foil + c.mesh + c.fiber), 0);
            
            // Re-evaluate threshold & truck cost on TOTAL surface
            let threshold = 0;
            const thresholds = newPrices?.surface_thresholds || [];
            if (newPrices?.custom_threshold !== undefined && newPrices.custom_threshold !== null && newPrices.custom_threshold !== '') {
                threshold = parseFloat(newPrices.custom_threshold) || 0;
            } else if (thresholds.length > 0) {
                const match = thresholds.find(t => totalChapeSurface >= parseFloat(t.min_sqm) && totalChapeSurface <= parseFloat(t.max_sqm));
                if (match) threshold = parseFloat(match.extra_charge) || 0;
            }
            
            let truck_cost = parseFloat(newPrices?.truck_cost || 0);
            const actualDistKm = parseFloat(newPrices?.distance_km || 0);
            
            if (truck_cost <= 0 && pricingSettings && actualDistKm > 0) {
                const truckFlat = parseFloat(pricingSettings.truck_extra_price_flat || 0);
                const distThreshold = parseFloat(pricingSettings.truck_distance_threshold_km || 50);
                const surfThreshold = parseFloat(pricingSettings.truck_surface_threshold_free_sqm || 500);
                if (truckFlat > 0 && actualDistKm > distThreshold && totalChapeSurface <= surfThreshold) {
                    truck_cost = truckFlat;
                }
            }
            
            totalNet += threshold + truck_cost;
            const discountPct = parseFloat(newPrices?.discount_pct || 0);
            totalNet = totalNet - (totalNet * discountPct / 100);
            
            // Also add PUR and EPS to estimated price (rough approx, backend might recalculate)
            // Wait, does estimated_price currently include PUR/EPS?
            // computeChapeTotal only returns Chape total!
            const newCalc = { net: totalNet };'''

content = newcalc_pattern.sub(newcalc_replacement, content)

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("newCalc patched.")

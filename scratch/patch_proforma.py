import re

with open("frontend/src/pages/admin/ProformaView.jsx", "r") as f:
    content = f.read()

old_truck = """        const distKm = parseFloat(activePrices.distance_km || 0);
        const totalSurface = (wo.volumes || []).reduce((sum, v) => {
            const lbl = (v.label || '').toLowerCase();
            if (/chape|sapa|[sșş]ap[aăâ]/i.test(lbl)) return sum + (parseFloat(v.quantity) || 0);
            return sum;
        }, 0);
        if (truckFlat > 0 && distKm > distThreshold && totalSurface <= surfThreshold) {"""

new_truck = """        const distKm = parseFloat(activePrices.distance_km || 0);
        const totalSurface = isInvoiceView && wo.actual_surface_m2 > 0 
            ? parseFloat(wo.actual_surface_m2) 
            : (wo.volumes || []).reduce((sum, v) => {
                const lbl = (v.label || '').toLowerCase();
                if (/chape|sapa|[sșş]ap[aăâ]/i.test(lbl)) return sum + (parseFloat(v.quantity) || 0);
                return sum;
            }, 0);
        if (truckFlat > 0 && distKm > distThreshold && totalSurface <= surfThreshold) {"""

content = content.replace(old_truck, new_truck)

with open("frontend/src/pages/admin/ProformaView.jsx", "w") as f:
    f.write(content)

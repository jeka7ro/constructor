with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

save_old = """    const handleCalcEditSave = async () => {
        if (!calcEditForm) return;
        setCalcEditSaving(true);
        try {
            const surface = parseFloat(calcEditForm.surface) || 0;
            const thickness = parseFloat(calcEditForm.thickness) || 0;
            
            const newPurSurface = parseFloat(calcEditForm.iso_pur_surface) || 0;
            const newPurThickness = parseFloat(calcEditForm.iso_pur_thickness) || 0;
            const newEpsVolume = parseFloat(calcEditForm.iso_eps_m3) || 0;

            const newVolumes = (wo.volumes || []).map(v => {
                const labelSafe = (v.label || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                if (/chape|[sșş]ap[aăâ]/i.test(labelSafe)) {
                    return { ...v, quantity: surface, thickness, has_foil: !!calcEditForm.has_foil, has_mesh: !!calcEditForm.has_mesh, has_fiber: !!calcEditForm.has_fiber, has_duramint: !!calcEditForm.has_duramint };
                }
                if (/isolation\s*pur/i.test(labelSafe)) {
                    return { ...v, quantity: newPurSurface, thickness: newPurThickness };
                }
                if (/isolation\s*eps/i.test(labelSafe)) {
                    return { ...v, quantity: parseFloat(calcEditForm.iso_eps_surface) || 0, eps_surface: parseFloat(calcEditForm.iso_eps_surface) || 0, thickness: parseFloat(calcEditForm.iso_eps_thickness) || 0 };
                }
                return v;
            });
            // Dacă nu există niciun volum Chape, creăm unul
            const hasChapeVol = (wo.volumes || []).some(v => /chape|[sșş]ap[aăâ]/i.test((v.label || '').toLowerCase()));
            if (!hasChapeVol && surface > 0) {
                newVolumes.push({ label: 'Chape', quantity: surface, unit: 'm²', thickness, has_foil: !!calcEditForm.has_foil, has_mesh: !!calcEditForm.has_mesh, has_fiber: !!calcEditForm.has_fiber, has_duramint: !!calcEditForm.has_duramint });
            }
            const newPrices = {"""

save_new = """    const handleCalcEditSave = async () => {
        if (!calcEditForm) return;
        setCalcEditSaving(true);
        try {
            const otherVolumes = (wo.volumes || []).filter(v => {
                const labelSafe = (v.label || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
                return !(/chape|[sșş]ap[aăâ]/i.test(labelSafe)) && 
                       !(/isolation\\s*pur/i.test(labelSafe)) && 
                       !(/isolation\\s*eps/i.test(labelSafe));
            });

            const newVolumes = [
                ...(calcEditForm.chapes || []).filter(c => parseFloat(c.surface) > 0).map(c => ({ label: 'Chape', quantity: parseFloat(c.surface) || 0, unit: 'm²', thickness: parseFloat(c.thickness) || 0, has_foil: !!c.has_foil, has_mesh: !!c.has_mesh, has_fiber: !!c.has_fiber, has_duramint: !!c.has_duramint })),
                ...(calcEditForm.pur_isolations || []).filter(p => parseFloat(p.surface) > 0).map(p => ({ label: 'Isolation PUR', unit: 'm²', quantity: parseFloat(p.surface) || 0, thickness: parseFloat(p.thickness) || 0, pur_aspiration: !!p.pur_aspiration, pur_niveller: !!p.pur_niveller, pur_poncage: !!p.pur_poncage, pur_protection: !!p.pur_protection })),
                ...(calcEditForm.eps_isolations || []).filter(e => parseFloat(e.surface) > 0).map(e => ({ label: 'Isolation EPS', unit: 'm³', quantity: parseFloat(e.surface) || 0, eps_surface: parseFloat(e.surface) || 0, thickness: parseFloat(e.thickness) || 0 })),
                ...otherVolumes
            ];
            const newPrices = {"""

content = content.replace(save_old, save_new)

init_old = """                                                const chapeVol = (wo.volumes || []).find(v => /chape|[sșş]ap[aăâ]/i.test((v.label || '').toLowerCase()));
                                                setCalcEditForm({
                                                    client_type: wo.client_type || (wo.client ? wo.client.client_type : 'fizica'),
                                                    work_type: wo.work_type || 'new',
                                                    surface: chapeVol?.quantity || surfaceForAuto || '',
                                                    thickness: chapeVol?.thickness || '',
                                                    has_foil: chapeVol?.has_foil || false,
                                                    has_mesh: chapeVol?.has_mesh || false,
                                                    has_fiber: chapeVol?.has_fiber || false,
                                                    has_duramint: chapeVol?.has_duramint || false,
                                                    base_price: wo.prices?.base ?? 12.5,
                                                    extra_price: wo.prices?.extra ?? 1.25,
                                                    foil_price: wo.prices?.foil ?? 1.2,
                                                    mesh_price: wo.prices?.mesh ?? 2.5,
                                                    fiber_price: wo.prices?.fiber ?? (surfaceForAuto <= 200 ? 2.5 : 2.0),
                                                    discount_pct: wo.prices?.discount_pct ?? 0,
                                                    custom_threshold: wo.prices?.custom_threshold !== undefined && wo.prices.custom_threshold !== null ? parseFloat(wo.prices.custom_threshold) : '',
                                                    custom_eps_price_flat: wo.prices?.custom_eps_price_flat !== undefined ? parseFloat(wo.prices.custom_eps_price_flat) : '',
                                                    custom_eps_price_per_m3: wo.prices?.custom_eps_price_per_m3 !== undefined ? parseFloat(wo.prices.custom_eps_price_per_m3) : '',
                                                    eps_tier1_flat: wo.prices?.eps_volume_thresholds?.[0]?.price_flat || 1495,
                                                    eps_tier2_m3: wo.prices?.eps_volume_thresholds?.[1]?.price_per_m3 || 160,
                                                    eps_tier3_m3: wo.prices?.eps_volume_thresholds?.[2]?.price_per_m3 || 155,
                                                    eps_tier4_m3: wo.prices?.eps_volume_thresholds?.[3]?.price_per_m3 || 150,
                                                    pur_base_price_3cm: parseFloat(wo.prices?.pur_base_price_3cm || 0),
                                                    pur_step_price_up_to_10cm: parseFloat(wo.prices?.pur_step_price_up_to_10cm || 0),
                                                    pur_extra_price_above_10cm: parseFloat(wo.prices?.pur_extra_price_above_10cm || 0),
                                                    pur_opt_aspiration: parseFloat(wo.prices?.pur_opt_aspiration || 0),
                                                    pur_opt_niveller: parseFloat(wo.prices?.pur_opt_niveller || 0),
                                                    pur_opt_poncage: parseFloat(wo.prices?.pur_opt_poncage || 0),
                                                    pur_opt_protection: parseFloat(wo.prices?.pur_opt_protection || 0),
                                                    pur_discount_pct: parseFloat(wo.prices?.pur_discount_pct || 0),
                                                    eps_discount_pct: parseFloat(wo.prices?.eps_discount_pct || 0),
                                                    
                                                    iso_pur_surface: isoPurSurface || '',
                                                    iso_pur_thickness: isoPurThick || '',
                                                    iso_eps_m3: isoEpsM3 || '',
                                                    iso_eps_surface: isoEpsSurface || '',
                                                    iso_eps_thickness: isoEpsThick || ''
                                                });
                                                setCalcEditTab('chape');"""

init_new = """                                                const allChapes = (wo.volumes || []).filter(v => /chape|[sșş]ap[aăâ]/i.test((v.label || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')));
                                                const allPurs = (wo.volumes || []).filter(v => /isolation\\s*pur/i.test((v.label || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')));
                                                const allEps = (wo.volumes || []).filter(v => /isolation\\s*eps/i.test((v.label || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')));

                                                const chapes = allChapes.length > 0 ? allChapes.map((v, i) => ({
                                                    id: Date.now() + i,
                                                    surface: v.quantity || '',
                                                    thickness: v.thickness || '',
                                                    has_foil: v.has_foil || false,
                                                    has_mesh: v.has_mesh || false,
                                                    has_fiber: v.has_fiber || false,
                                                    has_duramint: v.has_duramint || false
                                                })) : [{ id: Date.now(), surface: surfaceForAuto || '', thickness: '', has_foil: false, has_mesh: false, has_fiber: false, has_duramint: false }];
                                                
                                                const pur_isolations = allPurs.length > 0 ? allPurs.map((v, i) => ({
                                                    id: Date.now() + 1000 + i,
                                                    surface: v.quantity || '',
                                                    thickness: v.thickness || '',
                                                    pur_aspiration: v.pur_aspiration || false,
                                                    pur_niveller: v.pur_niveller || false,
                                                    pur_poncage: v.pur_poncage || false,
                                                    pur_protection: v.pur_protection || false
                                                })) : [];
                                                
                                                const eps_isolations = allEps.length > 0 ? allEps.map((v, i) => ({
                                                    id: Date.now() + 2000 + i,
                                                    surface: v.eps_surface || v.quantity || '',
                                                    thickness: v.thickness || ''
                                                })) : [];

                                                setCalcEditForm({
                                                    client_type: wo.client_type || (wo.client ? wo.client.client_type : 'fizica'),
                                                    work_type: wo.work_type || 'new',
                                                    chapes,
                                                    pur_isolations,
                                                    eps_isolations,
                                                    base_price: wo.prices?.base ?? 12.5,
                                                    extra_price: wo.prices?.extra ?? 1.25,
                                                    foil_price: wo.prices?.foil ?? 1.2,
                                                    mesh_price: wo.prices?.mesh ?? 2.5,
                                                    fiber_price: wo.prices?.fiber ?? (surfaceForAuto <= 200 ? 2.5 : 2.0),
                                                    discount_pct: wo.prices?.discount_pct ?? 0,
                                                    custom_threshold: wo.prices?.custom_threshold !== undefined && wo.prices.custom_threshold !== null ? parseFloat(wo.prices.custom_threshold) : '',
                                                    custom_eps_price_flat: wo.prices?.custom_eps_price_flat !== undefined ? parseFloat(wo.prices.custom_eps_price_flat) : '',
                                                    custom_eps_price_per_m3: wo.prices?.custom_eps_price_per_m3 !== undefined ? parseFloat(wo.prices.custom_eps_price_per_m3) : '',
                                                    eps_tier1_flat: wo.prices?.eps_volume_thresholds?.[0]?.price_flat || 1495,
                                                    eps_tier2_m3: wo.prices?.eps_volume_thresholds?.[1]?.price_per_m3 || 160,
                                                    eps_tier3_m3: wo.prices?.eps_volume_thresholds?.[2]?.price_per_m3 || 155,
                                                    eps_tier4_m3: wo.prices?.eps_volume_thresholds?.[3]?.price_per_m3 || 150,
                                                    pur_base_price_3cm: parseFloat(wo.prices?.pur_base_price_3cm || 0),
                                                    pur_step_price_up_to_10cm: parseFloat(wo.prices?.pur_step_price_up_to_10cm || 0),
                                                    pur_extra_price_above_10cm: parseFloat(wo.prices?.pur_extra_price_above_10cm || 0),
                                                    pur_opt_aspiration: parseFloat(wo.prices?.pur_opt_aspiration || 0),
                                                    pur_opt_niveller: parseFloat(wo.prices?.pur_opt_niveller || 0),
                                                    pur_opt_poncage: parseFloat(wo.prices?.pur_opt_poncage || 0),
                                                    pur_opt_protection: parseFloat(wo.prices?.pur_opt_protection || 0),
                                                    pur_discount_pct: parseFloat(wo.prices?.pur_discount_pct || 0),
                                                    eps_discount_pct: parseFloat(wo.prices?.eps_discount_pct || 0)
                                                });
                                                setCalcEditTab('chape');"""

content = content.replace(init_old, init_new)

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Replaced {len(save_new)} and {len(init_new)} characters")

import re

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'r') as f:
    content = f.read()

# Fix handleCalcEditSave
new_logic = """
            // 1. Păstrăm volumele care NU sunt de izolație și NU sunt șapă (dacă există altele)
            const otherVolumes = (wo.volumes || []).filter(v => {
                const labelSafe = (v.label || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const isChape = /chape|[sșş]ap[aăâ]/i.test(labelSafe);
                const isPur = /isolation\\s*pur/i.test(labelSafe);
                const isEps = /isolation\\s*eps/i.test(labelSafe);
                return !isChape && !isPur && !isEps;
            });

            // 2. Adăugăm chapes modificate
            const modifiedChapes = (calcEditForm.chapes || []).map(c => ({
                label: c.label || 'Șapă',
                quantity: parseFloat(c.surface) || 0,
                unit: 'm²',
                thickness: parseFloat(c.thickness) || 5,
                has_foil: !!c.has_foil,
                has_mesh: !!c.has_mesh,
                has_fiber: !!c.has_fiber,
                has_duramint: !!c.has_duramint
            })).filter(c => c.quantity > 0);

            // 3. Adăugăm PUR
            const modifiedPurs = (calcEditForm.pur_isolations || []).map(p => ({
                label: 'Isolation PUR',
                quantity: parseFloat(p.surface) || 0,
                unit: 'm²',
                thickness: parseFloat(p.thickness) || 3,
                pur_aspiration: !!p.pur_aspiration,
                pur_niveller: !!p.pur_niveller,
                pur_poncage: !!p.pur_poncage,
                pur_protection: !!p.pur_protection
            })).filter(p => p.quantity > 0);

            // 4. Adăugăm EPS
            const modifiedEps = (calcEditForm.eps_isolations || []).map(e => ({
                label: 'Isolation EPS',
                quantity: parseFloat(e.surface) || 0,
                eps_surface: parseFloat(e.surface) || 0,
                unit: 'm²',
                thickness: parseFloat(e.thickness) || 5
            })).filter(e => e.quantity > 0);

            const newVolumes = [...otherVolumes, ...modifiedChapes, ...modifiedPurs, ...modifiedEps];
            
            const totalChapeSurface = (calcEditForm.chapes || []).reduce((sum, c) => sum + (parseFloat(c.surface) || 0), 0);
"""

# Replace newVolumes logic
content = re.sub(
    r'const surface = parseFloat\(calcEditForm\.surface\) \|\| 0;.*?const totalChapeSurface = \(calcEditForm\.chapes \|\| \[\]\)\.reduce\(\(sum, c\) => sum \+ \(parseFloat\(c\.surface\) \|\| 0\), 0\);',
    new_logic,
    content,
    flags=re.DOTALL
)

# Fix setCalcEditForm
content = content.replace(
    "surface: v.quantity || '',",
    "label: v.label || 'Șapă',\n                                                    surface: v.quantity || '',"
)
content = content.replace(
    "has_duramint: v.has_duramint || false\n                                                })) : [{ id: Date.now(), surface: surfaceForAuto || '', thickness: '', has_foil: false, has_mesh: false, has_fiber: false, has_duramint: false }];",
    "has_duramint: v.has_duramint || false\n                                                })) : [{ id: Date.now(), label: 'Șapă', surface: surfaceForAuto || '', thickness: '', has_foil: false, has_mesh: false, has_fiber: false, has_duramint: false }];"
)

# Fix UI live calculation
content = content.replace(
    "{parseFloat(calcEditForm.surface) > 0 && (() => {",
    "{(calcEditForm.chapes || []).reduce((sum, c) => sum + (parseFloat(c.surface) || 0), 0) > 0 && (() => {\n                                const totalChapeSurface = (calcEditForm.chapes || []).reduce((sum, c) => sum + (parseFloat(c.surface) || 0), 0);"
)

# Fix disabled button
content = content.replace(
    "disabled={calcEditSaving || !parseFloat(calcEditForm.surface)}",
    "disabled={calcEditSaving || (calcEditForm.chapes || []).reduce((sum, c) => sum + (parseFloat(c.surface) || 0), 0) === 0}"
)

# Fix liveChapeCalc
content = re.sub(
    r'const liveChapeCalc = computeChapeTotal\([^;]+;',
    r'''const liveChapeCalc = (calcEditForm.chapes || []).map(c => computeChapeTotal(
                                    parseFloat(c.surface) || 0,
                                    parseFloat(c.thickness) || 0,
                                    {
                                        has_foil: !!c.has_foil,
                                        has_mesh: !!c.has_mesh,
                                        has_fiber: !!c.has_fiber,
                                        has_duramint: !!c.has_duramint
                                    },
                                    livePrices
                                )).reduce((acc, curr) => ({
                                    net: acc.net + curr.net,
                                    base: acc.base + curr.base,
                                    extra: acc.extra + curr.extra,
                                    threshold: acc.threshold + curr.threshold
                                }), { net: 0, base: 0, extra: 0, threshold: 0 });''',
    content
)


with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'w') as f:
    f.write(content)

print("Patched!")

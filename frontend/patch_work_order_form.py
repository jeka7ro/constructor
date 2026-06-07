import re

with open("src/pages/admin/WorkOrderForm.jsx", "r") as f:
    code = f.read()

# 1. Add the useEffect
calc_effect = """
    // Auto-calculate estimated_amount based on volumes and client type
    useEffect(() => {
        let isAutoCalculated = false;
        let totalNet = 0;
        
        form.volumes.forEach(vol => {
            const surface = parseFloat(vol.quantity) || 0;
            const thickness = parseFloat(vol.thickness) || 0;
            if (vol.label?.toLowerCase()?.includes('sapa') && surface > 0) {
                isAutoCalculated = true;
                const extraThickness = Math.max(0, thickness - 5);
                const basePrice = 12.5 * surface;
                const extraPrice = extraThickness * 1.25 * surface;
                const foilPrice = vol.has_foil ? 1.2 * surface : 0;
                const meshPrice = vol.has_mesh ? 2.5 * surface : 0;
                
                totalNet += basePrice + extraPrice + foilPrice + meshPrice;
            }
        });

        if (isAutoCalculated) {
            let totalGross = totalNet;
            const client = clients.find(c => c.id === form.client_id);
            if (client?.client_type === 'fizica') {
                totalGross = totalNet * 1.21;
            }
            totalGross = Math.round(totalGross * 100) / 100;
            
            if (form.estimated_amount !== totalGross || form.is_auto_calculated !== true) {
                setForm(p => ({ ...p, estimated_amount: totalGross, is_auto_calculated: true }));
            }
        } else {
            if (form.is_auto_calculated) {
                setForm(p => ({ ...p, is_auto_calculated: false }));
            }
        }
    }, [form.volumes, form.client_id, clients, form.estimated_amount, form.is_auto_calculated]);
"""

# Insert right before useEffect(() => { const load = async () => { ... }
code = code.replace("    useEffect(() => {\n        const load = async () => {", calc_effect + "\n    useEffect(() => {\n        const load = async () => {")


# 2. Add checkboxes to volumes
checkboxes = """
                            {vol.label?.toLowerCase()?.includes('sapa') && (
                                <div className="flex flex-wrap gap-4 mt-2 px-1">
                                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!vol.has_foil}
                                            onChange={e => updateRow('volumes', i, 'has_foil', e.target.checked)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                        />
                                        Include Folie plastic (1,2 EUR/m²)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!vol.has_mesh}
                                            onChange={e => updateRow('volumes', i, 'has_mesh', e.target.checked)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                        />
                                        Include Plasă metalică (2,50 EUR/m²)
                                    </label>
                                </div>
                            )}
"""

code = code.replace(
    "                                    </div>\n                                </div>\n                            </div>\n                            {sandKg > 0",
    "                                    </div>\n                                </div>\n                            </div>" + checkboxes + "\n                            {sandKg > 0"
)

# 3. Make estimated_amount readonly if auto calculated
input_field = """<input type="number" min="0"
                                value={form.estimated_amount || ''}
                                onChange={e => {
                                    set('estimated_amount', e.target.value)
                                }}
                                placeholder="ex: 1500"
                                className={`flex-1 px-3 py-2 text-sm bg-transparent outline-none ${form.is_auto_calculated ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}
                                disabled={form.is_auto_calculated}
                            />"""
                            
old_input = """<input type="number" min="0"
                                value={form.estimated_amount || ''}
                                onChange={e => {
                                    set('estimated_amount', e.target.value)
                                }}
                                placeholder="ex: 1500"
                                className="flex-1 px-3 py-2 text-sm text-slate-900 dark:text-white bg-transparent outline-none"
                            />"""

code = code.replace(old_input, input_field)

with open("src/pages/admin/WorkOrderForm.jsx", "w") as f:
    f.write(code)


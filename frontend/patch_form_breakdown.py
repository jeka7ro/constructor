import re

with open("src/pages/admin/WorkOrderForm.jsx", "r") as f:
    code = f.read()

# 1. Add computation variables inside the component
render_calc = """
    // Calculation variables for render
    let autoNet = 0;
    let autoBase = 0;
    let autoExtra = 0;
    let autoFoil = 0;
    let autoMesh = 0;
    let isAutoRender = false;
    let surfaceForAuto = 0;
    let extraThickForAuto = 0;

    form.volumes.forEach(vol => {
        const surface = parseFloat(vol.quantity) || 0;
        const thickness = parseFloat(vol.thickness) || 0;
        if (vol.label?.toLowerCase()?.includes('sapa') && surface > 0) {
            isAutoRender = true;
            surfaceForAuto += surface;
            const extraThickness = Math.max(0, thickness - 5);
            extraThickForAuto = extraThickness;
            autoBase += 12.5 * surface;
            autoExtra += extraThickness * 1.25 * surface;
            autoFoil += vol.has_foil ? 1.2 * surface : 0;
            autoMesh += vol.has_mesh ? 2.5 * surface : 0;
        }
    });

    autoNet = autoBase + autoExtra + autoFoil + autoMesh;
    let autoVat = 0;
    let totalGross = autoNet;
    const clientForRender = clients.find(c => c.id === form.client_id);
    if (isAutoRender && clientForRender?.client_type === 'fizica') {
        autoVat = autoNet * 0.21;
        totalGross = autoNet + autoVat;
    }
"""

code = code.replace(
    "    return (\n        <div className=\"max-w-4xl mx-auto pb-24\">",
    render_calc + "\n    return (\n        <div className=\"max-w-4xl mx-auto pb-24\">"
)

# 2. Patch the input field to be disabled
old_input = """<input type="number" min="0"
                                value={form.estimated_amount || ''}
                                onChange={e => {
                                    set('estimated_amount', e.target.value)
                                    set('estimated_price', e.target.value ? `${e.target.value} ${form.estimated_currency || 'EUR'}` : '')
                                }}
                                placeholder="ex: 1500"
                                className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-l-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                            />"""
                            
new_input = """<input type="number" min="0"
                                value={form.estimated_amount || ''}
                                onChange={e => {
                                    set('estimated_amount', e.target.value)
                                    set('estimated_price', e.target.value ? `${e.target.value} ${form.estimated_currency || 'EUR'}` : '')
                                }}
                                placeholder="ex: 1500"
                                disabled={form.is_auto_calculated}
                                className={`w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-l-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${form.is_auto_calculated ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400'}`}
                            />"""

code = code.replace(old_input, new_input)


# 3. Add the breakdown UI
breakdown_ui = """
                        </div>
                        {isAutoRender && (
                            <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 w-full col-span-1 sm:col-span-2">
                                <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">Calcul Cost (Vizibil doar Admin)</p>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Șapă de bază (≤5cm)</span>
                                        <span>{surfaceForAuto} m² × 12.50 = <b>{autoBase.toFixed(2)} EUR</b></span>
                                    </div>
                                    {autoExtra > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>Grosime extra ({extraThickForAuto} cm)</span>
                                            <span>{surfaceForAuto} m² × {extraThickForAuto * 1.25} = <b>{autoExtra.toFixed(2)} EUR</b></span>
                                        </div>
                                    )}
                                    {autoFoil > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>Folie plastic</span>
                                            <span>{surfaceForAuto} m² × 1.20 = <b>{autoFoil.toFixed(2)} EUR</b></span>
                                        </div>
                                    )}
                                    {autoMesh > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>Plasă metalică</span>
                                            <span>{surfaceForAuto} m² × 2.50 = <b>{autoMesh.toFixed(2)} EUR</b></span>
                                        </div>
                                    )}
                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                                    <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                                        <span>Total Net:</span>
                                        <span>{autoNet.toFixed(2)} EUR</span>
                                    </div>
                                    {clientForRender?.client_type === 'fizica' ? (
                                        <div className="flex justify-between font-bold text-amber-600 dark:text-amber-500">
                                            <span>TVA (21% Persoană Fizică):</span>
                                            <span>{autoVat.toFixed(2)} EUR</span>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between text-slate-500 text-xs">
                                            <span>TVA: 0% (Persoană Juridică)</span>
                                            <span>0.00 EUR</span>
                                        </div>
                                    )}
                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                                    <div className="flex justify-between text-base font-black text-blue-600 dark:text-blue-400">
                                        <span>TOTAL DE PLATĂ:</span>
                                        <span>{totalGross.toFixed(2)} EUR</span>
                                    </div>
                                </div>
                            </div>
                        )}
"""

code = code.replace(
    "                        </div>\n                        <p className=\"text-xs text-slate-400 mt-1.5 font-medium flex items-center gap-1.5\">",
    breakdown_ui + "\n                        <p className=\"text-xs text-slate-400 mt-1.5 font-medium flex items-center gap-1.5\">"
)

with open("src/pages/admin/WorkOrderForm.jsx", "w") as f:
    f.write(code)


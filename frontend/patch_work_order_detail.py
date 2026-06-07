import re

with open("src/pages/admin/WorkOrderDetail.jsx", "r") as f:
    code = f.read()

# 1. Add computation logic inside WorkOrderDetail component
calc_logic = """
    // Calculation Logic for Sapa
    let autoNet = 0;
    let autoBase = 0;
    let autoExtra = 0;
    let autoFoil = 0;
    let autoMesh = 0;
    let isAuto = false;
    let surfaceForAuto = 0;
    let extraThickForAuto = 0;

    (wo.volumes || []).forEach(vol => {
        const surface = parseFloat(vol.quantity) || 0;
        const thickness = parseFloat(vol.thickness) || 0;
        if (vol.label?.toLowerCase()?.includes('sapa') && surface > 0) {
            isAuto = true;
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
    if (isAuto && wo.client_type === 'fizica') {
        autoVat = autoNet * 0.21;
        totalGross = autoNet + autoVat;
    }
"""

code = code.replace(
    "    const volumeTotal = (wo.volumes || []).reduce((a, v) => a + (parseFloat(v.quantity) || 0), 0)",
    calc_logic + "\n    const volumeTotal = (wo.volumes || []).reduce((a, v) => a + (parseFloat(v.quantity) || 0), 0)"
)

# 2. Add the UI rendering
calc_ui = """
                        {isAuto && (
                            <div className="mt-4 mb-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">Calcul Cost (Doar Admin)</p>
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
                                    {wo.client_type === 'fizica' ? (
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
    "                        {wo.estimated_price && <Row label=\"Preț Estimativ\" value={wo.estimated_price} />}",
    "                        {wo.estimated_price && <Row label=\"Preț Estimativ\" value={wo.estimated_price} />}" + calc_ui
)

with open("src/pages/admin/WorkOrderDetail.jsx", "w") as f:
    f.write(code)


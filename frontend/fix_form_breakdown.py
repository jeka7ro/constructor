import re

with open("src/pages/admin/WorkOrderForm.jsx", "r") as f:
    lines = f.readlines()

# Let's find the start of section 7
start_idx = -1
for i, line in enumerate(lines):
    if "7. Preț Estimativ (Proformă)" in line:
        start_idx = i
        break

end_idx = -1
for i in range(start_idx, len(lines)):
    if "{/* Actions Bottom */}" in lines[i]:
        end_idx = i
        break

fixed_section = """            {/* 7. Preț Estimativ (Proformă) */}
            <Section icon={Banknote} title="Preț Estimativ (Proformă)" zIndex={10}>
                <div className="flex flex-col gap-4">
                    <Field label="Valoare estimată">
                        <div className="flex w-full sm:w-1/2 shadow-sm rounded-xl">
                            <input type="number" min="0"
                                value={form.estimated_amount || ''}
                                onChange={e => {
                                    set('estimated_amount', e.target.value)
                                    set('estimated_price', e.target.value ? `${e.target.value} ${form.estimated_currency || 'EUR'}` : '')
                                }}
                                placeholder="ex: 1500"
                                disabled={form.is_auto_calculated}
                                className={`w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-l-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${form.is_auto_calculated ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400'}`}
                            />
                            <select
                                value={form.estimated_currency || 'EUR'}
                                onChange={e => {
                                    set('estimated_currency', e.target.value)
                                    if (form.estimated_amount) {
                                        set('estimated_price', `${form.estimated_amount} ${e.target.value}`)
                                    }
                                }}
                                className="w-24 px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-l-0 border-slate-200 dark:border-slate-700 rounded-r-xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="EUR">EUR</option>
                                <option value="RON">RON</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 font-medium flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5" />
                            Apare pe proforma trimisă clientului
                        </p>
                    </Field>
                    
                    {isAutoRender && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 w-full mt-2">
                            <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4">Calcul Cost (Vizibil doar Admin)</p>
                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                    <span className="font-medium">Șapă de bază (≤5cm)</span>
                                    <span className="text-right whitespace-nowrap">{surfaceForAuto} m² × 12.50 = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoBase.toFixed(2)} EUR</b></span>
                                </div>
                                {autoExtra > 0 && (
                                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                        <span className="font-medium">Grosime extra ({extraThickForAuto} cm)</span>
                                        <span className="text-right whitespace-nowrap">{surfaceForAuto} m² × {(extraThickForAuto * 1.25).toFixed(2)} = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoExtra.toFixed(2)} EUR</b></span>
                                    </div>
                                )}
                                {autoFoil > 0 && (
                                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                        <span className="font-medium">Folie plastic</span>
                                        <span className="text-right whitespace-nowrap">{surfaceForAuto} m² × 1.20 = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoFoil.toFixed(2)} EUR</b></span>
                                    </div>
                                )}
                                {autoMesh > 0 && (
                                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                        <span className="font-medium">Plasă metalică</span>
                                        <span className="text-right whitespace-nowrap">{surfaceForAuto} m² × 2.50 = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoMesh.toFixed(2)} EUR</b></span>
                                    </div>
                                )}
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-3"></div>
                                <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
                                    <span>Total Net:</span>
                                    <span>{autoNet.toFixed(2)} EUR</span>
                                </div>
                                {clientForRender?.client_type === 'fizica' ? (
                                    <div className="flex justify-between items-center font-bold text-amber-600 dark:text-amber-500 mt-1.5">
                                        <span>TVA (21% Persoană Fizică):</span>
                                        <span>{autoVat.toFixed(2)} EUR</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center text-slate-500 text-xs mt-1.5">
                                        <span>TVA: 0% (Persoană Juridică)</span>
                                        <span>0.00 EUR</span>
                                    </div>
                                )}
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-3"></div>
                                <div className="flex justify-between items-center text-base font-black text-blue-600 dark:text-blue-400">
                                    <span>TOTAL DE PLATĂ:</span>
                                    <span>{totalGross.toFixed(2)} EUR</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Section>

                    </div>
                )}
            </div>

"""

new_lines = lines[:start_idx] + [fixed_section] + lines[end_idx:]

with open("src/pages/admin/WorkOrderForm.jsx", "w") as f:
    f.writelines(new_lines)


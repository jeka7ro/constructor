import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# 1. Fully replace the Preț Estimativ section
start_marker = "{/* 7. Preț Estimativ (Proformă) */}"
end_marker = "            {/* Actions Bottom */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_section = """{/* 7. Prix Estimé */}
            <Section icon={Banknote} title={t('work_order_form.estimated_price_title', 'Prix ​​Estimé (Facture Proforma)')} zIndex={10}>
                <div className="flex flex-col gap-4">
                    {isAutoRender && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 w-full mt-2">
                            <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4">{t('work_order_form.cost_calculation_admin', 'Calcul du coût (Visible uniquement par l\\'admin)')}</p>
                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                    <span className="font-medium">{t('work_order_form.base_screed', 'Chape de base')} (≤5cm)</span>
                                    <span className="text-right whitespace-nowrap flex items-center gap-2 justify-end">{surfaceForAuto} m² × <input type="number" step="0.1" value={form.prices?.base || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, base: e.target.value}}))} className="w-16 px-1 h-6 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center" /> = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoBase.toFixed(2)} EUR</b></span>
                                </div>
                                {autoExtra > 0 && (
                                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                        <span className="font-medium">{t('work_order_form.extra_thickness', 'Épaisseur supplémentaire')} ({extraThickForAuto} cm)</span>
                                        <span className="text-right whitespace-nowrap flex items-center gap-2 justify-end">{surfaceForAuto} m² × {extraThickForAuto} cm × <input type="number" step="0.1" value={form.prices?.extra || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, extra: e.target.value}}))} className="w-16 px-1 h-6 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center" /> = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoExtra.toFixed(2)} EUR</b></span>
                                    </div>
                                )}
                                {autoFoil > 0 && (
                                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                        <span className="font-medium">{t('work_order_form.plastic_foil', 'Film plastique')}</span>
                                        <span className="text-right whitespace-nowrap flex items-center gap-2 justify-end">{surfaceForAuto} m² × <input type="number" step="0.1" value={form.prices?.foil || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, foil: e.target.value}}))} className="w-16 px-1 h-6 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center" /> = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoFoil.toFixed(2)} EUR</b></span>
                                    </div>
                                )}
                                {autoMesh > 0 && (
                                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                        <span className="font-medium">{t('work_order_form.metal_mesh', 'Treillis métallique')}</span>
                                        <span className="text-right whitespace-nowrap flex items-center gap-2 justify-end">{surfaceForAuto} m² × <input type="number" step="0.1" value={form.prices?.mesh || ''} onChange={e => setForm(p => ({...p, prices: {...p.prices, mesh: e.target.value}}))} className="w-16 px-1 h-6 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center" /> = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoMesh.toFixed(2)} EUR</b></span>
                                    </div>
                                )}
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-3"></div>
                                <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
                                    <span>{t('work_order_form.total_net', 'Total Net')}:</span>
                                    <span>{autoNet.toFixed(2)} EUR</span>
                                </div>
                                {clientForRender?.client_type === 'fizica' ? (
                                    <div className="flex justify-between items-center font-bold text-amber-600 dark:text-amber-500 mt-1.5">
                                        <span>{t('work_order_form.vat_physical', 'TVA (21% Particulier)')}:</span>
                                        <span>{autoVat.toFixed(2)} EUR</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center text-slate-500 text-xs mt-1.5">
                                        <span>{t('work_order_form.vat_juridical', 'TVA: 0% (Entreprise)')}</span>
                                        <span>0.00 EUR</span>
                                    </div>
                                )}
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-3"></div>
                                <div className="flex justify-between items-center text-base font-black text-blue-600 dark:text-blue-400">
                                    <span>{t('work_order_form.total_gross', 'MONTANT TOTAL')}:</span>
                                    <div className="flex items-center gap-3">
                                        <span>{totalGross.toFixed(2)} EUR</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Section>
            </div>

"""
    content = content[:start_idx] + new_section + content[end_idx:]
    print("Section 7 replaced successfully")
else:
    print("Could not find boundaries for Section 7")

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)


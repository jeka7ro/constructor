import re

f = 'frontend/src/pages/admin/WorkOrderDetail.jsx'
with open(f, 'r') as file:
    c = file.read()

old_block = """                                                </div>
                                                {hasConsumed ? (
                                                    <>
                                                        <div className="w-px bg-slate-100 dark:bg-slate-700 hidden xl:block"></div>
                                                        <div className="flex-1 border-t xl:border-t-0 border-slate-100 dark:border-slate-700 pt-5 xl:pt-0">
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials_volumes.consumed', 'Consumat Efectiv')}</p>
                                                            </div>
                                                            <div className="space-y-1.5 mb-4">
                                                                {wo.actual_surface_m2 && (
                                                                    <div className="flex items-center justify-between px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                                                        <div>
                                                                            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Suprafață Confirmată</span>
                                                                            <p className="text-xs text-emerald-600">Raportat de echipă</p>
                                                                        </div>
                                                                        <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 ml-3 shrink-0">{wo.actual_surface_m2} m²</span>
                                                                    </div>
                                                                )}
                                                                
                                                                {wo.actual_sand_quantity && (
                                                                    <div className="flex items-center justify-between px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                                                        <div>
                                                                            <span className="text-sm font-bold text-amber-800 dark:text-amber-300">Nisip (kg)</span>
                                                                            <p className="text-xs text-amber-600">Raportat de echipă</p>
                                                                        </div>
                                                                        <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400 ml-3 shrink-0">{wo.actual_sand_quantity} kg</span>
                                                                    </div>
                                                                )}

                                                                {(wo.materials_consumed || []).filter(m => m.name).map((m, i) => (
                                                            <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                                                <div>
                                                                    <span className="text-sm font-bold text-amber-800 dark:text-amber-300">{m.name}</span>
                                                                    {m.note && <p className="text-xs text-amber-600">{m.note}</p>}
                                                                </div>
                                                                <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400 ml-3 shrink-0">{m.quantity} {m.unit}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {matPieData.length > 0 && (
                                                        <>
                                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('work_order_detail.materials.distribution', 'Distribuție Cantități')}</p>
                                                            <ResponsiveContainer width="100%" height={180}>
                                                                <PieChart>
                                                                    <Pie data={matPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                                                                        {matPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                                    </Pie>
                                                                    <Tooltip formatter={(v, n) => [v, n]} />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        </>
                                                    )}
                                                        </div>
                                                    </>
                                                ) : null}"""

new_block = """                                                </div>
                                                {hasConsumed ? (
                                                    <>
                                                        <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 hidden xl:block self-center mx-2"></div>
                                                        <div className="flex items-center flex-nowrap gap-2 overflow-x-auto no-scrollbar pt-2 xl:pt-0">
                                                            <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                                <p className="text-[10px] whitespace-nowrap font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials_volumes.consumed', 'RÉELLEMENT CONSOMMÉ')}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {wo.actual_surface_m2 && (
                                                                    <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg">
                                                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{t('work_order_detail.materials_volumes.confirmed_surface', 'Surface confirmée')}</span>
                                                                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{wo.actual_surface_m2} m²</span>
                                                                    </div>
                                                                )}
                                                                
                                                                {wo.actual_sand_quantity && (
                                                                    <div className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg">
                                                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{t('work_order_detail.materials_volumes.confirmed_sand', 'Sable')}</span>
                                                                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{wo.actual_sand_quantity} kg</span>
                                                                    </div>
                                                                )}

                                                                {(wo.materials_consumed || []).filter(m => m.name).map((m, i) => (
                                                                    <div key={i} className="flex items-center whitespace-nowrap shrink-0 gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg">
                                                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{m.name} {m.note && `(${m.note})`}</span>
                                                                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{m.quantity} {m.unit}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : null}"""

if old_block in c:
    c = c.replace(old_block, new_block)
    with open(f, 'w') as file:
        file.write(c)
    print("SUCCESS")
else:
    print("NOT FOUND")

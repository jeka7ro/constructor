import os

filepath = "/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(filepath, "r") as f:
    c = f.read()

import re

# Use regex to find the section
start_str = "<Section className=\"flex-1\" icon={Wrench} title={t('work_order_detail.materials_volumes.title'"
end_str = "</Section>"

start_idx = c.find(start_str)
if start_idx != -1:
    end_idx = c.find(end_str, start_idx) + len(end_str)
    old_section = c[start_idx:end_idx]
    
    # Check if we found the right section
    if "Planificat / Estimat" in old_section:
        new_section = """<Section className="flex-1" icon={Wrench} title={t('work_order_detail.materials_volumes.title', "Cantități & Materiale (Estimate vs Consumate)")}>
                                            <div className="flex flex-col xl:flex-row gap-6">
                                                {/* Partea Stângă (Planificat / Estimat) - REDUSĂ LA UN SINGUR RÂND */}
                                                <div className="flex-1 space-y-3">
                                                    {(wo.volumes || []).length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                                    {t('work_order_detail.materials_volumes.planned', 'Planificat / Estimat')} · {t('work_order_detail.materials_volumes.works_volumes', 'Lucrări / Volume')}
                                                                </span>
                                                            </div>
                                                            <div className="hidden sm:block w-px h-4 bg-blue-200 dark:bg-blue-800/50"></div>
                                                            <div className="flex items-center gap-4 flex-wrap">
                                                                {wo.volumes.map((v, i) => (
                                                                    <div key={i} className="flex items-baseline gap-1.5">
                                                                        <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">{v.name}:</span>
                                                                        <span className="text-xs font-extrabold text-blue-700 dark:text-blue-400">{v.value} {v.unit}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {(wo.materials || []).length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                                    {t('work_order_detail.materials.required', 'Materiale Necesare')}
                                                                </span>
                                                            </div>
                                                            <div className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                                                            <div className="flex items-center gap-4 flex-wrap">
                                                                {wo.materials.map((m, i) => (
                                                                    <div key={i} className="flex items-baseline gap-1.5">
                                                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{m.name}:</span>
                                                                        <span className="text-xs font-bold text-slate-900 dark:text-white">{m.quantity} {m.unit}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ASCUNDEM TOTAL PARTEA DREAPTĂ DACĂ E GOALĂ! */}
                                                {(wo.materials_consumed || []).filter(m => m.name).length > 0 && (
                                                    <>
                                                        <div className="w-px bg-slate-100 dark:bg-slate-700 hidden xl:block"></div>
                                                        <div className="flex-1 border-t xl:border-t-0 border-slate-100 dark:border-slate-700 pt-5 xl:pt-0">
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials_volumes.consumed', 'Consumat Efectiv')}</p>
                                                            </div>
                                                            
                                                            <div className="space-y-1.5 mb-4">
                                                                {wo.materials_consumed.filter(m => m.name).map((m, i) => (
                                                                    <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                                                        <div>
                                                                            <p className="text-sm font-bold text-amber-900 dark:text-amber-300">{m.name}</p>
                                                                            {m.added_by_name && (
                                                                                <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 mt-0.5">Adăugat de {m.added_by_name}</p>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-sm font-black text-amber-600 dark:text-amber-500">{m.quantity} {m.unit}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            
                                                            {matPieData.length > 0 && (
                                                                <>
                                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('work_order_detail.materials.distribution', 'Distribuție Cantități')}</p>
                                                                    <ResponsiveContainer width="100%" height={180}>
                                                                        <PieChart>
                                                                            <Pie data={matPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                                                                                {matPieData.map((entry, index) => (
                                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                                ))}
                                                                            </Pie>
                                                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                                        </PieChart>
                                                                    </ResponsiveContainer>
                                                                </>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </Section>"""
        c = c.replace(old_section, new_section)
        with open(filepath, "w") as f:
            f.write(c)
        print("Replaced successfully!")
    else:
        print("Could not find exact match in section")
else:
    print("Could not find start string")


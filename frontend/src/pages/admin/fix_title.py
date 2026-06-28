import os

filepath = "/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(filepath, "r") as f:
    c = f.read()

# 1. Hide the Consumat Efectiv section when empty, AND hide the divider
# 2. Change the Section title dynamically!

# We need to compute hasConsumed BEFORE the Section.
# Let's see where the Section is.
old_section_start = """                    <Section className="flex-1" icon={Wrench} title={t('work_order_detail.materials_volumes.title', "Cantități & Materiale (Estimate vs Consumate)")}>"""
new_section_start = """                    {(() => {
                        const hasConsumed = (wo.materials_consumed || []).filter(m => m.name).length > 0;
                        const sectionTitle = hasConsumed 
                            ? t('work_order_detail.materials_volumes.title', "Cantități & Materiale (Estimate vs Consumate)")
                            : t('work_order_detail.materials_volumes.title_no_consumed', "Cantități & Materiale (Estimate)");
                        
                        return (
                            <Section className="flex-1" icon={Wrench} title={sectionTitle}>"""

# Now replace the divider and right column logic
old_right_col = """                                                <div className="w-px bg-slate-100 dark:bg-slate-700 hidden xl:block"></div>
                                                <div className="flex-1 border-t xl:border-t-0 border-slate-100 dark:border-slate-700 pt-5 xl:pt-0">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials_volumes.consumed', 'Consumat Efectiv')}</p>
                                                    </div>
                                            {(wo.materials_consumed || []).filter(m => m.name).length > 0 ? (
                                                <>
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
                                                                        {matPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                                    </Pie>
                                                                    <Tooltip formatter={(v, n) => [v, n]} />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-sm text-slate-400 text-center py-4">{t('work_order_detail.materials_volumes.no_consumed_materials', 'Niciun material consumat înregistrat')}</p>
                                            )}
                                        
                                                </div>
                                            </div>
                                        </Section>"""

new_right_col = """                                                {hasConsumed && (
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
                                                                                {matPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                                            </Pie>
                                                                            <Tooltip formatter={(v, n) => [v, n]} />
                                                                        </PieChart>
                                                                    </ResponsiveContainer>
                                                                </>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </Section>
                        );
                    })()}"""

# We also need to fix the left side to put the 3 elements on a single row properly.
# The 3 elements are:
# 1. <p>Planificat / Estimat</p>
# 2. <p>Lucrari / Volume</p>
# 3. <div className="space-y-1.5">{wo.volumes.map(...)}</div>
# Let's combine them gracefully:
old_left_col = """                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('work_order_detail.materials_volumes.planned', 'Planificat / Estimat')}</p>
                                                    </div>
                                            {(wo.volumes || []).length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('work_order_detail.materials_volumes.works_volumes', 'Lucrări / Volume')}</p>
                                                    <div className="space-y-1.5">
                                                        {wo.volumes.map((v, i) => (
                                                            <div key={i} className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                                                <span className="font-semibold text-blue-900 dark:text-blue-300">{v.name}</span>
                                                                <span className="font-extrabold text-blue-700 dark:text-blue-400">{v.value} {v.unit}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}"""

# Create a clean single row design: "PLANIFICAT/ESTIMAT - LUCRARI/VOLUME" on the left, and the volumes as pills on the right, or just one row.
# But wait, the user's mockup:
# "PLANIFICAT / ESTIMAT
# LUCRĂRI / VOLUME
# Șapă 123 m² sa fie pe un singur rand"
# This could mean that "Planificat", "Lucrari", and "Sapa 123" are literally side-by-side.
new_left_col = """                                                <div className="flex-1">
                                                    {(wo.volumes || []).length > 0 && (
                                                        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-xl border border-blue-100 dark:border-blue-800/30 mb-3">
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                                    {t('work_order_detail.materials_volumes.planned', 'Planificat / Estimat')} · {t('work_order_detail.materials_volumes.works_volumes', 'Lucrări / Volume')}
                                                                </p>
                                                            </div>
                                                            <div className="w-px h-3 bg-blue-200 dark:bg-blue-800"></div>
                                                            <div className="flex items-center gap-3 flex-wrap flex-1">
                                                                {wo.volumes.map((v, i) => (
                                                                    <div key={i} className="flex items-baseline gap-1">
                                                                        <span className="font-semibold text-xs text-blue-900 dark:text-blue-300">{v.name}:</span>
                                                                        <span className="font-extrabold text-xs text-blue-700 dark:text-blue-400">{v.value} {v.unit}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}"""

if old_section_start in c and old_right_col in c and old_left_col in c:
    c = c.replace(old_section_start, new_section_start)
    c = c.replace(old_right_col, new_right_col)
    c = c.replace(old_left_col, new_left_col)
    with open(filepath, "w") as f:
        f.write(c)
    print("Replacements applied successfully!")
else:
    print("ERROR: Could not find strings for replacement.")


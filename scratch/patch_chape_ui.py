import re

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Chape tab UI
chape_tab_pattern = re.compile(r'(<div className="grid grid-cols-2 gap-4">\s*<div>\s*<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1\.5">.*?\{t\(\'work_order_detail\.calc_edit\.surface\', \'Surface \(m²\)\'\)\} \*</label>\s*<input\s*type="number" min="0" step="0\.5"\s*value=\{calcEditForm\.surface\}.*?</label>\s*\)\)\}\s*</div>\s*</div>)', re.DOTALL)

chape_tab_replacement = r'''<div className="space-y-4">
                                        {(calcEditForm.chapes || []).map((chape, idx) => (
                                            <div key={chape.id} className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl relative">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase">Chape {idx + 1}</h4>
                                                    {calcEditForm.chapes.length > 1 && (
                                                        <button 
                                                            onClick={() => setCalcEditForm(f => ({ ...f, chapes: f.chapes.filter((_, i) => i !== idx) }))}
                                                            className="text-red-500 hover:text-red-600 transition-colors"
                                                            title={t('common.delete', 'Supprimer')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('work_order_detail.calc_edit.surface', 'Surface (m²)')} *</label>
                                                        <input
                                                            type="number" min="0" step="0.5"
                                                            value={chape.surface}
                                                            onChange={e => {
                                                                const newChapes = [...calcEditForm.chapes];
                                                                newChapes[idx].surface = e.target.value;
                                                                setCalcEditForm({ ...calcEditForm, chapes: newChapes });
                                                            }}
                                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            placeholder="ex: 130"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('work_order_detail.calc_edit.thickness', 'Épaisseur (cm)')}</label>
                                                        <input
                                                            type="number" min="0" step="0.5"
                                                            value={chape.thickness}
                                                            onChange={e => {
                                                                const newChapes = [...calcEditForm.chapes];
                                                                newChapes[idx].thickness = e.target.value;
                                                                setCalcEditForm({ ...calcEditForm, chapes: newChapes });
                                                            }}
                                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            placeholder="ex: 10"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('work_order_detail.calc_edit.options', 'Options incluses')}</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        {[
                                                            { key: 'has_foil',     label: t('work_order_detail.calc_edit.foil',     'Feuille') },
                                                            { key: 'has_mesh',     label: t('work_order_detail.calc_edit.mesh',     'Treillis') },
                                                            { key: 'has_fiber',    label: t('work_order_detail.calc_edit.fiber',    'Fibres') },
                                                            { key: 'has_duramint', label: t('work_order_detail.calc_edit.duramint', 'Duramint') },
                                                        ].map(({ key, label }) => (
                                                            <label key={key} className="flex items-center gap-2 cursor-pointer group p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!chape[key]}
                                                                    onChange={e => {
                                                                        const newChapes = [...calcEditForm.chapes];
                                                                        newChapes[idx][key] = e.target.checked;
                                                                        setCalcEditForm({ ...calcEditForm, chapes: newChapes });
                                                                    }}
                                                                    className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">{label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={() => setCalcEditForm(f => ({ ...f, chapes: [...(f.chapes || []), { id: Date.now(), surface: '', thickness: '', has_foil: false, has_mesh: false, has_fiber: false, has_duramint: false }] }))}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-bold text-xs transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Ajouter une surface Chape
                                        </button>
                                    </div>'''

content = chape_tab_pattern.sub(chape_tab_replacement, content)

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Chape UI patched.")

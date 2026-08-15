import re

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace PUR block
pur_pattern = re.compile(r'(\{isoPurSurface > 0 && \(\s*<div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-4">\s*<p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">Isolation PUR</p>\s*)<div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">.*?</div>(\s*<p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tarifs & Remises PUR</p>)', re.DOTALL)

pur_replacement = r'''{((calcEditForm.pur_isolations || []).length > 0 || isoPurSurface > 0) && (
                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Isolation PUR</p>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setCalcEditForm(f => ({ ...f, pur_isolations: [...(f.pur_isolations || []), { id: Date.now(), surface: '', thickness: '', pur_aspiration: false, pur_niveller: false, pur_poncage: false, pur_protection: false }] }))}
                                                    className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-md text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" /> Ajouter
                                                </button>
                                            </div>
                                            
                                            <div className="space-y-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                                                {(calcEditForm.pur_isolations || []).map((pur, idx) => (
                                                    <div key={pur.id} className="relative p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                        {calcEditForm.pur_isolations.length > 1 && (
                                                            <button 
                                                                onClick={() => setCalcEditForm(f => ({ ...f, pur_isolations: f.pur_isolations.filter((_, i) => i !== idx) }))}
                                                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                                                                title={t('common.delete', 'Supprimer')}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Surface PUR (m²) {idx + 1}</label>
                                                                <input
                                                                    type="number" min="0" step="0.5"
                                                                    value={pur.surface}
                                                                    onChange={e => {
                                                                        const newPurs = [...calcEditForm.pur_isolations];
                                                                        newPurs[idx].surface = e.target.value;
                                                                        setCalcEditForm({ ...calcEditForm, pur_isolations: newPurs });
                                                                    }}
                                                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    placeholder="ex: 130"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Épaisseur PUR (cm)</label>
                                                                <input
                                                                    type="number" min="0" step="0.5"
                                                                    value={pur.thickness}
                                                                    onChange={e => {
                                                                        const newPurs = [...calcEditForm.pur_isolations];
                                                                        newPurs[idx].thickness = e.target.value;
                                                                        setCalcEditForm({ ...calcEditForm, pur_isolations: newPurs });
                                                                    }}
                                                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    placeholder="ex: 10"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="mt-3">
                                                            <div className="flex flex-wrap gap-2">
                                                                {[
                                                                    { key: 'pur_aspiration', label: 'Aspiration' },
                                                                    { key: 'pur_niveller', label: 'Niveller' },
                                                                    { key: 'pur_poncage', label: 'Ponçage' },
                                                                    { key: 'pur_protection', label: 'Protection' }
                                                                ].map(({ key, label }) => (
                                                                    <label key={key} className="flex items-center gap-1.5 cursor-pointer group p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={!!pur[key]}
                                                                            onChange={e => {
                                                                                const newPurs = [...calcEditForm.pur_isolations];
                                                                                newPurs[idx][key] = e.target.checked;
                                                                                setCalcEditForm({ ...calcEditForm, pur_isolations: newPurs });
                                                                            }}
                                                                            className="w-3 h-3 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                                        />
                                                                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">{label}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>\2'''

content = pur_pattern.sub(pur_replacement, content)

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("PUR UI patched.")

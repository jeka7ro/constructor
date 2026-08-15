import re

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace EPS block
eps_pattern = re.compile(r'(\{isoEpsM3 > 0 && \(\s*<div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-4">\s*<p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">Isolation EPS</p>\s*)<div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">.*?</div>(\s*<p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tarifs & Remises EPS</p>)', re.DOTALL)

eps_replacement = r'''{((calcEditForm.eps_isolations || []).length > 0 || isoEpsM3 > 0) && (
                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Isolation EPS</p>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setCalcEditForm(f => ({ ...f, eps_isolations: [...(f.eps_isolations || []), { id: Date.now(), surface: '', thickness: '' }] }))}
                                                    className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-md text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" /> Ajouter
                                                </button>
                                            </div>
                                            
                                            <div className="space-y-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                                                {(calcEditForm.eps_isolations || []).map((eps, idx) => (
                                                    <div key={eps.id} className="relative p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-4">
                                                        {calcEditForm.eps_isolations.length > 1 && (
                                                            <button 
                                                                onClick={() => setCalcEditForm(f => ({ ...f, eps_isolations: f.eps_isolations.filter((_, i) => i !== idx) }))}
                                                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                                                                title={t('common.delete', 'Supprimer')}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Surface EPS (m²) {idx + 1}</label>
                                                            <input
                                                                type="number" min="0" step="0.5"
                                                                value={eps.surface}
                                                                onChange={e => {
                                                                    const newEps = [...calcEditForm.eps_isolations];
                                                                    newEps[idx].surface = e.target.value;
                                                                    setCalcEditForm({ ...calcEditForm, eps_isolations: newEps });
                                                                }}
                                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                placeholder="ex: 130"
                                                            />
                                                        </div>
                                                        <div className="pr-6">
                                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Épaisseur EPS (cm)</label>
                                                            <input
                                                                type="number" min="0" step="0.5"
                                                                value={eps.thickness}
                                                                onChange={e => {
                                                                    const newEps = [...calcEditForm.eps_isolations];
                                                                    newEps[idx].thickness = e.target.value;
                                                                    setCalcEditForm({ ...calcEditForm, eps_isolations: newEps });
                                                                }}
                                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                placeholder="ex: 10"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>\2'''

content = eps_pattern.sub(eps_replacement, content)

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("EPS UI patched.")

import re

with open('src/pages/DevisOnline.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: handleSubmit
old_submit = """        if (!formData.surface || parseFloat(formData.surface) <= 0) {
            setError(t('workorders.surface_required', 'La surface est obligatoire.'));
            return;
        }"""
new_submit = """        const totalSurface = formData.surfaces?.reduce((sum, s) => sum + (parseFloat(s.surface) || 0), 0) || parseFloat(formData.surface) || 0;
        if (totalSurface <= 0) {
            setError(t('workorders.surface_required', 'La surface est obligatoire.'));
            return;
        }"""
content = content.replace(old_submit, new_submit)


# Fix 2: surfaces map UI
old_surfaces_map = """                                    {(formData.surfaces || []).map((s, index) => (
                                        <div key={s.id || index} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4 relative">
                                            {formData.surfaces.length > 1 && (
                                                <button type="button" onClick={() => {
                                                    const newSurfaces = formData.surfaces.filter((_, i) => i !== index);
                                                    setFormData({ ...formData, surfaces: newSurfaces });
                                                }} className="absolute top-3 right-3 text-red-400 hover:text-red-600 p-1 bg-white rounded-md shadow-sm border border-red-100">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{t('calculator.surface_label', 'Nom de la surface (ex: Terasă)')}</label>
                                                <input type="text" placeholder="Chape" value={s.label || ''} onChange={e => {
                                                    const newSurfaces = [...formData.surfaces];
                                                    newSurfaces[index].label = e.target.value;
                                                    setFormData({ ...formData, surfaces: newSurfaces });
                                                }} className="w-full bg-white border-2 rounded-xl px-3 py-2 text-sm border-slate-200 focus:border-yellow-400 focus:outline-none" />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className={`block text-[11px] font-bold mb-1.5 uppercase tracking-wider ${errorField === `surface_${index}` ? 'text-red-500' : 'text-slate-500'}`}>{t('calculator.surface', 'Surface (m²)')}</label>
                                                    <input type="number" required min="1" placeholder="120"
                                                        value={s.surface} onChange={e => {
                                                            const newSurfaces = [...formData.surfaces];
                                                            newSurfaces[index].surface = e.target.value;
                                                            setFormData({ ...formData, surfaces: newSurfaces });
                                                            if (errorField === `surface_${index}`) { setErrorField(''); setError(''); }
                                                        }}
                                                        className={`w-full bg-white border-2 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:bg-white transition-all ${errorField === `surface_${index}` ? 'border-red-400 text-red-600 focus:border-red-500 bg-red-50/30' : 'border-slate-100 focus:border-yellow-400'}`} />
                                                </div>
                                                <div>
                                                    <label className={`block text-[11px] font-bold mb-1.5 uppercase tracking-wider ${errorField === `thickness_${index}` ? 'text-red-500' : 'text-slate-500'}`}>{t('calculator.thickness', 'Épaisseur (cm)')}</label>
                                                    <input type="number" required min="5" step="0.5" placeholder="5"
                                                        value={s.thickness} onChange={e => {
                                                            const newSurfaces = [...formData.surfaces];
                                                            newSurfaces[index].thickness = e.target.value;
                                                            setFormData({ ...formData, surfaces: newSurfaces });
                                                            if (errorField === `thickness_${index}`) { setErrorField(''); setError(''); }
                                                        }}
                                                        className={`w-full bg-white border-2 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:bg-white transition-all ${errorField === `thickness_${index}` ? 'border-red-400 text-red-600 focus:border-red-500 bg-red-50/30' : 'border-slate-100 focus:border-yellow-400'}`} />
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{t('calculator.options', 'Options')}</label>
                                                <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${s.has_foil ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100 bg-white hover:border-yellow-200'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Layers className={`w-5 h-5 ${s.has_foil ? 'text-yellow-600' : 'text-slate-400'}`} />
                                                        <span className="font-bold text-sm text-slate-900">{t('calculator.foil', 'Film plastique')}</span>
                                                    </div>
                                                    <input type="checkbox" checked={s.has_foil} onChange={e => {
                                                        const newSurfaces = [...formData.surfaces];
                                                        newSurfaces[index].has_foil = e.target.checked;
                                                        setFormData({ ...formData, surfaces: newSurfaces });
                                                    }} className="w-4 h-4 accent-yellow-400" />
                                                </label>
                                                <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${s.has_mesh ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100 bg-white hover:border-yellow-200'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Grid3x3 className={`w-5 h-5 ${s.has_mesh ? 'text-yellow-600' : 'text-slate-400'}`} />
                                                        <span className="font-bold text-sm text-slate-900">{t('calculator.mesh', 'Treillis')}</span>
                                                    </div>
                                                    <input type="checkbox" checked={s.has_mesh} onChange={e => {
                                                        const newSurfaces = [...formData.surfaces];
                                                        newSurfaces[index].has_mesh = e.target.checked;
                                                        setFormData({ ...formData, surfaces: newSurfaces });
                                                    }} className="w-4 h-4 accent-yellow-400" />
                                                </label>
                                                <label className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all border-yellow-400 bg-yellow-50/50 opacity-80 cursor-not-allowed`} title={t('calculator.duramint_always_included', 'Toujours inclus')}>
                                                    <div className="flex items-center gap-3">
                                                        <Layers className={`w-5 h-5 text-yellow-600`} />
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm text-slate-900">{t('calculator.duramint', 'Fibre')}</span>
                                                            <span className="text-[10px] text-yellow-700">{t('calculator.always_included', 'Toujours inclus')}</span>
                                                        </div>
                                                    </div>
                                                    <input type="checkbox" checked={true} readOnly className="w-4 h-4 accent-yellow-400 cursor-not-allowed" />
                                                </label>
                                            </div>
                                        </div>
                                    ))}"""

new_surfaces_map = """                                    {(formData.surfaces || []).map((s, index) => (
                                        <div key={s.id || index} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{t('calculator.surface_label', 'Nom')}</label>
                                                    <input type="text" placeholder="Chape" value={s.label || ''} onChange={e => {
                                                        const newSurfaces = [...formData.surfaces];
                                                        newSurfaces[index].label = e.target.value;
                                                        setFormData({ ...formData, surfaces: newSurfaces });
                                                    }} className="w-full bg-white border-2 rounded-xl px-2 py-2 text-sm border-slate-200 focus:border-yellow-400 focus:outline-none" />
                                                </div>
                                                <div className="w-24">
                                                    <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${errorField === `surface_${index}` ? 'text-red-500' : 'text-slate-500'}`}>{t('calculator.surface', 'Sur. (m²)')}</label>
                                                    <input type="number" required min="1" placeholder="120"
                                                        value={s.surface} onChange={e => {
                                                            const newSurfaces = [...formData.surfaces];
                                                            newSurfaces[index].surface = e.target.value;
                                                            setFormData({ ...formData, surfaces: newSurfaces });
                                                            if (errorField === `surface_${index}`) { setErrorField(''); setError(''); }
                                                        }}
                                                        className={`w-full bg-white border-2 rounded-xl px-2 py-2 text-sm focus:outline-none focus:bg-white transition-all ${errorField === `surface_${index}` ? 'border-red-400 text-red-600 focus:border-red-500 bg-red-50/30' : 'border-slate-100 focus:border-yellow-400'}`} />
                                                </div>
                                                <div className="w-24">
                                                    <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${errorField === `thickness_${index}` ? 'text-red-500' : 'text-slate-500'}`}>{t('calculator.thickness', 'Ép. (cm)')}</label>
                                                    <input type="number" required min="5" step="0.5" placeholder="5"
                                                        value={s.thickness} onChange={e => {
                                                            const newSurfaces = [...formData.surfaces];
                                                            newSurfaces[index].thickness = e.target.value;
                                                            setFormData({ ...formData, surfaces: newSurfaces });
                                                            if (errorField === `thickness_${index}`) { setErrorField(''); setError(''); }
                                                        }}
                                                        className={`w-full bg-white border-2 rounded-xl px-2 py-2 text-sm focus:outline-none focus:bg-white transition-all ${errorField === `thickness_${index}` ? 'border-red-400 text-red-600 focus:border-red-500 bg-red-50/30' : 'border-slate-100 focus:border-yellow-400'}`} />
                                                </div>
                                                {formData.surfaces.length > 1 && (
                                                    <button type="button" onClick={() => {
                                                        const newSurfaces = formData.surfaces.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, surfaces: newSurfaces });
                                                    }} className="h-[40px] px-3 bg-red-50 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-colors border border-red-100 flex items-center justify-center">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}"""

content = content.replace(old_surfaces_map, new_surfaces_map)

# Fix 3: Options extracted
old_add_btn = """                                    <button type="button" onClick={() => {
                                        setFormData({
                                            ...formData,
                                            surfaces: [...formData.surfaces, { id: Date.now().toString(), label: '', surface: '', thickness: '', has_foil: false, has_mesh: false, has_duramint: true }]
                                        });
                                    }} className="w-full border-2 border-dashed border-slate-200 text-slate-500 hover:text-yellow-600 hover:border-yellow-400 hover:bg-yellow-50 py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2">
                                        + {t('calculator.add_surface', 'Ajouter une autre surface')}
                                    </button>
                                </div>"""

new_add_btn = """                                    <button type="button" onClick={() => {
                                        setFormData({
                                            ...formData,
                                            surfaces: [...formData.surfaces, { id: Date.now().toString(), label: '', surface: '', thickness: '', has_foil: false, has_mesh: false, has_duramint: true }]
                                        });
                                    }} className="w-full border-2 border-dashed border-slate-200 text-slate-500 hover:text-yellow-600 hover:border-yellow-400 hover:bg-yellow-50 py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2">
                                        + {t('calculator.add_surface', 'Ajouter une autre surface')}
                                    </button>
                                </div>

                                {/* Global Options */}
                                <div className="space-y-2 mt-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{t('calculator.options', 'Options')}</label>
                                    <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.has_foil ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100 bg-white hover:border-yellow-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <Layers className={`w-5 h-5 ${formData.has_foil ? 'text-yellow-600' : 'text-slate-400'}`} />
                                            <span className="font-bold text-sm text-slate-900">{t('calculator.foil', 'Film plastique')}</span>
                                        </div>
                                        <input type="checkbox" checked={formData.has_foil} onChange={e => setFormData({ ...formData, has_foil: e.target.checked })} className="w-4 h-4 accent-yellow-400" />
                                    </label>
                                    <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.has_mesh ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100 bg-white hover:border-yellow-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <Grid3x3 className={`w-5 h-5 ${formData.has_mesh ? 'text-yellow-600' : 'text-slate-400'}`} />
                                            <span className="font-bold text-sm text-slate-900">{t('calculator.mesh', 'Treillis')}</span>
                                        </div>
                                        <input type="checkbox" checked={formData.has_mesh} onChange={e => setFormData({ ...formData, has_mesh: e.target.checked })} className="w-4 h-4 accent-yellow-400" />
                                    </label>
                                    <label className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all border-yellow-400 bg-yellow-50/50 opacity-80 cursor-not-allowed`} title={t('calculator.duramint_always_included', 'Toujours inclus')}>
                                        <div className="flex items-center gap-3">
                                            <Layers className={`w-5 h-5 text-yellow-600`} />
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-slate-900">{t('calculator.duramint', 'Fibre')}</span>
                                                <span className="text-[10px] text-yellow-700">{t('calculator.always_included', 'Toujours inclus')}</span>
                                            </div>
                                        </div>
                                        <input type="checkbox" checked={true} readOnly className="w-4 h-4 accent-yellow-400 cursor-not-allowed" />
                                    </label>
                                </div>"""
content = content.replace(old_add_btn, new_add_btn)

with open('src/pages/DevisOnline.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched DevisOnline.jsx successfully")

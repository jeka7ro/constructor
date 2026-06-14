with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# 1. Add showAccess state after showFullSite
old_state = "    const [showFullSite, setShowFullSite] = useState(!isEdit);"
new_state = """    const [showFullSite, setShowFullSite] = useState(!isEdit);
    const [showAccess, setShowAccess] = useState(false);"""
content = content.replace(old_state, new_state)

# 2. Replace the entire Instructiuni Acces section with a collapsible version
old_section = """            {/* 7. Instructiuni Acces */}
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <Section icon={Image} title={t('work_order_form.access_instructions_title', 'Instructiuni Acces (vizibile echipei)')} zIndex={10}>
                <Field label={t('work_order_form.access_notes', 'Note Acces')}>
                    <textarea
                        value={form.access_notes}
                        onChange={e => set('access_notes', e.target.value)}
                        placeholder="Cod intrare: 1234&#10;Etaj 3, apartament stanga&#10;Suna la interfon la Ionescu"
                        rows={4}
                        className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none"
                    />
                </Field>

                {/* Poze instructiuni */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            {t('work_order_form.instruction_photos', 'Poze Instructiuni')} ({instructionPhotos.length})
                        </span>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                        >
                            <Plus className="w-3 h-3" /> {t('common.add_photo', 'Adauga Poza')}
                        </button>
                            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
                        </div>
                        {instructionPhotos.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {instructionPhotos.map((p, i) => (
                                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                                        <img src={p.preview} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removePhoto(i)}
                                            className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-slate-400">{t('work_order_form.photos_visibility_note', 'Aceste poze sunt vizibile doar pentru echipa, nu apar la client.')}</p>
                    </div>
                </Section>"""

new_section = """            {/* 7. Instructions Accès — collapsible */}
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                {/* Header — always visible, click to toggle */}
                <button
                    type="button"
                    onClick={() => setShowAccess(v => !v)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-600 dark:bg-slate-800 rounded-t-xl hover:bg-blue-700 transition-colors"
                >
                    <Image className="w-4 h-4 text-white" />
                    <h3 className="font-bold text-white text-sm flex-1 text-left">{t('work_order_form.access_instructions_title', 'Instructions d\'accès (visibles par l\'équipe)')}</h3>
                    {(form.access_notes || instructionPhotos.length > 0) && (
                        <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                            {[form.access_notes ? '✓ notes' : null, instructionPhotos.length > 0 ? `${instructionPhotos.length} 📷` : null].filter(Boolean).join('  ')}
                        </span>
                    )}
                    <span className="text-white/70 text-xs">{showAccess ? '▲' : '▼'}</span>
                </button>

                {/* Collapsible content */}
                {showAccess && (
                    <div className="p-3 space-y-3">
                        <Field label={t('work_order_form.access_notes', 'INSTRUCTIONS / NOTES D\'ACCÈS')}>
                            <textarea
                                value={form.access_notes}
                                onChange={e => set('access_notes', e.target.value)}
                                placeholder="Cod intrare: 1234&#10;Etaj 3, apartament stanga&#10;Suna la interfon la Ionescu"
                                rows={3}
                                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none"
                            />
                        </Field>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                {t('work_order_form.instruction_photos', 'Photos')} ({instructionPhotos.length})
                            </span>
                            <button type="button" onClick={() => fileRef.current?.click()}
                                className="flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
                                <Plus className="w-3 h-3" /> {t('common.add_photo', 'Ajouter photo')}
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
                        </div>
                        {instructionPhotos.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {instructionPhotos.map((p, i) => (
                                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                                        <img src={p.preview} alt="" className="w-full h-full object-cover" />
                                        <button onClick={() => removePhoto(i)}
                                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>"""

if old_section in content:
    content = content.replace(old_section, new_section)
    print("Replaced Instructiuni Acces section")
else:
    print("Section not found, searching substring...")
    idx = content.find("Instructiuni Acces (vizibile echipei)")
    print(f"  Found at idx: {idx}")
    # Show context
    if idx > 0:
        print(content[idx-50:idx+200])

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)

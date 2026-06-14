with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    lines = f.readlines()

new_lines = []

state_hooks = """    const [showFullClient, setShowFullClient] = useState(!isEdit);
    const [showFullSite, setShowFullSite] = useState(!isEdit);

    useEffect(() => {
        if (!isEdit) {
            setShowFullClient(true);
            setShowFullSite(true);
        }
    }, [isEdit]);
"""

skip = 0
for i, line in enumerate(lines):
    if skip > 0:
        skip -= 1
        continue

    if "const [showBankDetails" in line:
        new_lines.append(line)
        new_lines.append(state_hooks)
        continue

    # Client block replace
    if "{/* 2. Client */}" in line:
        # replace until line containing "</div>" after mapping over existing/new
        client_repl = """                        {/* 2. Client */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-blue-500" />
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('work_order_form.client', 'Client')}</h3>
                                </div>
                                {isEdit && !showFullClient && (
                                    <button type="button" onClick={() => setShowFullClient(true)} className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors">
                                        <Edit2 className="w-3 h-3" /> {t('common.edit', 'Modifică')}
                                    </button>
                                )}
                            </div>

                            {!showFullClient ? (
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                            <span className="text-blue-600 dark:text-blue-400 font-bold">{form.client_name ? form.client_name.charAt(0).toUpperCase() : '?'}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{form.client_name || 'Nume Nesetat'}</h4>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                                {form.client_phone && <span>📞 {form.client_phone}</span>}
                                                {form.client_email && <span>✉️ {form.client_email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mb-4">
                                        {[['existing', t('common.existing', 'Client Existent')], ['new', t('common.new', 'Client Nou')]].map(([m, label]) => (
                                            <button key={m} onClick={() => set('client_mode', m)}
                                                className={`px-4 h-8 rounded-full text-xs font-bold transition-all ${form.client_mode === m ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                                                {label}
                                            </button>
                                        ))}
                                        {isEdit && (
                                            <button type="button" onClick={() => setShowFullClient(false)} className="ml-auto flex items-center gap-1.5 px-3 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors">
                                                {t('common.cancel', 'Anulează')}
                                            </button>
                                        )}
                                    </div>
"""
        new_lines.append(client_repl)
        skip = 13 # skips lines from 567 to 580 inclusive (which is 14 lines total, skip 13 more)
        continue

    if line.strip() == '<div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-6"></div>':
        # Just before this, we must close the <> we opened for Client
        new_lines.insert(-2, "                                </>\n")
        new_lines.insert(-2, "                            )}\n")
        new_lines.append(line)
        continue

    # Site block replace
    if "{/* 3. Locatie + GPS */}" in line:
        site_repl = """                        {/* 3. Locatie + GPS */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-emerald-500" />
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('work_order_form.site_location', 'Locație Lucrare')}</h3>
                                </div>
                                {isEdit && !showFullSite && (
                                    <button type="button" onClick={() => setShowFullSite(true)} className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors">
                                        <Edit2 className="w-3 h-3" /> {t('common.edit', 'Modifică')}
                                    </button>
                                )}
                            </div>

                            {!showFullSite ? (
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                            <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{form.site_address || 'Adresă Nesetată'}</h4>
                                            {form.site_latitude && (
                                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                                    <span>📍 {form.site_latitude}, {form.site_longitude}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-2 mb-4">
                                        {[['existing', t('common.existing', 'Lucrare Existentă')], ['new', t('work_order_form.manual_address', 'Adresă Manuală')]].map(([m, label]) => (
                                            <button key={m} onClick={() => set('site_mode', m)}
                                                className={`px-4 h-8 rounded-full text-xs font-bold transition-all ${form.site_mode === m ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                                                {label}
                                            </button>
                                        ))}
                                        {isEdit && (
                                            <button type="button" onClick={() => setShowFullSite(false)} className="ml-auto flex items-center gap-1.5 px-3 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors">
                                                {t('common.cancel', 'Anulează')}
                                            </button>
                                        )}
                                    </div>
"""
        new_lines.append(site_repl)
        skip = 13
        continue

    if line.strip() == '</Section>' and "{/* 4. Planificare + Pret */}" in lines[i+2]:
        # we found the end of the first section
        new_lines.insert(-1, "                                </>\n")
        new_lines.insert(-1, "                            )}\n")
        new_lines.append(line)
        continue

    new_lines.append(line)

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.writelines(new_lines)

print("Patched WorkOrderForm with precise lines!")

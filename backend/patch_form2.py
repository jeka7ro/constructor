import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

state_hooks = """    const [showFullClient, setShowFullClient] = useState(!isEdit)
    const [showFullSite, setShowFullSite] = useState(!isEdit)

    useEffect(() => {
        if (!isEdit) {
            setShowFullClient(true);
            setShowFullSite(true);
        }
    }, [isEdit]);"""

if "showFullClient" not in content:
    content = content.replace("const [showBankDetails, setShowBankDetails] = useState(false)", "const [showBankDetails, setShowBankDetails] = useState(false)\n" + state_hooks)


# Replace Client Header
client_regex = re.compile(r"\{\/\* 2\. Client \*\/\}\n\s*<div>\n\s*<div className=\"flex items-center gap-2 mb-3\">\n\s*<User className=\"w-4 h-4 text-blue-500\" />\n\s*<h3 className=\"text-sm font-bold text-slate-700 dark:text-slate-300\">\{t\('work_order_form.client', 'Client'\)\}</h3>\n\s*</div>\n\s*<div className=\"flex gap-2 mb-4\">\n\s*\{\[\[\'existing\', t\('common.existing', 'Client Existent'\)\], \[\'new\', t\('common.new', 'Client Nou'\)\]\]\.map\(\(\[m, label\]\) => \(\n\s*<button key=\{m\} onClick=\{.*?\}\n\s*className=\{.*?\}>\n\s*\{label\}\n\s*</button>\n\s*\)\)\}\n\s*</div>")

client_replacement = """{/* 2. Client */}
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
                                    </div>"""

content = client_regex.sub(client_replacement, content)


# Close Client section and replace Location header
loc_regex = re.compile(r"(\s*</div>\n\s*)\}\n\s*</div>\n\n\s*<div className=\"h-px w-full bg-slate-100 dark:bg-slate-800 my-6\"></div>\n\n\s*\{\/\* 3\. Locatie \+ GPS \*\/\}\n\s*<div>\n\s*<div className=\"flex items-center gap-2 mb-3\">\n\s*<MapPin className=\"w-4 h-4 text-emerald-500\" />\n\s*<h3 className=\"text-sm font-bold text-slate-700 dark:text-slate-300\">\{t\('work_order_form.site_location', 'Locație Lucrare'\)\}</h3>\n\s*</div>\n\s*<div className=\"flex gap-2 mb-4\">\n\s*\{\[\[\'existing\', t\('common.existing', 'Lucrare Existentă'\)\], \[\'new\', t\('work_order_form.manual_address', 'Adresă Manuală'\)\]\]\.map\(\(\[m, label\]\) => \(\n\s*<button key=\{m\} onClick=\{.*?\}\n\s*className=\{.*?\}>\n\s*\{label\}\n\s*</button>\n\s*\)\)\}\n\s*</div>")

loc_replacement = r"""\1}
                                </>
                            )}
                        </div>

                        <div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-6"></div>

                        {/* 3. Locatie + GPS */}
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
                                    </div>"""
                                    
content = loc_regex.sub(loc_replacement, content)


# Close location section
loc_close_regex = re.compile(r"(\s*</div>\n\s*)\}\n\s*</div>\n\s*</Section>")

loc_close_replacement = r"""\1}
                                </>
                            )}
                        </div>
                    </Section>"""

content = loc_close_regex.sub(loc_close_replacement, content)

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)

print("Patched WorkOrderForm")

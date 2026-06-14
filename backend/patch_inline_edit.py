with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# Find the exact start of the Détails Généraux section and its closing Section tag
start_marker = "                <div className=\"space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500\">\n                    <Section icon={FileText}"
end_marker = "                    </Section>\n\n            {/* 4. Planificare"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"MARKERS NOT FOUND: start={start_idx}, end={end_idx}")
    exit(1)

new_section = '''                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Section icon={FileText} title={t('work_order_form.general_details', 'Détails Généraux')} zIndex={80}>
                        <div className="space-y-0">

                            {/* ===== COMPACT INLINE VIEW / EDIT ===== */}
                            {isEdit && !showFullClient && !showFullSite ? (
                                /* VIEW MODE — two tight rows, click to edit */
                                <div className="space-y-1">
                                    {/* Row 1 — Client */}
                                    <div
                                        onClick={() => setShowFullClient(true)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                            <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">{form.client_name ? form.client_name.charAt(0).toUpperCase() : '?'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{form.client_name || <span className="text-slate-400 italic">— client —</span>}</span>
                                            {form.client_phone && <span className="text-xs text-slate-500">📞 {form.client_phone}</span>}
                                            {form.client_email && <span className="text-xs text-slate-500">✉️ {form.client_email}</span>}
                                            {form.client_language && <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{form.client_language === 'fr' ? '🇫🇷' : form.client_language === 'en' ? '🇬🇧' : form.client_language === 'nl' ? '🇳🇱' : form.client_language === 'de' ? '🇩🇪' : form.client_language === 'ru' ? '🇷🇺' : '🇷🇴'} {form.client_language?.toUpperCase()}</span>}
                                        </div>
                                        <span className="text-xs text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 flex items-center gap-1"><Edit2 className="w-3 h-3" /> {t('common.edit', 'Modifier')}</span>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-slate-100 dark:bg-slate-800 mx-3" />

                                    {/* Row 2 — Location */}
                                    <div
                                        onClick={() => setShowFullSite(true)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group transition-colors"
                                    >
                                        <MapPin className="w-5 h-5 text-emerald-500 shrink-0" />
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {form.site_mode === 'existing' && selectedSite ? (
                                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{selectedSite.address}</span>
                                            ) : form.site_address ? (
                                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{form.site_address}</span>
                                            ) : (
                                                <span className="text-sm text-slate-400 italic">— {t('work_order_form.no_location', 'adresse non définie')} —</span>
                                            )}
                                            {(form.site_latitude && form.site_longitude) && (
                                                <span className="text-xs text-slate-400 shrink-0">📌 {parseFloat(form.site_latitude).toFixed(4)}, {parseFloat(form.site_longitude).toFixed(4)}</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0 flex items-center gap-1"><Edit2 className="w-3 h-3" /> {t('common.edit', 'Modifier')}</span>
                                    </div>
                                </div>
                            ) : (
                                /* EDIT MODE — compact inline fields */
                                <div className="space-y-3 p-1">

                                    {/* === CLIENT EDIT === */}
                                    <div className="space-y-2">
                                        {/* Toggle row */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <User className="w-4 h-4 text-blue-500 shrink-0" />
                                            <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-full">
                                                {[['existing', t('common.existing', 'Existant')], ['new', t('common.new', 'Nouveau')]].map(([m, label]) => (
                                                    <button key={m} type="button" onClick={() => set('client_mode', m)}
                                                        className={`px-3 h-6 rounded-full text-xs font-bold transition-all ${form.client_mode === m ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}>
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                            {form.client_mode === 'new' && (
                                                <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-full">
                                                    {[['fizica', t('work_order_form.company_type_physical', 'Particulier')], ['juridica', t('work_order_form.company_type_juridical', 'Entreprise')]].map(([m, label]) => (
                                                        <button key={m} type="button" onClick={() => set('client_type', m)}
                                                            className={`px-3 h-6 rounded-full text-xs font-bold transition-all ${form.client_type === m ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}>
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {isEdit && (
                                                <button type="button" onClick={() => { setShowFullClient(false); setShowFullSite(false); }}
                                                    className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                                    <X className="w-3.5 h-3.5" /> {t('common.cancel', 'Fermer')}
                                                </button>
                                            )}
                                        </div>

                                        {/* Fields row */}
                                        {form.client_mode === 'existing' ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                                                <div className="sm:col-span-3">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('work_order_form.select_client', 'Client')}</label>
                                                    <select value={form.client_id} onChange={e => {
                                                        const cl = clients.find(c => c.id === e.target.value)
                                                        setForm(p => ({
                                                            ...p,
                                                            client_id: e.target.value,
                                                            client_name: cl?.name || '',
                                                            client_email: cl?.email || '',
                                                            client_phone: cl?.phone || '',
                                                            client_language: cl?.preferred_language || 'ro',
                                                        }))
                                                    }} className={SELECT}>
                                                        <option value="">— {t('work_order_form.select_client', 'Choisir client')} —</option>
                                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('work_order_form.language', 'Langue')}</label>
                                                    <select value={form.client_language} onChange={e => set('client_language', e.target.value)} className={SELECT}>
                                                        <option value="ro">🇷🇴 RO</option>
                                                        <option value="en">🇬🇧 EN</option>
                                                        <option value="fr">🇫🇷 FR</option>
                                                        <option value="de">🇩🇪 DE</option>
                                                        <option value="nl">🇳🇱 NL</option>
                                                        <option value="ru">🇷🇺 RU</option>
                                                    </select>
                                                </div>
                                                {selectedClient && (
                                                    <div className="sm:col-span-4 flex gap-4 text-xs text-slate-500 px-1">
                                                        {selectedClient.phone && <span>📞 {selectedClient.phone}</span>}
                                                        {selectedClient.email && <span>✉️ {selectedClient.email}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                                                <div className="sm:col-span-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('work_order_form.full_name', 'Nom')} *</label>
                                                    <input type="text" value={form.client_name} onChange={e => set('client_name', e.target.value)} className={INPUT} placeholder="Popescu Ion" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('common.phone', 'Tél')}</label>
                                                    <input type="text" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} className={INPUT} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('common.email', 'Email')}</label>
                                                    <input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} className={INPUT} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('work_order_form.language', 'Langue')}</label>
                                                    <select value={form.client_language} onChange={e => set('client_language', e.target.value)} className={SELECT}>
                                                        <option value="ro">🇷🇴 RO</option>
                                                        <option value="en">🇬🇧 EN</option>
                                                        <option value="fr">🇫🇷 FR</option>
                                                        <option value="de">🇩🇪 DE</option>
                                                        <option value="nl">🇳🇱 NL</option>
                                                        <option value="ru">🇷🇺 RU</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* === LOCATION EDIT === */}
                                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('work_order_form.site_location', 'Lieu du Chantier')}</span>
                                            <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-full ml-2">
                                                {[['existing', t('common.existing', 'Sauvegardé')], ['new', t('common.new', 'Nouvelle adresse')]].map(([m, label]) => (
                                                    <button key={m} type="button" onClick={() => set('site_mode', m)}
                                                        className={`px-3 h-6 rounded-full text-xs font-bold transition-all ${form.site_mode === m ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}>
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {form.site_mode === 'existing' ? (
                                            <select value={form.site_id} onChange={e => set('site_id', e.target.value)} className={SELECT}>
                                                <option value="">— {t('work_order_form.select_location', 'Choisir chantier')} —</option>
                                                {sites.map(s => <option key={s.id} value={s.id}>{s.address}</option>)}
                                            </select>
                                        ) : (
                                            <div className="space-y-2">
                                                <AddressAutocomplete
                                                    value={form.site_address}
                                                    onChange={val => set('site_address', val)}
                                                    onSelect={({ address, lat, lon }) => setForm(p => ({ ...p, site_address: address, site_latitude: lat, site_longitude: lon }))}
                                                    placeholder={t('work_order_form.address_placeholder', 'Chercher une adresse...')}
                                                    className={INPUT}
                                                />
                                                {form.site_latitude && form.site_longitude && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
                                                        <MapPin className="w-3 h-3 text-emerald-500" />
                                                        <span>{parseFloat(form.site_latitude).toFixed(5)}, {parseFloat(form.site_longitude).toFixed(5)}</span>
                                                        <button type="button" onClick={handleDetectGPS} disabled={detecting}
                                                            className="ml-auto flex items-center gap-1 px-2 h-6 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-xs font-bold transition-colors disabled:opacity-60">
                                                            {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                                            {detecting ? t('work_order_form.detecting', 'Détection...') : t('work_order_form.detect_auto', 'GPS auto')}
                                                        </button>
                                                    </div>
                                                )}
                                                {!form.site_latitude && (
                                                    <button type="button" onClick={handleDetectGPS} disabled={detecting}
                                                        className="flex items-center gap-1 px-3 h-7 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-xs font-bold transition-colors disabled:opacity-60">
                                                        {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                                        {detecting ? t('work_order_form.detecting', 'Détection...') : t('work_order_form.detect_auto', 'Détecter GPS auto')}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            )}

                        </div>
                    </Section>

            {/* 4. Planificare'''

content = content[:start_idx] + new_section + content[end_idx + len(end_marker):]

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)

print(f"Done! Replaced section from idx {start_idx} to {end_idx}")

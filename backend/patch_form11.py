import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# 1. Compact Instructiuni Acces
acc_target = """            <Section icon={Image} title={t('work_order_form.access_instructions_title', 'Instructiuni Acces (vizibile echipei)')} zIndex={10}>
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
                <div className="space-y-3">"""
acc_repl = """            <Section icon={Image} title={t('work_order_form.access_instructions_title', 'Instructions d\\'accès (visibles par l\\'équipe)')} zIndex={10}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label={t('work_order_form.access_notes', 'INSTRUCTIONS / NOTES D\\'ACCÈS')}>
                    <textarea
                        value={form.access_notes}
                        onChange={e => set('access_notes', e.target.value)}
                        placeholder="Cod intrare: 1234&#10;Etaj 3, apartament stanga&#10;Suna la interfon la Ionescu"
                        rows={3}
                        className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none"
                    />
                </Field>

                {/* Poze instructiuni */}
                <div className="space-y-3">"""
content = content.replace(acc_target, acc_repl)

acc_end_target = """                            <p className="text-xs text-slate-400">{t('work_order_form.photos_visibility_note', 'Aceste poze sunt vizibile doar pentru echipa, nu apar la client.')}</p>
                        </div>
                    </Section>"""
acc_end_repl = """                            <p className="text-xs text-slate-400">{t('work_order_form.photos_visibility_note', 'Ces photos sont visibles uniquement par l\\'équipe.')}</p>
                        </div>
                        </div>
                    </Section>"""
content = content.replace(acc_end_target, acc_end_repl)

# 2. REMOVE Valoare estimata input and translate Calcul Cost
val_target = """            {/* 7. Preț Estimativ (Proformă) */}
            <Section icon={Banknote} title={t('work_order_form.estimated_price_title', 'Preț Estimativ (Proformă)')} zIndex={10}>
                <div className="flex flex-col gap-4">
                    <Field label={t('work_order_form.estimated_value', 'Valoare estimată')}>
                        <div className="flex w-full sm:w-1/2 shadow-sm rounded-xl">
                            <input type="text"
                                value={form.estimated_amount || ''}
                                onChange={e => {
                                    set('estimated_amount', e.target.value)
                                    set('estimated_price', e.target.value ? `${e.target.value} ${form.estimated_currency || 'EUR'}` : '')
                                }}
                                placeholder="ex: 1500"
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-l-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400" 
                            />
                            <select
                                value={form.estimated_currency || 'EUR'}
                                onChange={e => {
                                    set('estimated_currency', e.target.value)
                                    if (form.estimated_amount) {
                                        set('estimated_price', `${form.estimated_amount} ${e.target.value}`)
                                    }
                                }}
                                className="w-24 px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-l-0 border-slate-200 dark:border-slate-700 rounded-r-xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="EUR">EUR</option>
                                <option value="RON">RON</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 font-medium flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5" />
                            {t('work_order_form.proforma_note', 'Apare pe proforma trimisă clientului')}
                        </p>
                    </Field>
                    
                    {/* separator hidden on md+ */}
                    <div className="md:hidden h-px w-full bg-slate-100 dark:bg-slate-800 my-2"></div>"""
                    
val_repl = """            {/* 7. Preț Estimativ (Proformă) */}
            <Section icon={Banknote} title={t('work_order_form.estimated_price_title', 'Prix ​​Estimé (Facture Proforma)')} zIndex={10}>
                <div className="flex flex-col gap-4">"""

if "Preț Estimativ (Proformă)" in content and "Valoare estimată" in content:
    # Actually wait! The target may not match if "separator hidden on md+" is not there.
    pass


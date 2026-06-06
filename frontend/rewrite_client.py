with open("src/pages/admin/WorkOrderForm.jsx", "r") as f:
    code = f.read()

# Update EMPTY_FORM
old_empty = """    client_email: '',
    client_phone: '',
    client_language: 'ro',
    # Locatie"""
new_empty = """    client_email: '',
    client_phone: '',
    client_language: 'ro',
    client_type: 'fizica',
    client_contact_person: '',
    client_address: '',
    client_company_reg_number: '',
    client_company_vat: '',
    client_company_bank: '',
    client_company_iban: '',
    // Locatie"""
code = code.replace(old_empty.replace("#", "//"), new_empty)

# Update client mode "new" section
old_client_new = """                                <div className="space-y-3">
                                    <Field label="Nume Client" required>
                                        <input type="text" value={form.client_name}
                                            onChange={e => set('client_name', e.target.value)}
                                            placeholder="Familia Ionescu / SC Firma SRL"
                                            className={INPUT} />
                                    </Field>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                        <Field label="Telefon">
                                            <input type="text" value={form.client_phone}
                                                onChange={e => set('client_phone', e.target.value)}
                                                placeholder="+40 722 ..."
                                                className={INPUT} />
                                        </Field>
                                        <Field label="Email">
                                            <input type="email" value={form.client_email}
                                                onChange={e => set('client_email', e.target.value)}
                                                placeholder="contact@..."
                                                className={INPUT} />
                                        </Field>
                                        <Field label="Limba">
                                            <select 
                                                value={form.client_language} 
                                                onChange={e => set('client_language', e.target.value)}
                                                className={SELECT}
                                            >
                                                <option value="ro">🇷🇴 Română</option>
                                                <option value="en">🇬🇧 Engleză</option>
                                                <option value="fr">🇫🇷 Franceză</option>
                                                <option value="de">🇩🇪 Germană</option>
                                                <option value="nl">🇳🇱 Olandeză</option>
                                                <option value="ru">🇷🇺 Rusă</option>
                                            </select>
                                        </Field>
                                    </div>
                                </div>"""

new_client_new = """                                <div className="space-y-4">
                                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                        <button type="button" onClick={() => set('client_type', 'juridica')}
                                            className={`flex-1 px-4 h-8 rounded-md text-xs font-bold transition-all ${form.client_type === 'juridica' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                            Persoană Juridică
                                        </button>
                                        <button type="button" onClick={() => set('client_type', 'fizica')}
                                            className={`flex-1 px-4 h-8 rounded-md text-xs font-bold transition-all ${form.client_type === 'fizica' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                            Persoană Fizică
                                        </button>
                                    </div>

                                    {form.client_type === 'juridica' ? (
                                        <>
                                            <Field label="Nume Companie *" required>
                                                <input type="text" value={form.client_name} onChange={e => set('client_name', e.target.value)} className={INPUT} />
                                            </Field>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="CUI"><input type="text" value={form.client_company_vat} onChange={e => set('client_company_vat', e.target.value)} className={INPUT} /></Field>
                                                <Field label="Nr. Reg. Comerțului"><input type="text" value={form.client_company_reg_number} onChange={e => set('client_company_reg_number', e.target.value)} className={INPUT} /></Field>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <Field label="Nume Bancă"><input type="text" value={form.client_company_bank} onChange={e => set('client_company_bank', e.target.value)} className={INPUT} /></Field>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Field label="IBAN"><input type="text" value={form.client_company_iban} onChange={e => set('client_company_iban', e.target.value)} className={INPUT} /></Field>
                                                    <Field label="SWIFT"><input type="text" value={form.client_company_swift} onChange={e => set('client_company_swift', e.target.value)} className={INPUT} /></Field>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <Field label="Nume și Prenume *" required>
                                            <input type="text" value={form.client_name} onChange={e => set('client_name', e.target.value)} className={INPUT} placeholder="Popescu Ion" />
                                        </Field>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Field label="Telefon"><input type="text" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} className={INPUT} /></Field>
                                        <Field label="Email"><input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} className={INPUT} /></Field>
                                    </div>
                                    <Field label="Adresă"><input type="text" value={form.client_address} onChange={e => set('client_address', e.target.value)} className={INPUT} /></Field>

                                    <div className={`grid ${form.client_type === 'juridica' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                                        {form.client_type === 'juridica' && (
                                            <Field label="Persoană de Contact">
                                                <input type="text" value={form.client_contact_person} onChange={e => set('client_contact_person', e.target.value)} className={INPUT} />
                                            </Field>
                                        )}
                                        <Field label="Limba">
                                            <select value={form.client_language} onChange={e => set('client_language', e.target.value)} className={SELECT}>
                                                <option value="ro">🇷🇴 Română</option>
                                                <option value="en">🇬🇧 Engleză</option>
                                                <option value="fr">🇫🇷 Franceză</option>
                                                <option value="de">🇩🇪 Germană</option>
                                                <option value="nl">🇳🇱 Olandeză</option>
                                                <option value="ru">🇷🇺 Rusă</option>
                                            </select>
                                        </Field>
                                    </div>
                                </div>"""

if old_client_new in code:
    code = code.replace(old_client_new, new_client_new)
    with open("src/pages/admin/WorkOrderForm.jsx", "w") as f:
        f.write(code)
    print("Updated WorkOrderForm.jsx")
else:
    print("Could not find the block to replace in WorkOrderForm.jsx")

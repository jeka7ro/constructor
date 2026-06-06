import re

with open("src/pages/admin/WorkOrderForm.jsx", "r") as f:
    code = f.read()

# Add showBankDetails state
if "const [showBankDetails, setShowBankDetails] = useState(false)" not in code:
    code = code.replace("const [savedId, setSavedId] = useState(null)",
                        "const [savedId, setSavedId] = useState(null)\n    const [showBankDetails, setShowBankDetails] = useState(false)")

# Fix UI for Bank and Limba
old_ui = """                                            <div className="grid grid-cols-1 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
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
                                    </div>"""

new_ui = """                                            <div>
                                                <label className="flex items-center gap-2 cursor-pointer mb-3">
                                                    <input type="checkbox" checked={showBankDetails} onChange={e => setShowBankDetails(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Adaugă detalii bancare (Bancă, IBAN, SWIFT)</span>
                                                </label>
                                                {showBankDetails && (
                                                    <div className="space-y-4">
                                                        <Field label="Nume Bancă"><input type="text" value={form.client_company_bank} onChange={e => set('client_company_bank', e.target.value)} className={INPUT} /></Field>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Field label="IBAN"><input type="text" value={form.client_company_iban} onChange={e => set('client_company_iban', e.target.value)} className={INPUT} /></Field>
                                                            <Field label="SWIFT"><input type="text" value={form.client_company_swift} onChange={e => set('client_company_swift', e.target.value)} className={INPUT} /></Field>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <Field label="Nume și Prenume *" required>
                                            <input type="text" value={form.client_name} onChange={e => set('client_name', e.target.value)} className={INPUT} placeholder="Popescu Ion" />
                                        </Field>
                                    )}

                                    {form.client_type === 'juridica' && (
                                        <Field label="Persoană de Contact">
                                            <input type="text" value={form.client_contact_person} onChange={e => set('client_contact_person', e.target.value)} className={INPUT} />
                                        </Field>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <Field label="Telefon"><input type="text" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} className={INPUT} /></Field>
                                        <Field label="Email"><input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} className={INPUT} /></Field>
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
                                    <Field label="Adresă"><input type="text" value={form.client_address} onChange={e => set('client_address', e.target.value)} className={INPUT} /></Field>"""

if old_ui in code:
    code = code.replace(old_ui, new_ui)
    with open("src/pages/admin/WorkOrderForm.jsx", "w") as f:
        f.write(code)
    print("Updated WorkOrderForm.jsx")
else:
    print("Could not find the block to replace in WorkOrderForm.jsx")

import re

with open("src/pages/admin/ClientsManagement.jsx", "r") as f:
    code = f.read()

# Add showBankDetails state
if "const [showBankDetails, setShowBankDetails] = useState(false)" not in code:
    code = code.replace("const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' })",
                        "const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' })\n    const [showBankDetails, setShowBankDetails] = useState(false)")

# Update handleOpenModal
code = code.replace("setShowModal(true)\n    }", "setShowBankDetails(!!(client?.bank_name || client?.iban || client?.swift))\n        setShowModal(true)\n    }")

# Fix Limba + Telefon + Email
old_limba_section = """                                <div className={`grid ${formData.client_type === 'juridica' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                                    {formData.client_type === 'juridica' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Persoană de Contact</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                value={formData.contact_person}
                                                onChange={e => setFormData({...formData, contact_person: e.target.value})}
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Limba Preferată</label>
                                        <select
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            value={formData.preferred_language}
                                            onChange={e => setFormData({...formData, preferred_language: e.target.value})}
                                        >
                                            <option value="ro">🇷🇴 Română</option>
                                            <option value="en">🇬🇧 Engleză</option>
                                            <option value="fr">🇫🇷 Franceză</option>
                                            <option value="de">🇩🇪 Germană</option>
                                            <option value="nl">🇳🇱 Olandeză</option>
                                            <option value="ru">🇷🇺 Rusă</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Telefon</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            value={formData.phone}
                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>
                                </div>"""

new_limba_section = """                                {formData.client_type === 'juridica' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Persoană de Contact</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            value={formData.contact_person}
                                            onChange={e => setFormData({...formData, contact_person: e.target.value})}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Telefon</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            value={formData.phone}
                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Limba Preferată</label>
                                        <select
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            value={formData.preferred_language}
                                            onChange={e => setFormData({...formData, preferred_language: e.target.value})}
                                        >
                                            <option value="ro">🇷🇴 Română</option>
                                            <option value="en">🇬🇧 Engleză</option>
                                            <option value="fr">🇫🇷 Franceză</option>
                                            <option value="de">🇩🇪 Germană</option>
                                            <option value="nl">🇳🇱 Olandeză</option>
                                            <option value="ru">🇷🇺 Rusă</option>
                                        </select>
                                    </div>
                                </div>"""

code = code.replace(old_limba_section, new_limba_section)

# Fix Bank details block
old_bank_section = """                                        <div className="grid grid-cols-1 gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Nume Bancă</label>
                                                <input type="text" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">IBAN</label>
                                                    <input type="text" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value})} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">SWIFT</label>
                                                    <input type="text" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.swift} onChange={e => setFormData({...formData, swift: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>"""

new_bank_section = """                                        <div>
                                            <label className="flex items-center gap-2 cursor-pointer mb-3">
                                                <input type="checkbox" checked={showBankDetails} onChange={e => setShowBankDetails(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Adaugă detalii bancare (Bancă, IBAN, SWIFT)</span>
                                            </label>
                                            
                                            {showBankDetails && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Nume Bancă</label>
                                                        <input type="text" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">IBAN</label>
                                                            <input type="text" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value})} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">SWIFT</label>
                                                            <input type="text" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.swift} onChange={e => setFormData({...formData, swift: e.target.value})} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>"""

code = code.replace(old_bank_section, new_bank_section)

with open("src/pages/admin/ClientsManagement.jsx", "w") as f:
    f.write(code)

print("Updated ClientsManagement.jsx")

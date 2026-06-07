import re

with open("src/pages/admin/WorkOrderForm.jsx", "r") as f:
    code = f.read()

old_ui = """                        {/* 1. Titlu & Număr */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <Field label="Titlu Comandă (Opțional)">
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={e => set('title', e.target.value)}
                                        placeholder="Numele este opțional..."
                                        className={INPUT}
                                        autoFocus
                                    />
                                </Field>
                            </div>
                            <div className="w-full sm:w-32">
                                <Field label="ID (Auto)">
                                    <div className="h-11 flex items-center px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-mono text-xs font-bold shadow-inner truncate">
                                        #DC-{(savedId || id) ? String(savedId || id).padStart(4, '0') : 'AUTO'}
                                    </div>
                                </Field>
                            </div>
                        </div>"""

new_ui = """                        {/* 1. Titlu */}
                        <div>
                            <Field label="Titlu Comandă (Opțional)">
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => set('title', e.target.value)}
                                    placeholder="De ex. Lucrare bloc nou... (Codul DC va fi generat automat)"
                                    className={INPUT}
                                    autoFocus
                                />
                            </Field>
                        </div>"""

code = code.replace(old_ui, new_ui)

with open("src/pages/admin/WorkOrderForm.jsx", "w") as f:
    f.write(code)

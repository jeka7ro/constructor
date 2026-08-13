import re

file_path = "frontend/src/pages/DevisOnline.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Snowflake/Thermometer icon imports
old_imports = "import { Building2, User, Loader2, CheckCircle2, HardHat, FileText, ChevronRight, Home, Layers, Grid3x3, ShieldCheck, ChevronLeft, Search, Camera, Trash2 } from 'lucide-react';"
new_imports = "import { Building2, User, Loader2, CheckCircle2, HardHat, FileText, ChevronRight, Home, Layers, Grid3x3, ShieldCheck, ChevronLeft, Search, Camera, Trash2, Snowflake, Thermometer, Wind, Paintbrush, Shield, Ruler } from 'lucide-react';"
content = content.replace(old_imports, new_imports)

# 2. Add isolation fields to formData
old_formdata = """        has_duramint: true,
        approximate_date: '',
        honeypot: ''
    });"""
new_formdata = """        has_duramint: true,
        approximate_date: '',
        honeypot: '',
        // Isolation
        needs_isolation: false,
        isolation_type: '',
        isolation_surface: '',
        isolation_thickness: '',
        isolation_pur_aspiration: false,
        isolation_pur_niveller: false,
        isolation_pur_poncage: false,
        isolation_pur_protection: false
    });"""
content = content.replace(old_formdata, new_formdata)

# 3. Add isolation data to webhook payload (after has_duramint)
old_webhook_duramint = """                        has_duramint: formData.has_duramint,
                        source_domain: domain,"""
new_webhook_duramint = """                        has_duramint: formData.has_duramint,
                        needs_isolation: formData.needs_isolation,
                        isolation_type: formData.isolation_type,
                        isolation_surface: formData.isolation_surface,
                        isolation_thickness: formData.isolation_thickness,
                        source_domain: domain,"""
content = content.replace(old_webhook_duramint, new_webhook_duramint)

# 4. Add isolation data to submit payload
old_submit = "const res = await publicApi.post('/submit', { ...formData, domain, is_iframe: isIframe, source: urlSource });"
new_submit = """const submitData = { ...formData, domain, is_iframe: isIframe, source: urlSource };
            // Clean up isolation data if not needed
            if (!submitData.needs_isolation) {
                delete submitData.isolation_type;
                delete submitData.isolation_surface;
                delete submitData.isolation_thickness;
            }
            const res = await publicApi.post('/submit', submitData);"""
content = content.replace(old_submit, new_submit)

# 5. Change "Continuer" button from step 1 to go to step 1.5 instead of 2
old_continue = "                                    setError(''); setStep(2);"
new_continue = "                                    setError(''); setStep(1.5);"
content = content.replace(old_continue, new_continue, 1)  # Only first occurrence

# 6. Add title "Chape (Screed)" to step 1
old_step1_title = """                                <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 text-slate-900 tracking-tight">
                                    {t('calculator.project_details', 'Détails du Projet')}
                                </h1>
                                <p className="text-slate-500 text-sm sm:text-base">
                                    {t('calculator.describe_project', 'Décrivez le chantier pour que nous puissions calculer les matériaux.')}
                                </p>"""
new_step1_title = """                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                                        <Layers className="w-5 h-5 text-yellow-600" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                            {t('calculator.chape_title', 'Chape (Screed)')}
                                        </h1>
                                        <p className="text-slate-500 text-sm sm:text-base">
                                            {t('calculator.describe_project', 'Décrivez le chantier pour que nous puissions calculer les matériaux.')}
                                        </p>
                                    </div>
                                </div>"""
content = content.replace(old_step1_title, new_step1_title)

# 7. Insert the ISOLATION STEP (1.5) between step 1 and step 2
old_step2_comment = """                        {/* ═══════════════════════════════════ */}
                        {/* ÉTAPE 2 — ADRESSE DU CHANTIER      */}
                        {/* ═══════════════════════════════════ */}
                        {step === 2 && ("""

isolation_step = """                        {/* ═══════════════════════════════════ */}
                        {/* ÉTAPE 1.5 — ISOLATION (PUR / EPS)   */}
                        {/* ═══════════════════════════════════ */}
                        {step === 1.5 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <Snowflake className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                            {t('calculator.isolation_title', 'Isolation')}
                                        </h1>
                                        <p className="text-slate-500 text-sm sm:text-base">
                                            {t('calculator.isolation_sub', "Avez-vous besoin d'isolation pour ce chantier ?")}
                                        </p>
                                    </div>
                                </div>

                                {/* Yes / No buttons */}
                                {!formData.needs_isolation && !formData.isolation_type && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <button type="button" onClick={() => { setFormData(p => ({ ...p, needs_isolation: true })); }}
                                            className="p-5 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center gap-3">
                                            <Snowflake className="w-8 h-8 text-blue-500" />
                                            <span className="font-bold text-base text-slate-900">{t('common.yes', 'Oui')}</span>
                                            <span className="text-xs text-slate-500 text-center">{t('calculator.isolation_yes_sub', "J'ai besoin d'isolation")}</span>
                                        </button>
                                        <button type="button" onClick={() => { setFormData(p => ({ ...p, needs_isolation: false })); setStep(2); }}
                                            className="p-5 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-slate-300 transition-all flex flex-col items-center gap-3">
                                            <ChevronRight className="w-8 h-8 text-slate-400" />
                                            <span className="font-bold text-base text-slate-900">{t('common.no', 'Non')}</span>
                                            <span className="text-xs text-slate-500 text-center">{t('calculator.isolation_no_sub', 'Passer à la suite')}</span>
                                        </button>
                                    </div>
                                )}

                                {/* PUR vs EPS choice */}
                                {formData.needs_isolation && !formData.isolation_type && (
                                    <div className="space-y-4">
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('calculator.isolation_choose', "Type d'isolation")}</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button type="button" onClick={() => setFormData(p => ({ ...p, isolation_type: 'pur' }))}
                                                className="p-5 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex flex-col items-center gap-3">
                                                <Wind className="w-8 h-8 text-indigo-500" />
                                                <span className="font-bold text-base text-slate-900">PUR</span>
                                                <span className="text-xs text-slate-500 text-center">{t('calculator.pur_desc', 'Mousse polyuréthane projetée')}</span>
                                            </button>
                                            <button type="button" onClick={() => setFormData(p => ({ ...p, isolation_type: 'eps' }))}
                                                className="p-5 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50 transition-all flex flex-col items-center gap-3">
                                                <Thermometer className="w-8 h-8 text-emerald-500" />
                                                <span className="font-bold text-base text-slate-900">EPS</span>
                                                <span className="text-xs text-slate-500 text-center">{t('calculator.eps_desc', 'Polystyrène expansé')}</span>
                                            </button>
                                        </div>
                                        <button type="button" onClick={() => setFormData(p => ({ ...p, needs_isolation: false, isolation_type: '' }))}
                                            className="text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
                                            <ChevronLeft className="w-4 h-4" /> {t('common.back', 'Retour')}
                                        </button>
                                    </div>
                                )}

                                {/* PUR Form */}
                                {formData.isolation_type === 'pur' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                            <Wind className="w-5 h-5 text-indigo-600" />
                                            <span className="font-bold text-sm text-indigo-900">{t('calculator.pur_selected', 'Isolation PUR sélectionnée')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('calculator.surface', 'Surface (m²)')}</label>
                                                <input type="number" required min="1" placeholder="120"
                                                    value={formData.isolation_surface} onChange={e => setFormData(p => ({ ...p, isolation_surface: e.target.value }))}
                                                    className="w-full bg-slate-50 border-2 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:bg-white transition-all border-slate-100 focus:border-indigo-400" />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('calculator.thickness', 'Épaisseur (cm)')}</label>
                                                <input type="number" required min="3" step="0.5" placeholder="3"
                                                    value={formData.isolation_thickness} onChange={e => setFormData(p => ({ ...p, isolation_thickness: e.target.value }))}
                                                    className="w-full bg-slate-50 border-2 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:bg-white transition-all border-slate-100 focus:border-indigo-400" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{t('calculator.options', 'Options')}</label>
                                            {[
                                                { key: 'isolation_pur_aspiration', label: t('calculator.pur_aspiration', 'Aspiration'), icon: Wind, mandatory: config?.pricing?.is_pur_aspiration_mandatory },
                                                { key: 'isolation_pur_niveller', label: t('calculator.pur_niveller', 'Nivellement au laser'), icon: Ruler, mandatory: config?.pricing?.is_pur_niveller_mandatory },
                                                { key: 'isolation_pur_poncage', label: t('calculator.pur_poncage', 'Ponçage de la mousse'), icon: Paintbrush, mandatory: config?.pricing?.is_pur_poncage_mandatory },
                                                { key: 'isolation_pur_protection', label: t('calculator.pur_protection', 'Protection au-dessus 1M'), icon: Shield, mandatory: config?.pricing?.is_pur_protection_mandatory },
                                            ].map(opt => (
                                                <label key={opt.key} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${opt.mandatory ? 'border-indigo-400 bg-indigo-50/50 opacity-80 cursor-not-allowed' : formData[opt.key] ? 'border-indigo-400 bg-indigo-50/50 cursor-pointer' : 'border-slate-100 bg-slate-50 hover:border-indigo-200 cursor-pointer'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <opt.icon className={`w-5 h-5 ${(formData[opt.key] || opt.mandatory) ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm text-slate-900">{opt.label}</span>
                                                            {opt.mandatory && <span className="text-[10px] text-indigo-700">{t('calculator.always_included', 'Toujours inclus')}</span>}
                                                        </div>
                                                    </div>
                                                    <input type="checkbox" checked={opt.mandatory || formData[opt.key]} disabled={opt.mandatory}
                                                        onChange={e => { if (!opt.mandatory) setFormData(p => ({ ...p, [opt.key]: e.target.checked })); }}
                                                        className="w-4 h-4 accent-indigo-500" />
                                                </label>
                                            ))}
                                        </div>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => setFormData(p => ({ ...p, isolation_type: '' }))}
                                                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                                                <ChevronLeft className="w-5 h-5" /> {t('common.back', 'Retour')}
                                            </button>
                                            <button type="button" onClick={() => {
                                                if (!formData.isolation_surface || parseFloat(formData.isolation_surface) <= 0) {
                                                    setError(t('errors.surface_required', 'La surface est obligatoire.')); return;
                                                }
                                                setError(''); setStep(2);
                                            }} className="flex-[2] bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                                                {t('calculator.continue', 'Continuer')} <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* EPS Form */}
                                {formData.isolation_type === 'eps' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <Thermometer className="w-5 h-5 text-emerald-600" />
                                            <span className="font-bold text-sm text-emerald-900">{t('calculator.eps_selected', 'Isolation EPS sélectionnée')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('calculator.surface', 'Surface (m²)')}</label>
                                                <input type="number" required min="1" placeholder="120"
                                                    value={formData.isolation_surface} onChange={e => setFormData(p => ({ ...p, isolation_surface: e.target.value }))}
                                                    className="w-full bg-slate-50 border-2 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:bg-white transition-all border-slate-100 focus:border-emerald-400" />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('calculator.thickness', 'Épaisseur (cm)')}</label>
                                                <input type="number" required min="1" step="0.5" placeholder="5"
                                                    value={formData.isolation_thickness} onChange={e => setFormData(p => ({ ...p, isolation_thickness: e.target.value }))}
                                                    className="w-full bg-slate-50 border-2 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:bg-white transition-all border-slate-100 focus:border-emerald-400" />
                                            </div>
                                        </div>
                                        {formData.isolation_surface && formData.isolation_thickness && (
                                            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                <span className="text-sm text-slate-600">{t('calculator.eps_volume_calc', 'Volume calculé')}:</span>
                                                <span className="font-bold text-lg text-slate-900">
                                                    {(parseFloat(formData.isolation_surface) * parseFloat(formData.isolation_thickness) / 100).toFixed(2)} m³
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => setFormData(p => ({ ...p, isolation_type: '' }))}
                                                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                                                <ChevronLeft className="w-5 h-5" /> {t('common.back', 'Retour')}
                                            </button>
                                            <button type="button" onClick={() => {
                                                if (!formData.isolation_surface || parseFloat(formData.isolation_surface) <= 0) {
                                                    setError(t('errors.surface_required', 'La surface est obligatoire.')); return;
                                                }
                                                setError(''); setStep(2);
                                            }} className="flex-[2] bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                                                {t('calculator.continue', 'Continuer')} <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Skip button (always visible when choosing) */}
                                {formData.needs_isolation && formData.isolation_type && null}
                            </div>
                        )}

                        {/* ═══════════════════════════════════ */}
                        {/* ÉTAPE 2 — ADRESSE DU CHANTIER      */}
                        {/* ═══════════════════════════════════ */}
                        {step === 2 && ("""

content = content.replace(old_step2_comment, isolation_step)

# 8. Fix "Back" button on step 2 to go to 1.5 instead of 1
old_step2_back = """                                <button type="button" onClick={() => setStep(1)}
                                    className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700 transition-colors flex items-center gap-1">
                                    <ChevronLeft className="w-4 h-4" /> {t('common.back', 'Retour')}
                                </button>"""
# There might be multiple back buttons, let me be careful
content = content.replace('onClick={() => setStep(1)}', 'onClick={() => setStep(1.5)}', 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("DevisOnline patched with isolation step!")

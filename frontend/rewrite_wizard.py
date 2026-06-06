import re

with open('src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    code = f.read()

# 1. Add handleNext function before the return
handle_next_code = """
    const handleNext = () => {
        // Simple validation can be added here if needed
        if (currentStep < 3) {
            setCurrentStep(s => s + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

"""
code = code.replace("const selectedClient = clients.find(c => c.id === form.client_id)", handle_next_code + "    const selectedClient = clients.find(c => c.id === form.client_id)")

# 2. Add Stepper UI after {error && ...}
stepper_ui = """
            {/* Stepper UI */}
            <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-200 dark:bg-slate-800 -z-10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: currentStep === 1 ? '15%' : currentStep === 2 ? '50%' : '100%' }}></div>
                </div>
                {[
                    { step: 1, label: 'Detalii Generale' },
                    { step: 2, label: 'Planificare & Resurse' },
                    { step: 3, label: 'Financiar & Acces' }
                ].map(s => (
                    <div key={s.step} className="flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                            currentStep >= s.step 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-2 border-slate-200 dark:border-slate-700'
                        }`}>
                            {currentStep > s.step ? <Check className="w-4 h-4" /> : s.step}
                        </div>
                        <span className={`text-xs font-bold hidden sm:block ${currentStep >= s.step ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                            {s.label}
                        </span>
                    </div>
                ))}
            </div>

            <div className="max-w-3xl mx-auto space-y-6">
"""
code = code.replace("""            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Coloana Stânga */}
                <div className="space-y-6">""", stepper_ui + "\n                {currentStep === 1 && (\n                    <div className=\"space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500\">")

# 3. Close Step 1, open Step 2 before Planificare
code = code.replace("""                    <Section icon={Calendar} title="Planificare și Ofertare" zIndex={70}>""", """                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Section icon={Calendar} title="Planificare și Ofertare" zIndex={70}>""")

# 4. Remove right column divider, close Step 2 after Cantitati Estimate, open Step 3
# Wait, "Cantitati Estimate" is currently in the right column.
code = code.replace("""                </div>

                {/* Coloana Dreapta */}
                <div className="space-y-6">
                    <Section icon={FileText} title="Cantitati Estimate" zIndex={30}>""", """                    <Section icon={FileText} title="Cantitati Estimate" zIndex={30}>""")

code = code.replace("""                    <Section icon={FileText} title="Instrucțiuni Acces (vizibile echipei)">""", """                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Section icon={FileText} title="Instrucțiuni Acces (vizibile echipei)">""")

# 5. Close Step 3 and replace bottom buttons
code = code.replace("""            {/* Actions Bottom */}
            <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => navigate('/admin/work-orders')}
                    className="px-6 h-11 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    Anulează
                </button>
                <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-6 h-11 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 shadow-sm"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvează
                </button>
            </div>""", """                    </div>
                )}
            </div>

            {/* Actions Bottom */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => {
                        if (currentStep > 1) {
                            setCurrentStep(s => s - 1)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        } else {
                            navigate('/admin/work-orders')
                        }
                    }}
                    className="px-6 h-11 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    {currentStep > 1 ? 'Înapoi' : 'Anulează'}
                </button>
                
                <div className="flex gap-3">
                    {currentStep < 3 ? (
                        <button
                            onClick={handleNext}
                            className="flex items-center justify-center gap-2 px-8 h-11 rounded-full border border-transparent bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
                        >
                            Următorul
                        </button>
                    ) : (
                        <button
                            onClick={() => handleSave(false)}
                            disabled={saving}
                            className="flex items-center justify-center gap-2 px-8 h-11 rounded-full border border-transparent bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvează și Finalizează
                        </button>
                    )}
                </div>
            </div>""")

# Also fix the grid bug for mobile on volumes
code = code.replace("""<div className="grid grid-cols-3 gap-2">""", """<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">""")

# Now missing lucide-react imports: Check
if "Check" not in code.split("lucide-react")[0]: # rough check
    code = code.replace("import { ChevronLeft, Save, Loader2, FileText, Calendar, Users, Briefcase, MapPin, Plus, Trash2, Camera, UploadCloud, Info, CheckCircle, User, Truck, Phone, X, Edit2, Shield, LocateFixed } from 'lucide-react'", "import { ChevronLeft, Save, Loader2, FileText, Calendar, Users, Briefcase, MapPin, Plus, Trash2, Camera, UploadCloud, Info, CheckCircle, User, Truck, Phone, X, Edit2, Shield, LocateFixed, Check } from 'lucide-react'")

with open('src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(code)

print("Done")

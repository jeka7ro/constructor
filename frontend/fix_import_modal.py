import os
import re

# 1. Update ExpensesManagement.jsx to include the modal and fix the button
with open("src/pages/admin/ExpensesManagement.jsx", "r") as f:
    expenses_code = f.read()

expenses_code = expenses_code.replace("import { Link } from 'react-router-dom'", "import ImportInvoiceModal from './ImportInvoiceModal'")

# Add state for modal
expenses_code = expenses_code.replace("const [showModal, setShowModal] = useState(false)", "const [showModal, setShowModal] = useState(false)\n    const [showImportModal, setShowImportModal] = useState(false)")

# Replace the Link button with a proper modal button
bad_link = """                    <Link
                        to="/admin/import-factura"
                        className="flex items-center gap-2 px-4 h-10 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 text-sm font-bold rounded-full transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                        Import Factură (Materiale)
                    </Link>"""
good_btn = """                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-4 h-10 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-full transition-colors shadow-sm"
                    >
                        <FileText className="w-4 h-4 text-slate-500" />
                        Import Factură
                    </button>"""
expenses_code = expenses_code.replace(bad_link, good_btn)

# Add the modal component at the end
modal_mount = """            {showImportModal && (
                <ImportInvoiceModal onClose={() => setShowImportModal(false)} />
            )}
        </div>"""
expenses_code = expenses_code.replace("        </div>\n    )\n}", modal_mount + "\n    )\n}")

with open("src/pages/admin/ExpensesManagement.jsx", "w") as f:
    f.write(expenses_code)

# 2. Refactor ImportInvoice.jsx into ImportInvoiceModal.jsx
with open("src/pages/admin/ImportInvoice.jsx", "r") as f:
    import_code = f.read()

# Change function signature
import_code = import_code.replace("export default function ImportInvoice() {", "export default function ImportInvoiceModal({ onClose }) {")

# Wrap the main container in a modal overlay
modal_start = """        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shadow-inner">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Import Factură Materiale</h2>
                            <p className="text-xs text-slate-500">Extragere automată a cantităților în Gestiune</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">"""

# Replace the old header with the modal_start
old_header = """        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center shadow-inner">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Import Factură</h1>
                    <p className="text-slate-500 text-sm mt-1">Încarcă o factură PDF pentru a extrage automat cantitățile și a le adăuga în Gestiune.</p>
                </div>
            </div>"""

import_code = import_code.replace(old_header, modal_start)

# Add closing tags for modal at the very end
import_code = import_code.replace("        </div>\n    )\n}", "                </div>\n            </div>\n        </div>\n    )\n}")

# In the modal, we have a cancel button. Let's make it call onClose
import_code = import_code.replace("onClick={() => { setParsedData(null); setFile(null); }}", "onClick={onClose}")
import_code = import_code.replace("Anulează</button>", "Anulează</button>")

# After success save, close modal
import_code = import_code.replace("setParsedData(null)\n            setFile(null)", "onClose()")

# Save as ImportInvoiceModal.jsx
with open("src/pages/admin/ImportInvoiceModal.jsx", "w") as f:
    f.write(import_code)

# 3. Update App.jsx to remove the old route
with open("src/App.jsx", "r") as f:
    app_code = f.read()

app_code = app_code.replace("import ImportInvoice from './pages/admin/ImportInvoice'\n", "")
app_code = re.sub(r"<Route path=\"import-factura\" element=\{<ImportInvoice />\} />\s*", "", app_code)

with open("src/App.jsx", "w") as f:
    f.write(app_code)

# Remove old file
if os.path.exists("src/pages/admin/ImportInvoice.jsx"):
    os.remove("src/pages/admin/ImportInvoice.jsx")

print("Refactored to modal successfully.")

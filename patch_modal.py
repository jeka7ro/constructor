import re

with open("frontend/src/components/EmployeeDetailView.jsx", "r") as f:
    content = f.read()

# Add state
state_add = """    const [previewDoc, setPreviewDoc] = useState(null)
"""
if "previewDoc" not in content:
    content = content.replace("const [showDocUpload, setShowDocUpload] = useState(false)", "const [showDocUpload, setShowDocUpload] = useState(false)\n" + state_add)

# Add Modal UI at the bottom
modal_ui = """
            {/* Document Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-500" />
                                Vizualizare Document
                            </h3>
                            <div className="flex items-center gap-2">
                                <a 
                                    href={previewDoc} 
                                    download 
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Descarcă
                                </a>
                                <button 
                                    onClick={() => setPreviewDoc(null)}
                                    className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 overflow-hidden relative">
                            {previewDoc.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={previewDoc} className="w-full h-full rounded-xl border-0" title="PDF Preview" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center overflow-auto rounded-xl">
                                    <img src={previewDoc} alt="Preview" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
"""
if "Document Preview Modal" not in content:
    content = content.replace("        </div>\n    )\n}", modal_ui)


content = content.replace(
    '<a href={`${import.meta.env.VITE_API_URL?.replace(\'/api\', \'\') || \'\'}${user.contract_path}`} target="_blank" rel="noreferrer" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">\n                                                    Vizualizare Document\n                                                </a>',
    '<button onClick={() => setPreviewDoc(`${import.meta.env.VITE_API_URL?.replace(\'/api\', \'\') || \'\'}${user.contract_path}`)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">Vizualizare Document</button>'
)

content = content.replace(
    '<a href={`${import.meta.env.VITE_API_URL?.replace(\'/api\', \'\') || \'\'}${user.id_card_path}`} target="_blank" rel="noreferrer" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">\n                                                    Vizualizare Scan\n                                                </a>',
    '<button onClick={() => setPreviewDoc(`${import.meta.env.VITE_API_URL?.replace(\'/api\', \'\') || \'\'}${user.id_card_path}`)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">Vizualizare Scan</button>'
)

content = content.replace(
    '<a \n                                                    href={`${import.meta.env.VITE_API_URL?.replace(\'/api\', \'\') || \'\'}${doc.file_path}`} \n                                                    target="_blank" \n                                                    rel="noreferrer" \n                                                    className="flex-1 text-center py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"\n                                                >\n                                                    Deschide\n                                                </a>',
    '<button onClick={() => setPreviewDoc(`${import.meta.env.VITE_API_URL?.replace(\'/api\', \'\') || \'\'}${doc.file_path}`)} className="flex-1 text-center py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Deschide</button>'
)

# Add imports for Download, X
if "Download," not in content:
    content = content.replace("FileText, Trash2, Upload, File", "FileText, Trash2, Upload, File, Download, X")

with open("frontend/src/components/EmployeeDetailView.jsx", "w") as f:
    f.write(content)

print("Patched modal")

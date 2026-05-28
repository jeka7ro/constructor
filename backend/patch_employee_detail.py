import re

with open("../frontend/src/components/EmployeeDetailView.jsx", "r") as f:
    content = f.read()

# Add state variables
state_add = """    const [isUploadingDoc, setIsUploadingDoc] = useState(false)
    const [docName, setDocName] = useState('')
    const [docFile, setDocFile] = useState(null)
    const [showDocUpload, setShowDocUpload] = useState(false)
"""
if "isUploadingDoc" not in content:
    content = content.replace("const [loading, setLoading] = useState(true)", state_add + "    const [loading, setLoading] = useState(true)")

# Add upload handler
handler_add = """
    const handleUploadDocument = async (e) => {
        e.preventDefault()
        if (!docName || !docFile) return
        setIsUploadingDoc(true)
        try {
            const formData = new FormData()
            formData.append('name', docName)
            formData.append('file', docFile)
            
            const res = await api.post(`/admin/users/${user.id}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setDocuments([res.data, ...documents])
            setShowDocUpload(false)
            setDocName('')
            setDocFile(null)
        } catch (error) {
            console.error('Failed to upload document', error)
            alert('A apărut o eroare la încărcarea documentului.')
        } finally {
            setIsUploadingDoc(false)
        }
    }

    const handleDeleteDocument = async (docId) => {
        if (!window.confirm('Ești sigur că vrei să ștergi acest document?')) return
        try {
            await api.delete(`/admin/users/${user.id}/documents/${docId}`)
            setDocuments(documents.filter(d => d.id !== docId))
        } catch (error) {
            console.error('Failed to delete document', error)
        }
    }
"""
if "handleUploadDocument" not in content:
    content = content.replace("const fetchData = async () => {", handler_add + "\n    const fetchData = async () => {")

# Add UI block
ui_block = """
                {/* ══ DOCUMENTS TAB ══ */}
                {activeTab === 'documents' && (
                    <div className="space-y-6">
                        {/* Principal Documents */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Award className="w-4 h-4 text-blue-500" /> Documente Principale
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Contract */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white truncate">Contract de Muncă</p>
                                        <p className="text-xs text-slate-500 mt-1">Act oficial generat la angajare</p>
                                        <div className="mt-3 flex gap-2">
                                            {user.contract_path ? (
                                                <a href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${user.contract_path}`} target="_blank" rel="noreferrer" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                                    Vizualizare Document
                                                </a>
                                            ) : (
                                                <span className="text-xs font-medium text-slate-400">Nespecificat</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Buletin */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                        <File className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white truncate">Carte de Identitate (CI)</p>
                                        <p className="text-xs text-slate-500 mt-1">Scanat la creare profil</p>
                                        <div className="mt-3 flex gap-2">
                                            {user.id_card_path ? (
                                                <a href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${user.id_card_path}`} target="_blank" rel="noreferrer" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                                                    Vizualizare Scan
                                                </a>
                                            ) : (
                                                <span className="text-xs font-medium text-slate-400">Nespecificat</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100 dark:border-slate-800" />

                        {/* Additional Documents */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <File className="w-4 h-4 text-slate-500" /> Alte Documente ({documents.length})
                                </h3>
                                <button 
                                    onClick={() => setShowDocUpload(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
                                >
                                    <Upload className="w-3.5 h-3.5" /> Adaugă Act Nou
                                </button>
                            </div>
                            
                            {showDocUpload && (
                                <form onSubmit={handleUploadDocument} className="mb-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Încărcare Document Nou</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Nume Document</label>
                                            <input 
                                                type="text" 
                                                required 
                                                placeholder="Ex: Certificat Medical"
                                                value={docName}
                                                onChange={e => setDocName(e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Fișier (PDF / Imagine)</label>
                                            <input 
                                                type="file" 
                                                required 
                                                accept=".pdf,image/*"
                                                onChange={e => setDocFile(e.target.files[0])}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowDocUpload(false)}
                                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            Anulare
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={isUploadingDoc}
                                            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isUploadingDoc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                            {isUploadingDoc ? 'Se încarcă...' : 'Salvează Document'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {documents.length === 0 && !showDocUpload ? (
                                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 border-dashed dark:border-slate-700/50 rounded-2xl">
                                    <File className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Niciun document adițional încărcat</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {documents.map(doc => (
                                        <div key={doc.id} className="group bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-md transition-all relative">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                                                    {doc.file_path.toLowerCase().endsWith('.pdf') ? <FileText className="w-5 h-5" /> : <File className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-6">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={doc.name}>{doc.name}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(doc.uploaded_at).toLocaleDateString('ro-RO')}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center gap-2">
                                                <a 
                                                    href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${doc.file_path}`} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="flex-1 text-center py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    Deschide
                                                </a>
                                            </div>
                                            
                                            <button 
                                                onClick={() => handleDeleteDocument(doc.id)}
                                                className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="Șterge document"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
"""
if "activeTab === 'documents'" not in content:
    content = content.replace("{activeTab === 'fuel' && (", ui_block + "\n                {activeTab === 'fuel' && (")

with open("../frontend/src/components/EmployeeDetailView.jsx", "w") as f:
    f.write(content)

print("Patched EmployeeDetailView.jsx")

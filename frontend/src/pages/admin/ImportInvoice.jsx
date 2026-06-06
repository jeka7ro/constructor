import { useState, useRef, useEffect } from 'react'

import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, ChevronRight, Save, Plus } from 'lucide-react'
import { extractTextFromImageOrPdf } from '../../lib/pdfOcr'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import SearchableSelect from '../../components/SearchableSelect'

export default function ImportInvoice() {
    const showToast = useUIStore(s => s.showToast)
    const [file, setFile] = useState(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [progressText, setProgressText] = useState('')
    const [parsedData, setParsedData] = useState(null) // { supplier, date, invoice_number, items }
    const [warehouseItems, setWarehouseItems] = useState([])
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        api.get('/warehouse')
            .then(res => setWarehouseItems(res.data))
            .catch(err => console.error("Failed to load warehouse items", err))
    }, [])

    const handleFileSelect = async (e) => {
        const selected = e.target.files[0]
        if (!selected) return
        if (selected.type !== 'application/pdf') {
            showToast('Doar fișiere PDF sunt permise!', 'error')
            return
        }

        setFile(selected)
        setIsProcessing(true)
        setProgress(0)
        setProgressText('Încărcare fișier...')

        try {
            // Convert to base64
            const reader = new FileReader()
            reader.readAsDataURL(selected)
            reader.onload = async () => {
                try {
                    const { text } = await extractTextFromImageOrPdf(selected, (stage, pct) => {
                        setProgressText(stage)
                        setProgress(pct)
                    })

                    setProgressText('Parsare date pe server...')
                    const res = await api.post('/admin/invoices/parse', { preExtractedText: text })
                    
                    // Add mapping state to items
                    const items = res.data.items.map(it => {
                        // Auto-map if exact name match exists
                        const existing = warehouseItems.find(w => w.name.toLowerCase() === it.name.toLowerCase())
                        return {
                            ...it,
                            mapped_item_id: existing ? existing.id : '',
                            is_new: !existing
                        }
                    })

                    setParsedData({ ...res.data, items })
                    showToast('Factură extrasă cu succes!', 'success')
                } catch (err) {
                    console.error(err)
                    showToast('Eroare la extragere: ' + (err.response?.data?.detail || err.message, 'error'))
                } finally {
                    setIsProcessing(false)
                }
            }
        } catch (err) {
            console.error(err)
            showToast('Eroare la citirea fișierului', 'error')
            setIsProcessing(false)
        }
    }

    const handleSave = async () => {
        if (!parsedData || !parsedData.items.length) return
        setIsSaving(true)
        try {
            await api.post('/admin/invoices/import', parsedData)
            showToast('Import realizat cu succes!', 'success')
            setParsedData(null)
            setFile(null)
        } catch (err) {
            showToast('Eroare la salvare: ' + (err.response?.data?.detail || err.message, 'error'))
        } finally {
            setIsSaving(false)
        }
    }

    const updateItem = (id, field, value) => {
        setParsedData(prev => ({
            ...prev,
            items: prev.items.map(it => it.id === id ? { ...it, [field]: value } : it)
        }))
    }

    const removeItem = (id) => {
        setParsedData(prev => ({
            ...prev,
            items: prev.items.filter(it => it.id !== id)
        }))
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen space-y-6">
            <header>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    Import Factură
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Încarcă o factură PDF pentru a extrage automat cantitățile și a le adăuga în Gestiune.</p>
            </header>

            
                {!parsedData && !isProcessing && (
                    <div
                        
                        
                        
                        
                        className="relative group"
                    >
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 text-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-all group-hover:border-indigo-500 dark:group-hover:border-indigo-400">
                            <div className="w-20 h-20 mx-auto bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Trage PDF-ul aici sau apasă pentru a încărca</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Sistemul va extrage automat materialele și cantitățile.</p>
                        </div>
                    </div>
                )}

                {isProcessing && (
                    <div
                        
                        
                        
                        
                        className="border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center bg-white dark:bg-slate-900 shadow-xl"
                    >
                        <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Se analizează factura...</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{progressText}</p>
                        <div className="w-full max-w-md mx-auto bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div className=" from-indigo-500 to-purple-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}

                {parsedData && (
                    <div
                        
                        
                        
                        className="space-y-6"
                    >
                        {/* Header info */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Furnizor</p>
                                <p className="text-base font-bold text-slate-900 dark:text-white">{parsedData.supplier}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Data Facturii</p>
                                <p className="text-base font-bold text-slate-900 dark:text-white">{parsedData.date || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nr. Factură</p>
                                <p className="text-base font-bold text-slate-900 dark:text-white">{parsedData.invoice_number || '—'}</p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Linii Factură ({parsedData.items.length})
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 font-bold">Cantitate</th>
                                            <th className="px-4 py-3 font-bold">UM</th>
                                            <th className="px-4 py-3 font-bold">Articol Factură</th>
                                            <th className="px-4 py-3 font-bold">Mapare în Gestiune</th>
                                            <th className="px-4 py-3 font-bold text-right">Acțiuni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {parsedData.items.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3 w-32">
                                                    <input 
                                                        type="number" 
                                                        value={item.quantity}
                                                        onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 w-24">
                                                    <input 
                                                        type="text" 
                                                        value={item.unit}
                                                        onChange={e => updateItem(item.id, 'unit', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input 
                                                        type="text" 
                                                        value={item.name}
                                                        onChange={e => updateItem(item.id, 'name', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900 dark:text-white"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 min-w-[250px]">
                                                    <SearchableSelect
                                                        options={[
                                                            { value: '', label: '+ Creare Articol Nou' },
                                                            ...warehouseItems.map(w => ({ value: w.id, label: w.name }))
                                                        ]}
                                                        value={item.mapped_item_id}
                                                        onChange={val => {
                                                            updateItem(item.id, 'mapped_item_id', val)
                                                            updateItem(item.id, 'is_new', !val)
                                                        }}
                                                        placeholder="Selectează din gestiune..."
                                                        className="w-full"
                                                    />
                                                    {item.is_new && (
                                                        <p className="text-[10px] font-bold text-indigo-500 mt-1 flex items-center gap-1">
                                                            <Plus className="w-3 h-3" /> Se va crea element nou
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button 
                                                        onClick={() => removeItem(item.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title="Șterge rând"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {parsedData.items.length === 0 && (
                                <div className="p-8 text-center text-slate-500">Nu a rămas niciun articol.</div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => { setParsedData(null); setFile(null); }}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 shadow-sm"
                            >
                                Anulează
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || parsedData.items.length === 0}
                                className="flex items-center gap-2 px-8 py-3 rounded-xl  bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                Confirmă Importul
                            </button>
                        </div>
                    </div>
                )}
            
        </div>
    )
}

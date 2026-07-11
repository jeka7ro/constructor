import { useState, useRef, useEffect } from 'react'

import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, ChevronRight, Save, Plus } from 'lucide-react'
import { extractTextFromImageOrPdf } from '../../lib/pdfOcr'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import { useTranslation } from 'react-i18next'
import SearchableSelect from '../../components/SearchableSelect'

export default function ImportInvoiceModal({ onClose, initialFile }) {
    const { t } = useTranslation()
    const { showToast } = useUIStore()
    const [file, setFile] = useState(initialFile || null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [progressText, setProgressText] = useState('')
    const [parsedData, setParsedData] = useState(null) // { supplier, date, invoice_number, items, debug_text }
    const [warehouseItems, setWarehouseItems] = useState([])
    const [isSaving, setIsSaving] = useState(false)
    const [isPhysicalPerson, setIsPhysicalPerson] = useState(false)

    useEffect(() => {
        api.get('/warehouse')
            .then(res => setWarehouseItems(res.data.items || []))
            .catch(err => console.error("Failed to load warehouse items", err))
    }, [])

    useEffect(() => {
        if (initialFile && !parsedData && !isProcessing) {
            processFile(initialFile);
        }
    }, [initialFile])

    const processFile = async (selected) => {
        if (selected.type !== 'application/pdf') {
            showToast(t('import.error_pdf_only', 'Seuls les fichiers PDF sont autorisés !'), 'error')
            return
        }

        setFile(selected)
        setIsProcessing(true)
        setProgress(0)
        setProgressText(t('import.uploading', 'Téléchargement du fichier...'))

        try {
            const { text } = await extractTextFromImageOrPdf(selected, (stage, pct) => {
                setProgressText(stage)
                setProgress(pct)
            })

            setProgressText(t('import.parsing', 'Analyse des données sur le serveur...'))
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
            showToast(t('import.success_extract', 'Facture extraite avec succès !'), 'success')
        } catch (err) {
            console.error(err)
            showToast(t('import.error_extract', 'Erreur lors de l\'extraction : ') + (err.response?.data?.detail || err.message), 'error')
            if (initialFile) {
                onClose()
            }
        } finally {
            setIsProcessing(false)
        }
    }

    const handleFileSelect = async (e) => {
        const selected = e.target.files[0]
        if (!selected) return
        processFile(selected);
    }

    const handleSave = async () => {
        if (!parsedData || !parsedData.items.length) return
        setIsSaving(true)
        
        // Prepare payload, applying VAT if physical person
        const payload = {
            ...parsedData,
            items: parsedData.items.map(it => {
                const multiplier = isPhysicalPerson ? 1.19 : 1.0;
                const newUnitPrice = Number((parseFloat(it.unit_price || 0) * multiplier).toFixed(2));
                const qty = parseFloat(it.quantity || 0);
                return {
                    ...it,
                    unit_price: newUnitPrice,
                    total_price: Number((qty * newUnitPrice).toFixed(2))
                }
            })
        }

        try {
            await api.post('/admin/invoices/import', payload)
            showToast(t('import.success_import', 'Importation réussie !'), 'success')
            onClose()
        } catch (err) {
            showToast(t('import.error_save', 'Erreur de sauvegarde : ') + (err.response?.data?.detail || err.message), 'error')
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shadow-inner">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{t('import.title', 'Importer une Facture de Matériaux')}</h2>
                            <p className="text-xs text-slate-500">{t('import.subtitle', 'Extraction automatique des quantités vers la gestion')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            
                {!parsedData && !isProcessing && (
                    <div
                        
                        
                        
                        
                        className="relative group"
                    >
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileSelect}
                            title=""
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 text-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-all group-hover:border-indigo-500 dark:group-hover:border-indigo-400">
                            <div className="w-20 h-20 mx-auto bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('import.drag_drop', 'Faites glisser le PDF ici ou cliquez pour télécharger')}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('import.drag_drop_desc', 'Le système extraira automatiquement les matériaux et les quantités.')}</p>
                        </div>
                    </div>
                )}

                {isProcessing && (
                    <div
                        
                        
                        
                        
                        className="border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center bg-white dark:bg-slate-900 shadow-xl"
                    >
                        <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('import.analyzing', 'Analyse de la facture...')}</h3>
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
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('import.supplier', 'Fournisseur')}</p>
                                <p className="text-base font-bold text-slate-900 dark:text-white">{parsedData.supplier}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('import.date', 'Date de la Facture')}</p>
                                <p className="text-base font-bold text-slate-900 dark:text-white">{parsedData.date || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('import.invoice_number', 'N° Facture')}</p>
                                <p className="text-base font-bold text-slate-900 dark:text-white">{parsedData.invoice_number || '—'}</p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    {t('import.lines', 'Lignes de Facture')} ({parsedData.items.length})
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 font-bold">{t('import.qty', 'Quantité')}</th>
                                            <th className="px-4 py-3 font-bold">{t('import.unit', 'Unité')}</th>
                                            <th className="px-4 py-3 font-bold">{t('import.article', 'Article de Facture')}</th>
                                            <th className="px-4 py-3 font-bold">{t('import.mapping', 'Mappage en Gestion')}</th>
                                            <th className="px-4 py-3 font-bold text-right">{t('import.actions', 'Actions')}</th>
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
                                                            { value: '', label: t('import.create_new', '+ Créer un Nouvel Article') },
                                                            ...warehouseItems.map(w => ({ value: w.id, label: w.name }))
                                                        ]}
                                                        value={item.mapped_item_id}
                                                        onChange={val => {
                                                            updateItem(item.id, 'mapped_item_id', val)
                                                            updateItem(item.id, 'is_new', !val)
                                                        }}
                                                        placeholder={t('import.select_inventory', 'Sélectionnez depuis la gestion...')}
                                                        className="w-full"
                                                    />
                                                    {item.is_new && (
                                                        <p className="text-[10px] font-bold text-indigo-500 mt-1 flex items-center gap-1">
                                                            <Plus className="w-3 h-3" /> {t('import.will_create', 'Un nouvel élément sera créé')}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button 
                                                        onClick={() => removeItem(item.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title={t('import.delete_row', 'Supprimer la ligne')}
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
                                <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                                    <span>{t('import.no_articles', 'Aucun article extrait automatiquement du PDF restant.')}</span>
                                    {parsedData.debug_text && (
                                        <details className="mt-4 text-left max-w-lg w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-xs overflow-auto max-h-40">
                                            <summary className="cursor-pointer font-bold text-slate-700 dark:text-slate-300 mb-2">Debug Text OCR</summary>
                                            <pre className="whitespace-pre-wrap">{parsedData.debug_text}</pre>
                                        </details>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Extra Materials (Manual Addition) */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-1">{t('import.extra_materials', 'Ajouter du Matériel Supplémentaire')}</h4>
                                <p className="text-xs text-slate-500">{t('import.extra_materials_desc', 'Ajoutez rapidement des matériaux à partir des cases à cocher, les prix sont hors TVA.')}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => {
                                        setParsedData(prev => ({
                                            ...prev,
                                            items: [...prev.items, {
                                                id: 'manual-folie-' + Date.now(),
                                                name: t('import.foil', 'Folie plastique'),
                                                quantity: 1,
                                                unit: 'mp',
                                                unit_price: 1.2,
                                                total_price: 1.2,
                                                mapped_item_id: '',
                                                is_new: true
                                            }]
                                        }))
                                    }}
                                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" /> {t('import.foil_btn', 'Folie plastique (1.2/m²)')}
                                </button>
                                <button
                                    onClick={() => {
                                        setParsedData(prev => ({
                                            ...prev,
                                            items: [...prev.items, {
                                                id: 'manual-plasa-' + Date.now(),
                                                name: t('import.mesh', 'Treillis métallique'),
                                                quantity: 1,
                                                unit: 'buc',
                                                unit_price: 2.50,
                                                total_price: 2.50,
                                                mapped_item_id: '',
                                                is_new: true
                                            }]
                                        }))
                                    }}
                                    className="px-3 py-1.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-sm font-bold rounded-lg border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" /> {t('import.mesh_btn', 'Treillis métallique (2.50)')}
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 gap-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        checked={isPhysicalPerson}
                                        onChange={(e) => setIsPhysicalPerson(e.target.checked)}
                                    />
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    {t('import.physical_person', 'Client Personne Physique (Ajouter TVA)')}
                                </span>
                            </label>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button
                                    onClick={onClose}
                                    className="flex-1 md:flex-none px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 shadow-sm"
                                >
                                    {t('import.cancel', 'Annuler')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || parsedData.items.length === 0}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Save className="w-5 h-5" />
                                    )}
                                    {t('import.confirm', 'Confirmer l\'Importation')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            
                </div>
            </div>
        </div>
    )
}

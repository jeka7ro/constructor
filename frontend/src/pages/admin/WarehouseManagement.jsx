import { useState, useEffect } from 'react'
import { Plus, Package, Truck, Search, Loader2, ArrowUpRight, ArrowDownRight, Edit2, Trash2, FileText, Download, ChevronLeft, ChevronRight, Paperclip, History, X, FileSpreadsheet, Save } from 'lucide-react'
import api from '../../lib/api'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../store/uiStore'
import * as XLSX from 'xlsx'
import Pagination from '../../components/Pagination'

const CATEGORIES = [
    { id: 'TOATE', label: 'Toate', icon: Package },
    { id: 'SCULE', label: 'Scule', icon: Package },
    { id: 'CONSUMABILE', label: 'Consumabile', icon: Package },
    { id: 'STRUCTURA', label: 'Structură', icon: Package },
    { id: 'COMBUSTIBIL', label: 'Combustibil', icon: Truck },
]

export default function WarehouseManagement() {
    const { t } = useTranslation()
    const { showToast } = useUIStore()
    const [activeTab, setActiveTab] = useState('TOATE')
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [transactions, setTransactions] = useState([])
    const [historyItem, setHistoryItem] = useState(null)
    const [historySearch, setHistorySearch] = useState('')
    const [historyCurrentPage, setHistoryCurrentPage] = useState(1)
    const [historyItemsPerPage, setHistoryItemsPerPage] = useState(25)
    const [selectedTxIds, setSelectedTxIds] = useState([])
    const [editingTx, setEditingTx] = useState(null)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    
    // Pagination & Search for Items
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    // Data for dropdowns
    const [users, setUsers] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [sites, setSites] = useState([])

    // Modals
    const [showItemModal, setShowItemModal] = useState(false)
    const [showTxModal, setShowTxModal] = useState(false)
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
    const [selectedItem, setSelectedItem] = useState(null)
    const [txType, setTxType] = useState('IN') // 'IN' or 'OUT'

    // Form states
    const [itemForm, setItemForm] = useState({ name: '', unit: '' })
    const [txForm, setTxForm] = useState({ quantity: '', date: new Date().toISOString().split('T')[0], assigned_to_user_id: '', assigned_to_vehicle_id: '', site_id: '', notes: '', file: null })

    // Transactions History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false)

    useEffect(() => {
        fetchItems()
        setCurrentPage(1)
        setSearchQuery('')
    }, [activeTab])

    useEffect(() => {
        fetchDropdownData()
    }, [])

    const fetchItems = async () => {
        try {
            setLoading(true)
            const params = activeTab === 'TOATE' ? {} : { category: activeTab }
            const res = await api.get('/warehouse/items', { params })
            setItems(res.data)
        } catch (error) {
            showToast('Eroare la încărcarea stocurilor', 'error')
        } finally {
            setLoading(false)
        }
    }

    const fetchDropdownData = async () => {
        try {
            const [usersRes, vehiclesRes, sitesRes] = await Promise.all([
                api.get('/admin/users/', { params: { page_size: 1000 } }),
                api.get('/admin/vehicles/', { params: { page_size: 1000 } }),
                api.get('/admin/sites/', { params: { page_size: 1000 } })
            ])
            const usersList = Array.isArray(usersRes.data?.users) ? usersRes.data.users : (Array.isArray(usersRes.data) ? usersRes.data : [])
            setUsers(usersList.filter(u => u.is_active !== false))
            
            const vehiclesList = Array.isArray(vehiclesRes.data?.vehicles) ? vehiclesRes.data.vehicles : (Array.isArray(vehiclesRes.data) ? vehiclesRes.data : [])
            setVehicles(vehiclesList)
            
            const sitesList = Array.isArray(sitesRes.data?.sites) ? sitesRes.data.sites : (Array.isArray(sitesRes.data) ? sitesRes.data : [])
            setSites(sitesList)
        } catch (error) {
            console.error('Failed to load dropdowns', error)
        }
    }

    const fetchTransactions = async (itemId) => {
        try {
            const res = await api.get(`/warehouse/items/${itemId}/transactions`)
            setTransactions(res.data)
            setSelectedTxIds([])
        } catch (error) {
            showToast('Eroare la încărcarea istoricului', 'error')
        }
    }

    const handleToggleSelectTx = (id) => {
        setSelectedTxIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const handleToggleSelectAllTx = (txList) => {
        if (selectedTxIds.length === txList.length) {
            setSelectedTxIds([])
        } else {
            setSelectedTxIds(txList.map(t => t.id))
        }
    }

    const handleDeleteTx = (txId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Ștergere Tranzacție',
            message: 'Sigur doriți să ștergeți tranzacția? Stocul va fi actualizat automat.',
            onConfirm: async () => {
                try {
                    await api.delete(`/warehouse/transactions/${txId}`)
                    showToast('Tranzacție ștearsă', 'success')
                    fetchTransactions(selectedItem.id)
                    fetchItems()
                } catch (error) {
                    showToast('Eroare la ștergerea tranzacției', 'error')
                }
            }
        })
    }

    const handleBatchDeleteTx = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Ștergere Multiplă',
            message: `Sigur doriți să ștergeți ${selectedTxIds.length} tranzacții? Stocul va fi actualizat automat.`,
            onConfirm: async () => {
                try {
                    for (const id of selectedTxIds) {
                        await api.delete(`/warehouse/transactions/${id}`)
                    }
                    showToast('Tranzacții șterse', 'success')
                    setSelectedTxIds([])
                    fetchTransactions(selectedItem.id)
                    fetchItems()
                } catch (error) {
                    showToast('Eroare la ștergerea tranzacțiilor', 'error')
                }
            }
        })
    }

    const [isSubmittingItem, setIsSubmittingItem] = useState(false)

    const handleSaveItem = async (e) => {
        e.preventDefault()
        if (isSubmittingItem) return
        try {
            setIsSubmittingItem(true)
            if (selectedItem) {
                await api.put(`/warehouse/items/${selectedItem.id}`, { name: itemForm.name, unit: itemForm.unit })
                showToast('Articol actualizat', 'success')
            } else {
                await api.post('/warehouse/items', { ...itemForm, category: activeTab })
                showToast('Articol creat', 'success')
            }
            setShowItemModal(false)
            fetchItems()
        } catch (error) {
            showToast('Eroare la salvare', 'error')
        } finally {
            setIsSubmittingItem(false)
        }
    }

    const handleDeleteItem = (itemId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Ștergere Articol',
            message: 'Sigur dorești să ștergi acest articol? Tot istoricul va fi pierdut.',
            onConfirm: async () => {
                try {
                    await api.delete(`/warehouse/items/${itemId}`)
                    showToast('Articol șters', 'success')
                    fetchItems()
                } catch (error) {
                    showToast('Eroare la ștergerea articolului', 'error')
                }
            }
        })
    }

    const [isSubmittingTx, setIsSubmittingTx] = useState(false)

    const handleSaveTx = async (e) => {
        e.preventDefault()
        if (isSubmittingTx) return
        if (!txForm.quantity || Number(txForm.quantity) <= 0) {
            showToast('Introduceți o cantitate validă', 'error')
            return
        }

        try {
            setIsSubmittingTx(true)
            const formData = new FormData()
            if (!editingTx) {
                formData.append('item_id', selectedItem.id)
                formData.append('transaction_type', txType)
            }
            formData.append('quantity', Number(txForm.quantity))
            formData.append('date', txForm.date)
            
            if (txForm.assigned_to_user_id) formData.append('assigned_to_user_id', txForm.assigned_to_user_id)
            if (txForm.assigned_to_vehicle_id) formData.append('assigned_to_vehicle_id', txForm.assigned_to_vehicle_id)
            if (txForm.site_id) formData.append('site_id', txForm.site_id)
            if (txForm.notes) formData.append('notes', txForm.notes)
            if (txForm.file) formData.append('file', txForm.file)

            if (editingTx) {
                await api.put(`/warehouse/transactions/${editingTx.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                showToast('Tranzacție actualizată', 'success')
            } else {
                await api.post('/warehouse/transactions', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                showToast('Tranzacție salvată', 'success')
            }
            
            setShowTxModal(false)
            fetchItems()
            if (historyItem && historyItem.id === selectedItem.id) {
                fetchTransactions(selectedItem.id)
            }
        } catch (error) {
            showToast(error.response?.data?.detail || 'Eroare la salvare tranzacție', 'error')
        } finally {
            setIsSubmittingTx(false)
        }
    }

    const openTxModal = (item, type, existingTx = null) => {
        setSelectedItem(item)
        setTxType(type)
        if (existingTx) {
            setEditingTx(existingTx)
            setTxForm({
                quantity: existingTx.quantity,
                date: existingTx.date || new Date().toISOString().split('T')[0],
                assigned_to_user_id: existingTx.assigned_to_user_id || '',
                assigned_to_vehicle_id: existingTx.assigned_to_vehicle_id || '',
                site_id: existingTx.site_id || '',
                notes: existingTx.notes || '',
                file: null
            })
        } else {
            setEditingTx(null)
            setTxForm({ quantity: '', date: new Date().toISOString().split('T')[0], assigned_to_user_id: '', assigned_to_vehicle_id: '', site_id: '', notes: '', file: null })
        }
        setShowTxModal(true)
    }

    const handleExportExcel = () => {
        const dataToExport = filteredItems.map(item => ({
            'Articol': item.name,
            'Categorie': activeTab,
            'Stoc Curent': item.total_quantity,
            'Unitate de Măsură': item.unit
        }))
        const ws = XLSX.utils.json_to_sheet(dataToExport)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Stoc")
        XLSX.writeFile(wb, `Stoc_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    // Filtering & Pagination for Items
    const filteredItems = items.filter(i => 
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        i.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(i.total_quantity).includes(searchQuery)
    )
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
    const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const filteredHistory = transactions.filter(t => {
        const searchLower = historySearch.toLowerCase()
        return (
            (t.date && String(t.date).toLowerCase().includes(searchLower)) ||
            (t.transaction_type && t.transaction_type.toLowerCase().includes(searchLower)) ||
            (String(t.quantity).includes(searchLower)) ||
            (t.assigned_site && t.assigned_site.toLowerCase().includes(searchLower)) ||
            (t.assigned_user && t.assigned_user.toLowerCase().includes(searchLower)) ||
            (t.assigned_vehicle && t.assigned_vehicle.toLowerCase().includes(searchLower)) ||
            (t.operator && t.operator.toLowerCase().includes(searchLower)) ||
            (t.notes && t.notes.toLowerCase().includes(searchLower))
        )
    })

    return (
        <>
            {historyItem ? (
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                {/* Back Button */}
                <button 
                    onClick={() => setHistoryItem(null)}
                    className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors w-fit"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="font-semibold">Înapoi la Magazie</span>
                </button>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    {/* Header of Detail View */}
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700/50 shrink-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {historyItem.name}
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Stoc curent: <span className="font-bold text-slate-800 dark:text-slate-200">{historyItem.total_quantity} {historyItem.unit}</span></p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <div className="relative flex-1 lg:w-64 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Caută în istoric..."
                                    value={historySearch}
                                    onChange={e => setHistorySearch(e.target.value)}
                                    className="w-full pl-9 pr-10 py-2 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all h-10"
                                />
                                {historySearch && (
                                    <button
                                        onClick={() => setHistorySearch('')}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white p-1 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedItem(historyItem);
                                        setTxType('IN');
                                        setTxForm(prev => ({ ...prev, quantity: '', notes: '', file: null }));
                                        setShowTxModal(true);
                                    }}
                                    className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                                >
                                    <ArrowDownRight className="w-4 h-4" /> Intrare
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedItem(historyItem);
                                        setTxType('OUT');
                                        setTxForm(prev => ({ ...prev, quantity: '', notes: '', file: null }));
                                        setShowTxModal(true);
                                    }}
                                    className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                                >
                                    <ArrowUpRight className="w-4 h-4" /> Ieșire
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Batch Delete Actions */}
                    {selectedTxIds.length > 0 && (
                        <div className="bg-rose-50 border-b border-rose-100 px-4 py-2 flex items-center justify-between dark:bg-rose-900/20 dark:border-rose-900/50">
                            <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                                {selectedTxIds.length} tranzacții selectate
                            </span>
                            <button
                                onClick={handleBatchDeleteTx}
                                className="text-sm px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-sm transition-colors font-medium"
                            >
                                Șterge Selectatele
                            </button>
                        </div>
                    )}

                    <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30 dark:bg-slate-900/50">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-4 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={filteredHistory.length > 0 && selectedTxIds.length === filteredHistory.length}
                                            onChange={() => handleToggleSelectAllTx(filteredHistory)}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-blue-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4">Dată</th>
                                    <th className="px-6 py-4">Tip</th>
                                    <th className="px-6 py-4 text-right">Cantitate</th>
                                    <th className="px-6 py-4">Șantier</th>
                                    <th className="px-6 py-4">Destinatar</th>
                                    <th className="px-6 py-4">Notițe / Atașament</th>
                                    <th className="px-6 py-4">Operator</th>
                                    <th className="px-6 py-4 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredHistory.length === 0 ? (
                                    <tr><td colSpan="9" className="px-6 py-12 text-center text-slate-500">Nu s-au găsit tranzacții.</td></tr>
                                ) : (
                                    filteredHistory.slice((historyCurrentPage - 1) * historyItemsPerPage, historyCurrentPage * historyItemsPerPage).map(t => (
                                        <tr key={t.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${selectedTxIds.includes(t.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                            <td className="px-4 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTxIds.includes(t.id)}
                                                    onChange={() => handleToggleSelectTx(t.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-blue-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium">{t.date}</span>
                                                    {t.created_at && (
                                                        <span className="text-[10px] text-slate-400">Adăugat: {new Date(t.created_at).toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'})}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold ${t.transaction_type === 'IN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                                    {t.transaction_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                                {t.transaction_type === 'IN' ? '+' : '-'}{t.quantity}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                {t.assigned_site || 'Companie General'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                                                <div className="flex flex-col gap-0.5">
                                                    {t.assigned_user && <span className="font-bold">{t.assigned_user}</span>}
                                                    {t.assigned_vehicle && <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit">{t.assigned_vehicle}</span>}
                                                    {!t.assigned_user && !t.assigned_vehicle && '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    {t.notes && <span className="text-xs text-slate-500 truncate max-w-xs" title={t.notes}>{t.notes}</span>}
                                                    {t.attachment_url && (
                                                        <a href={t.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 px-2.5 py-1.5 rounded-md w-fit transition-colors">
                                                            <FileText className="w-3.5 h-3.5" />
                                                            Vezi Document
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{t.operator}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openTxModal(historyItem, t.transaction_type, t)} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors" title="Modifică tranzacție">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteTx(t.id)} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors" title="Șterge tranzacție">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    {filteredHistory.length > 0 && (
                        <Pagination
                            currentPage={historyCurrentPage}
                            pageSize={historyItemsPerPage}
                            totalItems={filteredHistory.length}
                            onPageChange={setHistoryCurrentPage}
                            onPageSizeChange={setHistoryItemsPerPage}
                        />
                    )}
                </div>
            </div>
            ) : (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                        <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Magazie</h1>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 flex flex-col xl:flex-row flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="relative group flex items-center w-full sm:w-auto">
                        <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Caută articol..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full sm:w-64 md:w-80 h-10 pl-10 pr-[72px] bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                        {searchQuery && (
                            <div className="absolute right-1.5 flex items-center gap-1 bg-blue-600 px-2 py-1 rounded-full shadow-sm">
                                <span className="text-[10px] font-bold text-white">
                                    {filteredItems.length}/{items.length}
                                </span>
                                <button
                                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                    className="p-0.5 hover:bg-blue-700 rounded-full transition-colors ml-0.5"
                                >
                                    <X className="w-3 h-3 text-white/80 hover:text-white" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                        <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-full shadow-inner mr-2 shrink-0">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => { setActiveTab(cat.id); setCurrentPage(1); }}
                                    className={`flex items-center justify-center gap-1.5 px-4 h-8 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                                        activeTab === cat.id
                                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-100/10'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    <cat.icon className="w-4 h-4 shrink-0" />
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span className="hidden sm:inline">Export Excel</span>
                        </button>

                        <button
                            onClick={() => { setItemForm({ name: '', unit: activeTab === 'COMBUSTIBIL' ? 'L' : '' }); setSelectedItem(null); setShowItemModal(true); }}
                            className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            Articol Nou
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">NR.</th>
                                <th className="px-6 py-4">ARTICOL</th>
                                <th className="px-6 py-4 text-center">U.M.</th>
                                <th className="px-6 py-4 text-center">INTRĂRI</th>
                                <th className="px-6 py-4 text-center">IEȘIRI</th>
                                <th className="px-6 py-4 text-center">STOC CURENT</th>
                                <th className="px-6 py-4 text-right">ACȚIUNI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                                        Nu s-au găsit articole.
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((item, index) => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => {
                                            setHistoryItem(item)
                                            setHistorySearch('')
                                            fetchTransactions(item.id)
                                        }}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-4 text-center text-slate-500 font-medium">
                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 dark:text-white truncate">{item.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400 font-medium">
                                            {item.unit}
                                        </td>
                                        <td className="px-6 py-4 text-center text-blue-600 dark:text-blue-400 font-bold">
                                            {item.total_in > 0 ? `+${item.total_in}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center text-rose-500 dark:text-rose-400 font-bold">
                                            {item.total_out > 0 ? `-${item.total_out}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-sm border ${item.total_quantity <= 0 ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-900/50' : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50'}`}>
                                                {item.total_quantity > 0 ? `• ${item.total_quantity}` : '0'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); openTxModal(item, 'IN'); }} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="Adaugă Intrare">
                                                    <ArrowDownRight className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); openTxModal(item, 'OUT'); }} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" title="Adaugă Ieșire">
                                                    <ArrowUpRight className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setItemForm({ name: item.name, unit: item.unit }); setShowItemModal(true); }} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors" title="Modifică articol">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors" title="Șterge articol">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                        <span className="uppercase tracking-wide">Afișează</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <span>Pagina {currentPage} din {Math.max(1, totalPages)}</span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        )}

        {/* CONFIRM MODAL */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transform scale-100 opacity-100 transition-all">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{confirmModal.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{confirmModal.message}</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                                    className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Anulează
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirmModal.onConfirm) confirmModal.onConfirm();
                                        setConfirmModal({ ...confirmModal, isOpen: false });
                                    }}
                                    className="px-5 h-10 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/20 transition-all"
                                >
                                    Da, Șterge
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ITEM MODAL */}
            {showItemModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Package className="w-5 h-5 text-slate-500" />
                                {selectedItem ? 'Modifică Articol' : 'Adaugă Articol Nou'}
                            </h2>
                            <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50">
                            <form onSubmit={handleSaveItem} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Nume Articol</label>
                                    <input type="text" required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Unitate de măsură</label>
                                    <select required value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} disabled={activeTab === 'COMBUSTIBIL'} className={`w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm ${activeTab === 'COMBUSTIBIL' ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                        {activeTab === 'COMBUSTIBIL' ? (
                                            <option value="L">L (Litri)</option>
                                        ) : (
                                            <>
                                                <option value="">Alege unitatea...</option>
                                                <option value="buc">buc (Bucăți)</option>
                                                <option value="L">L (Litri)</option>
                                                <option value="kg">kg (Kilograme)</option>
                                                <option value="m">m (Metri)</option>
                                                <option value="ml">ml (Metri liniari)</option>
                                                <option value="mp">mp (Metri pătrați)</option>
                                                <option value="rolă">rolă</option>
                                                <option value="set">set</option>
                                                <option value="cutie">cutie</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
                                    <button type="button" onClick={() => setShowItemModal(false)} className="px-5 h-10 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors bg-slate-100 dark:bg-slate-800/50">Anulează</button>
                                    <button type="submit" className="px-5 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-bold shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2">
                                        <Save className="w-4 h-4" />
                                        Salvează
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
             {/* TRANSACTION MODAL */}
            {showTxModal && selectedItem && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <div className={`px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between ${txType === 'IN' ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-orange-50/50 dark:bg-orange-900/10'}`}>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {txType === 'IN' ? <ArrowDownRight className="w-5 h-5 text-blue-600" /> : <ArrowUpRight className="w-5 h-5 text-orange-600" />}
                                {editingTx ? 'Modifică Tranzacție' : (txType === 'IN' ? 'Intrare Stoc' : 'Ieșire Stoc')}
                                <span className="text-sm font-normal text-slate-500 ml-2 block truncate">
                                    {selectedItem?.name}
                                </span>
                            </h2>
                            <button onClick={() => setShowTxModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                            <form onSubmit={handleSaveTx} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Cantitate ({selectedItem.unit})</label>
                                        <input type="number" step="0.01" min="0.01" required value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: e.target.value })} className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Data</label>
                                        <input type="date" required value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                                    </div>
                                </div>

                                {txType === 'OUT' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Șantier (Opțional)</label>
                                            <select
                                                value={txForm.site_id || ''}
                                                onChange={e => setTxForm({ ...txForm, site_id: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            >
                                                <option value="">Companie General</option>
                                                {sites.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Angajat / Persoană</label>
                                                <select
                                                    value={txForm.assigned_to_user_id || ''}
                                                    onChange={e => setTxForm({ ...txForm, assigned_to_user_id: e.target.value })}
                                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                >
                                                    <option value="">Alege angajat...</option>
                                                    {users.map(u => (
                                                        <option key={u.id} value={u.id}>{u.full_name} {u.employee_code ? `(${u.employee_code})` : ''}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Utilaj / Mașină</label>
                                                <select 
                                                    value={txForm.assigned_to_vehicle_id || ''} 
                                                    onChange={e => setTxForm({ ...txForm, assigned_to_vehicle_id: e.target.value })} 
                                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                >
                                                    <option value="">Alege utilaj...</option>
                                                    {vehicles.map(v => (
                                                        <option key={v.id} value={v.id}>{v.name} {v.plate_number ? `(${v.plate_number})` : ''}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Atașament (Opțional)</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            onChange={e => setTxForm({ ...txForm, file: e.target.files[0] })}
                                            className="w-full px-4 h-10 pt-2 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-transparent outline-none transition-all shadow-sm file:hidden pl-10"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                        />
                                        <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
                                            {txForm.file ? txForm.file.name : "Alege fisier..."}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Notițe (Opțional)</label>
                                    <textarea rows={2} value={txForm.notes} onChange={e => setTxForm({ ...txForm, notes: e.target.value })} className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm custom-scrollbar" />
                                </div>

                                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
                                    <button type="button" onClick={() => setShowTxModal(false)} className="px-5 h-10 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors bg-slate-100 dark:bg-slate-800/50">Anulează</button>
                                    <button type="submit" className={`px-5 h-10 text-white rounded-full text-sm font-bold shadow-sm transition-all flex items-center gap-2 ${txType === 'IN' ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'}`}>
                                        <Save className="w-4 h-4" />
                                        Salvează {txType === 'IN' ? 'Intrarea' : 'Ieșirea'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

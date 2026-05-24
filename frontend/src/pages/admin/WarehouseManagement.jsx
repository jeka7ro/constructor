import { useState, useEffect } from 'react'
import { Plus, Package, Truck, Search, Loader2, ArrowUpRight, ArrowDownRight, Edit2, Trash2, FileText, Download, ChevronLeft, ChevronRight, Paperclip, History, X } from 'lucide-react'
import api from '../../lib/api'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../store/uiStore'
import * as XLSX from 'xlsx'

const CATEGORIES = [
    { id: 'SCULE', label: 'Scule', icon: Package },
    { id: 'CONSUMABILE', label: 'Consumabile', icon: Package },
    { id: 'STRUCTURA', label: 'Structură', icon: Package },
    { id: 'COMBUSTIBIL', label: 'Combustibil', icon: Truck },
]

export default function WarehouseManagement() {
    const { t } = useTranslation()
    const { showToast } = useUIStore()
    const [activeTab, setActiveTab] = useState('SCULE')
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    
    // Pagination & Search for Items
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Data for dropdowns
    const [users, setUsers] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [sites, setSites] = useState([])

    // Modals
    const [showItemModal, setShowItemModal] = useState(false)
    const [showTxModal, setShowTxModal] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [txType, setTxType] = useState('IN') // 'IN' or 'OUT'

    // Form states
    const [itemForm, setItemForm] = useState({ name: '', unit: '' })
    const [txForm, setTxForm] = useState({ quantity: '', date: new Date().toISOString().split('T')[0], assigned_to_user_id: '', assigned_to_vehicle_id: '', site_id: '', notes: '', file: null })

    // Transactions History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [historyItem, setHistoryItem] = useState(null)
    const [transactions, setTransactions] = useState([])
    const [historySearch, setHistorySearch] = useState('')

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
            const res = await api.get('/warehouse/items', { params: { category: activeTab } })
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
                api.get('/admin/users'),
                api.get('/admin/vehicles'),
                api.get('/admin/sites/')
            ])
            setUsers(usersRes.data.filter(u => u.is_active))
            setVehicles(vehiclesRes.data)
            setSites(sitesRes.data.sites || [])
        } catch (error) {
            console.error('Failed to load dropdowns', error)
        }
    }

    const fetchTransactions = async (itemId) => {
        try {
            const res = await api.get(`/warehouse/items/${itemId}/transactions`)
            setTransactions(res.data)
        } catch (error) {
            showToast('Eroare la încărcarea istoricului', 'error')
        }
    }

    const handleSaveItem = async (e) => {
        e.preventDefault()
        try {
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
        }
    }

    const handleDeleteItem = async (id) => {
        if (!window.confirm('Sigur dorești să ștergi acest articol? Tot istoricul va fi pierdut.')) return
        try {
            await api.delete(`/warehouse/items/${id}`)
            showToast('Articol șters', 'success')
            fetchItems()
        } catch (error) {
            showToast('Eroare la ștergere', 'error')
        }
    }

    const handleSaveTx = async (e) => {
        e.preventDefault()
        if (!txForm.quantity || Number(txForm.quantity) <= 0) {
            showToast('Introduceți o cantitate validă', 'error')
            return
        }

        try {
            const formData = new FormData()
            formData.append('item_id', selectedItem.id)
            formData.append('transaction_type', txType)
            formData.append('quantity', Number(txForm.quantity))
            formData.append('date', txForm.date)
            
            if (txForm.assigned_to_user_id) formData.append('assigned_to_user_id', txForm.assigned_to_user_id)
            if (txForm.assigned_to_vehicle_id) formData.append('assigned_to_vehicle_id', txForm.assigned_to_vehicle_id)
            if (txForm.site_id) formData.append('site_id', txForm.site_id)
            if (txForm.notes) formData.append('notes', txForm.notes)
            if (txForm.file) formData.append('file', txForm.file)

            await api.post('/warehouse/transactions', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            
            showToast('Tranzacție salvată', 'success')
            setShowTxModal(false)
            fetchItems()
        } catch (error) {
            showToast(error.response?.data?.detail || 'Eroare la salvare tranzacție', 'error')
        }
    }

    const openTxModal = (item, type) => {
        setSelectedItem(item)
        setTxType(type)
        setTxForm({ quantity: '', date: new Date().toISOString().split('T')[0], assigned_to_user_id: '', assigned_to_vehicle_id: '', site_id: '', notes: '', file: null })
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
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                        <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Magazie Virtuală</h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Caută articol..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-64 pl-4 pr-24 py-2 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                        />
                        {searchQuery && (
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                    {filteredItems.length}/{items.length}
                                </span>
                                <button
                                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>

                    <select
                        value={activeTab}
                        onChange={(e) => { setActiveTab(e.target.value); setCurrentPage(1); }}
                        className="py-2 pl-4 pr-8 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em' }}
                    >
                        {CATEGORIES.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export Excel
                    </button>

                    <button
                        onClick={() => { setItemForm({ name: '', unit: activeTab === 'COMBUSTIBIL' ? 'L' : '' }); setSelectedItem(null); setShowItemModal(true); }}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Articol Nou
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
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
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4 text-center text-slate-500 font-medium">
                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 dark:text-white truncate">{item.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400 font-medium">
                                            {item.unit}
                                        </td>
                                        <td className="px-6 py-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                                            {item.total_in > 0 ? `+${item.total_in}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center text-rose-500 dark:text-rose-400 font-bold">
                                            {item.total_out > 0 ? `-${item.total_out}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => {
                                                    setHistoryItem(item)
                                                    setHistorySearch('')
                                                    setShowHistoryModal(true)
                                                    fetchTransactions(item.id)
                                                }}
                                                className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-sm transition-all border ${item.total_quantity <= 0 ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}
                                                title="Apasă pentru a vedea istoricul tranzacțiilor"
                                            >
                                                {item.total_quantity > 0 ? `• ${item.total_quantity}` : '0'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openTxModal(item, 'IN')} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors" title="Adaugă Intrare">
                                                    <ArrowDownRight className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => openTxModal(item, 'OUT')} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" title="Adaugă Ieșire">
                                                    <ArrowUpRight className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { setSelectedItem(item); setItemForm({ name: item.name, unit: item.unit }); setShowItemModal(true); }} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors" title="Modifică articol">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteItem(item.id)} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors" title="Șterge articol">
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

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-emerald-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                        <span className="uppercase tracking-wide">Afișează</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
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

            {/* ITEM MODAL */}
            {showItemModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            {selectedItem ? 'Modifică Articol' : 'Adaugă Articol Nou'} ({activeTab})
                        </h2>
                        <form onSubmit={handleSaveItem} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nume Articol</label>
                                <input type="text" required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unitate de măsură</label>
                                <select required value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} disabled={activeTab === 'COMBUSTIBIL'} className={`w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white ${activeTab === 'COMBUSTIBIL' ? 'bg-slate-50 dark:bg-slate-800 cursor-not-allowed text-slate-500' : ''}`}>
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
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowItemModal(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Anulează</button>
                                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm">Salvează</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TRANSACTION MODAL */}
            {showTxModal && selectedItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txType === 'IN' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                {txType === 'IN' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {txType === 'IN' ? 'Intrare Stoc' : 'Ieșire Stoc'}
                                </h2>
                                <p className="text-sm text-slate-500">{selectedItem.name}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveTx} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cantitate ({selectedItem.unit})</label>
                                    <input type="number" step="0.01" min="0.01" required value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                                    <input type="date" required value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white" />
                                </div>
                            </div>

                            {txType === 'OUT' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Șantier (Opțional)</label>
                                        <select
                                            value={txForm.site_id || ''}
                                            onChange={e => setTxForm({ ...txForm, site_id: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white"
                                        >
                                            <option value="">Companie General</option>
                                            {sites.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {activeTab === 'COMBUSTIBIL' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Utilaj / Mașină (Opțional)</label>
                                            <select value={txForm.assigned_to_vehicle_id} onChange={e => setTxForm({ ...txForm, assigned_to_vehicle_id: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white">
                                                <option value="">Alege utilaj...</option>
                                                {vehicles.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name} ({v.plate_number || v.chassis_number})</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Angajat / Persoană (Opțional)</label>
                                            <select
                                                value={txForm.assigned_to_user_id || ''}
                                                onChange={e => setTxForm({ ...txForm, assigned_to_user_id: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white"
                                            >
                                                <option value="">Selectează angajat...</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.full_name} ({u.employee_code})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Atașament (Ex: Factură/Aviz)</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        onChange={e => setTxForm({ ...txForm, file: e.target.files[0] })}
                                        className="w-full px-4 py-2 pl-10 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    <Paperclip className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notițe (Opțional)</label>
                                <textarea rows={2} value={txForm.notes} onChange={e => setTxForm({ ...txForm, notes: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowTxModal(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Anulează</button>
                                <button type="submit" className={`px-5 py-2 text-white rounded-xl font-medium shadow-sm ${txType === 'IN' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                                    Salvează {txType === 'IN' ? 'Intrarea' : 'Ieșirea'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* HISTORY MODAL */}
            {showHistoryModal && historyItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-slate-200 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Istoric: {historyItem.name}
                                </h2>
                                <p className="text-sm text-slate-500">Stoc curent: <span className="font-bold">{historyItem.total_quantity} {historyItem.unit}</span></p>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Caută în istoric..."
                                        value={historySearch}
                                        onChange={e => setHistorySearch(e.target.value)}
                                        className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                                    />
                                    {historySearch && (
                                        <button
                                            onClick={() => setHistorySearch('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => setShowHistoryModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium">
                                    Închide
                                </button>
                            </div>
                        </div>
                        <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Dată</th>
                                        <th className="px-6 py-3 font-medium">Tip</th>
                                        <th className="px-6 py-3 font-medium text-right">Cantitate</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400">Șantier</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400">Destinatar</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400">Notițe / Atașament</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400">Operator</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredHistory.length === 0 ? (
                                        <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-500">Nu s-au găsit tranzacții.</td></tr>
                                    ) : (
                                        filteredHistory.map(t => (
                                            <tr key={t.id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-700">{t.date}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${t.transaction_type === 'IN' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {t.transaction_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-800">
                                                    {t.transaction_type === 'IN' ? '+' : '-'}{t.quantity}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                                    {t.assigned_site || 'Companie General'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                                                    {t.assigned_user || t.assigned_vehicle || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                    <div className="flex flex-col gap-1">
                                                        {t.notes && <span className="text-xs truncate max-w-xs" title={t.notes}>{t.notes}</span>}
                                                        {t.attachment_url && (
                                                            <a href={t.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-2 py-1 rounded w-fit">
                                                                <FileText className="w-3 h-3" />
                                                                Vezi Document
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs">
                                                    {t.operator}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

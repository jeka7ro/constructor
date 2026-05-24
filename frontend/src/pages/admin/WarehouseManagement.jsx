import { useState, useEffect } from 'react'
import { Plus, Package, Truck, UserCircle, Search, LogOut, ArrowRightLeft, Loader2, ArrowUpRight, ArrowDownRight, Edit2, Trash2 } from 'lucide-react'
import api from '../../lib/api'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../store/uiStore'

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
    const [searchQuery, setSearchQuery] = useState('')

    // Data for dropdowns
    const [users, setUsers] = useState([])
    const [vehicles, setVehicles] = useState([])

    // Modals
    const [showItemModal, setShowItemModal] = useState(false)
    const [showTxModal, setShowTxModal] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [txType, setTxType] = useState('IN') // 'IN' or 'OUT'

    // Form states
    const [itemForm, setItemForm] = useState({ name: '', unit: '' })
    const [txForm, setTxForm] = useState({ quantity: '', date: new Date().toISOString().split('T')[0], assigned_to_user_id: '', assigned_to_vehicle_id: '', notes: '' })

    // Transactions History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [historyItem, setHistoryItem] = useState(null)
    const [transactions, setTransactions] = useState([])

    useEffect(() => {
        fetchItems()
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
            const [uRes, vRes] = await Promise.all([
                api.get('/admin/users/', { params: { is_active: true, page_size: 1000 } }),
                api.get('/admin/vehicles')
            ])
            setUsers(uRes.data?.items || uRes.data || [])
            setVehicles(vRes.data || [])
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

        if (txType === 'OUT') {
            if (activeTab === 'COMBUSTIBIL' && !txForm.assigned_to_vehicle_id) {
                showToast('Selectați utilajul / mașina', 'error')
                return
            }
            if (['CONSUMABILE', 'STRUCTURA', 'SCULE'].includes(activeTab) && !txForm.assigned_to_user_id) {
                showToast('Selectați angajatul', 'error')
                return
            }
        }

        try {
            await api.post('/warehouse/transactions', {
                item_id: selectedItem.id,
                transaction_type: txType,
                quantity: Number(txForm.quantity),
                date: txForm.date,
                assigned_to_user_id: txForm.assigned_to_user_id || null,
                assigned_to_vehicle_id: txForm.assigned_to_vehicle_id || null,
                notes: txForm.notes
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
        setTxForm({ quantity: '', date: new Date().toISOString().split('T')[0], assigned_to_user_id: '', assigned_to_vehicle_id: '', notes: '' })
        setShowTxModal(true)
    }

    const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="w-8 h-8 text-blue-600" />
                        Magazie Virtuală
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gestionează stocul pe categorii, intrări și ieșiri materiale.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-800 gap-1 hide-scrollbar">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveTab(cat.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                            activeTab === cat.id
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <cat.icon className="w-4 h-4" />
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Caută articol..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    onClick={() => { setSelectedItem(null); setItemForm({ name: '', unit: '' }); setShowItemModal(true); }}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    Adaugă Articol
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Articol</th>
                                <th className="px-6 py-4 font-semibold text-center">Stoc Curent</th>
                                <th className="px-6 py-4 font-semibold text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
                                        Nu există articole în această categorie.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">UM: {item.unit}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full font-bold text-sm ${item.total_quantity <= 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {item.total_quantity} {item.unit}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => {
                                                setHistoryItem(item)
                                                setShowHistoryModal(true)
                                                fetchTransactions(item.id)
                                            }} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors">
                                                Istoric
                                            </button>
                                            <button onClick={() => openTxModal(item, 'IN')} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors">
                                                + Intrare
                                            </button>
                                            <button onClick={() => openTxModal(item, 'OUT')} className="px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-xs font-medium transition-colors">
                                                - Ieșire
                                            </button>
                                            <button onClick={() => { setSelectedItem(item); setItemForm({ name: item.name, unit: item.unit }); setShowItemModal(true); }} className="px-2 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteItem(item.id)} className="px-2 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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
                                <select required value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white">
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
                                    {activeTab === 'COMBUSTIBIL' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Selectează Auto/Utilaj</label>
                                            <select required value={txForm.assigned_to_vehicle_id} onChange={e => setTxForm({ ...txForm, assigned_to_vehicle_id: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white">
                                                <option value="">Alege utilaj...</option>
                                                {vehicles.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name} ({v.plate_number || v.chassis_number})</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Angajat care a primit</label>
                                            <select required value={txForm.assigned_to_user_id} onChange={e => setTxForm({ ...txForm, assigned_to_user_id: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white">
                                                <option value="">Alege angajat...</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.full_name} ({u.employee_code})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-slate-200 shrink-0 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Istoric: {historyItem.name}</h2>
                                <p className="text-sm text-slate-500">Stoc curent: {historyItem.total_quantity} {historyItem.unit}</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium">
                                Închide
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Dată</th>
                                        <th className="px-6 py-3 font-medium">Tip</th>
                                        <th className="px-6 py-3 font-medium text-right">Cantitate</th>
                                        <th className="px-6 py-3 font-medium">Alocat Către / Operat de</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.length === 0 ? (
                                        <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">Nu există tranzacții.</td></tr>
                                    ) : (
                                        transactions.map(t => (
                                            <tr key={t.id}>
                                                <td className="px-6 py-3 whitespace-nowrap">{t.date}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${t.transaction_type === 'IN' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {t.transaction_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right font-medium">
                                                    {t.transaction_type === 'IN' ? '+' : '-'}{t.quantity}
                                                </td>
                                                <td className="px-6 py-3 text-xs">
                                                    {t.assigned_user && <div><span className="text-slate-500">Angajat:</span> {t.assigned_user}</div>}
                                                    {t.assigned_vehicle && <div><span className="text-slate-500">Utilaj:</span> {t.assigned_vehicle}</div>}
                                                    <div className="text-slate-400 mt-0.5">Op: {t.operator}</div>
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

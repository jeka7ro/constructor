import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { ChevronLeft, Wrench, Package, Flame, CheckCircle, Loader2, Minus, PackageSearch, RotateCcw, AlertTriangle } from 'lucide-react'

export default function EmployeeInventory() {
    const navigate = useNavigate()
    const [inventory, setInventory] = useState([])
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [successMsg, setSuccessMsg] = useState('')
    const [actionLoading, setActionLoading] = useState(null)

    const [showConsumeForm, setShowConsumeForm] = useState(false)
    const [consumeItem, setConsumeItem] = useState(null)
    const [consumeQty, setConsumeQty] = useState('')
    const [consumeNotes, setConsumeNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await api.get('/user/warehouse/my-inventory')
            setInventory(res.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchSilent, 3000)
        return () => clearInterval(interval)
    }, [])

    const fetchSilent = async () => {
        try {
            const reqRes = await api.get('/user/material-requests')
            setRequests(reqRes.data)
        } catch {}
    }

    const handleConfirm = async (id, action, reason = null) => {
        try {
            await api.put(`/user/material-requests/${id}/confirm`, { action, reason })
            setSuccessMsg(action === 'confirm' ? 'Preluare semnată cu succes!' : 'Refuz trimis adminului.')
            setTimeout(() => setSuccessMsg(''), 4000)
            fetchData()
            fetchSilent()
        } catch { /* silent */ }
    }

    const handleReturn = async (item) => {
        if (!window.confirm(`Confirmi returnarea sculei "${item.name}" în magazie?`)) return
        setActionLoading(item.id + '_return')
        try {
            await api.post('/user/warehouse/return-tool', { item_id: item.id })
            setSuccessMsg(`"${item.name}" a fost returnată în magazie.`)
            setTimeout(() => setSuccessMsg(''), 5000)
            fetchData()
        } catch (e) {
            setSuccessMsg('Eroare la returnare.')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDefective = async (item) => {
        const notes = window.prompt(`Descrie defectul pentru "${item.name}" (opțional):`)
        if (notes === null) return
        setActionLoading(item.id + '_defect')
        try {
            await api.post('/user/warehouse/report-defective', { item_id: item.id, notes })
            setSuccessMsg(`"${item.name}" a fost raportată ca DEFECTĂ și returnată în magazie.`)
            setTimeout(() => setSuccessMsg(''), 5000)
            fetchData()
        } catch (e) {
            setSuccessMsg('Eroare la raportare.')
        } finally {
            setActionLoading(null)
        }
    }

    const unconfirmedReq = requests.find(r => r.status === 'delivered')

    const handleConsumeClick = (item) => {
        setConsumeItem(item)
        setConsumeQty('')
        setConsumeNotes('')
        setShowConsumeForm(true)
    }

    const handleConsumeSubmit = async (e) => {
        e.preventDefault()
        const qty = parseFloat(consumeQty)
        if (!qty || qty <= 0 || qty > consumeItem.quantity) return

        setSubmitting(true)
        try {
            await api.post('/user/warehouse/consume', {
                item_id: consumeItem.id,
                quantity: qty,
                notes: consumeNotes
            })
            setSuccessMsg(`Ai raportat consumul pentru ${consumeItem.name}`)
            setTimeout(() => setSuccessMsg(''), 4000)
            setShowConsumeForm(false)
            fetchData()
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    const tools = inventory.filter(i => i.inventory_code)
    const consumables = inventory.filter(i => !i.inventory_code)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 shadow-lg sticky top-0 z-10">
                <div className="flex items-center gap-3 max-w-md mx-auto">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-white/80" />
                        <h1 className="font-bold text-lg">Inventarul Meu</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {successMsg && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-sm font-medium shadow-sm">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        {successMsg}
                    </div>
                )}

                {unconfirmedReq && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PackageSearch className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 text-center mb-2">Semnează Primirea</h2>
                            <p className="text-sm text-slate-500 text-center mb-6">
                                Administratorul a predat următoarea solicitare către șantier. Te rugăm să confirmi că ai intrat în posesia ei.
                            </p>
                            <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Materiale Vizate</p>
                                <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{unconfirmedReq.items_text}</p>
                            </div>
                            <div className="space-y-3">
                                <button 
                                    onClick={() => handleConfirm(unconfirmedReq.id, 'confirm')}
                                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98]"
                                >
                                    Confirm Primirea
                                </button>
                                <button 
                                    onClick={() => {
                                        const reason = prompt('Motivul refuzului (opțional, ex. lipsă produse):');
                                        if (reason !== null) {
                                            handleConfirm(unconfirmedReq.id, 'reject', reason);
                                        }
                                    }}
                                    className="w-full py-3.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                                >
                                    Refuz (Nu am primit)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                ) : inventory.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Inventar Gol</h3>
                        <p className="text-sm text-slate-500">Nu ai scule sau materiale atribuite pe numele tău.</p>
                    </div>
                ) : (
                    <>
                        {/* Scule Unice */}
                        {tools.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                                    <Wrench className="w-5 h-5 text-slate-500" />
                                    <h3 className="font-bold text-slate-800">Sculele Mele</h3>
                                    <span className="ml-auto bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">{tools.length}</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {tools.map(item => (
                                        <div key={item.id} className="p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="font-bold text-slate-800">{item.name}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {item.inventory_code && <span className="font-mono">{item.inventory_code}</span>}
                                                        {item.model && <span> · {item.model}</span>}
                                                    </p>
                                                </div>
                                                {item.is_defective ? (
                                                    <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase px-2 py-1 rounded-lg">Defect</span>
                                                ) : (
                                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-lg">La mine</span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleReturn(item)}
                                                    disabled={actionLoading === item.id + '_return'}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]"
                                                >
                                                    {actionLoading === item.id + '_return' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                                    Returnează
                                                </button>
                                                <button
                                                    onClick={() => handleDefective(item)}
                                                    disabled={actionLoading === item.id + '_defect'}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors active:scale-[0.97]"
                                                >
                                                    {actionLoading === item.id + '_defect' ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                                                    Raportează Defect
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Consumabile */}
                        {consumables.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-orange-500" />
                                    <h3 className="font-bold text-slate-800">Consumabile & Materiale</h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {consumables.map(item => (
                                        <div key={item.id} className="p-4 hover:bg-slate-50 flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-slate-800">{item.name}</p>
                                                    <p className="text-xs text-slate-500">{item.category}</p>
                                                </div>
                                                <div className="bg-slate-100 text-slate-800 px-3 py-1 rounded-lg text-sm font-bold border border-slate-200 shadow-sm">
                                                    {item.quantity} {item.unit}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleConsumeClick(item)}
                                                className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-1 shadow-sm active:scale-[0.98]"
                                            >
                                                <Minus className="w-3 h-3" />
                                                Raportează Consum
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Consume Modal */}
            {showConsumeForm && consumeItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Raportează Consum</h3>
                        <p className="text-sm text-slate-500 mb-4">{consumeItem.name}</p>
                        
                        <form onSubmit={handleConsumeSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    Cantitate consumată ({consumeItem.unit})
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={consumeItem.quantity}
                                        value={consumeQty}
                                        onChange={e => setConsumeQty(e.target.value)}
                                        className="w-full pl-4 pr-12 h-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-white text-lg font-bold text-slate-900 shadow-sm outline-none"
                                        placeholder="0.00"
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                                        {consumeItem.unit}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Stoc disponibil pe numele tău: {consumeItem.quantity} {consumeItem.unit}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notițe (Opțional)</label>
                                <textarea
                                    value={consumeNotes}
                                    onChange={e => setConsumeNotes(e.target.value)}
                                    placeholder="Detalii despre unde a fost folosit..."
                                    rows={2}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-white text-sm text-slate-900 shadow-sm outline-none resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowConsumeForm(false)}
                                    className="flex-1 h-11 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                                    Anulează
                                </button>
                                <button type="submit" disabled={submitting || !consumeQty}
                                    className="flex-1 h-11 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmă'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

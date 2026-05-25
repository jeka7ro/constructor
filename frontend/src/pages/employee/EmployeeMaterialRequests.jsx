import { useState, useEffect } from 'react'
import { PackageSearch, Plus, ChevronLeft, Send, Loader2, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

const STATUS_CONFIG = {
    pending:   { label: 'În Așteptare',  icon: Clock,        cls: 'bg-amber-100 text-amber-700' },
    approved:  { label: 'Aprobată',      icon: CheckCircle,  cls: 'bg-blue-100 text-blue-700' },
    rejected:  { label: 'Respinsă',      icon: XCircle,      cls: 'bg-rose-100 text-rose-700' },
    delivered: { label: 'Livrată',       icon: PackageSearch,cls: 'bg-emerald-100 text-emerald-700' },
}

export default function EmployeeMaterialRequests() {
    const navigate = useNavigate()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [itemsText, setItemsText] = useState('')
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')

    useEffect(() => { fetchRequests() }, [])

    const fetchRequests = async () => {
        setLoading(true)
        try {
            const res = await api.get('/user/material-requests')
            setRequests(res.data)
        } catch { /* silent */ }
        finally { setLoading(false) }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!itemsText.trim()) return
        setSubmitting(true)
        try {
            await api.post('/user/material-requests', { items_text: itemsText, notes })
            setItemsText('')
            setNotes('')
            setShowForm(false)
            setSuccessMsg('Necesarul a fost trimis cu succes!')
            setTimeout(() => setSuccessMsg(''), 4000)
            fetchRequests()
        } catch { /* silent */ }
        finally { setSubmitting(false) }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-4 shadow-lg">
                <div className="flex items-center justify-between max-w-md mx-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <PackageSearch className="w-5 h-5 text-white/80" />
                            <h1 className="font-bold text-lg">Necesar Materiale</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        title="Cerere nouă"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {/* Success banner */}
                {successMsg && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-sm font-medium">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        {successMsg}
                    </div>
                )}

                {/* Form */}
                {showForm && (
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                            <PackageSearch className="w-5 h-5 text-orange-500" />
                            <span className="font-bold text-slate-800">Cerere Nouă</span>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Listă Materiale *</label>
                                <textarea
                                    value={itemsText} onChange={e => setItemsText(e.target.value)} required
                                    placeholder="Scrie cantitățile și materialele de care ai nevoie..."
                                    rows={5}
                                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 bg-slate-50 text-slate-900 outline-none transition-all resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notițe (Opțional)</label>
                                <input
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="Detalii suplimentare..."
                                    className="w-full px-4 h-11 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 bg-slate-50 text-slate-900 outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 h-11 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                                    Anulează
                                </button>
                                <button type="submit" disabled={submitting || !itemsText.trim()}
                                    className="flex-1 h-11 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Trimite
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
                        <PackageSearch className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium text-sm">Nu ai trimis cereri de materiale.</p>
                        <button onClick={() => setShowForm(true)} className="mt-4 px-5 h-10 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2 mx-auto">
                            <Plus className="w-4 h-4" /> Prima cerere
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {requests.map(c => {
                            const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending
                            const StatusIcon = sc.icon
                            return (
                                <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${sc.cls}`}>
                                                <StatusIcon className="w-3 h-3" />{sc.label}
                                            </span>
                                            <p className="text-[10px] text-slate-400">
                                                {new Date(c.created_at).toLocaleString('ro-RO')}
                                            </p>
                                        </div>
                                        <p className="text-slate-700 text-sm font-medium whitespace-pre-wrap">{c.items_text}</p>
                                        {c.notes && (
                                            <p className="text-slate-500 text-xs mt-2 italic">{c.notes}</p>
                                        )}
                                    </div>

                                    {/* Admin response */}
                                    {c.admin_response && (
                                        <div className="bg-orange-50 border-t border-orange-100 px-4 py-3">
                                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Răspuns
                                            </p>
                                            <p className="text-sm text-slate-700 leading-relaxed">{c.admin_response}</p>
                                            {c.responded_at && (
                                                <p className="text-[10px] text-slate-400 mt-1">{new Date(c.responded_at).toLocaleString('ro-RO')}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { AlertTriangle, Plus, ChevronLeft, Send, Loader2, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

const STATUS_CONFIG = {
    active:   { label: 'Activă',     icon: AlertCircle,  cls: 'bg-rose-100 text-rose-700' },
    resolved: { label: 'Rezolvată',  icon: CheckCircle,  cls: 'bg-emerald-100 text-emerald-700' },
}

export default function EmployeeEmergencies() {
    const navigate = useNavigate()
    const [emergencies, setEmergencies] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [description, setDescription] = useState('')
    const [severity, setSeverity] = useState('high') // high or critical
    const [submitting, setSubmitting] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')

    useEffect(() => { fetchEmergencies() }, [])

    const fetchEmergencies = async () => {
        setLoading(true)
        try {
            const res = await api.get('/user/emergencies')
            setEmergencies(res.data)
        } catch { /* silent */ }
        finally { setLoading(false) }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!description.trim()) return
        setSubmitting(true)
        try {
            await api.post('/user/emergencies', { description, severity })
            setDescription('')
            setSeverity('high')
            setShowForm(false)
            setSuccessMsg('Urgența a fost trimisă. Un admin a fost notificat!')
            setTimeout(() => setSuccessMsg(''), 4000)
            fetchEmergencies()
        } catch { /* silent */ }
        finally { setSubmitting(false) }
    }

    return (
        <div className="h-full bg-gradient-to-br from-slate-50 to-rose-50/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-4 shadow-lg">
                <div className="flex items-center justify-between max-w-md mx-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-white/80" />
                            <h1 className="font-bold text-lg">Urgențe</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        title="Urgență nouă"
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
                        <div className="px-5 py-4 border-b border-rose-100 bg-rose-50 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-600" />
                            <span className="font-bold text-rose-800">Raportează o Urgență</span>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4 border-2 border-rose-50 rounded-b-2xl">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrierea Problemei *</label>
                                <textarea
                                    value={description} onChange={e => setDescription(e.target.value)} required
                                    placeholder="Descrie scurt și clar ce s-a întâmplat..."
                                    rows={4}
                                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-slate-50 text-slate-900 outline-none transition-all resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nivel Severitate</label>
                                <select
                                    value={severity} onChange={e => setSeverity(e.target.value)}
                                    className="w-full px-4 h-11 text-sm rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-slate-50 text-slate-900 outline-none transition-all"
                                >
                                    <option value="high">Urgent</option>
                                    <option value="critical">CRITIC / PERICOL MAJOR</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 h-11 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                                    Anulează
                                </button>
                                <button type="submit" disabled={submitting || !description.trim()}
                                    className="flex-1 h-11 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Trimite Urgență
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                    </div>
                ) : emergencies.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
                        <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium text-sm">Nu ai nicio urgență raportată.</p>
                        <button onClick={() => setShowForm(true)} className="mt-4 px-5 h-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2 mx-auto">
                            <Plus className="w-4 h-4" /> Raportează
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {emergencies.map(c => {
                            const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.active
                            const StatusIcon = sc.icon
                            return (
                                <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex gap-2">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${sc.cls}`}>
                                                    <StatusIcon className="w-3 h-3" />{sc.label}
                                                </span>
                                                {c.severity === 'critical' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 bg-red-100 text-red-800">
                                                        CRITIC
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-400">
                                                {new Date(c.created_at).toLocaleString('ro-RO')}
                                            </p>
                                        </div>
                                        <p className="text-slate-700 text-sm font-medium whitespace-pre-wrap mt-3">{c.description}</p>
                                    </div>

                                    {/* Admin response */}
                                    {c.admin_response && (
                                        <div className="bg-slate-50 border-t border-slate-100 px-4 py-3">
                                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Răspuns Admin
                                            </p>
                                            <p className="text-sm text-slate-700 leading-relaxed">{c.admin_response}</p>
                                            {c.resolved_at && (
                                                <p className="text-[10px] text-slate-400 mt-1">{new Date(c.resolved_at).toLocaleString('ro-RO')}</p>
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

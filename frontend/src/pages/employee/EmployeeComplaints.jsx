import { useState, useEffect } from 'react'
import { MessageSquareWarning, Plus, ChevronLeft, Send, Loader2, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import EmployeeHeader from '../../components/layout/EmployeeHeader'

const STATUS_CONFIG = {
    open:      { label: 'Deschisă',   icon: AlertCircle,  cls: 'bg-blue-100 text-blue-700' },
    in_review: { label: 'În Analiză', icon: Clock,        cls: 'bg-amber-100 text-amber-700' },
    resolved:  { label: 'Rezolvată',  icon: CheckCircle,  cls: 'bg-emerald-100 text-emerald-700' },
    closed:    { label: 'Închisă',    icon: XCircle,      cls: 'bg-slate-100 text-slate-500' },
}

export default function EmployeeComplaints() {
    const navigate = useNavigate()
    const [complaints, setComplaints] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')

    useEffect(() => { fetchComplaints() }, [])

    const fetchComplaints = async () => {
        setLoading(true)
        try {
            const res = await api.get('/user/complaints')
            setComplaints(res.data)
        } catch { /* silent */ }
        finally { setLoading(false) }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!title.trim() || !content.trim()) return
        setSubmitting(true)
        try {
            await api.post('/user/complaints', { title, content })
            setTitle('')
            setContent('')
            setShowForm(false)
            setSuccessMsg('Sesizarea a fost trimisă cu succes!')
            setTimeout(() => setSuccessMsg(''), 4000)
            fetchComplaints()
        } catch { /* silent */ }
        finally { setSubmitting(false) }
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-200">
            <EmployeeHeader 
                title="Sesizări și Reclamații" 
                showBack={true} 
                rightContent={
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md w-10 h-10 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 active:scale-95 transition-all"
                        title="Sesizare nouă"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                }
            />

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
                            <MessageSquareWarning className="w-5 h-5 text-orange-500" />
                            <span className="font-bold text-slate-800">Sesizare Nouă</span>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subiect *</label>
                                <input
                                    value={title} onChange={e => setTitle(e.target.value)} required
                                    placeholder="ex: Problemă cu echipamentul, Condiții de lucru..."
                                    className="w-full px-4 h-11 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descriere *</label>
                                <textarea
                                    value={content} onChange={e => setContent(e.target.value)} required
                                    placeholder="Descrie problema în detaliu..."
                                    rows={5}
                                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 outline-none transition-all resize-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 h-11 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                                    Anulează
                                </button>
                                <button type="submit" disabled={submitting || !title.trim() || !content.trim()}
                                    className="flex-1 h-11 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
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
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                ) : complaints.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
                        <MessageSquareWarning className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium text-sm">Nu ai sesizări trimise.</p>
                        <button onClick={() => setShowForm(true)} className="mt-4 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2 mx-auto">
                            <Plus className="w-4 h-4" /> Prima sesizare
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {complaints.map(c => {
                            const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.open
                            const StatusIcon = sc.icon
                            return (
                                <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-bold text-slate-900 text-sm leading-tight flex-1">{c.title}</h3>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${sc.cls}`}>
                                                <StatusIcon className="w-3 h-3" />{sc.label}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 text-xs leading-relaxed line-clamp-3">{c.content}</p>
                                        <p className="text-[10px] text-slate-300 mt-2">
                                            {new Date(c.created_at).toLocaleString('ro-RO')}
                                        </p>
                                    </div>

                                    {/* Admin response */}
                                    {c.admin_response && (
                                        <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-3">
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Răspuns Admin
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

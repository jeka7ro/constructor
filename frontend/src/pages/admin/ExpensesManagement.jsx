import { useState, useEffect } from 'react'
import { 
    Wallet, TrendingDown, DollarSign, Plus, Building2, User as UserIcon, Calendar, Upload, FileText, Trash2, X, FileEdit, Banknote, Search
} from 'lucide-react'
import api from '../../lib/api'

// O interfață de "Cheltuieli / Deconturi" cu design premium
export default function ExpensesManagement() {
    const [expenses, setExpenses] = useState([])
    const [sites, setSites] = useState([])
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [selectedSite, setSelectedSite] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [formData, setFormData] = useState({
        site_id: '',
        user_id: '',
        category: 'Cheltuieli diverse',
        amount: '',
        currency: 'RON',
        date: new Date().toISOString().split('T')[0],
        description: '',
        document_url: ''
    })

    const categories = ['Salarii', 'Cazare', 'Diurnă', 'Cheltuieli diverse']
    const categoryColors = {
        'Salarii': 'from-blue-500 to-indigo-600',
        'Cazare': 'from-purple-500 to-fuchsia-600',
        'Diurnă': 'from-orange-400 to-red-500',
        'Cheltuieli diverse': 'from-teal-400 to-emerald-500'
    }

    const loadData = async () => {
        try {
            const [expRes, sitesRes, usersRes] = await Promise.all([
                api.get('/admin/expenses', {
                    params: {
                        site_id: selectedSite || undefined,
                        category: selectedCategory || undefined
                    }
                }),
                api.get('/sites'),
                api.get('/admin/users')
            ])
            setExpenses(expRes.data)
            setSites(sitesRes.data.filter(s => s.status !== 'closed'))
            setUsers(usersRes.data)
        } catch (e) {
            console.error('Eroare încărcare date cheltuieli:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [selectedSite, selectedCategory])

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)
        
        setIsUploading(true)
        try {
            // Refolosim upload-logo temporar, sau vom avea o rută dedicată. Pentru acum, ne folosim de photo_upload generat în backend.
            // Am rute de upload la /photos/upload în system, dar putem folosi rute standardizate.
            // Dacă nu avem endpoint general de fișiere, vom simula sau face un API call la `admin/upload-logo` (hacky).
            // Acolo se acceptă și pdf? Nu, doar imagini. De fapt, vom face un endpoint dedicat pentru documente dacă e nevoie.
            // Temporar vom face un input text pt url dacă upload-ul dă fail (sau modificăm api ul mai târziu).
            const res = await api.post('/photos/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setFormData(prev => ({ ...prev, document_url: res.data.photo_url || res.data.url }))
        } catch (error) {
            console.error('Upload failed', error)
            alert('Atenție: Încărcarea fișierului a eșuat. Fișierul trebuie să fie imagine pentru ruta actuală.')
        } finally {
            setIsUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await api.post('/admin/expenses', {
                ...formData,
                amount: parseFloat(formData.amount)
            })
            setShowModal(false)
            setFormData({
                site_id: '', user_id: '', category: 'Cheltuieli diverse',
                amount: '', currency: 'RON', date: new Date().toISOString().split('T')[0],
                description: '', document_url: ''
            })
            loadData()
        } catch (e) {
            alert('Eroare la salvarea cheltuielii.')
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Ești sigur că vrei să ștergi această înregistrare?')) return
        try {
            await api.delete(`/admin/expenses/${id}`)
            loadData()
        } catch (e) {
            console.error(e)
        }
    }

    const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0)

    return (
        <div className="flex flex-col gap-6 p-2 lg:p-4 max-w-7xl mx-auto w-full min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
                <div>
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent tracking-tight flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-teal-400" />
                        Cheltuieli & Deconturi
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm max-w-lg leading-relaxed">
                        Gestionează centralizat salariile, cazările, diurnele și cheltuielile diverse atribuite fiecărui șantier.
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="group relative inline-flex items-center justify-center px-6 py-3 font-bold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 overflow-hidden"
                >
                    <Plus className="w-5 h-5 mr-2 transition-transform group-hover:rotate-90" />
                    Adaugă Cheltuială
                </button>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-white/5 relative overflow-hidden shadow-xl group hover:border-teal-500/30 transition-all">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-all"></div>
                    <p className="text-slate-400 text-sm font-medium mb-1">Total Cheltuieli</p>
                    <h2 className="text-4xl font-black text-white tracking-tight flex items-baseline gap-1">
                        {totalAmount.toLocaleString('ro-RO')} <span className="text-lg font-bold text-teal-400">RON</span>
                    </h2>
                </div>

                <div className="md:col-span-2 bg-slate-900/50 rounded-2xl p-6 border border-white/5 backdrop-blur-sm shadow-xl flex flex-col justify-center">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Filtru Șantier</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select 
                                    className="w-full bg-slate-800/80 border border-slate-700 text-white text-sm rounded-xl pl-10 pr-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                                    value={selectedSite}
                                    onChange={(e) => setSelectedSite(e.target.value)}
                                >
                                    <option value="">Toate Șantierele</option>
                                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Categorie</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select 
                                    className="w-full bg-slate-800/80 border border-slate-700 text-white text-sm rounded-xl pl-10 pr-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="">Toate Categoriile</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expenses List */}
            <div className="bg-slate-900/60 rounded-2xl border border-white/5 backdrop-blur-xl shadow-2xl overflow-hidden flex-1">
                {loading ? (
                    <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
                ) : expenses.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-white/5">
                            <TrendingDown className="w-10 h-10 text-slate-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Nicio cheltuială găsită</h3>
                        <p className="text-slate-400 max-w-sm">Nu există înregistrări pentru filtrele selectate. Apasă pe butonul de adăugare pentru a introduce o cheltuială nouă.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-white/5 text-xs uppercase tracking-widest text-slate-400">
                                    <th className="px-6 py-4 font-semibold">Dată</th>
                                    <th className="px-6 py-4 font-semibold">Categorie</th>
                                    <th className="px-6 py-4 font-semibold">Detalii</th>
                                    <th className="px-6 py-4 font-semibold">Șantier</th>
                                    <th className="px-6 py-4 font-semibold text-right">Suma (RON)</th>
                                    <th className="px-6 py-4 font-semibold text-center">Document</th>
                                    <th className="px-6 py-4 font-semibold text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {expenses.map(exp => (
                                    <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-300">
                                            {new Date(exp.date).toLocaleDateString('ro-RO')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${categoryColors[exp.category]} text-white shadow-sm`}>
                                                {exp.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-white font-medium">{exp.description || '-'}</div>
                                            {exp.user_name && <div className="text-xs text-slate-400 mt-1 flex items-center gap-1"><UserIcon className="w-3 h-3"/> {exp.user_name}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-slate-500" />
                                                {exp.site_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-base font-black text-white">
                                            {exp.amount.toLocaleString('ro-RO')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {exp.document_url ? (
                                                <a href={exp.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-800 text-blue-400 hover:text-blue-300 hover:bg-slate-700 transition-colors" title="Vezi Document">
                                                    <FileText className="w-5 h-5" />
                                                </a>
                                            ) : <span className="text-slate-600 text-xs">-</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button onClick={() => handleDelete(exp.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Adăugare Glassmorphism */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-teal-400" />
                                Înregistrează Cheltuială
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Șantier *</label>
                                    <select required className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none" value={formData.site_id} onChange={e => setFormData({...formData, site_id: e.target.value})}>
                                        <option value="" disabled>Alege șantier</option>
                                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Categorie *</label>
                                    <select required className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sumă (RON) *</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input required type="number" step="0.01" min="0" className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-bold" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dată *</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input required type="date" className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors [color-scheme:dark]" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {['Salarii', 'Diurnă'].includes(formData.category) && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Atribuie unui Angajat (Opțional)</label>
                                    <select className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none" value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})}>
                                        <option value="">-- Fără angajat specificat --</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Descriere / Observații</label>
                                <textarea className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none" rows="2" placeholder="Ex: Achiziție materiale Dedeman" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Document Justificativ (Poză/PDF)</label>
                                <div className="flex items-center justify-center w-full relative">
                                    <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all ${formData.document_url ? 'border-teal-500 bg-teal-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-950 hover:bg-slate-900'}`}>
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                            {isUploading ? (
                                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            ) : formData.document_url ? (
                                                <>
                                                    <CheckCircle className="w-8 h-8 text-teal-400 mb-2" />
                                                    <p className="text-sm font-semibold text-teal-400">Document Atașat</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-6 h-6 text-slate-500 mb-2" />
                                                    <p className="text-sm text-slate-400"><span className="font-semibold text-blue-400">Click pentru a încărca</span> sau fă o poză</p>
                                                </>
                                            )}
                                        </div>
                                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={isUploading} />
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 transition-colors">
                                    Anulează
                                </button>
                                <button type="submit" disabled={isUploading} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all hover:-translate-y-0.5">
                                    Salvează Cheltuiala
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

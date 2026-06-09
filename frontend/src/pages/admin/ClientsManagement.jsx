import { useState, useEffect } from 'react'
import { Building, Plus, Search, MapPin, Phone, Mail, Edit2, Trash2, Check, X, FileText, Briefcase, Loader2, RotateCw, Star } from 'lucide-react'
import { createPortal } from 'react-dom'
import MiniMapSelector from '../../components/MiniMapSelector'
import AddressAutocomplete from '../../components/AddressAutocomplete'
import api from '../../lib/api'

export default function ClientsManagement() {
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    
    // Modal states
    const [showModal, setShowModal] = useState(false)
    const [editingClient, setEditingClient] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [detecting, setDetecting] = useState(false)
    const [formData, setFormData] = useState({
        client_type: 'juridica',
        country: 'RO',
        name: '',
        first_name: '',
        last_name: '',
        cui: '',
        reg_com: '',
        address: '',
        latitude: '',
        longitude: '',
        contact_person: '',
        phone: '',
        email: '',
        preferred_language: 'ro',
        bank_name: '',
        iban: '',
        swift: ''
    })

    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' })
    const [showBankDetails, setShowBankDetails] = useState(false)

    useEffect(() => {
        fetchClients()
    }, [])

    const fetchClients = async () => {
        setLoading(true)
        try {
            const res = await api.get('/admin/clients')
            setClients(res.data)
        } catch (error) {
            console.error('Failed to load clients', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredClients = clients.filter(c => 
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.cui || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.contact_person || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleOpenModal = (client = null) => {
        if (client) {
            setEditingClient(client)
            let firstName = ''
            let lastName = ''
            if (client.client_type === 'fizica') {
                const parts = (client.name || '').split(' ')
                lastName = parts.pop() || ''
                firstName = parts.join(' ') || ''
            }
            setFormData({
                client_type: client.client_type || 'juridica',
                country: client.country || 'RO',
                name: client.client_type === 'juridica' ? (client.name || '') : '',
                first_name: firstName,
                last_name: lastName,
                cui: client.cui || '',
                reg_com: client.reg_com || '',
                address: client.address || '',
                latitude: client.latitude || '',
                longitude: client.longitude || '',
                contact_person: client.contact_person || '',
                phone: client.phone || '',
                email: client.email || '',
                preferred_language: client.preferred_language || 'ro',
                bank_name: client.bank_name || '',
                iban: client.iban || '',
                swift: client.swift || ''
            })
        } else {
            setEditingClient(null)
            setFormData({
                client_type: 'juridica',
                country: 'RO',
                name: '',
                first_name: '',
                last_name: '',
                cui: '',
                reg_com: '',
                address: '',
                latitude: '',
                longitude: '',
                contact_person: '',
                phone: '',
                email: '',
                preferred_language: 'ro',
                bank_name: '',
                iban: '',
                swift: ''
            })
        }
        setShowBankDetails(!!(client?.bank_name || client?.iban || client?.swift))
        setShowModal(true)
    }

    const handleDetectGPS = () => {
        setDetecting(true)
        if (!navigator.geolocation) {
            alert('Geolocatia nu este suportata de browser.');
            setDetecting(false);
            return;
        }

        const gpsTimeout = setTimeout(() => {
            setDetecting(false);
            alert('Timpul a expirat. Verifică dacă browser-ul are permisiunea de a accesa locația (GPS) în setările telefonului.');
        }, 8000);

        navigator.geolocation.getCurrentPosition(
            async pos => {
                clearTimeout(gpsTimeout);
                const lat = pos.coords.latitude.toFixed(6)
                const lon = pos.coords.longitude.toFixed(6)
                setFormData(p => ({ ...p, latitude: lat, longitude: lon }))
                // Reverse geocoding
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
                        { headers: { 'Accept-Language': 'ro' } }
                    )
                    const data = await res.json()
                    if (data?.display_name) {
                        const a = data.address || {}
                        const parts = [
                            a.road && a.house_number ? `${a.road} ${a.house_number}` : a.road,
                            a.city || a.town || a.village || a.municipality,
                            a.county,
                        ].filter(Boolean)
                        const addr = parts.length > 0 ? parts.join(', ') : data.display_name
                        setFormData(p => ({ ...p, address: addr }))
                    }
                } catch {}
                setDetecting(false)
            },
            (err) => {
                clearTimeout(gpsTimeout);
                setDetecting(false);
                alert('Eroare detectare GPS: ' + err.message + '\nTe rugăm să verifici dacă ai permis accesul la locație în browser/telefon.');
            },
            { enableHighAccuracy: true, timeout: 8000 }
        )
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setEditingClient(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (isSubmitting) return;
        setIsSubmitting(true)
        
        // Curățăm string-urile goale transformându-le în null
        const payload = { ...formData }
        
        if (payload.client_type === 'fizica') {
            payload.name = `${payload.first_name} ${payload.last_name}`.trim()
            payload.cui = null
            payload.reg_com = null
            payload.bank_name = null
            payload.iban = null
            payload.swift = null
        }
        delete payload.first_name
        delete payload.last_name

        Object.keys(payload).forEach(key => {
            if (payload[key] === '') {
                payload[key] = null
            }
        })

        try {
            if (editingClient) {
                await api.put(`/admin/clients/${editingClient.id}`, payload)
            } else {
                await api.post('/admin/clients', payload)
            }
            fetchClients()
            handleCloseModal()
        } catch (error) {
            console.error('Failed to save client', error)
            const detail = error.response?.data?.detail
            if (Array.isArray(detail)) {
                alert('Eroare de completare: ' + detail.map(d => `${d.loc[d.loc.length - 1]}: ${d.msg}`).join(', '))
            } else {
                alert(detail || 'Eroare la salvarea clientului.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteModal.id) return
        try {
            await api.delete(`/admin/clients/${deleteModal.id}`)
            fetchClients()
            setDeleteModal({ show: false, id: null, name: '' })
        } catch (error) {
            console.error('Failed to delete client', error)
            alert('Eroare la ștergerea clientului.')
        }
    }

    const handleToggleFavorite = async (client) => {
        try {
            // Optimistic UI Update
            setClients(prev => prev.map(c => 
                c.id === client.id ? { ...c, is_favorite: !c.is_favorite } : c
            ))
            
            await api.put(`/admin/clients/${client.id}`, {
                is_favorite: !client.is_favorite
            })
        } catch (error) {
            console.error('Failed to toggle favorite', error)
            fetchClients() // Revert on failure
        }
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                        <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Clienți</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Gestionează companiile pentru care lucrezi</p>
                    </div>
                </div>
            </div>

            {/* Main Content Wrapper */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                
                {/* Search & Actions Bar */}
                <div className="p-4 sm:p-5 flex flex-col xl:flex-row flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="relative group flex items-center w-full sm:w-auto">
                        <div className="absolute left-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Caută client..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 md:w-80 h-10 pl-10 pr-[72px] bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                        {searchQuery && (
                            <div className="absolute right-1.5 flex items-center gap-1 bg-orange-600 px-2 py-1 rounded-full shadow-sm">
                                <span className="text-[10px] font-bold text-white">
                                    {filteredClients.length}/{clients.length}
                                </span>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="p-0.5 hover:bg-orange-700 rounded-full transition-colors ml-0.5 cursor-pointer"
                                >
                                    <X className="w-3 h-3 text-white/80 hover:text-white" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            Client Nou
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">NR.</th>
                                <th className="px-6 py-4">CLIENT</th>
                                <th className="px-6 py-4">CUI / REG. COM.</th>
                                <th className="px-6 py-4">CONTACT</th>
                                <th className="px-6 py-4">TELEFON / EMAIL</th>
                                <th className="px-6 py-4 text-center">STATUS</th>
                                <th className="px-6 py-4 text-right">ACȚIUNI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Building className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                                            <p>{searchQuery ? 'Nu există clienți care să corespundă căutării.' : 'Nu s-au găsit clienți.'}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map((client, index) => (
                                    <tr 
                                        key={client.id}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${!client.is_active ? 'opacity-60 bg-red-50/30 dark:bg-red-900/10' : ''}`}
                                    >
                                        <td className="px-6 py-4 text-center font-medium text-slate-500">
                                            {index + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                                    <Building className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    {client.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                    {client.cui || '-'}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {client.reg_com || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-700 dark:text-slate-300">
                                                {client.contact_person || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-700 dark:text-slate-300">
                                                    {client.phone || '-'}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {client.email || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                client.is_active 
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                                {client.is_active ? 'Activ' : 'Inactiv'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                {client.is_active && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleToggleFavorite(client); }}
                                                            className={`flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
                                                                client.is_favorite 
                                                                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-500' 
                                                                    : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800'
                                                            }`}
                                                            title={client.is_favorite ? "Scoate de la favorite" : "Adaugă la favorite"}
                                                        >
                                                            <Star className="w-4 h-4" fill={client.is_favorite ? "currentColor" : "none"} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }}
                                                            className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                                                            title="Editează"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeleteModal({ show: true, id: client.id, name: client.name }); }}
                                                            className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors"
                                                            title="Șterge"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Add/Edit */}
            {showModal && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden transform scale-100 opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 bg-blue-600 dark:bg-slate-800 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-white" />
                                {editingClient ? 'Editează Client' : 'Adaugă Client Nou'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-blue-100 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Toggle Fizica/Juridica */}
                                <div className="flex gap-2 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-full">
                                    <button type="button" onClick={() => setFormData({...formData, client_type: 'juridica'})}
                                        className={`flex-1 px-4 h-8 rounded-full text-xs font-bold transition-all ${formData.client_type === 'juridica' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                        Persoană Juridică
                                    </button>
                                    <button type="button" onClick={() => setFormData({...formData, client_type: 'fizica'})}
                                        className={`flex-1 px-4 h-8 rounded-full text-xs font-bold transition-all ${formData.client_type === 'fizica' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                        Persoană Fizică
                                    </button>
                                </div>

                                {formData.client_type === 'juridica' ? (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="sm:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Nume Companie *</label>
                                                <input
                                                    type="text" required
                                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Țară</label>
                                                <select
                                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                    value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})}
                                                >
                                                    <option value="RO">România</option>
                                                    <option value="FR">Franța</option>
                                                    <option value="BE">Belgia</option>
                                                    <option value="NL">Olanda</option>
                                                    <option value="DE">Germania</option>
                                                    <option value="IT">Italia</option>
                                                    <option value="ES">Spania</option>
                                                    <option value="GB">Marea Britanie</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">
                                                    {formData.country === 'RO' ? 'CUI' : 'VAT Number (TVA)'}
                                                </label>
                                                <input type="text" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.cui} onChange={e => setFormData({...formData, cui: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">
                                                    {formData.country === 'RO' ? 'Nr. Reg. Comerțului' : 'Registration Number'}
                                                </label>
                                                <input type="text" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.reg_com} onChange={e => setFormData({...formData, reg_com: e.target.value})} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 cursor-pointer mb-3">
                                                <input type="checkbox" checked={showBankDetails} onChange={e => setShowBankDetails(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Adaugă detalii bancare (Bancă, IBAN, SWIFT)</span>
                                            </label>
                                            
                                            {showBankDetails && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Nume Bancă</label>
                                                        <input type="text" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">IBAN</label>
                                                            <input type="text" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value})} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">SWIFT</label>
                                                            <input type="text" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.swift} onChange={e => setFormData({...formData, swift: e.target.value})} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Nume *</label>
                                            <input type="text" required className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Prenume *</label>
                                            <input type="text" required className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                                        </div>
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Adresă (Sediu / Domiciliu)</label>
                                    <AddressAutocomplete 
                                        value={formData.address} 
                                        onChange={(addr, lat, lon) => {
                                            setFormData(p => ({
                                                ...p, 
                                                address: addr,
                                                ...(lat && lon ? { latitude: lat, longitude: lon } : {})
                                            }))
                                        }} 
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        placeholder="Caută adresa..."
                                    />
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wider">
                                            COORDONATE GPS
                                        </span>
                                        <button type="button" onClick={handleDetectGPS} disabled={detecting}
                                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-colors">
                                            <RotateCw className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
                                            {detecting ? 'Detectare...' : 'Detectează automat'}
                                        </button>
                                    </div>
                                    <div className="p-3">
                                        <MiniMapSelector latitude={formData.latitude} longitude={formData.longitude} onLocationChange={(lat, lon) => setFormData({...formData, latitude: lat, longitude: lon})} />
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Latitudine</label>
                                                <input type="text" readOnly className="w-full px-3 py-2 text-xs bg-slate-100/50 text-slate-500 rounded-xl border border-slate-200 outline-none" value={formData.latitude || ''} placeholder="Latitudine" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Longitudine</label>
                                                <input type="text" readOnly className="w-full px-3 py-2 text-xs bg-slate-100/50 text-slate-500 rounded-xl border border-slate-200 outline-none" value={formData.longitude || ''} placeholder="Longitudine" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {formData.client_type === 'juridica' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Persoană de Contact</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            value={formData.contact_person}
                                            onChange={e => setFormData({...formData, contact_person: e.target.value})}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Telefon</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            value={formData.phone}
                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Limba Preferată</label>
                                        <select
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            value={formData.preferred_language}
                                            onChange={e => setFormData({...formData, preferred_language: e.target.value})}
                                        >
                                            <option value="ro">🇷🇴 Română</option>
                                            <option value="en">🇬🇧 Engleză</option>
                                            <option value="fr">🇫🇷 Franceză</option>
                                            <option value="de">🇩🇪 Germană</option>
                                            <option value="nl">🇳🇱 Olandeză</option>
                                            <option value="ru">🇷🇺 Rusă</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Anulează
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-5 h-10 rounded-full text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Salvează
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* Modal Delete */}
            {deleteModal.show && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transform scale-100 opacity-100 transition-all">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Șterge Client</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                Ești sigur că vrei să ștergi clientul <span className="font-bold text-slate-700 dark:text-slate-300">{deleteModal.name}</span>? Dacă există șantiere asociate cu acesta, clientul va fi doar dezactivat.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                                    className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Anulează
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-5 h-10 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/20 transition-all"
                                >
                                    Da, Șterge
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            , document.body)}
        </div>
    )
}

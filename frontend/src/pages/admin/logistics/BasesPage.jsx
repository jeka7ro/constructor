import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, MapPin, Loader2, Save, X, ArrowLeft } from 'lucide-react'
import api from '../../../lib/api'
import { Link } from 'react-router-dom'
import { reverseGeocode } from '../../../lib/geocode'
import AddressAutocomplete from '../../../components/AddressAutocomplete'
import MapView from '../../../components/MapView'
import DataTable from '../../../components/DataTable'

export default function BasesPage() {
    const [bases, setBases] = useState([])
    const [teams, setTeams] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingBase, setEditingBase] = useState(null)
    const [formData, setFormData] = useState({ name: '', address: '', latitude: '', longitude: '', team_ids: [] })
    const [saving, setSaving] = useState(false)
    const [detecting, setDetecting] = useState(false)

    const handleDetectGPS = () => {
        setDetecting(true)
        if (!navigator.geolocation) {
            alert('Geolocația nu este suportată de acest browser.')
            setDetecting(false)
            return
        }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords
                try {
                    const address = await reverseGeocode(latitude, longitude)
                    setFormData(prev => ({ ...prev, latitude, longitude, address: address || prev.address }))
                } catch (e) {
                    setFormData(prev => ({ ...prev, latitude, longitude }))
                } finally {
                    setDetecting(false)
                }
            },
            (err) => {
                alert('Eroare la obținerea locației: ' + err.message)
                setDetecting(false)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const fetchData = async () => {
        try {
            setLoading(true)
            const [basesRes, teamsRes, vehiclesRes] = await Promise.all([
                api.get('/admin/logistics/bases'),
                api.get('/admin/teams/'),
                api.get('/admin/vehicles').catch(() => ({ data: [] }))
            ])
            setBases(basesRes.data)
            setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : (teamsRes.data?.teams || []))
            setVehicles(Array.isArray(vehiclesRes.data) ? vehiclesRes.data : (vehiclesRes.data?.items || []))
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const openModal = (base = null) => {
        if (base) {
            setEditingBase(base)
            setFormData({
                name: base.name,
                address: base.address || '',
                latitude: base.latitude || '',
                longitude: base.longitude || '',
                team_ids: base.team_ids || []
            })
        } else {
            setEditingBase(null)
            setFormData({ name: '', address: '', latitude: '', longitude: '', team_ids: [] })
        }
        setIsModalOpen(true)
    }

    const toggleTeam = (teamId) => {
        setFormData(prev => ({
            ...prev,
            team_ids: prev.team_ids.includes(teamId) 
                ? prev.team_ids.filter(id => id !== teamId)
                : [...prev.team_ids, teamId]
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = {
                name: formData.name,
                address: formData.address,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                team_ids: formData.team_ids
            }
            if (editingBase) {
                await api.put(`/admin/logistics/bases/${editingBase.id}`, payload)
            } else {
                await api.post('/admin/logistics/bases', payload)
            }
            setIsModalOpen(false)
            fetchData()
        } catch (err) {
            console.error(err)
            alert("Eroare la salvare")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm("Ești sigur că vrei să ștergi această Bază?")) return
        try {
            await api.delete(`/admin/logistics/bases/${id}`)
            fetchData()
        } catch (err) {
            console.error(err)
            alert("Eroare la ștergere")
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/admin/logistica" className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-blue-600" /> Baze (Puncte de plecare)
                    </h1>
                    <p className="text-slate-500 text-sm">Gestionează garajele/locațiile unde sunt parcate camioanele peste noapte.</p>
                </div>
                <div className="ml-auto">
                    <button onClick={() => openModal()} className="px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Adaugă Bază
                    </button>
                </div>
            </div>

            {/* DataTable Definition */}
            {(() => {
                const columns = [
                    {
                        key: 'name',
                        label: 'Nume Bază',
                        sortable: true,
                        render: (row) => <span className="font-bold text-slate-900 dark:text-white">{row.name}</span>
                    },
                    {
                        key: 'teams',
                        label: 'Camioane / Echipe',
                        render: (row) => {
                            const baseTeams = teams.filter(t => (row.team_ids || []).includes(t.id))
                            if (baseTeams.length === 0) return <span className="text-xs text-slate-400">Niciunul</span>
                            return (
                                <div className="flex flex-wrap gap-1">
                                    {baseTeams.map(t => {
                                        const truck = vehicles.find(v => v.user_ids?.includes(t.team_leader_id))
                                        return (
                                            <span key={t.id} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: t.color || '#ccc'}}></div>
                                                {t.name} {truck && <span className="text-blue-600 dark:text-blue-400">({truck.plate_number})</span>}
                                            </span>
                                        )
                                    })}
                                </div>
                            )
                        }
                    },
                    {
                        key: 'address',
                        label: 'Adresă',
                        sortable: true,
                        render: (row) => <span className="text-slate-600 dark:text-slate-400 text-sm">{row.address || '-'}</span>
                    },
                    {
                        key: 'coords',
                        label: 'Coordonate',
                        render: (row) => <span className="text-slate-500 dark:text-slate-500 text-xs font-mono">{row.latitude}, {row.longitude}</span>
                    },
                    {
                        key: 'actions',
                        label: 'Acțiuni',
                        render: (row) => (
                            <div className="flex items-center justify-end gap-2">
                                <button onClick={(e) => { e.stopPropagation(); openModal(row); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    }
                ]
                
                return (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-600 dark:bg-slate-800">
                            <h2 className="font-extrabold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-white" /> Tabel Baze (Garaje)
                            </h2>
                        </div>
                        <DataTable
                            columns={columns}
                            data={bases}
                            loading={loading}
                            emptyText="Nu există baze configurate."
                            searchable
                            searchPlaceholder="Caută bază..."
                            defaultPageSize={25}
                        />
                    </div>
                )
            })()}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-600 dark:bg-slate-800 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-white">{editingBase ? 'Editează Bază' : 'Bază Nouă'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-blue-100 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nume *</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-bold uppercase text-slate-500">Adresă / Căutare pe Hartă</label>
                                    <button 
                                        type="button" 
                                        onClick={handleDetectGPS} 
                                        disabled={detecting}
                                        className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 disabled:opacity-50"
                                    >
                                        {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                        Detectează
                                    </button>
                                </div>
                                <AddressAutocomplete
                                    value={formData.address}
                                    onChange={(addr, lat, lon) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            address: addr,
                                            latitude: lat !== null ? lat : prev.latitude,
                                            longitude: lon !== null ? lon : prev.longitude
                                        }))
                                    }}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            
                            <div className="rounded-xl overflow-hidden shadow-inner border border-slate-200 bg-slate-100">
                                <MapView 
                                    address={formData.address}
                                    latitude={formData.latitude}
                                    longitude={formData.longitude}
                                    height={200}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Latitudine GPS</label>
                                    <input type="number" step="any" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Longitudine GPS</label>
                                    <input type="number" step="any" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Camioane Alocate Bazei</label>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50 custom-scrollbar">
                                    {teams.length === 0 ? (
                                        <div className="col-span-2 text-sm text-slate-500 p-2">Nu există echipe/camioane.</div>
                                    ) : (
                                        teams.map(team => {
                                            const isSelected = formData.team_ids.includes(team.id)
                                            const truck = vehicles.find(v => v.user_ids?.includes(team.team_leader_id))
                                            return (
                                                <label key={team.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected}
                                                        onChange={() => toggleTeam(team.id)}
                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                        <div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor: team.color || '#ccc'}}></div>
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                                                            {team.name} {truck && <span className="text-blue-600 dark:text-blue-400 font-bold">({truck.plate_number})</span>}
                                                        </span>
                                                    </div>
                                                </label>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium">Anulare</button>
                                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvează
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

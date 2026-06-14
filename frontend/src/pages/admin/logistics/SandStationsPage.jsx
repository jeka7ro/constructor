import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, MapPin, Loader2, Save, X, ArrowLeft, Beaker, Map as MapIcon, List } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const getSandStationIcon = (letter) => new L.DivIcon({
    html: `<div style="background-color: #ef4444; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px;">${letter}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
})
import api from '../../../lib/api'
import { Link } from 'react-router-dom'
import AddressAutocomplete from '../../../components/AddressAutocomplete'
import MapView from '../../../components/MapView'
import DataTable from '../../../components/DataTable'

export default function SandStationsPage() {
    const [stations, setStations] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingStation, setEditingStation] = useState(null)
    const [formData, setFormData] = useState({ name: '', address: '', latitude: '', longitude: '' })
    const [saving, setSaving] = useState(false)
    const [detecting, setDetecting] = useState(false)
    const [viewMode, setViewMode] = useState(() => {
        const saved = localStorage.getItem('sandStations_viewMode')
        return saved || 'table'
    })

    useEffect(() => {
        localStorage.setItem('sandStations_viewMode', viewMode)
    }, [viewMode])

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
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, { headers: { 'Accept-Language': 'ro' } })
                    const data = await res.json()
                    setFormData(prev => ({ ...prev, latitude, longitude, address: data.display_name || prev.address }))
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

    const fetchStations = async () => {
        try {
            setLoading(true)
            const res = await api.get('/admin/logistics/sand-stations')
            setStations(res.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStations()
    }, [])

    const openModal = (station = null) => {
        if (station) {
            setEditingStation(station)
            setFormData({
                name: station.name,
                address: station.address || '',
                latitude: station.latitude || '',
                longitude: station.longitude || ''
            })
        } else {
            setEditingStation(null)
            setFormData({ name: '', address: '', latitude: '', longitude: '' })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = {
                name: formData.name,
                address: formData.address,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null
            }
            if (editingStation) {
                await api.put(`/admin/logistics/sand-stations/${editingStation.id}`, payload)
            } else {
                await api.post('/admin/logistics/sand-stations', payload)
            }
            setIsModalOpen(false)
            fetchStations()
        } catch (err) {
            console.error(err)
            alert("Eroare la salvare")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm("Ești sigur că vrei să ștergi această stație?")) return
        try {
            await api.delete(`/admin/logistics/sand-stations/${id}`)
            fetchStations()
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
                        <Beaker className="w-6 h-6 text-blue-600" /> Stații de Nisip
                    </h1>
                    <p className="text-slate-500 text-sm">Gestionează stațiile de la care se încarcă nisip/agregate.</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                        <button onClick={() => setViewMode('table')} className={`px-4 h-9 flex items-center gap-2 rounded-full text-sm font-bold transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                            <List className="w-4 h-4" /> Tabel
                        </button>
                        <button onClick={() => setViewMode('map')} className={`px-4 h-9 flex items-center gap-2 rounded-full text-sm font-bold transition-colors ${viewMode === 'map' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                            <MapIcon className="w-4 h-4" /> Hartă
                        </button>
                    </div>
                    <button onClick={() => openModal()} className="px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Adaugă Stație
                    </button>
                </div>
            </div>

            {/* DataTable Definition */}
            {viewMode === 'table' ? (() => {
                const columns = [
                    {
                        key: 'name',
                        label: 'Nume Stație',
                        sortable: true,
                        render: (row) => <span className="font-bold text-slate-900 dark:text-white">{row.name}</span>
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
                                <Beaker className="w-4 h-4 text-white" /> Tabel Stații Nisip
                            </h2>
                        </div>
                        <DataTable
                            columns={columns}
                            data={stations}
                            loading={loading}
                            emptyText="Nu există stații configurate."
                            searchable
                            searchPlaceholder="Caută stație..."
                            defaultPageSize={25}
                        />
                    </div>
                )
            })() : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
                    <div className="col-span-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><MapPin className="w-4 h-4 text-red-500" /> Legendă Stații</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {stations.map((s) => {
                                const letter = s.type === 'theirs' ? 'I' : 'D'
                                return (
                                <div key={s.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-default transition-colors">
                                    <div className="w-6 h-6 rounded-full bg-red-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border-2 border-white dark:border-slate-900 mt-0.5">
                                        {letter}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight">{s.name}</div>
                                        {s.address && <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{s.address}</div>}
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="col-span-1 lg:col-span-3 bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700 overflow-hidden relative z-0 h-full">
                        <MapContainer 
                            center={[50.8503, 4.3517]} 
                            zoom={8} 
                            scrollWheelZoom={false}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {stations.filter(s => s.latitude && s.longitude).map((s) => (
                                <Marker key={s.id} position={[s.latitude, s.longitude]} icon={getSandStationIcon(s.type === 'theirs' ? 'I' : 'D')}>
                                    <Popup>
                                        <div className="font-bold text-sm text-slate-900">{s.name}</div>
                                        <div className="text-xs text-slate-500 mt-1">{s.address}</div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-600 dark:bg-slate-800 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-white">{editingStation ? 'Editează Stație' : 'Stație Nouă'}</h2>
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

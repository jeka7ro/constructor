import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, MapPin, Loader2, Save, X, ArrowLeft, Beaker, Map as MapIcon, List } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useUIStore } from '../../../store/uiStore'
import ConfirmModal from '../../../components/ConfirmModal'

const getSandStationIcon = (letter, bgColor) => new L.DivIcon({
    html: `<div style="background-color: ${bgColor}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px;">${letter}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
})
import api from '../../../lib/api'
import { Link } from 'react-router-dom'
import { reverseGeocode } from '../../../lib/geocode'
import AddressAutocomplete from '../../../components/AddressAutocomplete'
import MapView from '../../../components/MapView'
import DataTable from '../../../components/DataTable'

function FlyToStation({ coords }) {
    const map = useMap();
    useEffect(() => {
        if (coords) {
            map.flyTo(coords, 14, { animate: true });
        }
    }, [coords, map]);
    return null;
}

export default function SandStationsPage() {
    const { showToast } = useUIStore()
    const [stations, setStations] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingStation, setEditingStation] = useState(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStationId, setSelectedStationId] = useState(null)
    const [formData, setFormData] = useState({ name: '', address: '', latitude: '', longitude: '', price_per_ton: '' })
    const [saving, setSaving] = useState(false)
    const [detecting, setDetecting] = useState(false)
    const [selectedCoords, setSelectedCoords] = useState(null)
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
            showToast('La géolocalisation n\'est pas supportée par ce navigateur.', 'error')
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
                showToast('Erreur de géolocalisation : ' + err.message, 'error')
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
                longitude: station.longitude || '',
                price_per_ton: station.price_per_ton !== null ? station.price_per_ton : ''
            })
        } else {
            setEditingStation(null)
            setFormData({ name: '', address: '', latitude: '', longitude: '', price_per_ton: '' })
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
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                price_per_ton: formData.price_per_ton ? parseFloat(formData.price_per_ton) : null
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
            showToast('Erreur lors de l\'enregistrement', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = (id) => {
        setDeleteConfirmId(id)
    }

    const confirmDeleteStation = async () => {
        if (!deleteConfirmId) return
        try {
            await api.delete(`/admin/logistics/sand-stations/${deleteConfirmId}`)
            setDeleteConfirmId(null)
            fetchStations()
        } catch (err) {
            console.error(err)
            showToast('Erreur lors de la suppression', 'error')
        }
    }

    return (
        <div className="w-full space-y-3 md:space-y-5">
            <div className="flex items-center gap-2 md:gap-4">
                <Link to="/admin/logistica" className="w-8.5 h-8.5 md:w-10 md:h-10 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors shadow-2xs shrink-0">
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-slate-600 dark:text-slate-300" />
                </Link>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 md:gap-3.5">
                        <h1 className="text-[17px] md:text-[28px] font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5 md:gap-2 truncate">
                            <Beaker className="w-4.5 h-4.5 md:w-6 md:h-6 text-[color:var(--tenant-bg)] shrink-0" /> Sablières
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 md:px-3.5 md:py-1.5 rounded-full text-[11px] md:text-[15px] font-extrabold bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 shrink-0">
                            <span className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </span>
                    </div>
                    <p className="hidden md:block text-slate-500 text-[15px] font-semibold mt-0.5">Gérez les sablières et leurs tarifs à la tonne.</p>
                </div>
                <div className="ml-auto flex items-center gap-2 md:gap-3 shrink-0">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200/90 dark:border-slate-700">
                        <button type="button" onClick={() => setViewMode('table')} className={`px-2.5 md:px-4 h-7.5 md:h-9.5 flex items-center gap-1 md:gap-2 rounded-full text-xs md:text-[14.5px] font-bold transition-colors cursor-pointer ${viewMode === 'table' ? 'bg-[color:var(--tenant-bg)] shadow-xs text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                            <List className="w-3.5 h-3.5 md:w-4 md:h-4" /> Liste
                        </button>
                        <button type="button" onClick={() => setViewMode('map')} className={`px-2.5 md:px-4 h-7.5 md:h-9.5 flex items-center gap-1 md:gap-2 rounded-full text-xs md:text-[14.5px] font-bold transition-colors cursor-pointer ${viewMode === 'map' ? 'bg-[color:var(--tenant-bg)] shadow-xs text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                            <MapIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /> Carte
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => openModal()}
                        aria-label="Ajouter une sablière"
                        title="Ajouter une sablière"
                        className="w-9 h-9 md:w-auto md:px-6 md:h-11 rounded-full bg-[color:var(--tenant-bg)] hover:opacity-95 text-white text-xs md:text-[15px] font-extrabold flex items-center justify-center gap-1.5 md:gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                    >
                        <Plus className="w-4.5 h-4.5 shrink-0" />
                        <span className="hidden md:inline">Ajouter</span>
                    </button>
                </div>
            </div>

            {/* DataTable Definition */}
            {(() => {
                const validPrices = stations
                    .map(s => parseFloat(s.price_per_ton))
                    .filter(p => !isNaN(p))
                    .sort((a, b) => a - b);

                const getPriceColor = (priceStr) => {
                    if (priceStr == null || priceStr === '') return '#64748b'; // slate-500 (gri - fără preț)
                    const price = parseFloat(priceStr);
                    if (isNaN(price) || validPrices.length === 0) return '#64748b';
                    if (validPrices[0] === validPrices[validPrices.length - 1]) return '#10b981';
                    const lessCount = validPrices.filter(p => p < price).length;
                    const ratio = lessCount / Math.max(1, validPrices.length - 1);
                    if (ratio < 0.34) return '#10b981'; // emerald-500 (verde)
                    if (ratio < 0.67) return '#f59e0b'; // amber-500 (portocaliu)
                    return '#ef4444'; // red-500 (roșu)
                };

                if (viewMode === 'table') {
                    const columns = [
                        {
                            key: 'name',
                            label: 'Nume Stație',
                            sortable: true,
                            render: (row) => (
                                <div className="flex items-center gap-2.5">
                                    <span
                                        className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm"
                                        style={{ backgroundColor: getPriceColor(row.price_per_ton) }}
                                    />
                                    <span className="font-bold text-slate-900 dark:text-white">{row.name}</span>
                                </div>
                            )
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
                            render: (row) => <span className="text-slate-500 dark:text-slate-500 text-xs tabular-nums">{row.latitude}, {row.longitude}</span>
                        },
                        {
                            key: 'price',
                            label: 'Preț per Tonă',
                            sortable: true,
                            render: (row) => {
                                if (row.price_per_ton !== null && row.price_per_ton !== undefined && row.price_per_ton !== '') {
                                    const color = getPriceColor(row.price_per_ton);
                                    return (
                                        <span
                                            className="inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg text-xs text-white whitespace-nowrap shadow-sm"
                                            style={{ backgroundColor: color }}
                                        >
                                            {row.price_per_ton} €
                                        </span>
                                    );
                                }
                                return <span className="text-slate-400 text-xs font-medium italic whitespace-nowrap">Fără preț</span>;
                            }
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
                        <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] border border-slate-200/90 dark:border-slate-800 overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                                <h2 className="font-extrabold text-slate-900 dark:text-white text-[15px] tracking-tight flex items-center gap-2">
                                    <Beaker className="w-4 h-4 text-emerald-600" /> Tabel Stații Nisip
                                    <span className="px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 tabular-nums">{stations.length}</span>
                                </h2>
                            </div>
                            <DataTable
                                columns={columns}
                                data={stations}
                                loading={loading}
                                emptyText="Nu există stații configurate."
                                searchable
                                searchPlaceholder="Rechercher une station..."
                                defaultPageSize={50}
                                mobileCard={(row) => {
                                    const color = getPriceColor(row.price_per_ton);
                                    return (
                                        <div className="bg-white dark:bg-slate-800/90 mx-2.5 my-1 px-3 py-2.5 rounded-2xl border border-slate-200/85 dark:border-slate-700/80 shadow-2xs flex items-center justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                                    <span className="text-[13.5px] font-extrabold text-slate-900 dark:text-white truncate">{row.name}</span>
                                                </div>
                                                {row.address && (
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 pl-4">{row.address}</div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {row.price_per_ton !== null && row.price_per_ton !== undefined && row.price_per_ton !== '' ? (
                                                    <span className="font-bold px-2 py-0.5 rounded-lg text-[11px] text-white whitespace-nowrap tabular-nums" style={{ backgroundColor: color }}>
                                                        {row.price_per_ton} €
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-[11px] italic">Sans prix</span>
                                                )}
                                                <button type="button" onClick={(e) => { e.stopPropagation(); openModal(row); }} className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-blue-600 bg-slate-100 dark:bg-slate-700 rounded-full cursor-pointer">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }} className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-red-600 bg-slate-100 dark:bg-slate-700 rounded-full cursor-pointer">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        </div>
                    )
                }

                return (
                    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-3 lg:gap-6 h-[calc(100dvh-180px)] lg:h-[700px]">
                        <div className="col-span-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col max-h-[190px] lg:max-h-none lg:h-full overflow-hidden shrink-0">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><MapPin className="w-4 h-4 text-red-500" /> Legendă Stații</h3>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Caută stație..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {stations.filter(s => {
                                    if (!searchQuery) return true;
                                    const q = searchQuery.toLowerCase();
                                    return (s.name || '').toLowerCase().includes(q) || (s.address || '').toLowerCase().includes(q);
                                }).map((s) => {
                                    const letter = 'S'
                                    const isSelected = selectedStationId === s.id;
                                    const stationColor = getPriceColor(s.price_per_ton);
                                    return (
                                    <div 
                                        key={s.id} 
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedStationId(null);
                                                setSelectedCoords(null);
                                            } else {
                                                setSelectedStationId(s.id);
                                                if (s.latitude && s.longitude) {
                                                    setSelectedCoords([s.latitude, s.longitude]);
                                                }
                                            }
                                        }}
                                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] border-2 ${isSelected ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        <div
                                            className="w-6 h-6 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border-2 border-white dark:border-slate-900 mt-0.5"
                                            style={{ backgroundColor: stationColor }}
                                        >
                                            {letter}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight truncate">{s.name}</div>
                                            {s.address && <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{s.address}</div>}
                                        </div>
                                        {s.price_per_ton != null && s.price_per_ton !== '' ? (
                                            <div className="shrink-0 flex flex-col items-end">
                                                <span
                                                    className="text-xs font-bold text-white px-2 py-1 rounded-lg whitespace-nowrap shadow-sm"
                                                    style={{ backgroundColor: stationColor }}
                                                >
                                                    {s.price_per_ton} €
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="shrink-0 flex flex-col items-end">
                                                <span className="text-[11px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                                    —
                                                </span>
                                            </div>
                                        )}
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
                                <TileLayer url="https://mt1.google.com/vt/lyrs=m&hl=fr&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" maxZoom={20} />
                                {selectedCoords && <FlyToStation coords={selectedCoords} />}
                                {stations.filter(s => s.latitude && s.longitude).map((s) => (
                                    <Marker key={s.id} position={[s.latitude, s.longitude]} icon={getSandStationIcon('S', getPriceColor(s.price_per_ton))}>
                                        <Popup>
                                            <div className="font-bold text-sm text-slate-900">{s.name}</div>
                                            <div className="text-xs text-slate-500 mt-1">{s.address}</div>
                                            {s.price_per_ton != null && s.price_per_ton !== '' ? (
                                                <div className="text-xs font-bold text-slate-700 mt-2 bg-slate-50 p-2 border border-slate-100 rounded-lg flex items-center justify-between gap-3">
                                                    <span>Preț:</span>
                                                    <span className="text-white px-2 py-0.5 rounded font-bold text-xs whitespace-nowrap" style={{ backgroundColor: getPriceColor(s.price_per_ton) }}>
                                                        {s.price_per_ton} € / tonă
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="text-xs font-medium text-slate-400 mt-2 italic">Fără preț configurat</div>
                                            )}
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>
                    </div>
                )
            })()}

            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 backdrop-blur-3xl saturate-150 rounded-[24px] w-full max-w-lg shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] border-[1.5px] border-slate-300/95 dark:border-slate-600/85 ring-1 ring-slate-900/10 overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200/85 dark:border-slate-800 flex justify-between items-center bg-[#F2F4F8] dark:bg-slate-800/80">
                            <h2 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-100/90 text-blue-600 border border-blue-200/80 flex items-center justify-center shadow-2xs">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                {editingStation ? 'Modifier la sablière' : 'Nouvelle sablière'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-300/80 flex items-center justify-center text-slate-500 transition-colors shadow-2xs"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nom *</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-[13px] focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Prix par tonne (€)</label>
                                    <input type="number" step="any" placeholder="ex: 25.5" value={formData.price_per_ton} onChange={e => setFormData({...formData, price_per_ton: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-[13px] focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-bold uppercase text-slate-500">Adresse / Recherche sur carte</label>
                                    <button 
                                        type="button" 
                                        onClick={handleDetectGPS} 
                                        disabled={detecting}
                                        className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 disabled:opacity-50"
                                    >
                                        {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                        Détecter
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
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-[13px] focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="rounded-[16px] overflow-hidden shadow-inner border border-slate-200/90 bg-slate-100">
                                <MapView 
                                    address={formData.address}
                                    latitude={formData.latitude}
                                    longitude={formData.longitude}
                                    height={200}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Latitude GPS</label>
                                    <input type="number" step="any" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-[13px] focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Longitude GPS</label>
                                    <input type="number" step="any" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-[13px] focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/85">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="h-[42px] px-5 rounded-[13px] bg-white border border-slate-300/90 text-slate-700 hover:bg-slate-50 font-bold text-[14px] shadow-2xs transition-all active:scale-[0.98]">Annuler</button>
                                <button type="submit" disabled={saving} className="h-[42px] px-6 bg-[color:var(--tenant-bg)] hover:opacity-95 text-white font-bold text-[14px] rounded-[13px] shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmModal
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={confirmDeleteStation}
                title="Supprimer la sablière"
                message="Êtes-vous sûr de vouloir supprimer cette sablière ?"
                confirmText="Supprimer"
                cancelText="Annuler"
                type="danger"
            />
        </div>
    )
}

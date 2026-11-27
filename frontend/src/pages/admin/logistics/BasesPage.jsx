import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, MapPin, Loader2, Save, X, ArrowLeft } from 'lucide-react'
import api from '../../../lib/api'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { reverseGeocode } from '../../../lib/geocode'
import AddressAutocomplete from '../../../components/AddressAutocomplete'
import MapView from '../../../components/MapView'
import DataTable from '../../../components/DataTable'
import { useUIStore } from '../../../store/uiStore'
import ConfirmModal from '../../../components/ConfirmModal'

export default function BasesPage() {
    const { t } = useTranslation();
    const { showToast } = useUIStore()
    const [bases, setBases] = useState([])
    const [teams, setTeams] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingBase, setEditingBase] = useState(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState(null)
    const [formData, setFormData] = useState({ name: '', address: '', latitude: '', longitude: '', team_ids: [] })
    const [saving, setSaving] = useState(false)
    const [detecting, setDetecting] = useState(false)

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
            showToast('Erreur lors de l\'enregistrement', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = (id) => {
        setDeleteConfirmId(id)
    }

    const confirmDeleteBase = async () => {
        if (!deleteConfirmId) return
        try {
            await api.delete(`/admin/logistics/bases/${deleteConfirmId}`)
            setDeleteConfirmId(null)
            fetchData()
        } catch (err) {
            console.error(err)
            showToast('Erreur lors de la suppression', 'error')
        }
    }

    return (
        <div className="w-full space-y-5">
            <div className="flex flex-wrap items-center gap-4">
                <Link to="/admin/logistica" className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors shadow-2xs">
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </Link>
                <div>
                    <div className="flex items-center gap-3.5">
                        <h1 className="text-[28px] font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
                            <MapPin className="w-6 h-6 text-[color:var(--tenant-bg)]" /> {t('logistics.bases_title', 'Baze (Puncte de plecare)')}
                        </h1>
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[15px] font-extrabold bg-emerald-500/15 text-emerald-700 border border-emerald-500/25">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </span>
                    </div>
                    <p className="text-slate-500 text-[15px] font-semibold mt-0.5">{t('logistics.bases_desc', 'Gestionează garajele/locațiile unde sunt parcate camioanele peste noapte.')}</p>
                </div>
                <div className="ml-auto">
                    <button onClick={() => openModal()} className="px-6 h-11 rounded-full bg-[color:var(--tenant-bg)] hover:opacity-95 text-white text-[15px] font-extrabold flex items-center gap-2 shadow-xs transition-all cursor-pointer">
                        <Plus className="w-4.5 h-4.5" /> {t('logistics.add_base', 'Ajouter Bază')}
                    </button>
                </div>
            </div>

            {/* DataTable Definition */}
            {(() => {
                const columns = [
                    {
                        key: 'name',
                        label: t('common.base_name', 'Nume Bază'),
                        sortable: true,
                        render: (row) => <span className="font-bold text-slate-900 dark:text-white">{row.name}</span>
                    },
                    {
                        key: 'teams',
                        label: t('logistics.trucks_teams', 'Camioane / Echipe'),
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
                        label: t('common.address', 'Adresă'),
                        sortable: true,
                        render: (row) => <span className="text-slate-600 dark:text-slate-400 text-sm">{row.address || '-'}</span>
                    },
                    {
                        key: 'coords',
                        label: t('common.coordinates', 'Coordonate'),
                        render: (row) => <span className="text-slate-500 dark:text-slate-500 text-xs tabular-nums">{row.latitude}, {row.longitude}</span>
                    },
                    {
                        key: 'actions',
                        label: t('common.actions', 'Acțiuni'),
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
                                <MapPin className="w-4 h-4 text-emerald-600" /> {t('logistics.bases_table', 'Tabel Baze (Garaje)')}
                                <span className="px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 tabular-nums">{bases.length}</span>
                            </h2>
                        </div>
                        <DataTable
                            columns={columns}
                            data={bases}
                            loading={loading}
                            emptyText={t('logistics.no_bases', 'Nu există baze configurate.')}
                            searchable
                            searchPlaceholder={t('logistics.search_base', 'Rechercher une base...')}
                            defaultPageSize={25}
                        />
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
                                {editingBase ? t('logistics.edit_base', 'Modifier la base') : t('logistics.new_base', 'Nouvelle base')}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-300/80 flex items-center justify-center text-slate-500 transition-colors shadow-2xs"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">{t('common.name', 'Nom')} *</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-[13px] focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-bold uppercase text-slate-500">{t('common.address_search', 'Adresse / Recherche sur carte')}</label>
                                    <button 
                                        type="button" 
                                        onClick={handleDetectGPS} 
                                        disabled={detecting}
                                        className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 disabled:opacity-50"
                                    >
                                        {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                        {t('common.detect', 'Détecter')}
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
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">{t('common.latitude', 'Latitude GPS')}</label>
                                    <input type="number" step="any" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-[13px] focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">{t('common.longitude', 'Longitude GPS')}</label>
                                    <input type="number" step="any" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-[13px] focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">{t('logistics.allocated_trucks', 'Camions alloués à la base')}</label>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200/90 rounded-[13px] bg-slate-50 custom-scrollbar">
                                    {teams.length === 0 ? (
                                        <div className="col-span-2 text-sm text-slate-500 p-2">{t('logistics.no_teams', 'Aucune équipe/camion.')}</div>
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

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/85">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="h-[42px] px-5 rounded-[13px] bg-white border border-slate-300/90 text-slate-700 hover:bg-slate-50 font-bold text-[14px] shadow-2xs transition-all active:scale-[0.98]">{t('common.cancel', 'Annuler')}</button>
                                <button type="submit" disabled={saving} className="h-[42px] px-6 bg-[color:var(--tenant-bg)] hover:opacity-95 text-white font-bold text-[14px] rounded-[13px] shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('common.save', 'Enregistrer')}
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
                onConfirm={confirmDeleteBase}
                title="Supprimer la base"
                message="Êtes-vous sûr de vouloir supprimer cette base ?"
                confirmText="Supprimer"
                cancelText="Annuler"
                type="danger"
            />
        </div>
    )
}

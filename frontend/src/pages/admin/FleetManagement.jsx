import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'
import { Loader2, X, Plus, Edit2, Trash2, Building2, Users } from 'lucide-react'

const VEHICLE_TYPES = ['car', 'van', 'truck', 'excavator', 'grader', 'compactor', 'pile_driver', 'concrete_mixer', 'tractor_trailer', 'forklift', 'telehandler', 'cherry_picker', 'crane_truck', 'crane', 'pickup_4x4', 'mobile_workshop', 'generator', 'other']
const VEHICLE_STATUSES = ['active', 'service', 'inactive']

const STATUS_COLORS = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    service: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    inactive: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600',
}

export default function FleetManagement() {
    const { t } = useTranslation()
    const [vehicles, setVehicles] = useState([])
    const [sites, setSites] = useState([])
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)


    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState(null)
    const [activeTab, setActiveTab] = useState('info') // 'info' | 'sites' | 'drivers'
    const [saving, setSaving] = useState(false)

    // Form state
    const [form, setForm] = useState({
        name: '', plate_number: '', type: 'van', year: new Date().getFullYear(), status: 'active', notes: ''
    })
    const [selectedSiteIds, setSelectedSiteIds] = useState([])
    const [selectedUserIds, setSelectedUserIds] = useState([])
    const [siteSearch, setSiteSearch] = useState('')
    const [userSearch, setUserSearch] = useState('')

    const filteredSites = sites.filter(s => (s.name || '').toLowerCase().includes(siteSearch.toLowerCase()) || (s.county || '').toLowerCase().includes(siteSearch.toLowerCase()))
    
    // Filter users dynamically based on selected sites
    const validUserIds = new Set();
    if (selectedSiteIds.length > 0) {
        selectedSiteIds.forEach(siteId => {
            const site = sites.find(s => s.id === siteId);
            if (site && site.assigned_worker_ids) {
                site.assigned_worker_ids.forEach(id => validUserIds.add(id));
            }
        });
    }
    
    const filteredUsers = users.filter(u => {
        // Must be in the valid user set if any sites are selected
        if (selectedSiteIds.length > 0 && !validUserIds.has(u.id)) return false;
        
        return `${u.first_name} ${u.last_name} ${u.employee_code}`.toLowerCase().includes(userSearch.toLowerCase());
    })
    const [deleteTarget, setDeleteTarget] = useState(null)

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const [vRes, sRes, uRes] = await Promise.all([
                api.get('/admin/vehicles', { params: { page_size: 1000 } }),
                api.get('/admin/sites/', { params: { page_size: 1000 } }),
                api.get('/admin/users/', { params: { is_active: true, page_size: 1000 } }),
            ])
            setVehicles(Array.isArray(vRes.data?.vehicles) ? vRes.data.vehicles : (Array.isArray(vRes.data) ? vRes.data : []))
            setSites(Array.isArray(sRes.data?.sites) ? sRes.data.sites : (Array.isArray(sRes.data) ? sRes.data : []))
            setUsers(Array.isArray(uRes.data?.users) ? uRes.data.users : (Array.isArray(uRes.data) ? uRes.data : []))
            setError(null)
        } catch (e) {
            setError(t('fleet.errors.load'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    const openAdd = () => {
        setEditingVehicle(null)
        setForm({ name: '', plate_number: '', type: 'van', year: new Date().getFullYear(), status: 'active', notes: '' })
        setSelectedSiteIds([])
        setSelectedUserIds([])
        setActiveTab('info')
        setShowModal(true)
    }

    const openEdit = (v) => {
        setEditingVehicle(v)
        setForm({ name: v.name, plate_number: v.plate_number || '', type: v.type || 'van', year: v.year || new Date().getFullYear(), status: v.status || 'active', notes: v.notes || '' })
        setSelectedSiteIds((v.site_ids || []))
        setSelectedUserIds((v.user_ids || []))
        setActiveTab('info')
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) return
        setSaving(true)
        try {
            const payload = { ...form, site_ids: selectedSiteIds, user_ids: selectedUserIds }
            if (editingVehicle) {
                await api.put(`/admin/vehicles/${editingVehicle.id}`, payload)
            } else {
                await api.post('/admin/vehicles', payload)
            }
            setShowModal(false)
            fetchAll()
        } catch (e) {
            alert(t('fleet.errors.save'))
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            await api.delete(`/admin/vehicles/${deleteTarget.id}`)
            setDeleteTarget(null)
            fetchAll()
        } catch { alert(t('fleet.errors.delete')) }
    }

    const toggleId = (id, list, setList) => {
        setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const columns = [
        {
            key: 'name', label: t('common.name'), sortable: true,
            render: (v) => (
                <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{v.name}</p>
                    {v.plate_number && <p className="text-xs text-slate-400 font-mono mt-0.5">{v.plate_number}</p>}
                </div>
            )
        },
        {
            key: 'type', label: t('fleet.type'), sortable: true,
            render: (v) => <span className="text-slate-600 dark:text-slate-300">{t(`fleet.types.${v.type}`)}</span>
        },
        { key: 'year', label: t('fleet.year'), sortable: true },
        {
            key: 'status', label: t('fleet.status'), sortable: true,
            render: (v) => (
                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLORS[v.status] || STATUS_COLORS.inactive}`}>
                    {t(`fleet.statuses.${v.status}`)}
                </span>
            )
        },
        {
            key: 'site_ids', label: t('fleet.assigned_sites'),
            render: (v) => {
                const count = v.site_ids?.length || 0
                return <span className="text-slate-500 dark:text-slate-400 text-sm">{count > 0 ? `${count} ${count === 1 ? t('common.site') : t('common.sites')}` : '—'}</span>
            }
        },
        {
            key: 'user_ids', label: t('fleet.drivers'),
            render: (v) => {
                const count = v.user_ids?.length || 0
                return <span className="text-slate-500 dark:text-slate-400 text-sm">{count > 0 ? `${count} ${count === 1 ? t('users.driver') : t('users.drivers')}` : '—'}</span>
            }
        },
        {
            key: '_actions', label: t('common.actions'),
            render: (v) => (
                <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(v)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        {t('common.edit')}
                    </button>
                    <button onClick={() => setDeleteTarget(v)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        {t('common.delete')}
                    </button>
                </div>
            )
        },
    ]

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {t('fleet.title')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {vehicles.length} {t('fleet.registered_vehicles')}
                    </p>
                </div>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    {t('fleet.add_vehicle')}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            <DataTable
                columns={columns}
                data={vehicles}
                loading={loading}
                defaultPageSize={25}
            />

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingVehicle ? t('common.edit') + ' ' + t('fleet.vehicle') : t('fleet.add_vehicle')}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
                            {[
                                { key: 'info', label: t('fleet.tab_info') },
                                { key: 'sites', label: t('fleet.tab_sites') },
                                { key: 'drivers', label: t('fleet.tab_drivers') },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab.key
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {/* Info Tab */}
                            {activeTab === 'info' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                            {t('common.name')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder={t('fleet.placeholders.name')}
                                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                {t('fleet.plate_number')}
                                            </label>
                                            <input
                                                value={form.plate_number}
                                                onChange={e => setForm(f => ({ ...f, plate_number: e.target.value.toUpperCase() }))}
                                                placeholder={t('fleet.placeholders.plate')}
                                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                {t('fleet.year')}
                                            </label>
                                            <input
                                                type="number"
                                                value={form.year}
                                                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                                                min="1990" max={new Date().getFullYear() + 1}
                                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                {t('fleet.type')}
                                            </label>
                                            <select
                                                value={form.type}
                                                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                            >
                                                {VEHICLE_TYPES.map(vt => (
                                                    <option key={vt} value={vt}>{t(`fleet.types.${vt}`)}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                {t('fleet.status')}
                                            </label>
                                            <select
                                                value={form.status}
                                                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                            >
                                                {VEHICLE_STATUSES.map(vs => (
                                                    <option key={vs} value={vs}>{t(`fleet.statuses.${vs}`)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('fleet_modal.notes')}</label>
                                        <textarea
                                            value={form.notes}
                                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                            rows={3}
                                            placeholder={t('fleet.placeholders.notes')}
                                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Sites Tab */}
                            {activeTab === 'sites' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {t('fleet.sites_desc')}
                                        </p>
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const allIds = filteredSites.map(s => s.id);
                                                const hasAll = allIds.every(id => selectedSiteIds.includes(id));
                                                if (hasAll) {
                                                    setSelectedSiteIds(selectedSiteIds.filter(id => !allIds.includes(id)));
                                                } else {
                                                    setSelectedSiteIds([...new Set([...selectedSiteIds, ...allIds])]);
                                                }
                                            }}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            {filteredSites.length > 0 && filteredSites.every(s => selectedSiteIds.includes(s.id)) ? 'Deselectează Toate' : 'Selectează Toate'}
                                        </button>
                                    </div>
                                    <div className="relative mb-4">
                                        <input type="text" placeholder="Caută șantier..." value={siteSearch} onChange={e => setSiteSearch(e.target.value)} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                    </div>
                                    {filteredSites.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-8">{t('common.no_data')}</p>
                                    ) : (
                                        filteredSites.map(s => (
                                            <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedSiteIds.includes(s.id) ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSiteIds.includes(s.id)}
                                                    onChange={() => toggleId(s.id, selectedSiteIds, setSelectedSiteIds)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div className="flex-1 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.name}</p>
                                                        {s.county && <p className="text-xs text-slate-400">{s.county}</p>}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-medium bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                        <span className="text-blue-600 dark:text-blue-400 font-bold">{s.assigned_workers || 0}</span> Muncitori
                                                    </div>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Drivers Tab */}
                            {activeTab === 'drivers' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {t('fleet.drivers_desc')}
                                        </p>
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const allIds = filteredUsers.map(u => u.id);
                                                const hasAll = allIds.every(id => selectedUserIds.includes(id));
                                                if (hasAll) {
                                                    setSelectedUserIds(selectedUserIds.filter(id => !allIds.includes(id)));
                                                } else {
                                                    setSelectedUserIds([...new Set([...selectedUserIds, ...allIds])]);
                                                }
                                            }}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            {filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(u.id)) ? 'Deselectează Toți' : 'Selectează Toți'}
                                        </button>
                                    </div>
                                    <div className="relative mb-4">
                                        <input type="text" placeholder="Caută șofer/operator..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                    </div>
                                    {filteredUsers.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-8">{t('common.no_data')}</p>
                                    ) : (
                                        filteredUsers.map(u => (
                                            <label key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedUserIds.includes(u.id) ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUserIds.includes(u.id)}
                                                    onChange={() => toggleId(u.id, selectedUserIds, setSelectedUserIds)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{u.last_name} {u.first_name}</p>
                                                    <p className="text-xs text-slate-400 font-mono">{u.employee_code} · {u.role_name}</p>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.name.trim()}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('common.delete_confirm')}</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                            {t('fleet.delete_confirm_msg')} <strong>{deleteTarget.name}</strong>? {t('common.cannot_be_undone')}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button onClick={handleDelete} className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors">
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

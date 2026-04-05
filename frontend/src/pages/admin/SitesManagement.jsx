import { useState, useEffect } from 'react'
import { useAdminStore } from '../../store/adminStore'
import useViewPreferencesStore from '../../store/viewPreferencesStore'
import api from '../../lib/api'
import {
    Building2, Plus, Search, Edit2, MapPin, Calendar, CheckCircle,
    Clock, XCircle, Zap, Hash, Loader2, Camera, X, Save, Trash2
} from 'lucide-react'
import ViewToggle from '../../components/ViewToggle'
import Pagination from '../../components/Pagination'
import PhotoUpload from '../../components/PhotoUpload'
import PhotoGallery from '../../components/PhotoGallery'
import { useUIStore } from '../../store/uiStore'

const PAGE_ID = 'admin-sites'

const EMPTY_SITE = {
    name: '',
    address: '',
    description: '',
    status: 'active',
    client_name: '',
    panel_count: '',
    system_power_kw: '',
    installation_type: 'residential',
    organization_id: '',
    work_start_time: '07:00',
    work_end_time: '16:00',
    max_overtime_minutes: 120
}

export default function SitesManagement() {
    const { showDialog, showToast } = useUIStore()
    const [sites, setSites] = useState([])
    const [totalSites, setTotalSites] = useState(0)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('active') // Default to active sites
    const [stats, setStats] = useState(null)
    const [selectedSite, setSelectedSite] = useState(null) // For photo modal
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingSite, setEditingSite] = useState(null)
    const [activeModalTab, setActiveModalTab] = useState('info')
    const [teams, setTeams] = useState([])
    const [selectedTeamIds, setSelectedTeamIds] = useState([])
    const [formData, setFormData] = useState(EMPTY_SITE)
    const [saving, setSaving] = useState(false)
    const token = useAdminStore((state) => state.token)
    
    // Bulk Select states
    const [selectedSiteIds, setSelectedSiteIds] = useState([])

    // View preferences
    const preferences = useViewPreferencesStore((state) => state.getPagePreferences(PAGE_ID))
    const setViewMode = useViewPreferencesStore((state) => state.setViewMode)
    const setPageSize = useViewPreferencesStore((state) => state.setPageSize)
    const setCurrentPage = useViewPreferencesStore((state) => state.setCurrentPage)

    useEffect(() => {
        fetchSites()
        fetchStats()
        fetchTeams()
    }, [search, statusFilter, preferences.currentPage, preferences.pageSize])


    const fetchTeams = async () => {
        try {
            const response = await api.get('/admin/teams/')
            setTeams(response.data.teams || [])
        } catch (error) {
            console.error('Error fetching teams:', error)
        }
    }

    const fetchSites = async () => {
        try {
            setLoading(true)
            const response = await api.get('/admin/sites/', {
                params: {
                    search,
                    ...(statusFilter && { status: statusFilter }),
                    page: preferences.currentPage,
                    page_size: preferences.pageSize
                }
            })
            setSites(response.data.sites || [])
            setTotalSites(response.data.total || 0)
        } catch (error) {
            console.error('Error fetching sites:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        try {
            const response = await api.get('/admin/sites/stats')
            setStats(response.data)
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    const handleAddSite = () => {
        setEditingSite(null)
        setFormData(EMPTY_SITE)
        setActiveModalTab('info')
        setSelectedTeamIds([])
        setActiveModalTab('info')
        setSelectedTeamIds(site.team_ids || [])
        setShowEditModal(true)
    }

    const handleEditSite = (site) => {
        setEditingSite(site)
        setFormData({
            name: site.name || '',
            address: site.address || '',
            description: site.description || '',
            status: site.status || 'active',
            client_name: site.client_name || '',
            panel_count: site.panel_count || '',
            system_power_kw: site.system_power_kw || '',
            installation_type: site.installation_type || 'residential',
            organization_id: site.organization_id || '',
            work_start_time: site.work_start_time || '07:00',
            work_end_time: site.work_end_time || '16:00',
            max_overtime_minutes: site.max_overtime_minutes ?? 120
        })
        setActiveModalTab('info')
        setSelectedTeamIds(site.team_ids || [])
        setShowEditModal(true)
    }

    const handleSaveSite = async () => {
        if (!formData.name.trim()) {
            showToast('Numele proiectului este obligatoriu!', 'error')
            return
        }

        try {
            setSaving(true)
            const payload = {
                ...formData,
                panel_count: formData.panel_count ? parseInt(formData.panel_count) : null,
                system_power_kw: formData.system_power_kw ? parseFloat(formData.system_power_kw) : null,
                max_overtime_minutes: formData.max_overtime_minutes ? parseInt(formData.max_overtime_minutes) : 120,
                organization_id: formData.organization_id || 'aa8a486f-b60f-4f68-b929-8340370fe8a7'
            }

            let currentSiteId = editingSite?.id;
            if (editingSite) {
                await api.put(`/admin/sites/${editingSite.id}`, payload)
            } else {
                const res = await api.post('/admin/sites/', payload)
                currentSiteId = res.data.id
            }

            if (currentSiteId) {
                await api.put(`/admin/sites/${currentSiteId}/teams`, { team_ids: selectedTeamIds })
            }

            setShowEditModal(false)
            fetchSites()
            fetchStats()
            showToast('Proiect salvat cu succes!', 'success')
        } catch (error) {
            showToast(error.response?.data?.detail || 'Eroare la salvare', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteSite = async (siteId) => {
        showDialog({
            title: 'Ștergere Proiect (Șantier)',
            message: 'Sigur doriți să suspendați temporar sau să ștergeți acest proiect?',
            type: 'danger',
            confirmText: 'Șterge',
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/sites/${siteId}`)
                    fetchSites()
                    fetchStats()
                    showToast('Proiect sters cu succes.', 'success')
                } catch (error) {
                    showToast(error.response?.data?.detail || 'Eroare la ștergere', 'error')
                }
            }
        })
    }

    const handleToggleSelectAll = (e) => {
        if (e.target.checked) setSelectedSiteIds(sites.map(s => s.id))
        else setSelectedSiteIds([])
    }

    const handleToggleSelect = (siteId) => {
        setSelectedSiteIds(prev => prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId])
    }

    const handleBulkDelete = () => {
        if (selectedSiteIds.length === 0) return
        showDialog({
            title: 'Ștergere Multiplă',
            message: `Ești sigur că vrei să ștergi (suspenzi) cele ${selectedSiteIds.length} proiecte/șantiere selectate?`,
            type: 'danger',
            confirmText: 'Șterge Selecția',
            onConfirm: async () => {
                try {
                    await Promise.all(selectedSiteIds.map(id => api.delete(`/admin/sites/${id}`)))
                    setSelectedSiteIds([])
                    fetchSites()
                    fetchStats()
                    showToast('Șantierele selectate au fost șterse.', 'success')
                } catch (error) {
                    showToast('Eroare la ștergerea în masă', 'error')
                }
            }
        })
    }

    const handlePhotoClick = (site) => {
        setSelectedSite(site)
        setShowPhotoModal(true)
    }

    const handlePhotoUploaded = () => {
        console.log('Photo uploaded successfully')
    }

    const getInstallationTypeBadge = (type) => {
        const badges = {
            residential: 'bg-blue-100 text-blue-700',
            commercial: 'bg-purple-100 text-purple-700',
            industrial: 'bg-slate-100 text-slate-700'
        }
        const labels = {
            residential: 'Rezidențial',
            commercial: 'Comercial',
            industrial: 'Industrial'
        }
        return (
            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${badges[type] || badges.residential}`}>
                {labels[type] || type}
            </span>
        )
    }

    const getStatusBadge = (status) => {
        if (status === 'active') return (
            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold">
                <CheckCircle className="w-3 h-3" />
                Activ
            </span>
        )
        if (status === 'completed') return (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                <CheckCircle className="w-3 h-3" />
                Finalizat
            </span>
        )
        return (
            <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                <XCircle className="w-3 h-3" />
                Suspendat
            </span>
        )
    }

    if (loading && sites.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        Gestionare Șantiere
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Administrează șantierele de instalare panouri solare și starea lor</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard label="Total" value={(stats.active_sites || 0) + (stats.completed_sites || 0)} icon={Building2} color="from-blue-500 to-indigo-600" onClick={() => {setStatusFilter(''); setCurrentPage(PAGE_ID, 1)}} active={statusFilter === ''} />
                    <StatCard label="Active" value={stats.active_sites || 0} icon={CheckCircle} color="from-emerald-500 to-green-600" onClick={() => {setStatusFilter('active'); setCurrentPage(PAGE_ID, 1)}} active={statusFilter === 'active'} />
                    <StatCard label="Finalizate" value={stats.completed_sites || 0} icon={Zap} color="from-amber-500 to-orange-500" onClick={() => {setStatusFilter('completed'); setCurrentPage(PAGE_ID, 1)}} active={statusFilter === 'completed'} />
                    <StatCard label="Suspendați" value={stats.suspended_sites || 0} icon={XCircle} color="from-slate-500 to-slate-600" onClick={() => {setStatusFilter('suspended'); setCurrentPage(PAGE_ID, 1)}} active={statusFilter === 'suspended'} />
                </div>
            )}

            {/* Search, Filters and Actions */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-3xl shadow-sm flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Caută după nume, client sau locație..."
                            value={search}
                            onChange={(e) => {setSearch(e.target.value); setCurrentPage(PAGE_ID, 1)}}
                            className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                        />
                    </div>
                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(PAGE_ID, 1) }}
                        className="px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-blue-400 outline-none transition-all shadow-sm font-medium min-w-[140px]"
                    >
                        <option value="">Toate stările</option>
                        <option value="active">Active</option>
                        <option value="completed">Finalizate</option>
                        <option value="suspended">Suspendate</option>
                    </select>

                    <ViewToggle
                        viewMode={preferences.viewMode}
                        onChange={(mode) => setViewMode(PAGE_ID, mode)}
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    {selectedSiteIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="px-4 py-2.5 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow flex items-center gap-2 whitespace-nowrap"
                        >
                            <Trash2 className="w-4 h-4" />
                            {selectedSiteIds.length > 1 ? 'Șterge Selecția' : 'Șterge'} ({selectedSiteIds.length})
                        </button>
                    )}
                    <button
                        onClick={handleAddSite}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        Adaugă Proiect
                    </button>
                </div>
            </div>

            {/* Sites List/Grid */}
            {preferences.viewMode === 'list' ? (
                <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-3xl">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 text-left w-12">
                                    <input type="checkbox" checked={sites.length > 0 && selectedSiteIds.length === sites.length} onChange={handleToggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Proiect</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Client</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Sistem</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Tip</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Program</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {sites.map((site) => (
                                <tr key={site.id} className={`hover:bg-blue-50/40 dark:hover:bg-slate-800 transition-colors ${selectedSiteIds.includes(site.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input type="checkbox" checked={selectedSiteIds.includes(site.id)} onChange={() => handleToggleSelect(site.id)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-slate-100">{site.name}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                                <MapPin className="w-3 h-3" />
                                                {site.address || 'Fără adresă'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-slate-800 dark:text-slate-200">{site.client_name || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1 text-amber-500 font-semibold">
                                                <Zap className="w-4 h-4" />
                                                {site.system_power_kw || 0} kW
                                            </span>
                                            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                <Hash className="w-4 h-4" />
                                                {site.panel_count || 0}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getInstallationTypeBadge(site.installation_type)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-sm">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{site.work_start_time || '07:00'}</span>
                                            <span className="text-slate-400">—</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{site.work_end_time || '16:00'}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">+{site.max_overtime_minutes ?? 120}min OT</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(site.status)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handlePhotoClick(site)}
                                                className="p-1.5 hover:bg-blue-50 rounded-full border border-slate-200 transition-colors"
                                                title="Fotografii"
                                            >
                                                <Camera className="w-3.5 h-3.5 text-blue-600" />
                                            </button>
                                            <button
                                                onClick={() => handleEditSite(site)}
                                                className="p-1.5 hover:bg-slate-100 rounded-full border border-slate-200 transition-colors"
                                                title="Editează"
                                            >
                                                <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSite(site.id)}
                                                className="p-1.5 hover:bg-red-50 rounded-full border border-slate-200 transition-colors"
                                                title="Șterge"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sites.map((site) => (
                        <div key={site.id} className={`bg-white rounded-xl border ${selectedSiteIds.includes(site.id) ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-200'} p-6 hover:shadow-lg transition-shadow relative`}>
                            <div className="absolute top-4 right-4 z-10" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={selectedSiteIds.includes(site.id)} onChange={() => handleToggleSelect(site.id)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer drop-shadow-sm" />
                            </div>
                            <div className="flex items-start justify-between mb-4 pr-8">
                                <h3 className="font-bold text-lg text-slate-900">{site.name}</h3>
                                {getStatusBadge(site.status)}
                            </div>

                            <div className="space-y-3 mb-4">
                                <p className="text-sm text-slate-600 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    {site.address || 'Fără adresă'}
                                </p>
                                {site.client_name && (
                                    <p className="text-sm text-slate-900 font-medium">
                                        Client: {site.client_name}
                                    </p>
                                )}
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1 text-amber-700 font-semibold">
                                            <Zap className="w-5 h-5" />
                                            {site.system_power_kw || 0} kW
                                        </span>
                                        <span className="flex items-center gap-1 text-amber-600">
                                            <Hash className="w-5 h-5" />
                                            {site.panel_count || 0} panouri
                                        </span>
                                    </div>
                                </div>
                                {getInstallationTypeBadge(site.installation_type)}
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    {site.work_start_time || '07:00'} — {site.work_end_time || '16:00'}
                                    <span className="text-xs text-slate-400">(+{site.max_overtime_minutes ?? 120}min OT)</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                                <button
                                    onClick={() => handlePhotoClick(site)}
                                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Camera className="w-4 h-4" />
                                    Fotografii
                                </button>
                                <button
                                    onClick={() => handleEditSite(site)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Editează
                                </button>
                                <button
                                    onClick={() => handleDeleteSite(site.id)}
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Șterge"
                                >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            <div className="mt-6">
                <Pagination
                    currentPage={preferences.currentPage}
                    pageSize={preferences.pageSize}
                    totalItems={totalSites}
                    onPageChange={(page) => setCurrentPage(PAGE_ID, page)}
                    onPageSizeChange={(size) => {
                        setPageSize(PAGE_ID, size)
                        setCurrentPage(PAGE_ID, 1)
                    }}
                />
            </div>

            {/* Edit/Add Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-900">
                                {editingSite ? 'Editează Proiect' : 'Adaugă Proiect Nou'}
                            </h2>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-6 h-6 text-slate-600" />
                            </button>
                        </div>

                                                <div className="flex border-b border-slate-200">
                            <button
                                onClick={() => setActiveModalTab('info')}
                                className={`px-6 py-4 text-sm font-semibold transition-colors ${activeModalTab === 'info' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Informații
                            </button>
                            <button
                                onClick={() => setActiveModalTab('teams')}
                                className={`px-6 py-4 text-sm font-semibold transition-colors ${activeModalTab === 'teams' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Echipe Alocate
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className={activeModalTab !== 'info' ? 'hidden' : ''}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nume Proiect *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="ex: Instalare Panouri Solare - Familia Ionescu"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Adresă</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="Strada, Număr, Oraș"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Client</label>
                                    <input
                                        type="text"
                                        value={formData.client_name}
                                        onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="Numele clientului"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Tip Instalare</label>
                                    <select
                                        value={formData.installation_type}
                                        onChange={e => setFormData({ ...formData, installation_type: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                    >
                                        <option value="residential">Rezidențial</option>
                                        <option value="commercial">Comercial</option>
                                        <option value="industrial">Industrial</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Putere Sistem (kW)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.system_power_kw}
                                        onChange={e => setFormData({ ...formData, system_power_kw: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="ex: 10.5"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Număr Panouri</label>
                                    <input
                                        type="number"
                                        value={formData.panel_count}
                                        onChange={e => setFormData({ ...formData, panel_count: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="ex: 24"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                    >
                                        <option value="active">Activ</option>
                                        <option value="completed">Finalizat</option>
                                        <option value="suspended">Suspendat</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Descriere</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all resize-none"
                                        placeholder="Detalii despre proiect..."
                                    />
                                </div>
                            </div>

                            {/* Work Schedule Section */}
                            <div className="border-t border-slate-200 pt-5 mt-5">
                                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    Program Lucru Șantier
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Început Program</label>
                                        <input
                                            type="time"
                                            value={formData.work_start_time}
                                            onChange={e => setFormData({ ...formData, work_start_time: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Sfârșit Program</label>
                                        <input
                                            type="time"
                                            value={formData.work_end_time}
                                            onChange={e => setFormData({ ...formData, work_end_time: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Overtime Max (min)</label>
                                        <input
                                            type="number"
                                            value={formData.max_overtime_minutes}
                                            onChange={e => setFormData({ ...formData, max_overtime_minutes: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                            placeholder="120"
                                            min="0"
                                            max="480"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Pontajul se poate face cu max 30 min înainte. Overtime fără aprobare: {formData.max_overtime_minutes || 120} minute.</p>
                            </div>
                            </div>

                            <div className={activeModalTab !== 'teams' ? 'hidden' : ''}>
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-500 mb-4">
                                        Bifează echipele care lucrează pe acest șantier. Orice modificare va actualiza forța de muncă din aplicație.
                                    </p>
                                    <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {teams.map(team => (
                                            <label key={team.id} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${selectedTeamIds.includes(team.id) ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTeamIds.includes(team.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedTeamIds([...selectedTeamIds, team.id])
                                                            else setSelectedTeamIds(selectedTeamIds.filter(id => id !== team.id))
                                                        }}
                                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{team.name}</p>
                                                        <p className="text-xs text-slate-500 mt-1">Șef: {team.team_leader_name} · {team.member_count} Muncitori</p>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                        {teams.length === 0 && (
                                            <p className="text-sm text-slate-400 text-center py-6">Nu există echipe create în sistem.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                            >
                                Anulează
                            </button>
                            <button
                                onClick={handleSaveSite}
                                disabled={saving}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {editingSite ? 'Salvează' : 'Creează Proiect'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Modal */}
            {showPhotoModal && selectedSite && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{selectedSite.name}</h2>
                                <p className="text-slate-600 mt-1">Fotografii proiect</p>
                            </div>
                            <button
                                onClick={() => setShowPhotoModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-600" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <PhotoUpload
                                        timesheetId={selectedSite.id}
                                        onUploadSuccess={handlePhotoUploaded}
                                        maxPhotos={20}
                                    />
                                </div>
                                <div>
                                    <PhotoGallery
                                        timesheetId={selectedSite.id}
                                        canDelete={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color, isActive, onClick }) {
    return (
        <div 
            onClick={onClick}
            className={`bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md ${isActive ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-lg transform -translate-y-1' : ''} rounded-2xl p-6 hover:shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-4 bg-gradient-to-br ${color} rounded-2xl shadow-inner`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{value}</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{label}</p>
                </div>
            </div>
        </div>
    )
}

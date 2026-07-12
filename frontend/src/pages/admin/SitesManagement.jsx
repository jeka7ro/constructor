import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon broken paths
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})
import { useAdminStore } from '../../store/adminStore'
import useViewPreferencesStore from '../../store/viewPreferencesStore'
import { useTenantStore } from '../../store/tenantStore'
import api from '../../lib/api'
import {
    Building2, Plus, Search, Edit2, MapPin, Calendar, CheckCircle,
    Clock, XCircle, Zap, Hash, Loader2, Camera, X, Save, Trash2,
    Timer, Users, UserCheck, FileText, ClipboardList, Filter, Grid, List
} from 'lucide-react'
import ViewToggle from '../../components/ViewToggle'
import Pagination from '../../components/Pagination'
import PhotoUpload from '../../components/PhotoUpload'
import PhotoGallery from '../../components/PhotoGallery'
import MiniMapSelector from '../../components/MiniMapSelector'
import { useUIStore } from '../../store/uiStore'
import SiteDetailView from '../../components/SiteDetailView'
import { reverseGeocode } from '../../lib/geocode'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const PAGE_ID = 'admin-sites'

const EMPTY_SITE = {
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    geofence_radius: 100,
    description: '',
    status: 'active',
    client_id: '',
    client_name: '',
    panel_count: '',
    system_power_kw: '',
    installation_type: 'residential',
    organization_id: '',
    work_start_time: '07:00',
    work_end_time: '16:00',
    lunch_break_start: '12:00',
    lunch_break_end: '13:00',
    max_overtime_minutes: 120,
    // lucrare scurta durata
    project_type: 'standard',
    planned_start_date: '',
    planned_end_date: '',
}

// ─── Urgency badge ────────────────────────────────────────────────────────────
const URGENCY_MAP = (t) => ({
    on_track:  { label: t('sites.urgency.on_track', 'En bonne voie'),   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900' },
    urgent:    { label: t('sites.urgency.urgent', 'Urgent'),      cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900' },
    overdue:   { label: t('sites.urgency.overdue', 'En retard'),     cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900' },
    completed: { label: t('sites.urgency.completed', 'Terminé'),   cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900' },
})

function UrgencyBadge({ urgency }) {
    const { t } = useTranslation()
    const map = URGENCY_MAP(t)
    const u = map[urgency] || map.on_track
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${u.cls}`}>{u.label}</span>
    )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, urgency }) {
    const color = urgency === 'overdue' ? 'bg-red-500'
        : urgency === 'urgent'  ? 'bg-amber-500'
        : urgency === 'completed' ? 'bg-blue-500'
        : 'bg-emerald-500'
    return (
        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
    )
}



export default function SitesManagement() {
    const { t } = useTranslation()
    const { showDialog, showToast } = useUIStore()
    const { token, admin } = useAdminStore()
    const { tenant } = useTenantStore()
    const navigate = useNavigate()

    // Feature flags din configuratia tenantului
    const hasLongTerm  = tenant?.has_long_term_sites !== false   // default true
    const hasShortTerm = tenant?.has_short_term_interventions === true  // default false
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
    const [detailSite, setDetailSite] = useState(null)
    const [clients, setClients] = useState([])

    // Comenzi de Lucru (pentru tab-ul Interventii)
    const [activeTab, setActiveTab] = useState('standard')
    const [workOrders, setWorkOrders] = useState([])
    const [loadingWorkOrders, setLoadingWorkOrders] = useState(false)

    // State-uri pentru modaluri (inca folosite la santiere standard)
    const [workerAssignModal, setWorkerAssignModal] = useState(null)
    const [allWorkers, setAllWorkers] = useState([])
    const [workerSearch, setWorkerSearch] = useState('')
    const [assigningSite, setAssigningSite] = useState(false)
    const [reportModal, setReportModal] = useState(null)
    const [loadingReport, setLoadingReport] = useState(false)

    // New Client inline modal state
    const [showNewClientModal, setShowNewClientModal] = useState(false)
    const [newClientData, setNewClientData] = useState({ name: '', address: '', phone: '' })
    const [savingClient, setSavingClient] = useState(false)

    // Bulk Select states
    const [selectedSiteIds, setSelectedSiteIds] = useState([])

    // View preferences
    const preferences = useViewPreferencesStore((state) => state.getPagePreferences(PAGE_ID))
    const setViewMode = useViewPreferencesStore((state) => state.setViewMode)
    const setPageSize = useViewPreferencesStore((state) => state.setPageSize)
    const setCurrentPage = useViewPreferencesStore((state) => state.setCurrentPage)

    const location = useLocation()
    
    useEffect(() => {
        fetchSites()
        fetchStats()
        fetchTeams()
        fetchClients()
    }, [search, statusFilter, preferences.currentPage, preferences.pageSize])

    // Auto-open site from location state (e.g., from Fleet Management)
    useEffect(() => {
        if (location.state?.openSiteId && sites.length > 0 && !detailSite) {
            const siteToOpen = sites.find(s => s.id === location.state.openSiteId)
            if (siteToOpen) {
                setDetailSite(siteToOpen)
                // Clear state so it doesn't reopen if they refresh
                window.history.replaceState({}, document.title)
            }
        }
    }, [location.state, sites, detailSite])

    useEffect(() => {
        if (activeTab === 'short_term') fetchWorkOrders()
    }, [activeTab])

    const fetchWorkOrders = async () => {
        setLoadingWorkOrders(true)
        try {
            const res = await api.get('/admin/work-orders?limit=100')
            setWorkOrders(res.data?.items || res.data || [])
        } catch (e) {
            console.error('fetchWorkOrders error:', e)
        } finally {
            setLoadingWorkOrders(false)
        }
    }

    const openWorkerAssign = async (site) => {
        setWorkerAssignModal(site)
        try {
            const res = await api.get('/admin/users?limit=200')
            setAllWorkers(res.data?.users || [])
        } catch { setAllWorkers([]) }
    }

    const handleAssignWorkers = async (workerIds) => {
        setAssigningSite(true)
        try {
            await api.post(`/admin/sites/${workerAssignModal.id}/assign-workers`, { worker_ids: workerIds })
            setWorkerAssignModal(null)
        } catch (e) {
            console.error('assign workers error:', e)
        } finally { setAssigningSite(false) }
    }

    const openFinalReport = async (site) => {
        setReportModal({ site, data: null })
        setLoadingReport(true)
        try {
            const res = await api.get(`/admin/sites/${site.id}/final-report`)
            setReportModal({ site, data: res.data })
        } catch (e) {
            console.error('final report error:', e)
        } finally { setLoadingReport(false) }
    }

    const downloadFinalReport = async (site) => {
        try {
            const res = await api.get(`/admin/sites/${site.id}/final-report/excel`, { responseType: 'blob' })
            const url = URL.createObjectURL(res.data)
            const a = document.createElement('a')
            a.href = url; a.download = `Rapport_${site.name}.xlsx`; a.click()
            URL.revokeObjectURL(url)
        } catch (e) { console.error('download report error:', e) }
    }

    const fetchClients = async () => {
        try {
            const response = await api.get('/admin/clients')
            // only show active clients
            setClients(response.data.filter(c => c.is_active) || [])
        } catch (error) {
            console.error('Error fetching clients:', error)
        }
    }

    const handleSaveNewClient = async (e) => {
        e.preventDefault()
        if (!newClientData.name.trim()) {
            showToast(t('sites.client_name_required', 'Le nom du client est obligatoire!'), 'error')
            return
        }
        setSavingClient(true)
        try {
            const res = await api.post('/admin/clients', newClientData)
            const newClient = res.data
            setClients(prev => [...prev, newClient])
            setFormData(prev => ({ ...prev, client_id: newClient.id, client_name: newClient.name }))
            setShowNewClientModal(false)
            setNewClientData({ name: '', address: '', phone: '' })
            showToast(t('sites.client_added', 'Client ajouté avec succès!'), 'success')
        } catch (error) {
            showToast(error.response?.data?.detail || t('sites.client_save_error', "Erreur lors de l'enregistrement du client"), 'error')
        } finally {
            setSavingClient(false)
        }
    }


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
        setShowEditModal(true)
    }

    const handleEditSite = (site) => {
        setEditingSite(site)
        setFormData({
            name: site.name || '',
            address: site.address || '',
            latitude: site.latitude || '',
            longitude: site.longitude || '',
            geofence_radius: site.geofence_radius ?? 100,
            description: site.description || '',
            status: site.status || 'active',
            client_id: site.client_id || '',
            client_name: site.client_name || '',
            panel_count: site.panel_count || '',
            system_power_kw: site.system_power_kw || '',
            installation_type: site.installation_type || 'residential',
            organization_id: site.organization_id || '',
            work_start_time: site.work_start_time || '07:00',
            work_end_time: site.work_end_time || '16:00',
            lunch_break_start: site.lunch_break_start || '12:00',
            lunch_break_end: site.lunch_break_end || '13:00',
            max_overtime_minutes: site.max_overtime_minutes ?? 120
        })
        setActiveModalTab('info')
        setSelectedTeamIds(site.team_ids || [])
        setShowEditModal(true)
    }


    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            showToast(t('sites.geo_not_supported', "La géolocalisation n'est pas supportée par votre navigateur."), 'error')
            return
        }

        showToast(t('sites.geo_detecting', "Détection de l'emplacement..."), 'info')
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude
                const lon = position.coords.longitude
                
                let fetchedAddress = formData.address
                
                try {
                    const address = await reverseGeocode(lat, lon)
                    if (address) {
                        fetchedAddress = address
                    }
                } catch(e) {
                    console.error("Geocoding failed:", e)
                }

                setFormData(prev => ({
                    ...prev,
                    latitude: lat,
                    longitude: lon,
                    address: fetchedAddress
                }))
                showToast(t('sites.geo_success', 'Emplacement récupéré avec succès!'), 'success')
            },
            (error) => {
                console.error("GPS Error:", error)
                showToast(t('sites.geo_error', "Erreur lors de la récupération de l'emplacement. Vérifiez les permissions GPS."), 'error')
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
    }

    const handleSaveSite = async () => {
        if (!formData.name.trim()) {
            showToast(t('sites.name_required', 'Le nom du chantier est obligatoire!'), 'error')
            return
        }

        try {
            setSaving(true)
            const payload = {
                ...formData,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                geofence_radius: formData.geofence_radius ? parseInt(formData.geofence_radius) : 100,
                panel_count: formData.panel_count ? parseInt(formData.panel_count) : null,
                system_power_kw: formData.system_power_kw ? parseFloat(formData.system_power_kw) : null,
                max_overtime_minutes: formData.max_overtime_minutes ? parseInt(formData.max_overtime_minutes) : 120,
                organization_id: formData.organization_id || admin?.organization_id || ''
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
            showToast(t('sites.save_success', 'Chantier enregistré avec succès!'), 'success')
        } catch (error) {
            showToast(error.response?.data?.detail || t('sites.save_error', "Erreur lors de l'enregistrement"), 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteSite = async (siteId) => {
        showDialog({
            title: t('sites.delete_title', 'Supprimer le chantier'),
            message: t('sites.delete_message', 'Êtes-vous sûr de vouloir suspendre ou supprimer ce chantier ?'),
            type: 'danger',
            confirmText: t('common.delete', 'Supprimer'),
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/sites/${siteId}`)
                    fetchSites()
                    fetchStats()
                    showToast(t('sites.delete_success', 'Chantier supprimé avec succès.'), 'success')
                } catch (error) {
                    showToast(error.response?.data?.detail || t('sites.delete_error', 'Erreur lors de la suppression'), 'error')
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
            title: t('sites.bulk_delete_title', 'Suppression multiple'),
            message: t('sites.bulk_delete_message', 'Êtes-vous sûr de vouloir supprimer/suspendre les {{count}} chantiers sélectionnés ?', { count: selectedSiteIds.length }),
            type: 'danger',
            confirmText: t('sites.bulk_delete_confirm', 'Supprimer la sélection'),
            onConfirm: async () => {
                try {
                    await Promise.all(selectedSiteIds.map(id => api.delete(`/admin/sites/${id}`)))
                    setSelectedSiteIds([])
                    fetchSites()
                    fetchStats()
                    showToast(t('sites.bulk_delete_success', 'Les chantiers sélectionnés ont été supprimés.'), 'success')
                } catch (error) {
                    showToast(t('sites.bulk_delete_error', 'Erreur lors de la suppression en masse'), 'error')
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
            residential: t('sites.types.residential', 'Résidentiel'),
            commercial: t('sites.types.commercial', 'Commercial'),
            industrial: t('sites.types.industrial', 'Industriel')
        }
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badges[type] || badges.residential}`}>
                {labels[type] || type}
            </span>
        )
    }

    const getStatusBadge = (status) => {
        if (status === 'active') return (
            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                <CheckCircle className="w-3 h-3" />
                {t('sites.status.active', 'Actif')}
            </span>
        )
        if (status === 'completed') return (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                <CheckCircle className="w-3 h-3" />
                {t('sites.status.completed', 'Terminé')}
            </span>
        )
        return (
            <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                <XCircle className="w-3 h-3" />
                {t('sites.status.suspended', 'Suspendu')}
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
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">


            {/* ── Tab Switcher: Standard / Lucrari Scurte — vizibil doar daca tenantul are ambele tipuri activate ── */}
            {hasLongTerm && hasShortTerm && (
                <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl w-fit">
                    <button
                        id="tab-standard"
                        onClick={() => setActiveTab('standard')}
                        className={`px-5 h-9 rounded-xl text-sm font-bold transition-all ${
                            activeTab === 'standard'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        {t('sites.tab_standard', 'Chantiers Standard')}
                    </button>
                    <button
                        id="tab-short-term"
                        onClick={() => setActiveTab('short_term')}
                        className={`px-5 h-9 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'short_term'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <Timer className="w-3.5 h-3.5" />
                        {t('sites.tab_short_term', 'Interventions / Travaux')}
                        {shortTermSites.filter(s => s.urgency === 'urgent' || s.urgency === 'overdue').length > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                                {shortTermSites.filter(s => s.urgency === 'urgent' || s.urgency === 'overdue').length}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {/* ── LUCRARI SCURTE PANEL ── */}
            {hasShortTerm && activeTab === 'short_term' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t('sites.work_orders_count', '{{count}} commandes de travail', { count: workOrders.length })}
                        </p>
                        <button
                            onClick={() => navigate('/admin/work-orders/new')}
                            className="px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> {t('sites.new_work_order', 'Nouvelle commande')}
                        </button>
                    </div>

                    {loadingWorkOrders ? (
                        <div className="py-12 flex items-center justify-center">
                            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                        </div>
                    ) : workOrders.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                            <Timer className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 font-semibold">{t('sites.no_active_work_orders', "Il n'y a pas de commandes de travail actives.")}</p>
                            <p className="text-sm text-slate-400 mt-1">{t('sites.click_new_work_order', 'Cliquez sur "Nouvelle commande" pour créer la première commande.')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {workOrders.map(wo => {
                                const statusColors = {
                                    draft:       'bg-slate-100 text-slate-600',
                                    assigned:    'bg-blue-50 text-blue-700',
                                    acknowledged:'bg-indigo-50 text-indigo-700',
                                    in_progress: 'bg-amber-50 text-amber-700',
                                    completed:   'bg-emerald-50 text-emerald-700',
                                    signed:      'bg-green-50 text-green-700',
                                }
                                const statusLabel = {
                                    draft:       t('sites.wo_status.draft', 'Brouillon'),
                                    assigned:    t('sites.wo_status.assigned', 'Attribué'),
                                    acknowledged:t('sites.wo_status.acknowledged', 'Confirmé'),
                                    in_progress: t('sites.wo_status.in_progress', 'En cours'),
                                    completed:   t('sites.wo_status.completed', 'Terminé'),
                                    signed:      t('sites.wo_status.signed', 'Signé'),
                                }
                                return (
                                <div key={wo.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="h-1 w-full" style={{background: wo.status === 'in_progress' ? '#f59e0b' : wo.status === 'completed' || wo.status === 'signed' ? '#10b981' : '#3b82f6'}} />
                                    <div className="px-5 py-4 flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{wo.title}</p>
                                            {wo.client_name && (
                                                <p className="text-xs text-slate-500 mt-0.5 truncate">{wo.client_name}</p>
                                            )}
                                            {wo.site_address && (
                                                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{wo.site_address}</span>
                                                </p>
                                            )}
                                        </div>
                                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusColors[wo.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {statusLabel[wo.status] || wo.status}
                                        </span>
                                    </div>
                                    <div className="px-5 pb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            {wo.start_date && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {wo.start_date}
                                                </span>
                                            )}
                                            {wo.assigned_team_id && (
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {t('sites.team', 'Équipe')}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => navigate(`/admin/work-orders/${wo.id}`)}
                                            className="px-3 h-8 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" /> {t('common.open', 'Ouvrir')}
                                        </button>
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'standard' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="relative group flex items-center w-full sm:w-auto">
                        <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder={t('sites.search_placeholder', 'Rechercher par nom, client, emplacement...')}
                            value={search}
                            onChange={(e) => {setSearch(e.target.value); setCurrentPage(PAGE_ID, 1)}}
                            className="w-full sm:w-64 md:w-80 h-10 pl-10 pr-[72px] bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                        {search && (
                            <div className="absolute right-1.5 flex items-center gap-1 bg-blue-600 px-2 py-1 rounded-full shadow-sm">
                                <span className="text-[10px] font-bold text-white">
                                    {sites.length}/{totalSites || 0}
                                </span>
                                <button 
                                    onClick={() => { setSearch(''); setCurrentPage(PAGE_ID, 1) }}
                                    className="p-0.5 hover:bg-blue-700 rounded-full transition-colors ml-0.5"
                                >
                                    <X className="w-3 h-3 text-white/80 hover:text-white" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                        <select
                            value={statusFilter}
                            onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(PAGE_ID, 1)}}
                            className="h-10 pl-4 pr-8 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em' }}
                        >
                            <option value="active">{t('sites.status.active', 'Actif')}</option>
                            <option value="completed">{t('sites.status.completed', 'Terminés')}</option>
                            <option value="suspended">{t('sites.status.suspended', 'Suspendus')}</option>
                            <option value="all">{t('sites.status.all', 'Tous les statuts')}</option>
                        </select>

                        <ViewToggle
                            viewMode={preferences.viewMode}
                            onViewModeChange={(mode) => setViewMode(PAGE_ID, mode)}
                        />

                        {/* Actions */}
                        {selectedSiteIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('common.delete', 'Supprimer')} ({selectedSiteIds.length})</span>
                            </button>
                        )}
                        <button
                            onClick={handleAddSite}
                            className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            {t('sites.add_site', 'Ajouter un chantier')}
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                {detailSite ? (
                    <SiteDetailView site={detailSite} onBack={() => setDetailSite(null)} />
                ) : (
                <div className="bg-white dark:bg-slate-900/80">
                    {preferences.viewMode === 'list' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-y border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 text-center w-16">
                                            <input type="checkbox" checked={sites.length > 0 && selectedSiteIds.length === sites.length} onChange={handleToggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                        </th>
                                        <th className="px-6 py-4">{t('sites.site', 'Chantier')}</th>
                                        <th className="px-6 py-4">{t('sites.client', 'Client')}</th>
                                        <th className="px-6 py-4">{t('sites.system', 'Système')}</th>
                                        <th className="px-6 py-4">{t('sites.type', 'Type')}</th>
                                        <th className="px-6 py-4">{t('sites.schedule', 'Programme')}</th>
                                        <th className="px-6 py-4 text-center">{t('common.status', 'Statut')}</th>
                                        <th className="px-6 py-4 text-right">{t('common.actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {sites.map((site) => (
                                        <tr key={site.id} className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${selectedSiteIds.includes(site.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                            <td className="px-6 py-4 text-center">
                                                <input type="checkbox" checked={selectedSiteIds.includes(site.id)} onChange={() => handleToggleSelect(site.id)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <div>
                                                    <button onClick={() => setDetailSite(site)} className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 transition-colors text-left">{site.name}</button>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="truncate max-w-[200px]">{site.address || t('sites.no_address', 'Sans adresse')}</span>
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <p className="text-sm text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{site.client_name || '-'}</p>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded w-fit border border-amber-100 dark:border-amber-800">
                                                <Zap className="w-3 h-3" />
                                                {site.system_power_kw || 0} kW
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        {getInstallationTypeBadge(site.installation_type)}
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        <div className="flex items-center gap-1 text-[11px]">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{site.work_start_time || '07:00'}</span>
                                            <span className="text-slate-400">—</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{site.work_end_time || '16:00'}</span>
                                        </div>
                                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">+{site.max_overtime_minutes ?? 120}min OT</p>
                                    </td>
                                    <td className="px-6 py-4 align-middle text-center">
                                        {getStatusBadge(site.status)}
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        <div className="flex items-center justify-end gap-1 transition-opacity">
                                            <button
                                                onClick={() => handlePhotoClick(site)}
                                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                title={t('sites.photos', 'Photos')}
                                            >
                                                <Camera className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEditSite(site)}
                                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                title={t('common.edit', 'Éditer')}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSite(site.id)}
                                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                                title={t('common.delete', 'Supprimer')}
                                            >
                                                <Trash2 className="w-4 h-4" />
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
                                <h3 className="font-bold text-lg text-slate-900 hover:text-blue-600 cursor-pointer" onClick={() => setDetailSite(site)}>{site.name}</h3>
                                {getStatusBadge(site.status)}
                            </div>

                            <div className="space-y-3 mb-4">
                                <p className="text-sm text-slate-600 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    {site.address || t('sites.no_address', 'Sans adresse')}
                                </p>
                                {site.client_name && (
                                    <p className="text-sm text-slate-900 font-medium">
                                        {t('sites.client', 'Client')}: {site.client_name}
                                    </p>
                                )}
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-full p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1 text-amber-700 font-semibold">
                                            <Zap className="w-5 h-5" />
                                            {site.system_power_kw || 0} kW
                                        </span>
                                        <span className="flex items-center gap-1 text-amber-600">
                                            <Hash className="w-5 h-5" />
                                            {site.panel_count || 0} {t('sites.panels', 'panneaux')}
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
                                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Camera className="w-4 h-4" />
                                    {t('sites.photos', 'Photos')}
                                </button>
                                <button
                                    onClick={() => handleEditSite(site)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-medium transition-colors flex items-center gap-2"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    {t('common.edit', 'Éditer')}
                                </button>
                                <button
                                    onClick={() => handleDeleteSite(site.id)}
                                    className="p-2 hover:bg-red-50 rounded-full transition-colors"
                                    title={t('common.delete', 'Supprimer')}
                                >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
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
            )}
        </div>
            )}

            {/* Edit/Add Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-slate-200 dark:border-slate-800 transform scale-100 opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-slate-500" />
                                {editingSite
                                    ? (editingSite.project_type === 'short_term' ? t('sites.edit_short_term', 'Éditer le travail') : t('sites.edit_site', 'Éditer le chantier'))
                                    : (formData.project_type === 'short_term' ? t('sites.add_short_term', 'Ajouter un travail court') : t('sites.add_site_new', 'Ajouter un nouveau chantier'))
                                }
                            </h2>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 px-6 pt-2">
                            <button
                                onClick={() => setActiveModalTab('info')}
                                className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${activeModalTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                {t('sites.information', 'Informations')}
                            </button>
                            <button
                                onClick={() => setActiveModalTab('teams')}
                                className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${activeModalTab === 'teams' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                {t('sites.assigned_teams', 'Équipes allouées')}
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 flex-1">
                            <div className={activeModalTab !== 'info' ? 'hidden' : ''}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">
                                            {formData.project_type === 'short_term' ? t('sites.work_title', 'Titre du travail *') : t('sites.site_name', 'Nom du chantier *')}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            placeholder={formData.project_type === 'short_term' ? t('sites.work_title_placeholder', 'ex: Révision électrique') : t('sites.site_name_placeholder', 'ex: Installation Panneaux Solaires')}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('common.address', 'Adresse')}</label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            placeholder={t('sites.address_placeholder', 'Rue, Numéro, Ville')}
                                        />
                                    </div>

                                    <div className="md:col-span-2 bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('sites.gps_coordinates', 'Coordonnées GPS')}</label>
                                            <button
                                                type="button"
                                                onClick={handleDetectLocation}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold transition-colors border border-blue-200 dark:border-blue-800"
                                            >
                                                <MapPin className="w-3.5 h-3.5" />
                                                {t('sites.auto_detect', 'Détection automatique')}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">{t('sites.latitude', 'Latitude')}</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.latitude}
                                                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                    placeholder="ex: 44.4268"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">{t('sites.longitude', 'Longitude')}</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.longitude}
                                                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                    placeholder="ex: 26.1025"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">{t('sites.geofence_radius', 'Rayon Geofence (m)')}</label>
                                                <input
                                                    type="number"
                                                    value={formData.geofence_radius}
                                                    onChange={e => setFormData({ ...formData, geofence_radius: e.target.value })}
                                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                    placeholder="ex: 100"
                                                    min="10"
                                                    max="5000"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-3 mb-2 ml-1">{t('sites.geofence_hint', "Utilisées pour le geofencing. Si elles ne sont pas définies, nous tenterons de les récupérer à partir de l'adresse lors de l'enregistrement.")}</p>
                                        <MiniMapSelector 
                                            latitude={formData.latitude} 
                                            longitude={formData.longitude} 
                                            onLocationChange={(lat, lon) => setFormData({...formData, latitude: lat, longitude: lon})} 
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1 ml-1">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('sites.client', 'Client')}</label>
                                            <button 
                                                type="button" 
                                                onClick={() => setShowNewClientModal(true)}
                                                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                            >
                                                + {t('sites.new_client', 'Nouveau Client')}
                                            </button>
                                        </div>
                                        <select
                                            value={formData.client_id}
                                            onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        >
                                            <option value="">-- {t('sites.no_client_associated', 'Aucun client associé')} --</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Tip Instalare — doar pentru santiere standard */}
                                    {formData.project_type !== 'short_term' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('sites.installation_type', "Type d'installation")}</label>
                                        <select
                                            value={formData.installation_type}
                                            onChange={e => setFormData({ ...formData, installation_type: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        >
                                            <option value="residential">{t('sites.types.residential', 'Résidentiel')}</option>
                                            <option value="commercial">{t('sites.types.commercial', 'Commercial')}</option>
                                            <option value="industrial">{t('sites.types.industrial', 'Industriel')}</option>
                                        </select>
                                    </div>
                                    )}

                                    {/* Putere (kW) si Numar Panouri — doar pentru santiere standard */}
                                    {formData.project_type !== 'short_term' && (<>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('sites.system_power', 'Puissance du système (kW)')}</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.system_power_kw}
                                            onChange={e => setFormData({ ...formData, system_power_kw: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            placeholder="ex: 10.5"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('sites.panel_count', 'Nombre de panneaux')}</label>
                                        <input
                                            type="number"
                                            value={formData.panel_count}
                                            onChange={e => setFormData({ ...formData, panel_count: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            placeholder="ex: 24"
                                        />
                                    </div>
                                    </>)}

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('common.status', 'Statut')}</label>
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        >
                                            <option value="active">{t('sites.status.active', 'Actif')}</option>
                                            <option value="completed">{t('sites.status.completed', 'Terminé')}</option>
                                            <option value="suspended">{t('sites.status.suspended', 'Suspendu')}</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('common.description', 'Description')}</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none"
                                            placeholder={t('sites.description_placeholder', 'Détails sur le chantier...')}
                                        />
                                    </div>
                                </div>

                                {/* Program Lucru — ascuns pentru lucrari scurte */}
                                {formData.project_type !== 'short_term' && (
                                <div className="border-t border-slate-200 dark:border-slate-800 pt-5 mt-5">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-500" />
                                        {t('sites.work_schedule', 'Programme de travail du chantier')}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('sites.start_time', 'Heure de début')}</label>
                                            <input
                                                type="time"
                                                value={formData.work_start_time}
                                                onChange={e => setFormData({ ...formData, work_start_time: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('sites.end_time', 'Heure de fin')}</label>
                                            <input
                                                type="time"
                                                value={formData.work_end_time}
                                                onChange={e => setFormData({ ...formData, work_end_time: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('sites.max_overtime', 'Heures supplémentaires max (min)')}</label>
                                            <input
                                                type="number"
                                                value={formData.max_overtime_minutes}
                                                onChange={e => setFormData({ ...formData, max_overtime_minutes: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                placeholder="120"
                                                min="0"
                                                max="480"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('sites.lunch_start', 'Début de pause déjeuner')}</label>
                                            <input
                                                type="time"
                                                value={formData.lunch_break_start}
                                                onChange={e => setFormData({ ...formData, lunch_break_start: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('sites.lunch_end', 'Fin de pause déjeuner')}</label>
                                            <input
                                                type="time"
                                                value={formData.lunch_break_end}
                                                onChange={e => setFormData({ ...formData, lunch_break_end: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-1">{t('sites.schedule_hint', 'Le pointage peut se faire max 30 min avant. Heures supp sans approbation: {{minutes}} minutes.', { minutes: formData.max_overtime_minutes || 120 })}</p>
                                </div>
                                )}
                            </div>

                            <div className={activeModalTab !== 'teams' ? 'hidden' : ''}>
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                        {t('sites.teams_hint', "Cochez les équipes qui travaillent sur ce chantier. Toute modification mettra à jour la main-d'œuvre dans l'application.")}
                                    </p>
                                    <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {teams.map(team => (
                                            <label key={team.id} className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-colors ${selectedTeamIds.includes(team.id) ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
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
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{team.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('sites.team_leader', 'Chef')}: {team.team_leader_name} · {t('sites.workers_count', '{{count}} Travailleurs', { count: team.member_count })}</p>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                        {teams.length === 0 && (
                                            <p className="text-sm text-slate-400 text-center py-6">{t('sites.no_teams', "Il n'y a pas d'équipes créées dans le système.")}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0 bg-white dark:bg-slate-900">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button
                                onClick={handleSaveSite}
                                disabled={saving}
                                className="px-5 h-10 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {editingSite
                                    ? t('common.save', 'Enregistrer')
                                    : (formData.project_type === 'short_term' ? t('sites.create_short_term', 'Créer le travail') : t('sites.create_site', 'Créer le chantier'))
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Modal */}
            {showPhotoModal && selectedSite && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200/50 dark:border-slate-800/50" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between text-white shrink-0">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Camera className="w-6 h-6" />
                                    {selectedSite.name}
                                </h2>
                                <p className="text-white/80 mt-1 ml-8 text-sm">{t('sites.site_photos', 'Photos du chantier')}</p>
                            </div>
                            <button
                                onClick={() => setShowPhotoModal(false)}
                                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-6 h-6" />
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
            {/* Worker Assign Modal */}
            {workerAssignModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-blue-500" />
                                {t('sites.assign_workers', 'Allocation de travailleurs')} — {workerAssignModal.name}
                            </h2>
                            <button onClick={() => setWorkerAssignModal(null)} className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                            <input
                                type="text"
                                placeholder={t('sites.search_worker', 'Rechercher un travailleur...')}
                                value={workerSearch}
                                onChange={e => setWorkerSearch(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm mb-3 outline-none focus:border-blue-500"
                            />
                            {allWorkers.filter(w => w.name?.toLowerCase().includes(workerSearch.toLowerCase()) || w.email?.toLowerCase().includes(workerSearch.toLowerCase())).map(w => {
                                const checked = workerAssignModal.assigned_worker_ids?.includes(w.id) || false
                                return (
                                    <label key={w.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            defaultChecked={checked}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setWorkerAssignModal(prev => ({ ...prev, assigned_worker_ids: [...(prev.assigned_worker_ids || []), w.id] }))
                                                } else {
                                                    setWorkerAssignModal(prev => ({ ...prev, assigned_worker_ids: (prev.assigned_worker_ids || []).filter(id => id !== w.id) }))
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{w.name}</p>
                                            <p className="text-xs text-slate-400">{w.email}</p>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                            <button onClick={() => setWorkerAssignModal(null)} className="px-5 h-10 rounded-full text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">{t('common.cancel', 'Annuler')}</button>
                            <button
                                onClick={() => handleAssignWorkers(workerAssignModal.assigned_worker_ids || [])}
                                disabled={assigningSite}
                                className="px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-60"
                            >
                                {assigningSite ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                {t('sites.save_allocation', "Enregistrer l'allocation")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Final Report Modal */}
            {reportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-blue-500" />
                                {t('sites.final_report', 'Rapport final')} — {reportModal.site.name}
                            </h2>
                            <div className="flex items-center gap-2">
                                {reportModal.data && (
                                    <button
                                        onClick={() => downloadFinalReport(reportModal.site)}
                                        className="px-4 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
                                    >
                                        <FileText className="w-3.5 h-3.5" /> {t('sites.export_excel', 'Exporter vers Excel')}
                                    </button>
                                )}
                                <button onClick={() => setReportModal(null)} className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>
                        </div>
                        {loadingReport || !reportModal.data ? (
                            <div className="p-12 flex items-center justify-center">
                                <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                            </div>
                        ) : (
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { label: t('common.workers', 'Travailleurs'), value: reportModal.data.summary.total_workers },
                                        { label: t('sites.hours_worked', 'Heures travaillées'), value: reportModal.data.summary.total_hours + 'h' },
                                        { label: t('sites.materials', 'Matériaux'), value: reportModal.data.summary.total_material_types },
                                        { label: t('sites.total_km', 'KM Total'), value: reportModal.data.summary.total_km_trips + ' km' },
                                    ].map(kpi => (
                                        <div key={kpi.label} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 text-center">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{kpi.label}</p>
                                            <p className="text-lg font-extrabold text-slate-900 dark:text-white">{kpi.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {reportModal.data.workers.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t('common.workers', 'Travailleurs')}</p>
                                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        {[t('sites.code', 'Code'), t('common.name', 'Nom'), t('sites.hours', 'Heures'), t('sites.days', 'Jours')].map(h => (
                                                            <th key={h} className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {reportModal.data.workers.map(w => (
                                                        <tr key={w.code}>
                                                            <td className="px-3 py-2 text-slate-500 font-mono text-xs">{w.code}</td>
                                                            <td className="px-3 py-2 font-semibold text-slate-800 dark:text-white">{w.name}</td>
                                                            <td className="px-3 py-2 font-bold text-blue-600">{w.total_hours}h</td>
                                                            <td className="px-3 py-2 text-slate-500">{w.days_worked} {t('sites.days_worked', 'jours')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {reportModal.data.materials.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t('sites.used_materials', 'Matériaux utilisés')}</p>
                                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        {[t('sites.material_name', 'Dénomination'), t('sites.category', 'Catégorie'), t('sites.quantity', 'Quantité')].map(h => (
                                                            <th key={h} className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {reportModal.data.materials.map(m => (
                                                        <tr key={m.name}>
                                                            <td className="px-3 py-2 font-semibold text-slate-800 dark:text-white">{m.name}</td>
                                                            <td className="px-3 py-2 text-slate-500">{m.category}</td>
                                                            <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-300">{m.quantity} {m.unit}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* ── New Client Modal ── */}
            {showNewClientModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('sites.add_client_quick', 'Ajouter un client rapide')}</h2>
                            <button onClick={() => setShowNewClientModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveNewClient} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('sites.company_name', "Nom de l'entreprise *")}</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 h-9 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                                    value={newClientData.name}
                                    onChange={e => setNewClientData({...newClientData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('sites.hq_address', 'Adresse du siège')}</label>
                                <input
                                    type="text"
                                    className="w-full px-4 h-9 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                                    value={newClientData.address}
                                    onChange={e => setNewClientData({...newClientData, address: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('common.phone', 'Téléphone')}</label>
                                <input
                                    type="text"
                                    className="w-full px-4 h-9 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                                    value={newClientData.phone}
                                    onChange={e => setNewClientData({...newClientData, phone: e.target.value})}
                                />
                            </div>
                            <div className="pt-2 flex justify-end gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowNewClientModal(false)}
                                    className="px-4 h-9 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    {t('common.cancel', 'Annuler')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingClient}
                                    className="px-4 h-9 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-70"
                                >
                                    {savingClient ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    {t('common.save', 'Enregistrer')}
                                </button>
                            </div>
                        </form>
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

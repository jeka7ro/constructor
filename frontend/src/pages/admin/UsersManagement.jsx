import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdminStore } from '../../store/adminStore'
import useViewPreferencesStore from '../../store/viewPreferencesStore'
import api from '../../lib/api'
import { Users, Plus, Search, Edit2, Trash2, Key, UserCheck, UserX, Loader2, Mail, Phone, Calendar, X, Save, Eye, Download, Upload, CreditCard, FileSpreadsheet, ScanLine, MapPin, Filter, XCircle, FileText, FileUp, FileDown } from 'lucide-react'
import ViewToggle from '../../components/ViewToggle'
import Pagination from '../../components/Pagination'
import AvatarCropModal from '../../components/AvatarCropModal'
import { useUIStore } from '../../store/uiStore'

const PAGE_ID = 'admin-users'
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

const EMPTY_USER = {
    employee_code: '',
    last_name: '',
    first_name: '',
    role_id: '',
    pin: '',
    birth_date: '',
    cnp: '',
    birth_place: '',
    id_card_series: '',
    phone: '',
    email: '',
    address: '',
    is_active: true,
    hourly_rate: '',
}

export default function UsersManagement() {
    const { t } = useTranslation()
    const { showDialog, showToast, openDialog } = useUIStore()
    const [users, setUsers] = useState([])
    const [totalUsers, setTotalUsers] = useState(0)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('true')
    const [stats, setStats] = useState(null)
    const [roles, setRoles] = useState([])
    const token = useAdminStore((state) => state.token)
    
    // Bulk Select states
    const [selectedUserIds, setSelectedUserIds] = useState([])

    // Modal states
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [formData, setFormData] = useState(EMPTY_USER)
    const [saving, setSaving] = useState(false)
    const [showPinModal, setShowPinModal] = useState(false)
    const [pinUserId, setPinUserId] = useState(null)
    const [newPin, setNewPin] = useState('')
    const [showViewModal, setShowViewModal] = useState(false)
    const [viewingUser, setViewingUser] = useState(null)
    const [idCardFile, setIdCardFile] = useState(null)
    const [idCardPreview, setIdCardPreview] = useState(null)
    const [uploadingIdCard, setUploadingIdCard] = useState(false)
    const [ocrLoading, setOcrLoading] = useState(false)
    const [avatarCropImage, setAvatarCropImage] = useState(null)
    const [importing, setImporting] = useState(false)
    const [deleteModalData, setDeleteModalData] = useState(null)
    
    // Site Assignment states
    const [sites, setSites] = useState([])
    const [showAssignSiteModal, setShowAssignSiteModal] = useState(false)
    const [assignTargetUserId, setAssignTargetUserId] = useState(null)
    const [assignSiteId, setAssignSiteId] = useState('')
    const [assigningSite, setAssigningSite] = useState(false)
    const [contractFile, setContractFile] = useState(null)
    const [uploadingContract, setUploadingContract] = useState(false)
    const contractInputRef = useRef(null)
    const importInputRef = useRef(null)
    const idCardInputRef = useRef(null)

    // View preferences
    const preferences = useViewPreferencesStore((state) => state.getPagePreferences(PAGE_ID))
    const setViewMode = useViewPreferencesStore((state) => state.setViewMode)
    const setPageSize = useViewPreferencesStore((state) => state.setPageSize)
    const setCurrentPage = useViewPreferencesStore((state) => state.setCurrentPage)

    // Auto-reset page if beyond results
    useEffect(() => {
        if (!loading && users.length === 0 && totalUsers > 0 && preferences.currentPage > 1) {
            setCurrentPage(PAGE_ID, 1)
        }
    }, [loading, users.length, totalUsers, preferences.currentPage])

    useEffect(() => {
        fetchUsers()
        fetchStats()
        fetchRoles()
        fetchSites()
    }, [search, roleFilter, statusFilter, preferences.currentPage, preferences.pageSize])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const params = { search, page: preferences.currentPage, page_size: preferences.pageSize }
            if (roleFilter) params.role_id = roleFilter
            if (statusFilter !== '') params.is_active = statusFilter === 'true'
            const response = await api.get('/admin/users/', { params })
            // Exclude technical admin/system accounts from employee list
            const filtered = (response.data.users || []).filter(u =>
                !(u.role_code === 'ADMIN' || u.employee_code === 'ADMIN' ||
                  (u.last_name === 'Admin' && u.first_name === 'User') ||
                  u.role_name === 'Administrator')
            )
            setUsers(filtered)
            setTotalUsers(response.data.total)
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        try {
            const response = await api.get('/admin/users/stats/summary')
            setStats(response.data)
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    const fetchRoles = async () => {
        try {
            const response = await api.get('/admin/roles/')
            setRoles(response.data || [])
        } catch (error) {
            console.error('Error fetching roles:', error)
        }
    }

    const fetchSites = async () => {
        try {
            const response = await api.get('/admin/sites/', { params: { page_size: 1000 } })
            setSites(response.data.sites || [])
        } catch (error) {
            console.error('Error fetching sites:', error)
        }
    }

    const handleAssignSiteClick = (user) => {
        setAssignTargetUserId(user.id)
        setAssignSiteId(user.site_id || '')
        setShowAssignSiteModal(true)
    }

    const handleSaveSiteAssignment = async () => {
        try {
            setAssigningSite(true)
            await api.put(`/admin/users/${assignTargetUserId}`, { site_id: assignSiteId })
            showToast('Șantier atașat cu succes', 'success')
            setShowAssignSiteModal(false)
            fetchUsers()
        } catch (error) {
            showToast(error.response?.data?.detail || 'Eroare la atașarea șantierului', 'error')
        } finally {
            setAssigningSite(false)
        }
    }

    const handleAddUser = async () => {
        setEditingUser(null)
        setFormData(EMPTY_USER)
        setIdCardFile(null)
        setIdCardPreview(null)
        setShowEditModal(true)
        // Auto-fetch next employee code
        try {
            const resp = await api.get('/admin/users/next-code')
            if (resp.data.next_code) {
                setFormData(prev => ({ ...prev, employee_code: resp.data.next_code }))
            }
        } catch (e) {
            console.error('Could not fetch next employee code:', e)
        }
    }

    const handleEditUser = (user) => {
        setEditingUser(user)
        setFormData({
            employee_code: user.employee_code || '',
            last_name: user.last_name || '',
            first_name: user.first_name || '',
            role_id: user.role_id || '',
            pin: '',
            birth_date: user.birth_date || '',
            cnp: user.cnp || '',
            birth_place: user.birth_place || '',
            id_card_series: user.id_card_series || '',
            phone: user.phone || '',
            email: user.email || '',
            address: user.address || '',
            is_active: user.is_active,
            hourly_rate: user.hourly_rate != null ? String(user.hourly_rate) : '',
        })
        setIdCardFile(null)
        setIdCardPreview(null)
        setShowEditModal(true)
    }

    const handleSaveUser = async () => {
        if (!formData.last_name.trim()) {
            showToast(t('users.errors.last_name_required'), 'error')
            return
        }
        if (!formData.first_name.trim()) {
            showToast(t('users.errors.first_name_required'), 'error')
            return
        }
        if (!editingUser && !formData.employee_code.trim()) {
            showToast(t('users.errors.code_required'), 'error')
            return
        }
        if (!editingUser && !formData.pin) {
            showToast(t('users.errors.pin_required'), 'error')
            return
        }

        try {
            setSaving(true)
            let savedUser
            if (editingUser) {
                const updatePayload = {}
                if (formData.last_name !== (editingUser.last_name || '')) updatePayload.last_name = formData.last_name
                if (formData.first_name !== (editingUser.first_name || '')) updatePayload.first_name = formData.first_name
                if (formData.role_id !== editingUser.role_id) updatePayload.role_id = formData.role_id
                if (formData.is_active !== editingUser.is_active) updatePayload.is_active = formData.is_active
                if (formData.birth_date !== (editingUser.birth_date || '')) updatePayload.birth_date = formData.birth_date || null
                if (formData.cnp !== (editingUser.cnp || '')) updatePayload.cnp = formData.cnp || null
                if (formData.birth_place !== (editingUser.birth_place || '')) updatePayload.birth_place = formData.birth_place || null
                if (formData.id_card_series !== (editingUser.id_card_series || '')) updatePayload.id_card_series = formData.id_card_series || null
                if (formData.phone !== (editingUser.phone || '')) updatePayload.phone = formData.phone || null
                if (formData.email !== (editingUser.email || '')) updatePayload.email = formData.email || null
                if (formData.address !== (editingUser.address || '')) updatePayload.address = formData.address || null
                // hourly_rate: always send if present (0 is valid)
                const hrVal = formData.hourly_rate !== '' ? parseFloat(formData.hourly_rate) : null
                if (hrVal !== (editingUser.hourly_rate ?? null)) updatePayload.hourly_rate = hrVal

                const resp = await api.put(`/admin/users/${editingUser.id}`, updatePayload)
                savedUser = resp.data
            } else {
                // Clean empty strings to null for optional fields
                const cleanData = { ...formData }
                const optionalFields = ['birth_date', 'cnp', 'birth_place', 'id_card_series', 'phone', 'email', 'address']
                optionalFields.forEach(f => { if (cleanData[f] === '') cleanData[f] = null })
                const resp = await api.post('/admin/users/', cleanData)
                savedUser = resp.data
            }

            // Upload ID card if selected
            if (idCardFile && savedUser?.id) {
                const fd = new FormData()
                fd.append('file', idCardFile)
                await api.post(`/admin/users/${savedUser.id}/upload-id-card`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
            }

            setShowEditModal(false)
            fetchUsers()
            fetchStats()
            showToast(t('users.success.saved'), 'success')
        } catch (error) {
            showToast(error.response?.data?.detail || t('users.errors.save_failed'), 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleToggleActive = async (userId, currentStatus) => {
        try {
            await api.put(`/admin/users/${userId}`, { is_active: !currentStatus })
            fetchUsers()
            fetchStats()
        } catch (error) {
            console.error('Error updating user:', error)
        }
    }

    const handleDelete = (userId) => {
        const user = users.find(u => u.id === userId)
        if (user) setDeleteModalData(user)
    }

    const executeDelete = async (hardDelete) => {
        if (!deleteModalData) return
        try {
            await api.delete(`/admin/users/${deleteModalData.id}`, { params: { hard_delete: hardDelete } })
            setDeleteModalData(null)
            fetchUsers()
            fetchStats()
            showToast(hardDelete ? t('users.success.deleted') : t('users.success.archived'), 'success')
        } catch (error) {
            showToast(error.response?.data?.detail || t('users.errors.delete_failed'), 'error')
            console.error('Error deleting user:', error)
        }
    }

    const handleRestore = async (userId) => {
        try {
            await api.put(`/admin/users/${userId}`, { is_active: true })
            fetchUsers()
            fetchStats()
            showToast(t('users.success.restored'), 'success')
        } catch (error) {
            console.error('Error restoring user:', error)
            showToast(t('users.errors.restore_failed'), 'error')
        }
    }

    const handleResetPin = (userId) => {
        setPinUserId(userId)
        setNewPin('')
        setShowPinModal(true)
    }

    const handleToggleSelectAll = (e) => {
        if (e.target.checked) setSelectedUserIds(users.map(u => u.id))
        else setSelectedUserIds([])
    }

    const handleToggleSelect = (userId) => {
        setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
    }

    const handleBulkDelete = () => {
        if (selectedUserIds.length === 0) return
        showDialog({
            title: t('users.bulk_delete.title'),
            message: t('users.bulk_delete.message', { count: selectedUserIds.length }),
            type: 'danger',
            confirmText: t('common.delete'),
            onConfirm: async () => {
                try {
                    await Promise.all(selectedUserIds.map(id => api.delete(`/admin/users/${id}`)))
                    setSelectedUserIds([])
                    fetchUsers()
                    fetchStats()
                    showToast(t('users.success.bulk_deleted'), 'success')
                } catch (error) {
                    showToast(t('users.errors.bulk_delete_failed'), 'error')
                }
            }
        })
    }

    const handleSavePin = async () => {
        if (!newPin || newPin.length < 4) {
            showToast(t('users.errors.pin_length'), 'error')
            return
        }
        try {
            setSaving(true)
            await api.post(`/admin/users/${pinUserId}/reset-pin`, { new_pin: newPin })
            setShowPinModal(false)
            showToast(t('users.success.pin_reset'), 'success')
        } catch (error) {
            showToast(error.response?.data?.detail || t('users.errors.pin_reset_failed'), 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleViewUser = (user) => {
        setViewingUser(user)
        setShowViewModal(true)
    }

    const handleIdCardSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            setIdCardFile(file)
            setIdCardPreview(URL.createObjectURL(file))
        }
    }

    const handleScanIdCard = async () => {
        if (!idCardFile) {
            showToast(t('users.errors.select_id_card'), 'error')
            return
        }
        try {
            setOcrLoading(true)
            
            // Dynamic import to prevent Vite/Webpack from bundling massive libraries on initial load
            const { extractTextFromImageOrPdf } = await import('../../lib/pdfOcr')
            
            // Client-side text extraction (handles images and PDF)
            const extractedText = await extractTextFromImageOrPdf(idCardFile, (stage) => {
                // optional: use progress in UI, e.g., showToast(`OCR: ${stage}`, 'info')
            })

            const fd = new FormData()
            fd.append('file', idCardFile)
            fd.append('raw_text', extractedText) // send the extracted text

            const resp = await api.post('/admin/users/ocr/extract', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            const ocr = resp.data
            
            if (ocr.success) {
                const cnpValue = ocr.cnp || formData.cnp
                const autoPin = cnpValue && cnpValue.length >= 4 ? cnpValue.slice(-4) : ''
                setFormData(prev => ({
                    ...prev,
                    last_name: ocr.last_name || prev.last_name,
                    first_name: ocr.first_name || prev.first_name,
                    cnp: ocr.cnp || prev.cnp,
                    pin: autoPin || prev.pin,
                    birth_date: ocr.birth_date || prev.birth_date,
                    birth_place: ocr.birth_place || prev.birth_place,
                    id_card_series: ocr.id_card_series || prev.id_card_series,
                    address: ocr.address || prev.address,
                }))
                showToast(t('users.success.ocr_extracted'), 'success')
            } else {
                showToast(ocr.message, 'error')
            }
        } catch (error) {
            showToast(t('users.errors.ocr_failed') + (error.response?.data?.detail || error.message), 'error')
        } finally {
            setOcrLoading(false)
        }
    }

    const handleExportExcel = async () => {
        try {
            const response = await api.get('/admin/users/export/excel', { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `angajati_${new Date().toISOString().slice(0, 10)}.xlsx`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            openDialog({ type: 'danger', title: t('common.export_error'), message: t('common.error_message') + (error.response?.data?.detail || error.message), confirmText: 'OK', cancelText: null })
        }
    }

    const handleImportExcel = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        try {
            setImporting(true)
            const fd = new FormData()
            fd.append('file', file)
            const resp = await api.post('/admin/users/import/excel', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            const result = resp.data
            let msg = `${result.message}`
            if (result.errors?.length) {
                msg += `\n\n${t('common.errors')}:\n${result.errors.join('\n')}`
            }
            openDialog({ type: 'info', title: t('common.import_finished'), message: msg, confirmText: 'OK', cancelText: null })
            fetchUsers()
            fetchStats()
        } catch (error) {
            openDialog({ type: 'danger', title: t('common.import_error'), message: t('common.error_message') + (error.response?.data?.detail || error.message), confirmText: 'OK', cancelText: null })
        } finally {
            setImporting(false)
            if (importInputRef.current) importInputRef.current.value = ''
        }
    }

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-600" />
                        {t('users.title')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t('users.subtitle')}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit shadow-inner mb-2 border border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => { setStatusFilter('true'); setCurrentPage(PAGE_ID, 1) }}
                  className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${statusFilter !== 'false' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shadow-none'}`}
                >
                  <UserCheck className="w-4 h-4" />
                  {t('users.active_tab')}
                </button>
                <button 
                  onClick={() => { setStatusFilter('false'); setCurrentPage(PAGE_ID, 1) }}
                  className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${statusFilter === 'false' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white' : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shadow-none'}`}
                >
                  <UserX className="w-4 h-4" />
                  {t('users.archive_tab')}
                </button>
            </div>

            {/* Stats Cards - Optional visibility based on preference or keep them small if needed, for now let's just keep the overall counts */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard label={t('users.total_installed')} value={(stats.total_users || 0) + (stats.inactive_users || 0)} icon={Users} color="from-blue-500 to-indigo-600" />
                    <StatCard label={t('users.active_now')} value={stats.total_users || 0} icon={UserCheck} color="from-emerald-500 to-green-600" />
                    <StatCard label={t('users.roles')} value={stats.users_by_role?.length || 0} icon={Key} color="from-violet-500 to-purple-600" />
                    <StatCard label={t('users.archived')} value={stats.inactive_users || 0} icon={UserX} color="from-slate-500 to-slate-600" />
                </div>
            )}

            {/* Search, Filters and Actions */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-3xl shadow-sm flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(PAGE_ID, 1) }}
                            placeholder={t('users.search_placeholder')}
                            className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                        />
                    </div>
                    {/* Role Filter */}
                    <select
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(PAGE_ID, 1) }}
                        className="px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                    >
                        <option value="">{t('common.all')}</option>
                        {roles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>

                    <ViewToggle
                        viewMode={preferences.viewMode}
                        onViewModeChange={(mode) => setViewMode(PAGE_ID, mode)}
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <input type="file" ref={importInputRef} accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
                    <button onClick={() => importInputRef.current?.click()} disabled={importing} className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shadow-sm whitespace-nowrap">
                        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />} {t('common.import')}
                    </button>
                    <button onClick={handleExportExcel} className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shadow-sm whitespace-nowrap">
                        <FileDown className="w-4 h-4" /> {t('common.export')}
                    </button>

                    {selectedUserIds.length > 0 && (
                        <button onClick={handleBulkDelete} className="px-4 py-2.5 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap">
                            <Trash2 className="w-4 h-4" /> {t('common.delete')} ({selectedUserIds.length})
                        </button>
                    )}

                    <button onClick={handleAddUser} className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap">
                        <Plus className="w-5 h-5" /> {t('common.add')}
                    </button>
                </div>
            </div>

            {/* Users Content */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-3xl">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : preferences.viewMode === 'list' ? (
                    <UsersTable users={users} onToggleActive={handleToggleActive} onDelete={handleDelete} onEdit={handleEditUser} onResetPin={handleResetPin} onView={handleViewUser} onAssignSite={handleAssignSiteClick} selectedUserIds={selectedUserIds} onToggleSelect={handleToggleSelect} onToggleSelectAll={handleToggleSelectAll} />
                ) : (
                    <UsersGrid users={users} onToggleActive={handleToggleActive} onDelete={handleDelete} onEdit={handleEditUser} onResetPin={handleResetPin} onView={handleViewUser} selectedUserIds={selectedUserIds} onToggleSelect={handleToggleSelect} />
                )}

                {!loading && users.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium">{t('users.no_users')}</p>
                        <p className="text-sm text-slate-500 mt-1">{t('users.no_users_hint')}</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!loading && users.length > 0 && (
                <Pagination
                    currentPage={preferences.currentPage}
                    pageSize={preferences.pageSize}
                    totalItems={totalUsers}
                    onPageChange={(page) => setCurrentPage(PAGE_ID, page)}
                    onPageSizeChange={(size) => setPageSize(PAGE_ID, size)}
                />
            )}

            {/* =================== ADD/EDIT USER MODAL =================== */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl border border-slate-200/50" onClick={e => e.stopPropagation()}>
                        {/* Header with gradient */}
                        <div className="relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"></div>
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,white,transparent)]"></div>
                            <div className="relative p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Avatar in header — clickable to change */}
                                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload-input')?.click()}>
                                        {editingUser?.avatar_path ? (
                                            <img
                                                src={`${API_BASE}${editingUser.avatar_path}`}
                                                style={{ objectPosition: 'top' }}
                                                alt=""
                                                className="w-14 h-14 rounded-full object-cover ring-3 ring-white/40 shadow-lg"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                            />
                                        ) : null}
                                        <div className={`w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full items-center justify-center text-white font-bold text-xl ring-3 ring-white/20 ${editingUser?.avatar_path ? 'hidden' : 'flex'}`}>
                                            {editingUser ? (editingUser.last_name?.charAt(0) || '') + (editingUser.first_name?.charAt(0) || '') : '✦'}
                                        </div>
                                        {editingUser && (
                                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white text-xs font-semibold">📷</span>
                                            </div>
                                        )}
                                        <input
                                            id="avatar-upload-input"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const f = e.target.files[0]
                                                if (!f || !editingUser) return
                                                setAvatarCropImage(f)
                                                e.target.value = ''
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">
                                            {editingUser ? t('users_modal.edit_employee') : t('users_modal.add_employee')}
                                        </h2>
                                        {editingUser && (
                                            <p className="text-blue-100 text-sm">{editingUser.full_name} • {editingUser.employee_code}</p>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <X className="w-6 h-6 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* ID Card Upload + OCR Section */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                                <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    Carte de Identitate
                                </h3>
                                <div className="flex items-start gap-4">
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            ref={idCardInputRef}
                                            accept="image/*"
                                            onChange={handleIdCardSelect}
                                            className="hidden"
                                        />
                                        {idCardPreview ? (
                                            <div className="relative">
                                                <img src={idCardPreview} alt="CI Preview" className="w-full h-40 object-contain rounded-lg border border-slate-200 bg-white" />
                                                <button
                                                    onClick={() => { setIdCardFile(null); setIdCardPreview(null) }}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => idCardInputRef.current?.click()}
                                                className="w-full h-32 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                <Upload className="w-6 h-6 mb-1" />
                                                <span className="text-sm font-medium">Încarcă poză CI</span>
                                                <span className="text-xs text-blue-400 mt-0.5">JPG, PNG, max 10MB</span>
                                            </button>
                                        )}
                                    </div>
                                    {idCardPreview && (
                                        <button
                                            onClick={handleScanIdCard}
                                            disabled={ocrLoading}
                                            className="px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                                            Scanează CI
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Employee Code */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Cod Angajat *</label>
                                    <input
                                        type="text"
                                        value={formData.employee_code}
                                        onChange={e => setFormData({ ...formData, employee_code: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="ex: EMP001"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nume *</label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="ex: Popescu"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Prenume *</label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="ex: Ion"
                                    />
                                </div>

                                {/* PIN - only for new */}
                                {!editingUser && (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">PIN *</label>
                                        <input
                                            type="password"
                                            value={formData.pin}
                                            onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                            placeholder="4-6 cifre"
                                            maxLength={6}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Rol *</label>
                                    <select
                                        value={formData.role_id}
                                        onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                    >
                                        <option value="">Selectează rol...</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('users_modal.cnp')}</label>
                                    <input
                                        type="text"
                                        value={formData.cnp}
                                        onChange={e => {
                                            const cnpVal = e.target.value
                                            const updates = { ...formData, cnp: cnpVal }
                                            // Auto-fill PIN with last 4 digits of CNP when complete
                                            if (cnpVal.length === 13 && !formData.pin) {
                                                updates.pin = cnpVal.slice(-4)
                                            }
                                            setFormData(updates)
                                        }}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="13 cifre"
                                        maxLength={13}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('users_modal.id_serial')}</label>
                                    <input
                                        type="text"
                                        value={formData.id_card_series}
                                        onChange={e => setFormData({ ...formData, id_card_series: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="ex: RD 123456"
                                        maxLength={20}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('users_modal.birth_date')}</label>
                                    <input
                                        type="date"
                                        value={formData.birth_date}
                                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('users_modal.birth_place')}</label>
                                    <input
                                        type="text"
                                        value={formData.birth_place}
                                        onChange={e => setFormData({ ...formData, birth_place: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="ex: București"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Telefon</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="07xx xxx xxx"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="email@example.com"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Domiciliu</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="Strada, Număr, Oraș"
                                    />
                                </div>

                                {/* Hourly Rate — admin only, confidential */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Tarif Orar (Lei/h)
                                        <span className="ml-2 text-xs font-normal text-slate-400">confidential</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={formData.hourly_rate}
                                        onChange={e => setFormData({ ...formData, hourly_rate: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        placeholder="ex: 25.00"
                                    />
                                </div>

                                {editingUser && (
                                    <div className="md:col-span-2">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active}
                                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                                className="w-5 h-5 rounded border-slate-300"
                                            />
                                            <span className="text-sm font-semibold text-slate-700">Cont activ</span>
                                        </label>
                                    </div>
                                )}

                                {/* Contract Upload */}
                                {editingUser && (
                                    <div className="md:col-span-2">
                                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                                            <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                Contract de Muncă
                                            </h3>
                                            {editingUser.contract_path ? (
                                                <div className="flex items-center gap-3">
                                                    <a
                                                        href={editingUser.contract_path.startsWith('http') ? editingUser.contract_path : `${API_BASE}${editingUser.contract_path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors text-sm font-medium"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        Vizualizează Contract
                                                    </a>
                                                    <input type="file" ref={contractInputRef} accept=".pdf,.jpg,.jpeg,.png" onChange={async (e) => {
                                                        const file = e.target.files[0]
                                                        if (!file) return
                                                        setUploadingContract(true)
                                                        try {
                                                            const fd = new FormData()
                                                            fd.append('file', file)
                                                            const resp = await api.post(`/admin/users/${editingUser.id}/upload-contract`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                                                            setEditingUser({ ...editingUser, contract_path: resp.data.contract_path })
                                                            openDialog({ type: 'info', title: 'Succes', message: 'Contract încărcat cu succes!', confirmText: 'OK', cancelText: null })
                                                        } catch (err) { openDialog({ type: 'danger', title: 'Eroare', message: 'Eroare: ' + (err.response?.data?.detail || err.message), confirmText: 'OK', cancelText: null }) }
                                                        finally { setUploadingContract(false); if (contractInputRef.current) contractInputRef.current.value = '' }
                                                    }} className="hidden" />
                                                    <button
                                                        onClick={() => contractInputRef.current?.click()}
                                                        disabled={uploadingContract}
                                                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        {uploadingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                        Înlocuiește
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <input type="file" ref={contractInputRef} accept=".pdf,.jpg,.jpeg,.png" onChange={async (e) => {
                                                        const file = e.target.files[0]
                                                        if (!file) return
                                                        setUploadingContract(true)
                                                        try {
                                                            const fd = new FormData()
                                                            fd.append('file', file)
                                                            const resp = await api.post(`/admin/users/${editingUser.id}/upload-contract`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                                                            setEditingUser({ ...editingUser, contract_path: resp.data.contract_path })
                                                            openDialog({ type: 'info', title: 'Succes', message: 'Contract încărcat cu succes!', confirmText: 'OK', cancelText: null })
                                                        } catch (err) { openDialog({ type: 'danger', title: 'Eroare', message: 'Eroare: ' + (err.response?.data?.detail || err.message), confirmText: 'OK', cancelText: null }) }
                                                        finally { setUploadingContract(false); if (contractInputRef.current) contractInputRef.current.value = '' }
                                                    }} className="hidden" />
                                                    <button
                                                        onClick={() => contractInputRef.current?.click()}
                                                        disabled={uploadingContract}
                                                        className="w-full h-24 border-2 border-dashed border-amber-300 rounded-lg flex flex-col items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors"
                                                    >
                                                        {uploadingContract ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileUp className="w-6 h-6 mb-1" />}
                                                        <span className="text-sm font-medium">Încarcă Contract</span>
                                                        <span className="text-xs text-amber-400 mt-0.5">PDF, JPG, PNG</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
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
                                onClick={handleSaveUser}
                                disabled={saving}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {editingUser ? t('users_modal.save') : t('users_modal.create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================== VIEW USER MODAL =================== */}
            {showViewModal && viewingUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowViewModal(false)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                <Eye className="w-6 h-6 text-blue-600" />
                                Detalii Angajat
                            </h2>
                            <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-6 h-6 text-slate-600" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* User Header */}
                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200">
                                {viewingUser.avatar_path ? (
                                    <img
                                        src={`${API_BASE}${viewingUser.avatar_path}`}
                                        style={{ objectPosition: 'top' }}
                                        alt="Avatar"
                                        className="w-16 h-16 rounded-full object-cover shadow-lg border-2 border-blue-200"
                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                    />
                                ) : null}
                                <div className={`w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full items-center justify-center text-white font-bold text-2xl shadow-lg ${viewingUser.avatar_path ? 'hidden' : 'flex'}`}>
                                    {viewingUser.full_name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{viewingUser.full_name}</h3>
                                    <p className="text-sm font-mono text-slate-500">{viewingUser.employee_code}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                            {viewingUser.role_name}
                                        </span>
                                        {viewingUser.is_active ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Activ
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> Inactiv
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <InfoField label="Nume" value={viewingUser.last_name} />
                                <InfoField label="Prenume" value={viewingUser.first_name} />
                                <InfoField label="CNP" value={viewingUser.cnp} />
                                <InfoField label="Serie Buletin" value={viewingUser.id_card_series} icon={<CreditCard className="w-4 h-4" />} />
                                <InfoField label="Data Nașterii" value={viewingUser.birth_date ? new Date(viewingUser.birth_date).toLocaleDateString('ro-RO') : null} />
                                <InfoField label="Loc Naștere" value={viewingUser.birth_place} icon={<MapPin className="w-4 h-4" />} />
                                <InfoField label="Telefon" value={viewingUser.phone} icon={<Phone className="w-4 h-4" />} />
                                <InfoField label="Email" value={viewingUser.email} icon={<Mail className="w-4 h-4" />} />
                                <InfoField label="Domiciliu" value={viewingUser.address} fullWidth />
                            </div>

                            {/* ID Card Image */}
                            {viewingUser.id_card_path && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <CreditCard className="w-4 h-4" />
                                        Carte de Identitate
                                    </h4>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                        <img
                                            src={`${API_BASE}${viewingUser.id_card_path}`}
                                            alt="Carte de identitate"
                                            className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                                            onError={(e) => { e.target.style.display = 'none' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => { setShowViewModal(false); handleEditUser(viewingUser) }}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Editează
                            </button>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                            >
                                Închide
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================== RESET PIN MODAL =================== */}
            {showPinModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPinModal(false)}>
                    <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">Resetare PIN</h2>
                            <button onClick={() => setShowPinModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">PIN Nou (4-6 cifre)</label>
                            <input
                                type="password"
                                value={newPin}
                                onChange={e => setNewPin(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-center text-2xl tracking-widest"
                                placeholder="••••"
                                maxLength={6}
                                autoFocus
                            />
                        </div>
                        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button onClick={() => setShowPinModal(false)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
                                Anulează
                            </button>
                            <button
                                onClick={handleSavePin}
                                disabled={saving || newPin.length < 4}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                                Resetează PIN
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================== AVATAR CROP MODAL =================== */}
            <AvatarCropModal
                imageFile={avatarCropImage}
                onCancel={() => setAvatarCropImage(null)}
                onSave={async (blob) => {
                    if (!editingUser) return
                    const fd = new FormData()
                    fd.append('file', blob, 'avatar.jpg')
                    try {
                        const resp = await api.post(`/admin/users/${editingUser.id}/upload-avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                        setEditingUser({ ...editingUser, avatar_path: resp.data.avatar_path })
                        fetchUsers()
                        showToast('Avatar actualizat', 'success')
                    } catch (err) { console.error('Avatar upload error:', err); showToast('Eroare la actualizare avatar', 'error') }
                    setAvatarCropImage(null)
                }}
            />

            {/* =================== ASSIGN SITE MODAL =================== */}
            {showAssignSiteModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignSiteModal(false)}>
                    <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-orange-500" />
                                Atașează Șantier
                            </h2>
                            <button onClick={() => setShowAssignSiteModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Selectează Șantierul</label>
                            <select
                                value={assignSiteId}
                                onChange={e => setAssignSiteId(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                            >
                                <option value="">Niciun șantier (Anulează atașarea)</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                            <p className="mt-3 text-xs text-slate-500">
                                Angajatul va fi transferat direct pe acest șantier, ocolind necesitatea asocierii într-o Echipă dedicată.
                            </p>
                        </div>
                        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button onClick={() => setShowAssignSiteModal(false)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
                                Anulează
                            </button>
                            <button
                                onClick={handleSaveSiteAssignment}
                                disabled={assigningSite}
                                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                {assigningSite ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Salvează
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================== DELETE / ARCHIVE MODAL =================== */}
            {deleteModalData && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteModalData(null)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                <Trash2 className="w-6 h-6 text-red-500" />
                                Ștergere Angajat: {deleteModalData.last_name} {deleteModalData.first_name}
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-600">
                                Ai ales să elimini acest angajat din lista curentă. Te rugăm să alegi cum dorești să fie procesat:
                            </p>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => executeDelete(false)}>
                                <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-1">
                                    <UserX className="w-5 h-5 text-blue-700" />
                                    Mută în Arhivă (Recomandat)
                                </h3>
                                <p className="text-sm text-blue-800/80">
                                    Păstrează tot istoricul și rapoartele de pontaj. Angajatul nu va mai avea acces, dar informațiile lui rămân în arhivă pentru statiscă.
                                </p>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => executeDelete(true)}>
                                <h3 className="font-bold text-red-900 flex items-center gap-2 mb-1">
                                    <Trash2 className="w-5 h-5 text-red-700" />
                                    Șterge Definitiv
                                </h3>
                                <p className="text-sm text-red-800/80">
                                    <strong>Atenție!</strong> Toate pontajele și rapoartele asociate acestui angajat vor fi distruse. Folosește această opțiune doar dacă angajatul a fost creat dintr-o greșeală.
                                </p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 flex justify-end">
                            <button onClick={() => setDeleteModalData(null)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
                                Anulează
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// =================== HELPER COMPONENTS ===================

function InfoField({ label, value, icon, fullWidth }) {
    return (
        <div className={fullWidth ? 'col-span-2' : ''}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm text-slate-900 flex items-center gap-1.5">
                {icon}
                {value || <span className="text-slate-400 italic">—</span>}
            </p>
        </div>
    )
}

function UsersTable({ users, onToggleActive, onDelete, onEdit, onResetPin, onView, onAssignSite, selectedUserIds, onToggleSelect, onToggleSelectAll }) {
    const { t } = useTranslation()
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    const allSelected = users.length > 0 && selectedUserIds.length === users.length
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-800 dark:to-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        <th className="px-6 py-4 text-left w-12">
                            <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('users.employee_col')}</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('common.phone')}</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('common.role')}</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('common.status')}</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('common.actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {users.map((user) => (
                        <tr key={user.id} className={`group hover:bg-blue-50/40 dark:hover:bg-slate-700/50 transition-all duration-200 cursor-pointer ${selectedUserIds?.includes(user.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`} onClick={() => onView(user)}>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={selectedUserIds?.includes(user.id) || false} onChange={() => onToggleSelect(user.id)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    {user.avatar_path ? (
                                        <img src={`${apiBase}${user.avatar_path}`} alt="" className="w-10 h-10 rounded-full object-cover object-top ring-2 ring-white dark:ring-slate-700 shadow-md" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }} />
                                    ) : null}
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white dark:ring-slate-700 ${user.avatar_path ? 'hidden' : 'flex'}`}>
                                        {(user.last_name?.charAt(0) || '') + (user.first_name?.charAt(0) || '')}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.last_name} {user.first_name}</p>
                                        <p className="text-xs font-mono text-slate-400 dark:text-slate-500">{user.employee_code}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                <div className="space-y-0.5">
                                    {user.email && (
                                        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="truncate max-w-[180px]">{user.email}</span>
                                        </div>
                                    )}
                                    {user.phone && (
                                        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            {user.phone}
                                        </div>
                                    )}
                                    {!user.email && !user.phone && (
                                        <span className="text-xs text-slate-300 dark:text-slate-600 italic">—</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                <div className="flex flex-col items-start gap-1.5">
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                        {user.role_name}
                                    </span>
                                    {user.site_name && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                            <MapPin className="w-3 h-3" />
                                            <span className="truncate max-w-[120px]">{user.site_name}</span>
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {user.is_active ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                        {t('common.active')}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                        {t('common.inactive')}
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onView(user)} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full border border-slate-200 dark:border-slate-600 transition-colors" title="Vizualizează">
                                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </button>
                                    <button onClick={() => onAssignSite(user)} className="p-2 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full border border-slate-200 dark:border-slate-600 transition-colors" title="Atașează Șantier">
                                        <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                    </button>
                                    <button onClick={() => onToggleActive(user.id, user.is_active)} className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-full border border-slate-200 dark:border-slate-600 transition-colors" title={user.is_active ? t('users.deactivate') : t('users.activate')}>
                                        {user.is_active ? <UserX className="w-4 h-4 text-amber-600 dark:text-amber-400" /> : <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                                    </button>
                                    <button onClick={() => onResetPin(user.id)} className="p-2 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-full border border-slate-200 dark:border-slate-600 transition-colors" title="Resetează PIN">
                                        <Key className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    </button>
                                    <button onClick={() => onEdit(user)} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full border border-slate-200 dark:border-slate-600 transition-colors" title="Editează">
                                        <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </button>
                                    <button onClick={() => onDelete(user.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full border border-slate-200 dark:border-slate-600 transition-colors" title="Șterge">
                                        <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function UsersGrid({ users, onToggleActive, onDelete, onEdit, onResetPin, onView, selectedUserIds, onToggleSelect }) {
    const { t } = useTranslation()
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {users.map((user) => (
                <div key={user.id} className={`bg-white dark:bg-slate-800 border ${selectedUserIds?.includes(user.id) ? 'border-blue-400 ring-1 ring-blue-400 dark:border-blue-500' : 'border-slate-200 dark:border-slate-700'} rounded-2xl p-5 hover:border-blue-300 hover:shadow-xl transition-all duration-300 group cursor-pointer relative`} onClick={() => onView(user)}>
                    <div className="absolute top-4 right-4 z-10" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedUserIds?.includes(user.id) || false} onChange={() => onToggleSelect(user.id)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer drop-shadow-sm" />
                    </div>
                    <div className="flex items-start justify-between mb-4 mt-2">
                        <div className="flex items-center gap-3 pr-8">
                            {/* Avatar */}
                            {user.avatar_path ? (
                                <img
                                    src={`${apiBase}${user.avatar_path}`}
                                    style={{ objectPosition: 'top' }}
                                    alt=""
                                    className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-lg"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                />
                            ) : null}
                            <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white ${user.avatar_path ? 'hidden' : 'flex'}`}>
                                {(user.last_name?.charAt(0) || '') + (user.first_name?.charAt(0) || '')}
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{user.last_name} {user.first_name}</h3>
                                <p className="text-xs font-mono text-slate-400">{user.employee_code}</p>
                            </div>
                        </div>
                        {user.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                {t('common.active')}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                                {t('common.inactive')}
                            </span>
                        )}
                    </div>

                    <div className="space-y-2 mb-4" onClick={e => e.stopPropagation()}>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100">
                            {user.role_name}
                        </span>
                        {user.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <span className="truncate">{user.email}</span>
                            </div>
                        )}
                        {user.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone className="w-4 h-4 text-slate-400" />
                                {user.phone}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1 pt-4 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                        <button onClick={() => onView(user)} className="p-2 hover:bg-blue-100 rounded-lg transition-colors" title="Vizualizează">
                            <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button onClick={() => onToggleActive(user.id, user.is_active)} className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors border border-slate-200">
                            {user.is_active ? t('users.deactivate') : t('users.activate')}
                        </button>
                        <button onClick={() => onResetPin(user.id)} className="p-2 hover:bg-violet-100 rounded-lg transition-colors" title="Resetează PIN">
                            <Key className="w-4 h-4 text-violet-600" />
                        </button>
                        <button onClick={() => onEdit(user)} className="p-2 hover:bg-blue-100 rounded-lg transition-colors" title="Editează">
                            <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button onClick={() => onDelete(user.id)} className="p-2 hover:bg-red-100 rounded-lg transition-colors" title="Șterge">
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color, onClick, active }) {
    return (
        <div 
            onClick={onClick}
            className={`bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md ${active ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-lg transform -translate-y-1' : ''} rounded-2xl p-6 hover:shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
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

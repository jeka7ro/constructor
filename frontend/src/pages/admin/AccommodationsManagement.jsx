import { useState, useEffect } from 'react'
import { BedDouble, Plus, Search, X, ChevronLeft, ChevronRight, Loader2, Edit2, Trash2, Users, MapPin, UserPlus } from 'lucide-react'
import api from '../../lib/api';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/uiStore'

export default function AccommodationsManagement() {
    const { t } = useTranslation();
    const { showToast } = useUIStore()
    const [accommodations, setAccommodations] = useState([])
    const [allUsers, setAllUsers] = useState([])
    const [allSites, setAllSites] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const [selectedIds, setSelectedIds] = useState([])

    // Detail view
    const [detailAcc, setDetailAcc] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)

    // Modals
    const [showFormModal, setShowFormModal] = useState(false)
    const [editingAcc, setEditingAcc] = useState(null)
    const [form, setForm] = useState({ name: '', address: '', capacity: '', notes: '' })
    const [saving, setSaving] = useState(false)

    const [showAssignModal, setShowAssignModal] = useState(false)
    const [selectedUserIds, setSelectedUserIds] = useState([])
    const [assignDates, setAssignDates] = useState({ assigned_from: '', assigned_until: '' })
    const [workerSearch, setWorkerSearch] = useState('')
    const [siteFilter, setSiteFilter] = useState('')
    const [assigning, setAssigning] = useState(false)

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

    useEffect(() => { fetchAll() }, [])

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [accRes, usersRes, sitesRes] = await Promise.all([
                api.get('/admin/accommodations/'),
                api.get('/admin/users/', { params: { page_size: 1000 } }),
                api.get('/admin/sites/', { params: { page_size: 1000 } })
            ])
            setAccommodations(accRes.data)
            const list = Array.isArray(usersRes.data?.users) ? usersRes.data.users : (Array.isArray(usersRes.data) ? usersRes.data : [])
            setAllUsers(list.filter(u => u.is_active !== false))
            const sitesList = Array.isArray(sitesRes.data?.sites) ? sitesRes.data.sites : (Array.isArray(sitesRes.data) ? sitesRes.data : [])
            setAllSites(sitesList)
        } catch {
            showToast(t('accommodations.load_error', 'Erreur de chargement'), 'error')
        } finally {
            setLoading(false)
        }
    }

    const openDetail = async (acc) => {
        setDetailAcc(acc)
        setDetailLoading(true)
        try {
            const res = await api.get(`/admin/accommodations/${acc.id}`)
            setDetailAcc(res.data)
        } catch { showToast(t('accommodations.details_error', 'Erreur de détails'), 'error') }
        finally { setDetailLoading(false) }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!form.name.trim()) { showToast(t('accommodations.fill_name_error', 'Veuillez remplir le nom'), 'error'); return }
        setSaving(true)
        try {
            const payload = { name: form.name, address: form.address, capacity: form.capacity ? Number(form.capacity) : null, notes: form.notes }
            if (editingAcc) {
                await api.put(`/admin/accommodations/${editingAcc.id}`, payload)
                showToast(t('accommodations.acc_updated', 'Cazare actualizată'), 'success')
            } else {
                await api.post('/admin/accommodations/', payload)
                showToast(t('accommodations.acc_added', 'Cazare adăugată'), 'success')
            }
            setShowFormModal(false)
            if (detailAcc?.id === editingAcc?.id) openDetail(detailAcc)
        } catch { showToast(t('accommodations.save_error', 'Erreur d\'enregistrement'), 'error') }
        finally { setSaving(false) }
    }

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true, title: t('accommodations.delete_title', 'Supprimerre Cazare'),
            message: t('accommodations.delete_msg', 'Sigur doriți să ștergeți această cazare? Toate repartizările vor fi pierdute.'),
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/accommodations/${id}`)
                    showToast(t('accommodations.acc_deleted', 'Hébergement supprimé'), 'success')
                    fetchAll()
                    if (detailAcc?.id === id) setDetailAcc(null)
                } catch { showToast(t('accommodations.error', 'Erreur'), 'error') }
            }
        })
    }

    const handleAssign = async (e) => {
        e.preventDefault()
        if (!selectedUserIds.length) { showToast(t('accommodations.select_worker_error', 'Sélectionnez au moins un employé'), 'error'); return }
        setAssigning(true)
        let added = 0, errors = 0
        for (const uid of selectedUserIds) {
            try {
                await api.post(`/admin/accommodations/${detailAcc.id}/assign`, {
                    user_id: uid,
                    assigned_from: assignDates.assigned_from || null,
                    assigned_until: assignDates.assigned_until || null,
                })
                added++
            } catch { errors++ }
        }
        if (added > 0) showToast(t('accommodations.assigned_success', '{{count}} employés affectés', { count: added }), 'success')
        if (errors > 0) showToast(t('accommodations.assigned_errors', '{{count}} erreurs d\'affectation (déjà logés ?)', { count: errors }), 'error')
        setShowAssignModal(false)
        setSelectedUserIds([])
        setAssignDates({ assigned_from: '', assigned_until: '' })
        setWorkerSearch('')
        if (detailAcc) openDetail(detailAcc)
        fetchAll()
        setAssigning(false)
    }

    const openAssignModal = async (acc) => {
        setAssigning(false)
        setSelectedUserIds([])
        setAssignDates({ assigned_from: '', assigned_until: '' })
        setWorkerSearch('')
        setSiteFilter('')
        if (!detailAcc || detailAcc.id !== acc.id) {
            try {
                const res = await api.get(`/admin/accommodations/${acc.id}`)
                setDetailAcc(res.data)
            } catch { setDetailAcc(acc) }
        }
        setShowAssignModal(true)
    }

    const handleRemoveAssignment = (assignmentId) => {
        setConfirmModal({
            isOpen: true, title: t('accommodations.remove_worker_title', 'Eliminare Muncitor'),
            message: t('accommodations.remove_worker_msg', 'Sigur doriți să eliminați repartizarea?'),
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/accommodations/${detailAcc.id}/assign/${assignmentId}`)
                    showToast(t('accommodations.worker_removed', 'Employé retiré'), 'success')
                    openDetail(detailAcc)
                } catch { showToast(t('accommodations.error', 'Erreur'), 'error') }
            }
        })
    }

    const toggleSelect = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
    const toggleAll = () => {
        const pageIds = paginated.map(a => a.id)
        setSelectedIds(pageIds.every(id => selectedIds.includes(id)) ? selectedIds.filter(id => !pageIds.includes(id)) : [...new Set([...selectedIds, ...pageIds])])
    }

    const openEdit = (acc, e) => {
        e.stopPropagation()
        setEditingAcc(acc)
        setForm({ name: acc.name, address: acc.address || '', capacity: acc.capacity || '', notes: acc.notes || '' })
        setShowFormModal(true)
    }

    const filtered = accommodations.filter(a =>
        a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.address?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Users not already assigned
    const unassignedUsers = detailAcc ? allUsers.filter(u => !detailAcc.assignments?.some(a => a.user_id === u.id)) : allUsers

    // ─── DETAIL VIEW ───────────────────────────────────────────────────────────
    if (detailAcc) {
        return (
            <>
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <button onClick={() => setDetailAcc(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors w-fit">
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-semibold">{t('accommodations.back_to_list', 'Retour aux hébergements')}</span>
                    </button>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <BedDouble className="w-6 h-6 text-blue-500" /> {detailAcc.name}
                                </h2>
                                {detailAcc.address && (
                                    <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5" /> {detailAcc.address}
                                    </p>
                                )}
                                <p className="text-sm text-slate-500 mt-1">
                                    <strong className="text-blue-600">{detailAcc.assignments?.length || 0}</strong>
                                    {detailAcc.capacity ? ` / ${detailAcc.capacity} ${t('accommodations.occupied_spots', 'locuri ocupate')}` : ` ${t('accommodations.workers_housed', 'muncitori cazați')}`}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingAcc(detailAcc); setForm({ name: detailAcc.name, address: detailAcc.address || '', capacity: detailAcc.capacity || '', notes: detailAcc.notes || '' }); setShowFormModal(true) }}
                                    className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-sm font-bold transition-all">
                                    <Edit2 className="w-4 h-4" /> {t('accommodations.edit_btn', 'Éditer')}
                                </button>
                                <button onClick={() => openAssignModal(detailAcc)}
                                    className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all">
                                    <UserPlus className="w-4 h-4" /> {t('accommodations.add_workers_btn', 'Ajouter Muncitori')}
                                </button>
                            </div>
                        </div>

                        {detailLoading ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">{t('accommodations.col_nr', 'Nr.')}</th>
                                            <th className="px-6 py-4">{t('accommodations.col_employee', 'Angajat')}</th>
                                            <th className="px-6 py-4">{t('accommodations.col_from', 'De la')}</th>
                                            <th className="px-6 py-4">{t('accommodations.col_to', 'Până la')}</th>
                                            <th className="px-6 py-4 text-right">{t('accommodations.col_actions', 'Acțiuni')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {!detailAcc.assignments?.length ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">{t('accommodations.no_workers_housed', 'Niciun muncitor cazat momentan.')}</td></tr>
                                        ) : detailAcc.assignments.map((a, i) => (
                                            <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-6 py-4 text-slate-500 font-medium">{i + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600">
                                                            {a.user_name?.charAt(0) || '?'}
                                                        </div>
                                                        <span className="font-bold text-slate-900 dark:text-white">{a.user_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{a.assigned_from || '—'}</td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{a.assigned_until || t('accommodations.undefined', 'Non défini')}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleRemoveAssignment(a.id)}
                                                        className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors ml-auto opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Footer total */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-slate-800/20 flex justify-end text-xs font-medium text-slate-500">
                            <span>{t('accommodations.total_label', 'Total:')} <strong className="text-slate-700 dark:text-slate-200">{detailAcc.assignments?.length || 0}</strong> {t('accommodations.workers_housed', 'muncitori cazați')}
                                {detailAcc.capacity ? ` / ${detailAcc.capacity} ${t('accommodations.spots', 'locuri')}` : ''}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Multi-select Assign Modal — detail view */}
                {showAssignModal && detailAcc && (() => {
                    const alreadyIn = detailAcc.assignments?.map(a => a.user_id) || []
                    const available = allUsers.filter(u => !alreadyIn.includes(u.id))
                    const filtered = available.filter(u => {
                        const mName = u.full_name?.toLowerCase().includes(workerSearch.toLowerCase())
                        const mSite = siteFilter ? u.site_id === siteFilter : true
                        return mName && mSite
                    })
                    const allChecked = filtered.length > 0 && filtered.every(u => selectedUserIds.includes(u.id))
                    return (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                                {/* Header */}
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <UserPlus className="w-5 h-5 text-blue-500" /> {t('accommodations.add_workers_title', 'Ajouter Muncitori')}
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-0.5">📍 {detailAcc.name} &middot; {available.length} {t('accommodations.available_workers', 'disponibili')} &middot; <span className="text-blue-500 font-bold">{selectedUserIds.length} {t('accommodations.selected', 'selectați')}</span></p>
                                    </div>
                                    <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                                </div>

                                {/* Search + Filter + Select All */}
                                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-3">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder={t('accommodations.search_employee_placeholder', 'Rechercher un employé...')}
                                                value={workerSearch}
                                                onChange={e => setWorkerSearch(e.target.value)}
                                                autoFocus
                                                className="w-full h-9 pl-10 pr-4 bg-slate-50 dark:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <select
                                            value={siteFilter}
                                            onChange={e => setSiteFilter(e.target.value)}
                                            className="h-9 px-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-blue-500 outline-none transition-all max-w-[160px] truncate"
                                        >
                                            <option value="">{t('accommodations.all_sites', 'Toate șantierele')}</option>
                                            {allSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-300 font-semibold select-none">
                                            <input
                                                type="checkbox"
                                                checked={allChecked}
                                                onChange={() => {
                                                    if (allChecked) setSelectedUserIds(p => p.filter(id => !filtered.map(u => u.id).includes(id)))
                                                    else setSelectedUserIds(p => [...new Set([...p, ...filtered.map(u => u.id)])])
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                            {t('accommodations.select_all', 'Selectează Toți')} ({filtered.length})
                                        </label>
                                        {selectedUserIds.length > 0 && (
                                            <button onClick={() => setSelectedUserIds([])} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                                                {t('accommodations.clear_selection', 'Golire selecție')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Worker list */}
                                <div className="overflow-y-auto flex-1 px-2 py-2">
                                    {filtered.length === 0 ? (
                                        <p className="text-center text-slate-400 text-sm py-8">{t('accommodations.no_available_employee', 'Nu s-a găsit niciun angajat disponibil.')}</p>
                                    ) : filtered.map(u => {
                                        const checked = selectedUserIds.includes(u.id)
                                        return (
                                            <label key={u.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${checked ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => setSelectedUserIds(p => checked ? p.filter(id => id !== u.id) : [...p, u.id])}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                                />
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                                                    {u.full_name?.charAt(0) || '?'}
                                                </div>
                                                <span className={`text-sm font-semibold ${checked ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>{u.full_name}</span>
                                            </label>
                                        )
                                    })}
                                </div>

                                {/* Dates + Submit */}
                                <form onSubmit={handleAssign} className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('accommodations.from_date', 'De la')}</label>
                                            <input type="date" value={assignDates.assigned_from} onChange={e => setAssignDates(p => ({ ...p, assigned_from: e.target.value }))}
                                                className="w-full px-3 h-9 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('accommodations.to_date', 'Până la')}</label>
                                            <input type="date" value={assignDates.assigned_until} onChange={e => setAssignDates(p => ({ ...p, assigned_until: e.target.value }))}
                                                className="w-full px-3 h-9 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                        <button type="button" onClick={() => setShowAssignModal(false)} className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">{t('accommodations.cancel', 'Anulează')}</button>
                                        <button type="submit" disabled={assigning || !selectedUserIds.length}
                                            className="flex items-center gap-2 px-5 h-10 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50">
                                            {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                            {t('accommodations.add', 'Ajouter')} {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                })()}

                <ConfirmModal state={confirmModal} onClose={() => setConfirmModal(p => ({ ...p, isOpen: false }))} />
                <FormModal show={showFormModal} editing={editingAcc} form={form} setForm={setForm} saving={saving} onSave={handleSave} onClose={() => setShowFormModal(false)} />
            </>
        )
    }

    // ─── LIST VIEW ─────────────────────────────────────────────────────────────
    return (
        <>
            <div className="p-4 md:p-8 max-w-7xl mx-auto">


                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    {/* Toolbar */}
                    <div className="p-4 sm:p-5 flex flex-col xl:flex-row flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50">
                        <div className="relative group flex items-center w-full sm:w-auto">
                            <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Search className="w-4 h-4" />
                            </div>
                            <input type="text" placeholder={t('accommodations.search')} value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                                className="w-full sm:w-72 h-10 pl-10 pr-10 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                            {searchQuery && (
                                <div className="absolute right-1.5 flex items-center gap-1 bg-blue-600 px-2 py-1 rounded-full shadow-sm">
                                    <span className="text-[10px] font-bold text-white">{filtered.length}/{accommodations.length}</span>
                                    <button onClick={() => { setSearchQuery(''); setCurrentPage(1) }} className="p-0.5 hover:bg-blue-700 rounded-full transition-colors ml-0.5">
                                        <X className="w-3 h-3 text-white/80 hover:text-white" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <button onClick={() => { setEditingAcc(null); setForm({ name: '', address: '', capacity: '', notes: '' }); setShowFormModal(true) }}
                            className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap">
                            <Plus className="w-4 h-4" /> {t('accommodations.new_acc_btn', 'Cazare Nouă')}
                        </button>
                    </div>

                    {/* Batch delete bar */}
                    {selectedIds.length > 0 && (
                        <div className="bg-rose-50 border-b border-rose-100 px-4 py-2 flex items-center justify-between dark:bg-rose-900/20 dark:border-rose-900/50">
                            <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">{selectedIds.length} {t('accommodations.selected', 'sélectionnés')}</span>
                            <button onClick={() => setConfirmModal({
                                isOpen: true, title: t('accommodations.batch_delete_title', 'Supprimerre multiplă'),
                                message: t('accommodations.batch_delete_msg', 'Ștergi {{count}} cazări?', { count: selectedIds.length }),
                                onConfirm: async () => { for (const id of selectedIds) await api.delete(`/admin/accommodations/${id}`); fetchAll() }
                            })} className="text-sm px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-medium transition-colors">{t('accommodations.delete_selected', 'Supprimer Selectatele')}</button>
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-4 w-10 text-center">
                                        <input type="checkbox" checked={paginated.length > 0 && paginated.every(a => selectedIds.includes(a.id))} onChange={toggleAll}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                    </th>
                                    <th className="px-6 py-4">{t('accommodations.col_nr', 'Nr.')}</th>
                                    <th className="px-6 py-4">{t('accommodations.col_name', 'Denumire')}</th>
                                    <th className="px-6 py-4">{t('accommodations.address', 'Adresă')}</th>
                                    <th className="px-6 py-4 text-center">{t('accommodations.col_capacity', 'Capacitate')}</th>
                                    <th className="px-6 py-4 text-center">{t('accommodations.col_occupants', 'Ocupanți')}</th>
                                    <th className="px-6 py-4 text-right">{t('accommodations.col_actions', 'Acțiuni')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={7} className="px-4 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></td></tr>
                                ) : paginated.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">{t('accommodations.no_accommodations', 'Nu există cazări. Ajouter prima cazare!')}</td></tr>
                                ) : paginated.map((acc, index) => (
                                    <tr key={acc.id} onClick={() => openDetail(acc)}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer ${selectedIds.includes(acc.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                        <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" checked={selectedIds.includes(acc.id)} onChange={() => toggleSelect(acc.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                                    <BedDouble className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-white">{acc.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                                            {acc.address ? (
                                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" />{acc.address}</span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {acc.capacity ? (
                                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                    {acc.capacity} {t('accommodations.spots', 'locuri')}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-sm border gap-1.5 ${
                                                acc.capacity && acc.occupants_count >= acc.capacity
                                                    ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-900/50'
                                                    : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50'
                                            }`}>
                                                <Users className="w-3.5 h-3.5" />
                                                {acc.occupants_count}
                                                {acc.capacity ? ` / ${acc.capacity}` : ''}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation()
                                                        await openAssignModal(acc)
                                                    }}
                                                    title={t('accommodations.add_workers_title', 'Ajouter muncitori la cazare')}
                                                    className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                </button>
                                                <button onClick={e => openEdit(acc, e)}
                                                    className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={e => { e.stopPropagation(); handleDelete(acc.id) }}
                                                    className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-2">
                            <span className="uppercase tracking-wide">{t('accommodations.show', 'Afficher')}</span>
                            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 font-semibold focus:ring-2 focus:ring-blue-500 outline-none">
                                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <span>· {t('accommodations.total_label', 'Total :')} <strong className="text-slate-700 dark:text-slate-200">{filtered.length}</strong></span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>{t('accommodations.page_of', 'Pagina {{current}} din {{total}}', { current: currentPage, total: Math.max(1, totalPages) })}</span>
                            <div className="flex gap-1">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <FormModal show={showFormModal} editing={editingAcc} form={form} setForm={setForm} saving={saving} onSave={handleSave} onClose={() => setShowFormModal(false)} />
            <ConfirmModal state={confirmModal} onClose={() => setConfirmModal(p => ({ ...p, isOpen: false }))} />

            {/* Multi-select Assign Modal — list view */}
            {showAssignModal && detailAcc && (() => {
                const alreadyIn = detailAcc.assignments?.map(a => a.user_id) || []
                const available = allUsers.filter(u => !alreadyIn.includes(u.id))
                const filteredW = available.filter(u => {
                    const mName = u.full_name?.toLowerCase().includes(workerSearch.toLowerCase())
                    const mSite = siteFilter ? u.site_id === siteFilter : true
                    return mName && mSite
                })
                const allChecked = filteredW.length > 0 && filteredW.every(u => selectedUserIds.includes(u.id))
                return (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <UserPlus className="w-5 h-5 text-blue-500" /> {t('accommodations.add_workers_title', 'Ajouter Muncitori')}
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-0.5">📍 {detailAcc.name} &middot; {available.length} {t('accommodations.available_workers', 'disponibili')} &middot; <span className="text-blue-500 font-bold">{selectedUserIds.length} {t('accommodations.selected', 'selectați')}</span></p>
                                </div>
                                <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-3">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="text" placeholder={t('accommodations.search_employee_placeholder', 'Rechercher un employé...')} value={workerSearch}
                                            onChange={e => setWorkerSearch(e.target.value)} autoFocus
                                            className="w-full h-9 pl-10 pr-4 bg-slate-50 dark:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                    </div>
                                    <select
                                        value={siteFilter}
                                        onChange={e => setSiteFilter(e.target.value)}
                                        className="h-9 px-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-blue-500 outline-none transition-all max-w-[160px] truncate"
                                    >
                                        <option value="">{t('accommodations.all_sites', 'Toate șantierele')}</option>
                                        {allSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-300 font-semibold select-none">
                                        <input type="checkbox" checked={allChecked}
                                            onChange={() => {
                                                if (allChecked) setSelectedUserIds(p => p.filter(id => !filteredW.map(u => u.id).includes(id)))
                                                else setSelectedUserIds(p => [...new Set([...p, ...filteredW.map(u => u.id)])])
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        {t('accommodations.select_all', 'Tout sélectionner')} ({filteredW.length})
                                    </label>
                                    {selectedUserIds.length > 0 && (
                                        <button onClick={() => setSelectedUserIds([])} className="text-xs text-slate-400 hover:text-red-500 transition-colors">{t('accommodations.clear_selection', 'Vider la sélection')}</button>
                                    )}
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1 px-2 py-2">
                                {filteredW.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-8">{t('accommodations.no_available_employee', 'Nu s-a găsit niciun angajat disponibil.')}</p>
                                ) : filteredW.map(u => {
                                    const checked = selectedUserIds.includes(u.id)
                                    return (
                                        <label key={u.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${checked ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                            <input type="checkbox" checked={checked}
                                                onChange={() => setSelectedUserIds(p => checked ? p.filter(id => id !== u.id) : [...p, u.id])}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0" />
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                                                {u.full_name?.charAt(0) || '?'}
                                            </div>
                                            <span className={`text-sm font-semibold ${checked ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>{u.full_name}</span>
                                        </label>
                                    )
                                })}
                            </div>
                            <form onSubmit={handleAssign} className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('accommodations.from_date', 'De la')}</label>
                                        <input type="date" value={assignDates.assigned_from} onChange={e => setAssignDates(p => ({ ...p, assigned_from: e.target.value }))}
                                            className="w-full px-3 h-9 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('accommodations.to_date', 'Până la')}</label>
                                        <input type="date" value={assignDates.assigned_until} onChange={e => setAssignDates(p => ({ ...p, assigned_until: e.target.value }))}
                                            className="w-full px-3 h-9 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button type="button" onClick={() => setShowAssignModal(false)} className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">{t('accommodations.cancel', 'Anulează')}</button>
                                    <button type="submit" disabled={assigning || !selectedUserIds.length}
                                        className="flex items-center gap-2 px-5 h-10 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50">
                                        {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                        {t('accommodations.add', 'Ajouter')} {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            })()}
        </>
    )
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function FormModal({ show, editing, form, setForm, saving, onSave, onClose }) {
    const { t } = useTranslation();
    if (!show) return null
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BedDouble className="w-5 h-5 text-slate-500" />
                        {editing ? t('accommodations.edit_acc_title', 'Modifică Cazare') : t('accommodations.new_acc_title', 'Cazare Nouă')}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={onSave} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('accommodations.col_name', 'Denumire')} *</label>
                        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                            placeholder={t('accommodations.name_placeholder', 'ex: Pensiunea Florin, Ap. 2 Str. Mihai...')} autoFocus
                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('accommodations.address')}</label>
                        <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                            placeholder={t('accommodations.address_placeholder', 'Stradă, număr, localitate...')}
                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('accommodations.capacity_label', 'Capacitate (nr. locuri)')}</label>
                        <input type="number" min="1" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))}
                            placeholder={t('accommodations.ex_capacity', 'ex: 6')}
                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('accommodations.notes_label', 'Observații')}</label>
                        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                            placeholder={t('accommodations.notes_placeholder', 'Note, informații suplimentare...')} rows={3}
                            className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none" />
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                        <button type="button" onClick={onClose} className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">{t('accommodations.cancel', 'Anulează')}</button>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 px-5 h-10 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BedDouble className="w-4 h-4" />}
                            {editing ? t('accommodations.save_btn', 'Enregistrer') : t('accommodations.add_btn', 'Ajouter')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function ConfirmModal({ state, onClose }) {
    const { t } = useTranslation();
    if (!state.isOpen) return null
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-600 dark:text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{state.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{state.message}</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={onClose} className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">{t('accommodations.cancel', 'Anulează')}</button>
                        <button onClick={() => { if (state.onConfirm) state.onConfirm(); onClose() }}
                            className="px-5 h-10 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all">{t('accommodations.yes_delete', 'Da, Supprimer')}</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

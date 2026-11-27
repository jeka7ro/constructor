import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Search, X, ChevronLeft, ChevronRight, Loader2, CheckCircle, Clock, XCircle, Send, User, MapPin } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import { useTranslation } from 'react-i18next'

const STATUSES = [
    { id: 'all',       labelKey: 'common.all', fallback: 'Toutes',       color: 'slate' },
    { id: 'active',    labelKey: 'emergencies.active_plural', fallback: 'Actives',      color: 'rose' },
    { id: 'resolved',  labelKey: 'emergencies.resolved_plural', fallback: 'Résolues',   color: 'emerald' },
]

const STATUS_CONFIG = {
    active:   { labelKey: 'emergencies.active', fallback: 'Active',    icon: AlertTriangle, cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
    resolved: { labelKey: 'emergencies.resolved', fallback: 'Résolue', icon: CheckCircle,   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
}

export default function AdminEmergencies() {
    const { t } = useTranslation()
    const { showToast } = useUIStore()
    const [emergencies, setEmergencies] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const [selectedIds, setSelectedIds] = useState([])

    const [detailReq, setDetailReq] = useState(null)
    const [responseText, setResponseText] = useState('')
    const [responseStatus, setResponseStatus] = useState('resolved')
    const [submitting, setSubmitting] = useState(false)

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

    useEffect(() => { fetchEmergencies() }, [statusFilter])

    const fetchEmergencies = async () => {
        setLoading(true)
        try {
            const params = statusFilter !== 'all' ? { status_filter: statusFilter } : {}
            const res = await api.get('/admin/emergencies/', { params })
            setEmergencies(res.data)
            setSelectedIds([])
            setCurrentPage(1)
        } catch {
            showToast(t('common.error_loading', 'Erreur de chargement'), 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleRespond = async () => {
        setSubmitting(true)
        try {
            await api.put(`/admin/emergencies/${detailReq.id}/status`, {
                admin_response: responseText.trim() ? responseText : null,
                status: responseStatus,
            })
            showToast(t('common.updated_successfully', 'Mis à jour avec succès'), 'success')
            setDetailReq(null)
            fetchEmergencies()
        } catch {
            showToast(t('common.update_error', 'Erreur de mise à jour'), 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: t('emergencies.delete_title', 'Supprimer l\'Urgence'),
            message: t('emergencies.delete_confirm', 'Êtes-vous sûr de vouloir supprimer cette urgence ?'),
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/emergencies/${id}`)
                    showToast(t('emergencies.deleted_success', 'Urgence supprimée'), 'success')
                    fetchEmergencies()
                    if (detailReq?.id === id) setDetailReq(null)
                } catch { showToast(t('common.delete_error', 'Erreur de suppression'), 'error') }
            }
        })
    }

    const toggleSelect = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
    const toggleAll = () => {
        const pageIds = paginated.map(c => c.id)
        setSelectedIds(pageIds.every(id => selectedIds.includes(id)) ? selectedIds.filter(id => !pageIds.includes(id)) : [...new Set([...selectedIds, ...pageIds])])
    }

    const filtered = emergencies.filter(c =>
        c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.site_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <>
            <div className="w-full space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                {t('nav.emergencies', 'Urgences & Incidents')}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[15px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                            </span>
                        </div>
                        <p className="text-[15.5px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                            {t('emergencies.subtitle', 'Suivi en temps réel des alertes d\'urgence signalées sur chantier')}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 flex flex-col xl:flex-row flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800">
                        <div className="relative group flex items-center w-full sm:w-auto">
                            <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                placeholder={t('common.search', 'Rechercher...')}
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                                className="w-full sm:w-72 h-10 pl-10 pr-10 bg-slate-50 dark:bg-slate-900 text-[15px] font-medium text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 rounded-full focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                        </div>

                        <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700 shrink-0 overflow-x-auto">
                            {STATUSES.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => { setStatusFilter(s.id); setCurrentPage(1) }}
                                    className={`flex items-center justify-center gap-1.5 px-4 h-9.5 rounded-full text-[15px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                                        statusFilter === s.id
                                            ? 'bg-[color:var(--tenant-bg)] text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {t(s.labelKey, s.fallback)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="bg-rose-50 border-b border-rose-100 px-6 py-2.5 flex items-center justify-between dark:bg-rose-900/20 dark:border-rose-900/50">
                            <span className="text-[15px] font-semibold text-rose-700 dark:text-rose-400">{selectedIds.length} {t('common.selected', 'sélectionné(s)')}</span>
                            <button
                                onClick={() => setConfirmModal({
                                    isOpen: true,
                                    title: t('common.bulk_delete_title', 'Suppression Multiple'),
                                    message: t('emergencies.bulk_delete_confirm', 'Supprimer {{count}} urgences ?', { count: selectedIds.length }),
                                    onConfirm: async () => {
                                        for (const id of selectedIds) await api.delete(`/admin/emergencies/${id}`)
                                        showToast(t('emergencies.bulk_deleted_success', 'Urgences supprimées'), 'success')
                                        fetchEmergencies()
                                    }
                                })}
                                className="text-[14px] px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold transition-colors"
                            >{t('common.delete_selected', 'Supprimer la Sélection')}</button>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[16px] whitespace-nowrap">
                            <thead className="bg-slate-50/90 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-700 text-[15px] font-bold">
                                <tr>
                                    <th className="px-4 py-4 w-10 text-center"><input type="checkbox" onChange={toggleAll} className="rounded" /></th>
                                    <th className="px-6 py-4">{t('emergencies.employee_site', 'Employé / Chantier')}</th>
                                    <th className="px-6 py-4">{t('common.description', 'Description')}</th>
                                    <th className="px-6 py-4">{t('emergencies.status_level', 'Statut / Niveau')}</th>
                                    <th className="px-6 py-4">{t('common.date', 'Date')}</th>
                                    <th className="px-6 py-4 text-right">{t('common.actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></td></tr>
                                ) : paginated.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">{t('emergencies.no_emergencies', 'Aucune urgence.')}</td></tr>
                                ) : paginated.map(c => {
                                    const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.active
                                    const StatusIcon = sc.icon
                                    return (
                                        <tr key={c.id}
                                            onClick={() => { setDetailReq(c); setResponseText(c.admin_response || ''); setResponseStatus(c.status === 'active' ? 'resolved' : c.status) }}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${c.severity === 'critical' && c.status === 'active' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                                        >
                                            <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{c.user_name}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/> {c.site_name}</p>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-sm text-slate-900 dark:text-white truncate">{c.description}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sc.cls}`}>
                                                        <StatusIcon className="w-3.5 h-3.5" />{t(sc.labelKey, sc.fallback)}
                                                    </span>
                                                    {c.severity === 'critical' && (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                                            {t('emergencies.critical_upper', 'CRITIQUE')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">
                                                {new Date(c.created_at).toLocaleDateString('ro-RO', { timeZone: 'Europe/Berlin' })}
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* DETAIL MODAL — Apple HIG System Sheet */}
            {detailReq && createPortal(
                <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-md z-[99999] flex items-center justify-center p-4" onClick={() => setDetailReq(null)}>
                    <div className="bg-white dark:bg-slate-900 backdrop-blur-3xl saturate-150 rounded-[24px] w-full max-w-lg shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] border-[1.5px] border-slate-300/95 dark:border-slate-600/85 ring-1 ring-slate-900/10 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className={`px-6 py-4 border-b flex items-center justify-between ${detailReq.severity === 'critical' ? 'bg-red-50/90 border-red-200/85' : 'bg-[#F2F4F8] dark:bg-slate-800/80 border-slate-200/85 dark:border-slate-800'}`}>
                            <h2 className={`text-[17px] font-black tracking-tight ${detailReq.severity === 'critical' ? 'text-red-800' : 'text-slate-900 dark:text-white'}`}>
                                {t('emergencies.details_title', 'Détails de l\'Urgence')} {detailReq.severity === 'critical' ? t('emergencies.critical_badge', '(CRITIQUE)') : ''}
                            </h2>
                            <button onClick={() => setDetailReq(null)} className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-300/80 flex items-center justify-center text-slate-500 shadow-2xs"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-[16px] border border-slate-200/80 p-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('emergencies.problem_description', 'Description du problème')}</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{detailReq.description}</p>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('emergencies.resolution', 'Résolution')}</p>
                                <select value={responseStatus} onChange={e => setResponseStatus(e.target.value)}
                                    className="w-full mb-3 px-4 h-11 border border-slate-200/90 dark:border-slate-700 rounded-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500">
                                    <option value="active">{t('emergencies.status_remain_active', 'Reste Active')}</option>
                                    <option value="resolved">{t('emergencies.status_mark_resolved', 'Marquer comme Résolue')}</option>
                                </select>

                                <textarea
                                    value={responseText}
                                    onChange={e => setResponseText(e.target.value)}
                                    placeholder={t('emergencies.resolution_details_placeholder', 'Détails sur la résolution (optionnel)...')}
                                    rows={3}
                                    className="w-full px-4 py-3 text-sm border border-slate-200/90 dark:border-slate-700 rounded-[13px] focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-900 outline-none"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-[#F2F4F8] dark:bg-slate-800/80 border-t border-slate-200/85 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setDetailReq(null)} className="h-[42px] px-5 rounded-[13px] text-[14px] font-bold bg-white border border-slate-300/90 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all active:scale-[0.98]">{t('common.cancel', 'Annuler')}</button>
                            <button onClick={handleRespond} disabled={submitting} className="flex items-center gap-2 h-[42px] px-5 rounded-[13px] text-[14px] font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-[0_8px_18px_-4px_rgba(225,29,72,0.45)] transition-all active:scale-[0.98]">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {t('common.save_changes', 'Enregistrer les Modifications')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            {confirmModal.isOpen && createPortal(
                <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
                    <div className="w-full max-w-[360px] rounded-[24px] bg-[#F2F4F8] dark:bg-slate-900 text-slate-900 dark:text-white backdrop-blur-3xl saturate-150 border-[1.5px] border-slate-300/95 dark:border-slate-600/85 ring-1 ring-slate-900/10 dark:ring-white/10 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] p-3.5 text-center overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="rounded-[16px] bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/85 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-5 flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-rose-500/15 dark:bg-rose-500/20 border border-rose-500/25 flex items-center justify-center mx-auto mb-3.5">
                                <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                            </div>
                            <h3 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white leading-snug">{confirmModal.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-[13.5px] mt-1.5 leading-relaxed">{confirmModal.message}</p>
                        </div>
                        <div className="flex gap-2.5 w-full mt-3">
                            <button type="button" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 h-10 px-4 rounded-[14px] bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/90 dark:border-slate-600/80 text-[13.5px] font-semibold transition-all cursor-pointer">{t('common.cancel', 'Annuler')}</button>
                            <button type="button" onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }) }} className="flex-1 h-10 px-4 rounded-[14px] bg-rose-600 hover:bg-rose-700 text-white text-[13.5px] font-semibold shadow-sm shadow-rose-600/20 transition-all cursor-pointer">{t('common.delete', 'Supprimer')}</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}

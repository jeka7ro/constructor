import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import { useTranslation } from 'react-i18next'
import {
    Bell, Loader2, RefreshCw, Filter, Calendar, Clock, User,
    LogIn, LogOut, Coffee, RotateCcw, ChevronLeft, ChevronRight,
    Building2, Search
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const getEventStyles = (t) => ({
    check_in: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: t('notifications.check_in', 'Entrée'), Icon: LogIn },
    check_out: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: t('notifications.check_out', 'Sortie'), Icon: LogOut },
    break_start: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: t('notifications.break_start', 'Pause'), Icon: Coffee },
    break_end: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: t('notifications.break_end', 'Retour'), Icon: RotateCcw },
})

function AvatarImg({ path, name, size = 'w-8 h-8', textSize = 'text-xs' }) {
    if (path) {
        return (
            <div className={`shrink-0 group flex items-center justify-center`}>
                <img 
                    src={path.startsWith('http') ? path : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${path}`} 
                    alt="" 
                    className={`${size} rounded-lg object-cover object-[center_20%] ring-1 ring-slate-200 shrink-0`} 
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }} 
                />
                <div className={`${size} rounded-lg bg-slate-100 flex items-center justify-center font-bold ${textSize} text-slate-500 shrink-0 hidden`}>
                    {name?.substring(0, 2).toUpperCase() || 'W'}
                </div>
            </div>
        )
    }
    return (
        <div className={`${size} rounded-lg bg-slate-100 flex items-center justify-center font-bold ${textSize} text-slate-500 shrink-0`}>
            {name?.substring(0, 2).toUpperCase() || 'W'}
        </div>
    )
}

export default function NotificationsPage() {
    const { t } = useTranslation()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [typeFilter, setTypeFilter] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    const eventStyles = getEventStyles(t)

    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true)
            const res = await api.get('/admin/notifications/feed')
            setEvents(res.data.events || [])
            setTotal(res.data.total || 0)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchEvents() }, [fetchEvents])

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const t = setInterval(fetchEvents, 30000)
        return () => clearInterval(t)
    }, [fetchEvents])

    const formatTime = (t) => {
        try {
            return new Date(t).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Berlin',  hour: '2-digit', minute: '2-digit', second: '2-digit' })
        } catch { return '' }
    }

    const formatDate = (t) => {
        try {
            return new Date(t).toLocaleDateString('fr-FR', { timeZone: 'Europe/Berlin',  day: 'numeric', month: 'long', year: 'numeric' })
        } catch { return '' }
    }

    // Filter events
    const filtered = events.filter(evt => {
        if (typeFilter && evt.type !== typeFilter) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            if (!evt.message.toLowerCase().includes(q) && !evt.detail.toLowerCase().includes(q) && !(evt.worker_name || '').toLowerCase().includes(q)) return false
        }
        return true
    })

    // Group events by date
    const today = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Berlin',  day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <div className="w-full space-y-5">
            <div className="w-full space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                {t('nav.notifications', 'Notifications')}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[15px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                            </span>
                            <span className="text-[15px] font-bold text-slate-500 tabular-nums">({total} {t('notifications.events', 'événements')})</span>
                        </div>
                        <p className="text-[15.5px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                            {t('notifications.subtitle', 'Flux des événements et pointages en temps réel')}
                        </p>
                    </div>
                    <button
                        onClick={fetchEvents}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 h-10 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-full text-[15px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('common.refresh', 'Actualiser')}
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-900 rounded-[22px] border border-slate-200/90 dark:border-slate-800 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.05)] p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('notifications.search', 'Rechercher par nom, chantier...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-12 py-2 border border-slate-200 rounded-full text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                            />
                            {searchQuery && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-full min-w-[20px] px-1 h-5 shadow-sm">
                                    {filtered.length}
                                </div>
                            )}
                        </div>
                        {/* Type filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="border border-slate-200 rounded-full px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                            >
                                <option value="">{t('notifications.all_events', 'Tous les événements')}</option>
                                <option value="check_in">🟢 {t('notifications.check_ins', 'Entrées')}</option>
                                <option value="check_out">{t('notifications.check_outs', 'Sorties')}</option>
                                <option value="break_start">{t('notifications.breaks', 'Pauses')}</option>
                                <option value="break_end">{t('notifications.returns', 'Retours')}</option>
                            </select>
                        </div>
                        {/* Today date badge */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-full">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">{today}</span>
                        </div>
                    </div>
                </div>

                {/* Events */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-semibold text-slate-600">{t('notifications.no_events', 'Aucun événement')}</p>
                        <p className="text-sm text-slate-400 mt-1">{searchQuery || typeFilter ? t('notifications.try_other_filters', 'Essayez d\'autres filtres') : t('notifications.today_events_here', 'Les événements d\'aujourd\'hui apparaîtront ici')}</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('common.type', 'Type')}</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('common.worker', 'Ouvrier')}</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('common.event', 'Événement')}</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('common.site_details', 'Chantier / Détails')}</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('common.date', 'Date')}</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('common.time', 'Heure')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((evt, i) => {
                                    const style = eventStyles[evt.type] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', label: evt.type, Icon: Bell }
                                    const { Icon } = style
                                    return (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            {/* Type badge */}
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text} ${style.border} border`}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {style.label}
                                                </span>
                                            </td>
                                            {/* Worker */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <AvatarImg path={evt.avatar_path} name={evt.worker_name} size="w-8 h-8" />
                                                    <span className="text-sm font-semibold text-slate-800">{evt.worker_name}</span>
                                                </div>
                                            </td>
                                            {/* Message */}
                                            <td className="px-5 py-3.5">
                                                <p className="text-sm text-slate-700">{evt.message}</p>
                                            </td>
                                            {/* Site / detail */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>{evt.detail}</span>
                                                </div>
                                            </td>
                                            {/* Date */}
                                            <td className="px-5 py-3.5">
                                                <span className="text-sm text-slate-500">{formatDate(evt.time)}</span>
                                            </td>
                                            {/* Time */}
                                            <td className="px-5 py-3.5">
                                                <span className="text-sm tabular-nums font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                                    {formatTime(evt.time)}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {/* Footer */}
                        <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                            <span>{t('notifications.showing_events', '{{count}} sur {{total}} événements affichés', { count: filtered.length, total })}</span>
                            <span className="flex items-center gap-1.5">
                                <RefreshCw className="w-3 h-3" /> {t('notifications.auto_refresh', 'Mise à jour auto à 30s')}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

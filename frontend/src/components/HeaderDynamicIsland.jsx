import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    Truck,
    MessageSquare,
    ClipboardList,
    CalendarDays,
    ChevronRight,
    Sparkles,
    X,
} from 'lucide-react'
import api from '../lib/api'

function extractCityShort(address) {
    if (!address) return ''
    const parts = address.split(',').map(p => p.trim()).filter(Boolean)
    const isStreetLike = (s) => /\b(strada|str\.|rue|street|laan|steenweg|chauss[eé]e|avenue|av\.|bd\.|boulevard|weg|straat|platz|place)\b/i.test(s)
    const zipPart = parts.find(p => /\b\d{4,6}\b/.test(p) && !isStreetLike(p))
    if (zipPart) {
        return zipPart.replace(/\d+/g, '').replace(/\s+/g, ' ').trim() || zipPart
    }
    const cleanCityPart = parts.find(
        p => !/\d/.test(p) && !isStreetLike(p) && !/^(belgique|belgie|belgië|belgium|belgia|romania|românia|moldova)$/i.test(p)
    )
    if (cleanCityPart) return cleanCityPart
    const nonStreet = parts.find(p => !isStreetLike(p))
    const chosen = nonStreet || parts[parts.length - 1] || ''
    return chosen.replace(/\d+/g, '').replace(/\s+/g, ' ').trim() || chosen
}

export default function HeaderDynamicIsland() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)
    // isPeeking = true when the island temporarily expands horizontally to show text, then shrinks back to icons-only
    const [isPeeking, setIsPeeking] = useState(false)
    // Keep displayedAlert data in state while isAlertVisible controls the emergence / return-to-island animation
    const [displayedAlert, setDisplayedAlert] = useState(null)
    const [isAlertVisible, setIsAlertVisible] = useState(false)
    const islandRef = useRef(null)
    const alertTimeoutRef = useRef(null)
    const peekTimeoutRef = useRef(null)
    const isInitialFetchRef = useRef(true)
    const prevCountsRef = useRef({ unreadMsgs: 0, pendingTotal: 0, movingTrucks: 0 })

    const [summary, setSummary] = useState({
        activeTrucks: 0,
        movingTrucks: 0,
        totalKmToday: 0,
        todayJobsCount: 0,
        todayTotalM2: 0,
        pendingQuotesTotal: 0,
        recentPendingQuotes: [],
        unreadMessagesCount: 0,
        unreadMessages: [],
    })

    const triggerPeek = useCallback((durationMs = 5000) => {
        setIsPeeking(true)
        if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current)
        peekTimeoutRef.current = setTimeout(() => {
            setIsPeeking(false)
        }, durationMs)
    }, [])

    const triggerLiveAlert = useCallback((alertObj) => {
        setDisplayedAlert(alertObj)
        // Ensure next frame triggers the spring emergence from inside the island
        requestAnimationFrame(() => {
            setIsAlertVisible(true)
        })
        if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current)
        alertTimeoutRef.current = setTimeout(() => {
            setIsAlertVisible(false)
        }, 5500)
    }, [])

    const fetchIslandData = useCallback(async () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
        const todayStr = new Date().toISOString().split('T')[0]

        try {
            const [resVeh, resMsgs, resPending, resToday] = await Promise.all([
                api.get('/admin/vehicles/live').catch(() => ({ data: [] })),
                api.get('/admin/chat-notifications/unread').catch(() => ({ data: { unread_count: 0, messages: [] } })),
                api.get('/admin/work-orders?status=draft,pending,confirmed&is_quote=true&slim=true').catch(() => ({ data: [] })),
                api.get(`/admin/work-orders?start_date=${todayStr}&end_date=${todayStr}&slim=true`).catch(() => ({ data: { items: [] } })),
            ])

            const vehicles = Array.isArray(resVeh.data) ? resVeh.data : []
            const activeTrucks = vehicles.length
            const movingTrucks = vehicles.filter(v => Number(v.speed || 0) > 2).length
            const totalKmToday = Math.round(vehicles.reduce((s, v) => s + (Number(v.distance_today) || 0), 0))

            const unreadMessagesCount = Number(resMsgs.data?.unread_count || 0)
            const rawMsgs = Array.isArray(resMsgs.data?.messages) ? resMsgs.data.messages : []
            const groupedMap = {}
            rawMsgs.forEach(m => {
                if (!groupedMap[m.work_order_id]) {
                    groupedMap[m.work_order_id] = { ...m, count: 1 }
                } else {
                    groupedMap[m.work_order_id].count += 1
                    if (new Date(m.created_at) > new Date(groupedMap[m.work_order_id].created_at)) {
                        groupedMap[m.work_order_id] = { ...m, count: groupedMap[m.work_order_id].count }
                    }
                }
            })
            const unreadMessages = Object.values(groupedMap)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 4)

            const rawPending = Array.isArray(resPending.data?.items)
                ? resPending.data.items
                : (Array.isArray(resPending.data) ? resPending.data : [])
            let starredIds = []
            try {
                starredIds = JSON.parse(localStorage.getItem('starred_quotes') || '[]')
            } catch (_) {}
            const pendingItems = rawPending
                .filter(q => q.status !== 'cancelled' && q.status !== 'planning' && !q.start_date)
                .sort((a, b) => (starredIds.includes(b.id) ? 1 : 0) - (starredIds.includes(a.id) ? 1 : 0))
            const pendingQuotesTotal = pendingItems.length
            const recentPendingQuotes = pendingItems.slice(0, 4)

            const todayRaw = Array.isArray(resToday.data?.items)
                ? resToday.data.items
                : (Array.isArray(resToday.data) ? resToday.data : [])
            const todayActiveJobs = todayRaw.filter(w => {
                const dStr = (w.start_date || w.deadline_date || '').split('T')[0]
                return dStr === todayStr && !['cancelled', 'pending'].includes(w.status)
            })
            const todayJobsCount = todayActiveJobs.length
            const todayTotalM2 = Math.round(
                todayActiveJobs.reduce((acc, w) => {
                    const vols = Array.isArray(w.volumes) ? w.volumes : []
                    const surf = vols.reduce((s, v) => s + (parseFloat(v.quantity) || 0), 0) || parseFloat(w.surface_area || w.surface || 0) || 0
                    return acc + surf
                }, 0)
            )

            // Expand automatically ONLY when a new message or new pending quote arrives
            if (!isInitialFetchRef.current) {
                if (unreadMessagesCount > prevCountsRef.current.unreadMsgs && unreadMessages[0]) {
                    const newestMsg = unreadMessages[0]
                    triggerPeek(5000)
                    triggerLiveAlert({
                        type: 'message',
                        title: newestMsg.sender_name || newestMsg.work_order_title || 'Client',
                        subtitle: newestMsg.message || t('dynamic_island.new_message_alert', 'Nouveau message client'),
                        link: `/admin/chats?wo_id=${newestMsg.work_order_id}`,
                    })
                } else if (pendingQuotesTotal > prevCountsRef.current.pendingTotal && recentPendingQuotes[0]) {
                    const newestQuote = recentPendingQuotes[0]
                    const qSurf = newestQuote.volumes?.[0]?.quantity ? `${newestQuote.volumes[0].quantity}m²` : ''
                    const qCity = extractCityShort(newestQuote.site_address)
                    triggerPeek(5000)
                    triggerLiveAlert({
                        type: 'quote',
                        title: newestQuote.client_name || newestQuote.title || t('dynamic_island.new_quote_title', 'Nouveau devis'),
                        subtitle: [qSurf, qCity].filter(Boolean).join(' · ') || t('dynamic_island.new_quote_subtitle', 'Nouveau devis en attente'),
                        link: `/admin/work-orders/${newestQuote.id}`,
                    })
                }
            }

            prevCountsRef.current = {
                unreadMsgs: unreadMessagesCount,
                pendingTotal: pendingQuotesTotal,
                movingTrucks,
            }
            isInitialFetchRef.current = false

            setSummary({
                activeTrucks,
                movingTrucks,
                totalKmToday,
                todayJobsCount,
                todayTotalM2,
                pendingQuotesTotal,
                recentPendingQuotes,
                unreadMessagesCount,
                unreadMessages,
            })
        } catch (_) {}
    }, [t, triggerLiveAlert, triggerPeek])

    useEffect(() => {
        void fetchIslandData()
        const timer = setInterval(() => {
            if (typeof document === 'undefined' || document.visibilityState === 'visible') {
                void fetchIslandData()
            }
        }, 20000)

        const handleRefresh = () => { void fetchIslandData() }
        window.addEventListener('refresh-notifications', handleRefresh)
        window.addEventListener('focus', handleRefresh)

        return () => {
            clearInterval(timer)
            if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current)
            if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current)
            window.removeEventListener('refresh-notifications', handleRefresh)
            window.removeEventListener('focus', handleRefresh)
        }
    }, [fetchIslandData])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (islandRef.current && !islandRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMarkAllMessagesRead = async (e) => {
        e.stopPropagation()
        try {
            await api.post('/admin/work-orders/chat-notifications/mark-read')
            void fetchIslandData()
            window.dispatchEvent(new Event('refresh-notifications'))
        } catch (_) {}
    }

    const showExpandedText = isPeeking || isOpen

    // Smooth CSS Grid 0fr -> 1fr interpolation (interpolates exact natural width with zero dead time or sliced letters)
    const morphItemStyle = {
        display: 'grid',
        gridTemplateColumns: showExpandedText ? '1fr' : '0fr',
        opacity: showExpandedText ? 1 : 0,
        marginLeft: showExpandedText ? '6px' : '0px',
        filter: showExpandedText ? 'blur(0px)' : 'blur(2px)',
        transform: showExpandedText ? 'translateX(0) scale(1)' : 'translateX(-4px) scale(0.94)',
        transition: showExpandedText
            ? 'grid-template-columns 680ms cubic-bezier(0.22, 1, 0.36, 1), opacity 420ms ease-out 70ms, margin-left 680ms cubic-bezier(0.22, 1, 0.36, 1), filter 420ms ease-out, transform 680ms cubic-bezier(0.22, 1, 0.36, 1)'
            : 'grid-template-columns 640ms cubic-bezier(0.32, 0.72, 0, 1), opacity 220ms ease-in, margin-left 640ms cubic-bezier(0.32, 0.72, 0, 1), filter 250ms ease-in, transform 640ms cubic-bezier(0.32, 0.72, 0, 1)',
    }

    const morphDividerStyle = {
        width: showExpandedText ? '1px' : '0px',
        opacity: showExpandedText ? 1 : 0,
        marginLeft: showExpandedText ? '10px' : '5px',
        marginRight: showExpandedText ? '10px' : '5px',
        transition: 'all 650ms cubic-bezier(0.22, 1, 0.36, 1)',
    }

    return (
        <div ref={islandRef} className="relative flex items-center justify-center z-50 select-none">
            {/* State 1: Compact Apple Dynamic Island Capsule in the center of the Header Bar (Pulses gently when releasing or absorbing a notification below it) */}
            <button
                type="button"
                onClick={() => {
                    if (isAlertVisible) setIsAlertVisible(false)
                    setIsOpen(o => !o)
                }}
                title={t('dynamic_island.tooltip', 'Dynamic Island — Activité en direct, Messages & Devis')}
                style={{
                    transition: 'all 680ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className={`relative z-20 rounded-full backdrop-blur-2xl border flex items-center justify-center cursor-pointer overflow-hidden ${
                    isAlertVisible
                        ? 'h-8 px-4 scale-[1.06] bg-white/28 dark:bg-slate-900/90 border-emerald-300/80 dark:border-emerald-400/60 text-white shadow-[0_0_24px_rgba(16,185,129,0.42),inset_0_1px_0_rgba(255,255,255,0.6)]'
                        : isOpen
                            ? 'h-8 px-4 scale-[1.04] bg-white/26 dark:bg-slate-900/90 border-white/55 dark:border-sky-400/40 text-white shadow-[0_10px_28px_-6px_rgba(8,47,73,0.45),inset_0_1px_0_rgba(255,255,255,0.55)]'
                            : 'h-8 px-3.5 scale-100 bg-white/16 hover:bg-white/24 dark:bg-slate-900/75 border-white/30 hover:border-white/45 dark:border-white/15 text-white shadow-[0_6px_18px_-4px_rgba(8,47,73,0.25),inset_0_1px_0_rgba(255,255,255,0.38)]'
                }`}
            >
                <div className="min-w-0 overflow-hidden flex items-center">
                    {/* 1. Trucks Icon */}
                    <div className="flex items-center shrink-0">
                        <span className="relative flex items-center justify-center">
                            <Truck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        </span>
                    </div>

                    <div className="w-0 mx-1.5 h-3.5 bg-white/25 shrink-0 opacity-0" />

                    {/* 2. Today's Calendar Icon */}
                    <div className="flex items-center shrink-0">
                        <CalendarDays className="w-3.5 h-3.5 text-sky-200 shrink-0" />
                    </div>

                    <div className="w-0 mx-1.5 h-3.5 bg-white/25 shrink-0 opacity-0" />

                    {/* 3. Pending Quotes Icon */}
                    <div className="flex items-center shrink-0">
                        <span className="relative flex items-center justify-center">
                            <ClipboardList className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            {summary.pendingQuotesTotal > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-300" />
                            )}
                        </span>
                    </div>

                    <div className="w-0 mx-1.5 h-3.5 bg-white/25 shrink-0 opacity-0" />

                    {/* 4. Client Messages Icon */}
                    <div className="flex items-center shrink-0">
                        <span className="relative flex items-center justify-center">
                            <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${(summary.unreadMessagesCount > 0 || isAlertVisible) ? 'text-emerald-300' : 'text-white/75'}`} />
                            {(summary.unreadMessagesCount > 0 || isAlertVisible) && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                            )}
                        </span>
                    </div>
                </div>
            </button>

            {/* State 2: Incoming Notification Bubble — Literally emerges DOWN from inside the Dynamic Island capsule above, floats just below it, and gets sucked BACK UP inside the capsule! */}
            <div
                aria-hidden={!isAlertVisible}
                onClick={() => {
                    const target = displayedAlert?.link
                    setIsAlertVisible(false)
                    if (target) navigate(target)
                }}
                style={{
                    transformOrigin: '50% -18px',
                    transition: isAlertVisible
                        ? 'transform 780ms cubic-bezier(0.16, 1, 0.3, 1), opacity 480ms cubic-bezier(0.16, 1, 0.3, 1), filter 520ms cubic-bezier(0.16, 1, 0.3, 1)'
                        : 'transform 680ms cubic-bezier(0.32, 0.72, 0, 1), opacity 460ms cubic-bezier(0.32, 0.72, 0, 1) 80ms, filter 480ms ease-in',
                    transform: isAlertVisible
                        ? 'translate3d(-50%, 6px, 0) scaleX(1) scaleY(1)'
                        : 'translate3d(-50%, -34px, 0) scaleX(0.26) scaleY(0.38)',
                }}
                className={`absolute top-full left-1/2 z-[9998] w-[390px] max-w-[92vw] rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-white backdrop-blur-2xl border border-emerald-400/70 dark:border-emerald-400/50 shadow-[0_20px_48px_-10px_rgba(15,23,42,0.32),0_0_0_1px_rgba(255,255,255,0.7)_inset] dark:shadow-[0_22px_50px_-10px_rgba(0,0,0,0.85),0_0_24px_-4px_rgba(16,185,129,0.35)] px-3.5 py-2.5 cursor-pointer ${
                    isAlertVisible
                        ? 'opacity-100 blur-0 pointer-events-auto'
                        : 'opacity-0 blur-[5px] pointer-events-none'
                }`}
            >
                {/* Small top connector notch pointing up to the Dynamic Island pill */}
                <div className="w-7 h-1 rounded-full bg-emerald-400/60 dark:bg-emerald-400/50 mx-auto -mt-1 mb-1.5" />
                <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center shrink-0">
                        {displayedAlert?.type === 'quote' ? (
                            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        ) : (
                            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                {displayedAlert?.type === 'quote'
                                    ? t('dynamic_island.new_quote_title', 'Nouveau devis')
                                    : t('dynamic_island.new_message_alert', 'Nouveau message client')}
                            </span>
                        </div>
                        <div className="text-xs font-black text-slate-900 dark:text-white truncate mt-0.5">
                            {displayedAlert?.title}
                        </div>
                        <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                            {displayedAlert?.subtitle}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsAlertVisible(false)
                        }}
                        className="w-6 h-6 rounded-full hover:bg-slate-200/70 dark:hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* State 3: Full Expanded Dynamic Island Live Activity Sheet — Strictly compliant with Apple HIG (liquid-glass.md, live-activities.md, lists-and-tables.md) */}
            <div
                aria-hidden={!isOpen}
                style={{
                    transformOrigin: '50% -18px',
                    transition: isOpen
                        ? 'transform 720ms cubic-bezier(0.16, 1, 0.3, 1), opacity 440ms cubic-bezier(0.16, 1, 0.3, 1), filter 440ms cubic-bezier(0.16, 1, 0.3, 1)'
                        : 'transform 600ms cubic-bezier(0.32, 0.72, 0, 1), opacity 400ms cubic-bezier(0.32, 0.72, 0, 1) 60ms, filter 400ms ease-in',
                    transform: isOpen
                        ? 'translate3d(-50%, 6px, 0) scaleX(1) scaleY(1)'
                        : 'translate3d(-50%, -34px, 0) scaleX(0.24) scaleY(0.22)',
                }}
                className={`absolute top-full left-1/2 w-[420px] max-w-[94vw] rounded-[24px] bg-white/92 dark:bg-slate-900/92 text-slate-900 dark:text-white backdrop-blur-3xl saturate-150 border border-white/80 dark:border-white/15 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.22),0_0_0_0.5px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.16)] p-3.5 z-[9999] ${
                    isOpen
                        ? 'opacity-100 blur-0 pointer-events-auto'
                        : 'opacity-0 blur-[5px] pointer-events-none'
                }`}
            >
                {/* 1. Unified Apple Inset Grouped Summary Strip (Single neutral surface with hairline vertical dividers — no rainbow boxes, no 2-line wrapped titles) */}
                <div className="grid grid-cols-3 divide-x divide-slate-200/75 dark:divide-white/10 rounded-[14px] bg-slate-100/80 dark:bg-white/[0.06] border border-slate-200/50 dark:border-white/[0.06] mb-3.5 overflow-hidden">
                    <div
                        onClick={() => { setIsOpen(false); navigate('/admin/planning') }}
                        className="px-3 py-2.5 hover:bg-white/70 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                    >
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {t('dynamic_island.today', "Aujourd'hui")}
                        </div>
                        <div className="mt-0.5 text-[17px] font-bold tracking-tight text-slate-900 dark:text-white tabular-nums leading-tight">
                            {summary.todayJobsCount} <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">{t('dynamic_island.jobs_short', 'chantiers')}</span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums truncate">
                            {summary.todayTotalM2} m² {t('dynamic_island.planned_short', 'planifiés')}
                        </div>
                    </div>

                    <div
                        onClick={() => { setIsOpen(false); navigate('/admin/tracking') }}
                        className="px-3 py-2.5 hover:bg-white/70 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                    >
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">{t('dynamic_island.fleet_gps', 'Flotte GPS')}</span>
                        </div>
                        <div className="mt-0.5 text-[17px] font-bold tracking-tight text-slate-900 dark:text-white tabular-nums leading-tight">
                            {summary.activeTrucks} <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">{t('dynamic_island.active_plural', 'actifs')}</span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums truncate">
                            {summary.totalKmToday} km · {summary.movingTrucks} {t('dynamic_island.moving_short', 'en route')}
                        </div>
                    </div>

                    <div
                        onClick={() => { setIsOpen(false); navigate('/admin/quotes') }}
                        className="px-3 py-2.5 hover:bg-white/70 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                    >
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {t('dynamic_island.pending', 'En attente')}
                        </div>
                        <div className="mt-0.5 text-[17px] font-bold tracking-tight text-slate-900 dark:text-white tabular-nums leading-tight">
                            {summary.pendingQuotesTotal} <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">{t('dynamic_island.quotes_short', 'devis')}</span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
                            {t('dynamic_island.quotes_title', 'Nouveaux devis')}
                        </div>
                    </div>
                </div>

                {/* 2. Unread Client Messages — Apple Inset Grouped Section */}
                <div className="mb-3.5">
                    <div className="flex items-center justify-between px-1.5 mb-1.5">
                        <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                            {t('dynamic_island.messages_clients', 'Messages clients')}
                            {summary.unreadMessagesCount > 0 ? ` (${summary.unreadMessagesCount})` : ''}
                        </span>
                        {summary.unreadMessagesCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllMessagesRead}
                                className="text-[12px] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer"
                            >
                                {t('dynamic_island.mark_all_read', 'Tout marquer lu')}
                            </button>
                        )}
                    </div>
                    <div className="rounded-[14px] bg-slate-100/80 dark:bg-white/[0.06] border border-slate-200/50 dark:border-white/[0.06] divide-y divide-slate-200/70 dark:divide-white/[0.07] overflow-hidden">
                        {summary.unreadMessages.length === 0 ? (
                            <div
                                onClick={() => { setIsOpen(false); navigate('/admin/chats') }}
                                className="px-3.5 py-2.5 text-[12.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between hover:bg-white/70 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                            >
                                <span>{t('dynamic_island.no_unread_messages', 'Aucun message non lu')}</span>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                        ) : (
                            summary.unreadMessages.map(msg => (
                                <div
                                    key={msg.id || msg.work_order_id}
                                    onClick={() => {
                                        setIsOpen(false)
                                        navigate(`/admin/chats?wo_id=${msg.work_order_id}`)
                                    }}
                                    className="px-3.5 py-2.5 hover:bg-white/80 dark:hover:bg-white/[0.08] cursor-pointer transition-colors flex items-center justify-between gap-2.5"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                                            <span className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                                                {msg.work_order_title || msg.sender_name || 'Client'}
                                            </span>
                                            {msg.count > 1 && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[10.5px] font-semibold tabular-nums leading-none">
                                                    {msg.count}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate mt-0.5 pl-4">
                                            {msg.message}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400/80 shrink-0" />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 3. Latest Pending Quotes — True Apple iOS/macOS Inset Grouped List (single rounded container with hairline dividers & trailing disclosure chevrons) */}
                <div>
                    <div className="flex items-center justify-between px-1.5 mb-1.5">
                        <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                            {t('dynamic_island.latest_pending_quotes', 'Derniers devis en attente')}
                        </span>
                        <button
                            type="button"
                            onClick={() => { setIsOpen(false); navigate('/admin/quotes') }}
                            className="text-[12px] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer"
                        >
                            {t('dynamic_island.view_all', 'Voir tout')} ({summary.pendingQuotesTotal})
                        </button>
                    </div>
                    <div className="rounded-[14px] bg-slate-100/80 dark:bg-white/[0.06] border border-slate-200/50 dark:border-white/[0.06] divide-y divide-slate-200/70 dark:divide-white/[0.07] overflow-hidden">
                        {summary.recentPendingQuotes.map(q => {
                            const city = extractCityShort(q.site_address)
                            const vol = q.volumes?.[0] || {}
                            const isOnline = q.source_system === 'devis_online'
                            const isWeR = q.source_system === 'calculator_public' || q.source_system === 'we-r'
                            return (
                                <div
                                    key={q.id}
                                    onClick={() => {
                                        setIsOpen(false)
                                        navigate(`/admin/work-orders/${q.id}`)
                                    }}
                                    className="px-3.5 py-2.5 hover:bg-white/80 dark:hover:bg-white/[0.08] cursor-pointer transition-colors flex items-center justify-between gap-2.5"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <span
                                            className={`w-2 h-2 rounded-full shrink-0 ${
                                                isWeR ? 'bg-amber-500' : isOnline ? 'bg-sky-500' : 'bg-slate-400'
                                            }`}
                                        />
                                        <span className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                                            {q.client_name || q.title || 'Client'}
                                        </span>
                                        {city && (
                                            <span className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                                                · {city}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                                        {vol.quantity && (
                                            <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                                                {vol.quantity} m²{vol.thickness ? ` · ${vol.thickness} cm` : ''}
                                            </span>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-slate-400/80" />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

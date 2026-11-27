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
    Bell,
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

const PUBLIC_HOLIDAYS_BE = [
    { date: '2025-12-25', name: 'Noël' },
    { date: '2026-01-01', name: 'Nieuwjaar' },
    { date: '2026-04-06', name: 'Paasmaandag' },
    { date: '2026-05-01', name: 'Fête du Travail' },
    { date: '2026-05-14', name: 'Ascension' },
    { date: '2026-05-25', name: 'Lundi de Pentecôte' },
    { date: '2026-07-21', name: 'Fête Nationale' },
    { date: '2026-08-15', name: "L'Assomption" },
    { date: '2026-11-01', name: 'Toussaint' },
    { date: '2026-11-11', name: 'Armistice' },
    { date: '2026-12-25', name: 'Noël' },
    { date: '2027-01-01', name: 'Nieuwjaar' },
    { date: '2027-03-29', name: 'Paasmaandag' },
    { date: '2027-05-01', name: 'Fête du Travail' },
    { date: '2027-05-06', name: 'Ascension' },
    { date: '2027-05-17', name: 'Lundi de Pentecôte' },
    { date: '2027-07-21', name: 'Fête Nationale' },
    { date: '2027-08-15', name: "L'Assomption" },
    { date: '2027-11-01', name: 'Toussaint' },
    { date: '2027-11-11', name: 'Armistice' },
    { date: '2027-12-25', name: 'Noël' },
]

function getUpcomingHolidays(count = 2) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const upcoming = []
    for (const h of PUBLIC_HOLIDAYS_BE) {
        const hDate = new Date(h.date)
        if (hDate >= today) {
            upcoming.push(h)
            if (upcoming.length >= count) break
        }
    }
    return upcoming
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
    // isAbsorbing = true briefly when a notification bubble or popover retracts back into the capsule (Apple cushion bounce)
    const [isAbsorbing, setIsAbsorbing] = useState(false)
    const islandRef = useRef(null)
    const alertTimeoutRef = useRef(null)
    const peekTimeoutRef = useRef(null)
    const absorbDelayRef = useRef(null)
    const absorbTimeoutRef = useRef(null)
    const isInitialFetchRef = useRef(true)
    const prevCountsRef = useRef({ unreadMsgs: 0, lastMsgId: null, pendingTotal: 0, lastQuoteId: null, movingTrucks: 0 })

    const triggerAbsorbPulse = useCallback(() => {
        if (absorbDelayRef.current) clearTimeout(absorbDelayRef.current)
        if (absorbTimeoutRef.current) clearTimeout(absorbTimeoutRef.current)
        // Trigger the capsule cushion pulse right as the retracting card reaches the capsule (~130ms into retraction)
        absorbDelayRef.current = setTimeout(() => {
            setIsAbsorbing(true)
            absorbTimeoutRef.current = setTimeout(() => {
                setIsAbsorbing(false)
            }, 240)
        }, 120)
    }, [])

    const closeAlert = useCallback(() => {
        setIsAlertVisible(prev => {
            if (prev) triggerAbsorbPulse()
            return false
        })
    }, [triggerAbsorbPulse])

    const closePopover = useCallback(() => {
        setIsOpen(prev => {
            if (prev) triggerAbsorbPulse()
            return false
        })
    }, [triggerAbsorbPulse])

    const [summary, setSummary] = useState({
        activeTrucks: 0,
        movingTrucks: 0,
        totalKmToday: 0,
        todayEstimatedKm: 0,
        todayJobsCount: 0,
        todayTotalM2: 0,
        todaySandTons: 0,
        pendingQuotesTotal: 0,
        recentPendingQuotes: [],
        latestQuote: null,
        latestQuoteSqm: 0,
        unreadMessagesCount: 0,
        unreadMessages: [],
    })
    const [tickerIndex, setTickerIndex] = useState(0)

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
            closeAlert()
        }, 5500)
    }, [closeAlert])

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
            } catch (_) { }
            const pendingItems = rawPending
                .filter(q => q.status !== 'cancelled' && q.status !== 'planning' && !q.start_date)
                .sort((a, b) => (starredIds.includes(b.id) ? 1 : 0) - (starredIds.includes(a.id) ? 1 : 0))
            const pendingQuotesTotal = pendingItems.length
            const recentPendingQuotes = pendingItems.slice(0, 4)
            const sortedByNewestQuote = [...rawPending]
                .filter(q => q.status !== 'cancelled')
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
            const latestQuote = sortedByNewestQuote[0] || recentPendingQuotes[0] || null
            const latestQuoteSqm = latestQuote
                ? Math.round(
                    (Array.isArray(latestQuote.volumes) ? latestQuote.volumes : []).reduce(
                        (s, v) => s + (parseFloat(v.quantity) || 0),
                        0
                    ) || parseFloat(latestQuote.surface_area || latestQuote.surface_m2 || 0) || 0
                )
                : 0

            const todayRaw = Array.isArray(resToday.data?.items)
                ? resToday.data.items
                : (Array.isArray(resToday.data) ? resToday.data : [])
            const todayActiveJobs = todayRaw.filter(w => {
                const dStr = (w.start_date || w.deadline_date || '').split('T')[0]
                return dStr === todayStr && !['cancelled', 'pending'].includes(w.status)
            })
            const todayJobsCount = todayActiveJobs.length
            let calcTodayM2 = 0
            let calcTodaySandTons = 0
            let calcTodayKm = 0
            todayActiveJobs.forEach(w => {
                const vols = Array.isArray(w.volumes) ? w.volumes : []
                let jobSqm = 0
                let jobWeightedCm = 0
                vols.forEach(v => {
                    const q = parseFloat(v.actual_quantity || v.quantity) || 0
                    const th = parseFloat(v.actual_thickness || v.thickness) || 6
                    const lbl = String(v.label || '').toLowerCase()
                    if (q > 0) {
                        jobSqm += q
                        if (!lbl.includes('pur') && !lbl.includes('mousse') && !lbl.includes('eps')) {
                            jobWeightedCm += q * th
                        }
                    }
                })
                if (jobSqm <= 0) {
                    jobSqm = parseFloat(w.actual_surface_m2 || w.surface_m2 || w.surface_area || w.surface || 0) || 0
                    const th = parseFloat(w.actual_thickness_cm || w.thickness_cm || w.thickness) || 6
                    jobWeightedCm = jobSqm * th
                }
                calcTodayM2 += jobSqm

                const routeSandKg = parseFloat(w.route_sand_kg) || 0
                const actualSandRaw = parseFloat(w.actual_sand_quantity) || 0
                if (actualSandRaw > 0) {
                    calcTodaySandTons += actualSandRaw > 200 ? actualSandRaw / 1000 : actualSandRaw
                } else if (routeSandKg > 0) {
                    calcTodaySandTons += routeSandKg / 1000
                } else if (jobWeightedCm > 0) {
                    calcTodaySandTons += (jobWeightedCm * 16) / 1000
                }

                let jobKm = parseFloat(w.route_distance_km) || 0
                if (jobKm <= 0 && w.prices?.distance_km) {
                    jobKm = (parseFloat(w.prices.distance_km) || 0) * 2
                }
                if (jobKm <= 0 && w.distance_km) {
                    jobKm = (parseFloat(w.distance_km) || 0) * 2
                }
                if (jobKm <= 0 && Array.isArray(w.route_segments) && w.route_segments.length > 0) {
                    jobKm = w.route_segments.reduce((s, seg) => s + (parseFloat(seg.km) || 0), 0) * 2
                }
                calcTodayKm += jobKm
            })
            const todayTotalM2 = Math.round(calcTodayM2)
            const todaySandTons = Number(calcTodaySandTons.toFixed(1))
            const todayEstimatedKm = Math.round(calcTodayKm)

            // Expand automatically ONLY when a new message or new pending quote arrives
            const newestMsgId = unreadMessages[0]?.id || unreadMessages[0]?.created_at || null
            const newestQuoteId = recentPendingQuotes[0]?.id || null
            if (!isInitialFetchRef.current) {
                const hasNewMessage =
                    unreadMessages[0] &&
                    (unreadMessagesCount > prevCountsRef.current.unreadMsgs ||
                        (newestMsgId && newestMsgId !== prevCountsRef.current.lastMsgId))
                const hasNewQuote =
                    recentPendingQuotes[0] &&
                    (pendingQuotesTotal > prevCountsRef.current.pendingTotal ||
                        (newestQuoteId && newestQuoteId !== prevCountsRef.current.lastQuoteId))

                if (hasNewMessage) {
                    const newestMsg = unreadMessages[0]
                    triggerPeek(5000)
                    triggerLiveAlert({
                        type: 'message',
                        title: newestMsg.sender_name || newestMsg.work_order_title || 'Client',
                        subtitle: newestMsg.message || t('dynamic_island.new_message_alert', 'Nouveau message client'),
                        link: `/admin/chats?wo_id=${newestMsg.work_order_id}`,
                    })
                } else if (hasNewQuote) {
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
                lastMsgId: newestMsgId,
                pendingTotal: pendingQuotesTotal,
                lastQuoteId: newestQuoteId,
                movingTrucks,
            }
            isInitialFetchRef.current = false

            setSummary({
                activeTrucks,
                movingTrucks,
                totalKmToday,
                todayEstimatedKm,
                todayJobsCount,
                todayTotalM2,
                todaySandTons,
                pendingQuotesTotal,
                recentPendingQuotes,
                latestQuote,
                latestQuoteSqm,
                unreadMessagesCount,
                unreadMessages,
            })
        } catch (_) { }
    }, [t, triggerLiveAlert, triggerPeek])

    useEffect(() => {
        void fetchIslandData()
        const timer = setInterval(() => {
            if (typeof document === 'undefined' || document.visibilityState === 'visible') {
                void fetchIslandData()
            }
        }, 8000)

        const handleRefresh = () => { void fetchIslandData() }
        window.addEventListener('refresh-notifications', handleRefresh)
        window.addEventListener('focus', handleRefresh)

        return () => {
            clearInterval(timer)
            if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current)
            if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current)
            if (absorbDelayRef.current) clearTimeout(absorbDelayRef.current)
            if (absorbTimeoutRef.current) clearTimeout(absorbTimeoutRef.current)
            window.removeEventListener('refresh-notifications', handleRefresh)
            window.removeEventListener('focus', handleRefresh)
        }
    }, [fetchIslandData])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (islandRef.current && !islandRef.current.contains(e.target)) {
                closePopover()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [closePopover])

    const handleMarkAllMessagesRead = async (e) => {
        e.stopPropagation()
        try {
            await api.post('/admin/work-orders/chat-notifications/mark-read')
            void fetchIslandData()
            window.dispatchEvent(new Event('refresh-notifications'))
        } catch (_) { }
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

    const tickerItems = [
        {
            key: 'today_jobs',
            dotClass: 'bg-[#34C759] shadow-[0_0_6px_rgba(52,199,89,0.45)]',
            text: `${t('dynamic_island.today', "Aujourd'hui")}: ${summary.todayJobsCount} ${t('dynamic_island.jobs_short', 'chantiers')}`,
        },
        {
            key: 'today_vol_sand',
            dotClass: 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.4)]',
            text: `${summary.todayTotalM2} m² · ${summary.todaySandTons} T ${t('dynamic_island.sand_short', 'sable')}`,
        },
        {
            key: 'today_est_km',
            dotClass: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.45)]',
            text: `${t('dynamic_island.route_today_prefix', 'Traseu azi')}: ${summary.todayEstimatedKm} km ${t('dynamic_island.estimated_short', 'estimați')}`,
        },
        {
            key: 'latest_quote',
            dotClass: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.45)]',
            text: summary.latestQuote
                ? `${t('dynamic_island.latest_quote_prefix', 'Dernier devis')}: ${summary.latestQuote.quote_number || ''}${summary.latestQuoteSqm > 0 ? ` · ${summary.latestQuoteSqm} m²` : ` · ${(summary.latestQuote.client_name || summary.latestQuote.title || '').slice(0, 14)}`}`
                : `${t('dynamic_island.pending', 'En attente')}: ${summary.pendingQuotesTotal} ${t('dynamic_island.quotes_short', 'devis')}`,
        },
        {
            key: 'pending_quotes',
            dotClass: 'bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.45)]',
            text: `${t('dynamic_island.pending', 'En attente')}: ${summary.pendingQuotesTotal} ${t('dynamic_island.quotes_short', 'devis')}`,
        },
        ...(summary.unreadMessagesCount > 0
            ? [{
                key: 'unread_msgs',
                dotClass: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.45)]',
                text: `${summary.unreadMessagesCount} ${t('dynamic_island.unread_msgs_short', 'messages non lus')}`,
            }]
            : []),
    ]

    useEffect(() => {
        const rotateTimer = setInterval(() => {
            setTickerIndex(prev => (prev + 1) % tickerItems.length)
        }, 5000)
        return () => clearInterval(rotateTimer)
    }, [tickerItems.length])

    const currentTicker = tickerItems[tickerIndex % tickerItems.length] || tickerItems[0]

    return (
        <div ref={islandRef} className="relative flex items-center justify-center z-50 select-none">
            {/* State 1: Compact Apple Dynamic Island Capsule in the center of the Header Bar (Rotates live info every 5s) */}
            <button
                type="button"
                onClick={() => {
                    if (isAlertVisible) closeAlert()
                    if (isOpen) {
                        closePopover()
                    } else {
                        setIsOpen(true)
                    }
                }}
                title={isOpen ? undefined : t('dynamic_island.tooltip', 'Dynamic Island — Activité en direct, Messages & Devis')}
                style={{
                    transform: isAbsorbing
                        ? 'scale(1.06, 0.94)'
                        : 'none',
                    transition: isAbsorbing
                        ? 'transform 170ms cubic-bezier(0.22, 1, 0.36, 1), background-color 240ms ease, border-color 240ms ease, box-shadow 240ms ease'
                        : 'transform 520ms cubic-bezier(0.22, 1.28, 0.36, 1), background-color 280ms ease, border-color 280ms ease, box-shadow 280ms ease',
                }}
                className={`relative z-20 h-[34px] min-w-[224px] max-w-[290px] px-3.5 rounded-full bg-white hover:bg-slate-50/95 dark:bg-[#1C1C1E] dark:hover:bg-[#242426] border border-slate-200/90 dark:border-white/15 text-slate-900 dark:text-white flex items-center justify-between cursor-pointer overflow-hidden shadow-[0_4px_14px_rgba(15,23,42,0.14),0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-300 ${
                    isAlertVisible ? 'ring-2 ring-emerald-400/70' : isOpen ? 'ring-2 ring-white/50' : ''
                }`}
            >
                {/* Left: Status dot + 5-second rotating live info */}
                <div key={currentTicker.key} className="flex items-center gap-2 pr-3 min-w-0 animate-[fadeIn_260ms_ease-out]">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-300 ${currentTicker.dotClass}`} />
                    <span className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums tracking-tight whitespace-nowrap truncate">
                        {currentTicker.text}
                    </span>
                </div>

                {/* Right: Vertical divider + Bell icon */}
                <div className="flex items-center pl-2.5 border-l border-slate-200 dark:border-white/15 shrink-0">
                    <span className="relative flex items-center justify-center">
                        <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" strokeWidth={1.85} />
                        {(summary.unreadMessagesCount > 0 || summary.pendingQuotesTotal > 0 || isAlertVisible) && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#1C1C1E]" />
                        )}
                    </span>
                </div>
            </button>

            {/* State 2: Incoming Notification Bubble — Crisp Retina text when open, smooth spring emergence & suction return */}
            <div
                aria-hidden={!isAlertVisible}
                onClick={() => {
                    const target = displayedAlert?.link
                    closeAlert()
                    if (target) navigate(target)
                }}
                style={{
                    transformOrigin: '50% 0%',
                    borderRadius: isAlertVisible ? '22px' : '44px',
                    transition: isAlertVisible
                        ? 'transform 460ms cubic-bezier(0.22, 1.08, 0.36, 1), border-radius 460ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out'
                        : 'transform 380ms cubic-bezier(0.32, 0, 0.15, 1), border-radius 340ms cubic-bezier(0.32, 0, 0.15, 1), opacity 220ms cubic-bezier(0.32, 0, 0.2, 1) 100ms',
                    transform: isAlertVisible
                        ? 'translateX(-50%) translateY(8px)'
                        : 'translate3d(-50%, -24px, 0) scale3d(0.30, 0.25, 1)',
                    opacity: isAlertVisible ? 1 : 0,
                }}
                className={`absolute top-full left-1/2 z-[9998] w-[390px] max-w-[92vw] bg-[#F2F4F8] dark:bg-slate-900 text-slate-950 dark:text-white border-[1.5px] border-slate-300 dark:border-slate-600 ring-1 ring-slate-900/10 dark:ring-white/10 shadow-[0_24px_54px_-12px_rgba(15,23,42,0.38),0_6px_18px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-[0_24px_54px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.16)] p-2.5 cursor-pointer overflow-hidden antialiased ${isAlertVisible
                    ? 'pointer-events-auto'
                    : 'pointer-events-none'
                    }`}
            >
                <div
                    style={{
                        opacity: isAlertVisible ? 1 : 0,
                        transition: isAlertVisible
                            ? 'opacity 220ms ease-out 50ms'
                            : 'opacity 150ms ease-out',
                    }}
                    className="flex items-center gap-3 rounded-[15px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 shadow-2xs"
                >
                    <span className="w-9 h-9 rounded-full bg-sky-50 dark:bg-sky-400/15 border border-sky-200 dark:border-sky-500/25 flex items-center justify-center shrink-0">
                        {displayedAlert?.type === 'quote' ? (
                            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        ) : (
                            <MessageSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        )}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                                {displayedAlert?.type === 'quote'
                                    ? t('dynamic_island.new_quote_title', 'Nouveau devis')
                                    : t('dynamic_island.new_message_alert', 'Nouveau message client')}
                            </span>
                        </div>
                        <div className="text-[13px] font-bold text-slate-950 dark:text-white truncate">
                            {displayedAlert?.title}
                        </div>
                        <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {displayedAlert?.subtitle}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            closeAlert()
                        }}
                        className="w-6 h-6 rounded-full hover:bg-slate-200 dark:hover:bg-white/15 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white shrink-0"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* State 3: Full Expanded Dynamic Island Live Activity Sheet — Crisp Retina text (no GPU scale3d bitmap blur when open, solid opaque background) */}
            <div
                aria-hidden={!isOpen}
                style={{
                    transformOrigin: '50% 0%',
                    borderRadius: isOpen ? '24px' : '44px',
                    transition: isOpen
                        ? 'transform 440ms cubic-bezier(0.22, 1.06, 0.36, 1), border-radius 440ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease-out'
                        : 'transform 380ms cubic-bezier(0.32, 0, 0.15, 1), border-radius 340ms cubic-bezier(0.32, 0, 0.15, 1), opacity 220ms cubic-bezier(0.32, 0, 0.2, 1) 100ms',
                    transform: isOpen
                        ? 'translateX(-50%) translateY(8px)'
                        : 'translate3d(-50%, -24px, 0) scale3d(0.28, 0.20, 1)',
                    opacity: isOpen ? 1 : 0,
                }}
                className={`absolute top-full left-1/2 w-[420px] max-w-[94vw] bg-[#F2F4F8] dark:bg-slate-900 text-slate-950 dark:text-white border-[1.5px] border-slate-300 dark:border-slate-600 ring-1 ring-slate-900/10 dark:ring-white/10 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.42),0_8px_24px_-4px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-[0_28px_64px_-12px_rgba(0,0,0,0.9),0_8px_24px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.16)] p-3.5 z-[9999] overflow-hidden antialiased ${isOpen
                    ? 'pointer-events-auto'
                    : 'pointer-events-none'
                    }`}
            >
                <div
                    style={{
                        opacity: isOpen ? 1 : 0,
                        transition: isOpen
                            ? 'opacity 200ms ease-out 40ms'
                            : 'opacity 140ms ease-out',
                    }}
                >
                {/* 1. Unified Apple Inset Grouped Summary Strip */}
                <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 rounded-[14px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)] mb-3.5 overflow-hidden">
                    <div
                        onClick={() => { closePopover(); navigate('/admin/planning') }}
                        className="px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                    >
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                            {t('dynamic_island.today', "Aujourd'hui")}
                        </div>
                        <div className="mt-0.5 text-[17px] font-black tracking-tight text-slate-950 dark:text-white tabular-nums leading-tight">
                            {summary.todayJobsCount} <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{t('dynamic_island.jobs_short', 'chantiers')}</span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 tabular-nums truncate">
                            {summary.todayTotalM2} m² · {summary.todaySandTons} T {t('dynamic_island.sand_short', 'nisip')}
                        </div>
                    </div>

                    <div
                        onClick={() => { closePopover(); navigate('/admin/tracking') }}
                        className="px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                    >
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">{t('dynamic_island.fleet_gps', 'Flotte GPS')}</span>
                        </div>
                        <div className="mt-0.5 text-[17px] font-black tracking-tight text-slate-950 dark:text-white tabular-nums leading-tight">
                            {summary.todayEstimatedKm} <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">km {t('dynamic_island.estimated_short', 'estimați')}</span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 tabular-nums truncate">
                            {summary.activeTrucks} {t('dynamic_island.active_plural', 'active')} · {summary.movingTrucks} {t('dynamic_island.moving_short', 'în mișcare')}
                        </div>
                    </div>

                    <div
                        onClick={() => { closePopover(); navigate('/admin/quotes') }}
                        className="px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                    >
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                            {t('dynamic_island.pending', 'En attente')}
                        </div>
                        <div className="mt-0.5 text-[17px] font-black tracking-tight text-slate-950 dark:text-white tabular-nums leading-tight">
                            {summary.pendingQuotesTotal} <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{t('dynamic_island.quotes_short', 'devis')}</span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                            {t('dynamic_island.quotes_title', 'Nouveaux devis')}
                        </div>
                    </div>
                </div>

                {/* 2. Unread Client Messages — Apple Inset Grouped Section */}
                <div className="mb-3.5">
                    <div className="flex items-center justify-between px-1.5 mb-1.5">
                        <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                            {t('dynamic_island.messages_clients', 'Messages clients')}
                            {summary.unreadMessagesCount > 0 ? ` (${summary.unreadMessagesCount})` : ''}
                        </span>
                        {summary.unreadMessagesCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllMessagesRead}
                                className="text-[12px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer"
                            >
                                {t('dynamic_island.mark_all_read', 'Tout marquer lu')}
                            </button>
                        )}
                    </div>
                    <div className="rounded-[14px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)] divide-y divide-slate-200 dark:divide-slate-700 overflow-hidden">
                        {summary.unreadMessages.length === 0 ? (
                            <div
                                onClick={() => { closePopover(); navigate('/admin/chats') }}
                                className="px-3.5 py-2.5 text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                            >
                                <span>{t('dynamic_island.no_unread_messages', 'Aucun message non lu')}</span>
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                            </div>
                        ) : (
                            summary.unreadMessages.map(msg => (
                                <div
                                    key={msg.id || msg.work_order_id}
                                    onClick={() => {
                                        closePopover()
                                        navigate(`/admin/chats?wo_id=${msg.work_order_id}`)
                                    }}
                                    className="px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.08] cursor-pointer transition-colors flex items-center justify-between gap-2.5"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                                            <span className="text-[13px] font-bold text-slate-950 dark:text-white truncate">
                                                {msg.work_order_title || msg.sender_name || 'Client'}
                                            </span>
                                            {msg.count > 1 && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 text-[10.5px] font-bold tabular-nums leading-none">
                                                    {msg.count}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 truncate mt-0.5 pl-4">
                                            {msg.message}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 3. Latest Pending Quotes — True Apple iOS/macOS Inset Grouped List */}
                <div>
                    <div className="flex items-center justify-between px-1.5 mb-1.5">
                        <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                            {t('dynamic_island.latest_pending_quotes', 'Derniers devis en attente')}
                        </span>
                        <button
                            type="button"
                            onClick={() => { closePopover(); navigate('/admin/quotes') }}
                            className="text-[12px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer"
                        >
                            {t('dynamic_island.view_all', 'Voir tout')} ({summary.pendingQuotesTotal})
                        </button>
                    </div>
                    <div className="rounded-[14px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)] divide-y divide-slate-200 dark:divide-slate-700 overflow-hidden">
                        {summary.recentPendingQuotes.map(q => {
                            const city = extractCityShort(q.site_address)
                            const vol = q.volumes?.[0] || {}
                            const isOnline = q.source_system === 'devis_online'
                            const isWeR = q.source_system === 'calculator_public' || q.source_system === 'we-r'
                            return (
                                <div
                                    key={q.id}
                                    onClick={() => {
                                        closePopover()
                                        navigate(`/admin/work-orders/${q.id}`)
                                    }}
                                    className="px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.08] cursor-pointer transition-colors flex items-center justify-between gap-2.5"
                                >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span
                                            className={`w-2 h-2 rounded-full shrink-0 ${isWeR ? 'bg-amber-500' : isOnline ? 'bg-sky-500' : 'bg-slate-500'
                                                }`}
                                        />
                                        <span className="text-[13px] font-bold text-slate-950 dark:text-white truncate">
                                            {q.client_name || q.title || 'Client'}
                                        </span>
                                        {city && (
                                            <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                                                · {city}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                                        {vol.quantity && (
                                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                                                {vol.quantity} m²{vol.thickness ? ` · ${vol.thickness} cm` : ''}
                                            </span>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-slate-500" />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 4. Upcoming Belgian Public Holidays — Moved from Calendar Bar into Dynamic Island */}
                {(() => {
                    const upcomingHolidays = getUpcomingHolidays(2)
                    if (upcomingHolidays.length === 0) return null
                    const nextH = upcomingHolidays[0]
                    const secondH = upcomingHolidays[1]
                    const fmtDate = (dStr) =>
                        new Date(dStr + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                    return (
                        <div className="mt-3 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)] flex items-center justify-between px-3 py-2 text-[11.5px]">
                            <button
                                type="button"
                                onClick={() => {
                                    closePopover()
                                    navigate('/admin/planning')
                                    setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('jump-to-calendar-date', { detail: { date: nextH.date } }))
                                    }, 60)
                                }}
                                className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors"
                            >
                                <CalendarDays className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="font-semibold">{t('planning.next_holiday_full', 'Prochain férié')} :</span>
                                <span className="font-bold text-slate-950 dark:text-white">
                                    {t(`holidays.${nextH.name.replace(/[^a-zA-Z]/g, '').toLowerCase()}`, nextH.name)} ({fmtDate(nextH.date)})
                                </span>
                            </button>
                            {secondH && (
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                                    · {t(`holidays.${secondH.name.replace(/[^a-zA-Z]/g, '').toLowerCase()}`, secondH.name)} ({fmtDate(secondH.date)})
                                </span>
                            )}
                        </div>
                    )
                })()}
                </div>
            </div>
        </div>
    )
}

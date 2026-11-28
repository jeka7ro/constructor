import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Outlet, NavLink, useLocation, Navigate } from 'react-router-dom'
import { useAdminStore } from '../../store/adminStore'
import { useTenantStore } from '../../store/tenantStore'
import api from '../../lib/api'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '../../components/LanguageSelector'
import HeaderNotifications from '../../components/HeaderNotifications'
import HeaderDynamicIsland from '../../components/HeaderDynamicIsland'
import GlobalSearch from '../../components/GlobalSearch'
import {
    LayoutDashboard, Users, Building2, FileText, Settings, LogOut,
    ChevronLeft, Clock, Activity, Bell, ChevronRight, Camera, Sun, Moon, Truck, Package, Briefcase, Shield, HardHat, MessageSquareWarning, BedDouble, Wallet, PackageSearch, AlertTriangle, Megaphone, Globe, Navigation, ClipboardList, CalendarDays, Menu, BarChart3, Calculator, Radio, History, MessageSquare, Search, Mail, MapIcon, HardDrive, Handshake, Maximize2, Minimize2, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const base = API_BASE.replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
}

export default function AdminDashboard() {
    const { admin, logout, updateAdmin } = useAdminStore()
    const { tenant } = useTenantStore()
    const navigate = useNavigate()
    const location = useLocation()
    const { t, i18n } = useTranslation()
    const [now, setNow] = useState(new Date())
    const [isMobileNavCompact, setIsMobileNavCompact] = useState(false)
    const lastScrollYRef = useRef(0)
    const touchStartYRef = useRef(null)
    const scrollPosMapRef = useRef(typeof WeakMap !== 'undefined' ? new WeakMap() : null)

    // Always restore bottom navigation bar when navigating to a new route
    useEffect(() => {
        setIsMobileNavCompact(false)
    }, [location.pathname])

    const handleWorkspaceScroll = useCallback((e) => {
        if (typeof window !== 'undefined' && window.innerWidth >= 768) return
        const el = e.currentTarget
        if (!el) return
        const currentY = el.scrollTop || 0
        const delta = currentY - lastScrollYRef.current
        if (currentY < 14) {
            setIsMobileNavCompact(false)
        } else if (delta > 6) {
            setIsMobileNavCompact(true)
        } else if (delta < -5) {
            setIsMobileNavCompact(false)
        }
        lastScrollYRef.current = currentY
    }, [])

    useEffect(() => {
        const onCapturedScroll = (e) => {
            if (window.innerWidth >= 768) return
            if (window.location.pathname.startsWith('/admin/chats')) {
                setIsMobileNavCompact(false)
                return
            }
            const target = e.target === document ? document.documentElement : e.target
            if (!target || typeof target.scrollTop !== 'number') return
            if (target.closest?.('[data-no-nav-hide="true"]')) return
            // Skip horizontal-only scrollbars or tiny elements
            if (target.scrollHeight <= target.clientHeight + 8) return
            const currentY = target.scrollTop
            const prevY = scrollPosMapRef.current?.get(target) ?? currentY
            const delta = currentY - prevY
            scrollPosMapRef.current?.set(target, currentY)
            if (currentY < 14) {
                setIsMobileNavCompact(false)
            } else if (delta > 6) {
                setIsMobileNavCompact(true)
            } else if (delta < -5) {
                setIsMobileNavCompact(false)
            }
        }
        const onTouchStart = (e) => {
            if (window.innerWidth >= 768) return
            if (e.touches && e.touches.length === 1) {
                touchStartYRef.current = e.touches[0].clientY
            }
        }
        const onTouchMove = (e) => {
            if (window.innerWidth >= 768 || touchStartYRef.current === null) return
            if (e.touches && e.touches.length === 1) {
                const dy = e.touches[0].clientY - touchStartYRef.current
                // Swiping finger down (scrolling up) > 18px immediately restores the bottom bar
                if (dy > 18) {
                    setIsMobileNavCompact(false)
                    touchStartYRef.current = e.touches[0].clientY
                }
            }
        }
        window.addEventListener('scroll', onCapturedScroll, { passive: true, capture: true })
        window.addEventListener('touchstart', onTouchStart, { passive: true })
        window.addEventListener('touchmove', onTouchMove, { passive: true })
        return () => {
            window.removeEventListener('scroll', onCapturedScroll, { capture: true })
            window.removeEventListener('touchstart', onTouchStart)
            window.removeEventListener('touchmove', onTouchMove)
        }
    }, [])
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    // Background cache pre-warmer so navigating to Chats, Isoflex, Reports, Invoicing, or Quotes is 0ms instant
    // Delayed to 3500ms so it NEVER competes with Planning calendar initial load on Safari's 6-connection pool
    useEffect(() => {
        if (typeof window === 'undefined') return
        const isMobile = window.innerWidth < 768
        const tId = setTimeout(() => {
            if (!window.__adminTeamsCache) {
                api.get('/admin/teams').then(res => {
                    const data = res.data
                    const tms = Array.isArray(data) ? data : (data?.teams || data?.items || [])
                    if (tms.length > 0) window.__adminTeamsCache = tms
                }).catch(() => {})
            }
            if (!window.__adminQuotesCache) {
                api.get('/admin/work-orders?is_quote=true&slim=true').then(res => {
                    const list = Array.isArray(res.data) ? res.data.filter(q => q.status !== 'cancelled') : []
                    window.__adminQuotesCache = list
                }).catch(() => {})
            }
            if (!window.__adminChatsCache) {
                api.get('/admin/chats').then(res => {
                    const list = Array.isArray(res.data) ? res.data : []
                    window.__adminChatsCache = list
                    if (!isMobile) {
                        if (!window.__adminChatMessagesCache) window.__adminChatMessagesCache = new Map()
                        list.slice(0, 4).forEach(c => {
                            const wid = String(c.work_order_id)
                            if (wid && !window.__adminChatMessagesCache.has(wid)) {
                                api.get(`/admin/work-orders/${wid}/messages`)
                                    .then(mRes => {
                                        const arr = Array.isArray(mRes.data) ? mRes.data : (mRes.data?.data || mRes.data?.messages || [])
                                        window.__adminChatMessagesCache.set(wid, arr)
                                    })
                                    .catch(() => {})
                            }
                        })
                    }
                }).catch(() => {})
            }
            if (!isMobile && !window.__adminIsoflexCache) {
                api.get('/admin/robaws-history', { params: { page: 0, limit: 200 } }).then(res => {
                    window.__adminIsoflexCache = { items: res.data?.items || [], teams: res.data?.teams || [] }
                }).catch(() => {})
            }
            if (!isMobile && !window.__adminInvoiceOrdersCache) {
                api.get('/admin/work-orders?limit=1000&invoice_mode=true').then(res => {
                    const wos = (Array.isArray(res.data) ? res.data : (res.data?.items || [])).filter(w => w.status !== 'deleted')
                    window.__adminInvoiceOrdersCache = wos
                }).catch(() => {})
            }
            if (!window.__adminPricingSettingsCache) {
                api.get('/admin/pricing-settings').then(res => {
                    if (res.data) window.__adminPricingSettingsCache = res.data
                }).catch(() => {})
            }
        }, 3500)
        return () => clearTimeout(tId)
    }, [])

    // Live weather + timezone for the user's current location (auto-detected via geolocation/IP, cached in localStorage + MET Norway fallback so it never disappears on Open-Meteo 429)
    const [userWeather, setUserWeather] = useState(() => {
        try {
            const cached = localStorage.getItem('pontaj_user_header_weather_v3') || sessionStorage.getItem('pontaj_user_header_weather_v2')
            if (cached) {
                const parsed = JSON.parse(cached)
                if (parsed && parsed.temp != null) {
                    return parsed
                }
            }
        } catch (_) {}
        return {
            temp: 6,
            code: 2,
            wind: 14,
            city: 'Bruxelles',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Brussels',
            ts: 0,
        }
    })

    const fetchUserLocationWeather = useCallback(async (forceGpsPrompt = false) => {
        const mapMetSymbolToWmo = (sym = '') => {
            const s = String(sym).toLowerCase()
            if (s.includes('thunder')) return 95
            if (s.includes('snow') || s.includes('sleet')) return 73
            if (s.includes('rain') || s.includes('drizzle')) return 61
            if (s.includes('fog')) return 45
            if (s.includes('partlycloudy') || s.includes('fair')) return 2
            if (s.includes('cloudy')) return 3
            return 0
        }

        const loadFromCoords = async (lat, lon, fallbackCity = '') => {
            try {
                const gPromise = fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${i18n.language || 'fr'}`).then(r => r.json()).catch(() => ({}))
                let tempVal = null
                let codeVal = 0
                let windVal = 0
                let tzVal = Intl.DateTimeFormat().resolvedOptions().timeZone

                try {
                    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`).then(r => r.json())
                    if (wRes?.current_weather && wRes.current_weather.temperature != null) {
                        tempVal = Math.round(Number(wRes.current_weather.temperature))
                        codeVal = Number(wRes.current_weather.weathercode || 0)
                        windVal = Math.round(Number(wRes.current_weather.windspeed || 0))
                        if (wRes.timezone) tzVal = wRes.timezone
                    }
                } catch (_) {}

                // Fallback to MET Norway (ECMWF) when Open-Meteo is rate-limited (HTTP 429)
                if (tempVal === null) {
                    const metRes = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${Number(lat).toFixed(4)}&lon=${Number(lon).toFixed(4)}`).then(r => r.json()).catch(() => null)
                    const firstTs = metRes?.properties?.timeseries?.[0]
                    const details = firstTs?.data?.instant?.details
                    if (details && details.air_temperature != null) {
                        tempVal = Math.round(Number(details.air_temperature))
                        windVal = Math.round(Number(details.wind_speed || 0) * 3.6)
                        const sym = firstTs?.data?.next_1_hours?.summary?.symbol_code || firstTs?.data?.next_6_hours?.summary?.symbol_code || ''
                        codeVal = mapMetSymbolToWmo(sym)
                    }
                }

                const gRes = await gPromise
                if (tempVal !== null) {
                    const city = gRes?.city || gRes?.locality || fallbackCity || gRes?.principalSubdivision || 'Bruxelles'
                    const payload = {
                        temp: tempVal,
                        code: codeVal,
                        wind: windVal,
                        city,
                        timezone: tzVal,
                        ts: Date.now(),
                    }
                    setUserWeather(payload)
                    try {
                        localStorage.setItem('pontaj_user_header_weather_v3', JSON.stringify(payload))
                        sessionStorage.setItem('pontaj_user_header_weather_v2', JSON.stringify(payload))
                    } catch (_) {}
                }
            } catch (_) {}
        }

        const loadFromIpOrTimezone = async () => {
            try {
                const ipRes = await fetch('https://ipwho.is/').then(r => r.json()).catch(() => null)
                if (ipRes && ipRes.latitude && ipRes.longitude) {
                    await loadFromCoords(ipRes.latitude, ipRes.longitude, ipRes.city || '')
                    return
                }
                const ipApi = await fetch('https://ipapi.co/json/').then(r => r.json()).catch(() => null)
                if (ipApi && ipApi.latitude && ipApi.longitude) {
                    await loadFromCoords(ipApi.latitude, ipApi.longitude, ipApi.city || '')
                    return
                }
            } catch (_) {}
            await loadFromCoords(50.8503, 4.3517, 'Bruxelles')
        }

        try {
            if (forceGpsPrompt && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => { void loadFromCoords(pos.coords.latitude, pos.coords.longitude) },
                    () => { void loadFromIpOrTimezone() },
                    { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
                )
                return
            }

            if (navigator.geolocation) {
                let handled = false
                if (navigator.permissions) {
                    try {
                        const perm = await navigator.permissions.query({ name: 'geolocation' })
                        if (perm.state === 'granted') {
                            handled = true
                            navigator.geolocation.getCurrentPosition(
                                (pos) => { void loadFromCoords(pos.coords.latitude, pos.coords.longitude) },
                                () => { void loadFromIpOrTimezone() },
                                { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
                            )
                            return
                        }
                    } catch (_) {}
                }
                if (!handled) {
                    await loadFromIpOrTimezone()
                }
            } else {
                await loadFromIpOrTimezone()
            }
        } catch (_) {}
    }, [i18n.language])

    useEffect(() => {
        void fetchUserLocationWeather(false)
        const wTimer = setInterval(() => {
            if (typeof document === 'undefined' || document.visibilityState === 'visible') {
                void fetchUserLocationWeather(false)
            }
        }, 15 * 60 * 1000)
        return () => clearInterval(wTimer)
    }, [fetchUserLocationWeather])
    // On iPad / tablets (< 1280px or coarse touch pointer), keep sidebar minimized by default so Planning + Pending Quotes have full width
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window === 'undefined') return true
        const isTouchTablet = window.matchMedia && window.matchMedia('(pointer: coarse)').matches
        return window.innerWidth >= 1280 && !isTouchTablet
    })
    const [showGlobalSearch, setShowGlobalSearch] = useState(false)

    // Global Fullscreen state synced with browser & Esc key (including Safari webkit fallback + iOS Chrome/Safari in-app fullscreen fallback)
    const [isSimulatedFullscreen, setIsSimulatedFullscreen] = useState(false)
    const [isNativeFullscreen, setIsNativeFullscreen] = useState(() => {
        if (typeof document === 'undefined') return false
        return Boolean(document.fullscreenElement || document.webkitFullscreenElement)
    })
    const isAppFullscreen = isNativeFullscreen || isSimulatedFullscreen

    useEffect(() => {
        const syncFsState = () => {
            setIsNativeFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement))
            setTimeout(() => window.dispatchEvent(new Event('resize')), 80)
            setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
        }
        document.addEventListener('fullscreenchange', syncFsState)
        document.addEventListener('webkitfullscreenchange', syncFsState)
        return () => {
            document.removeEventListener('fullscreenchange', syncFsState)
            document.removeEventListener('webkitfullscreenchange', syncFsState)
        }
    }, [])

    const handleToggleFullscreen = async () => {
        const rootEl = document.documentElement
        const activeEl = document.fullscreenElement || document.webkitFullscreenElement
        if (isSimulatedFullscreen) {
            setIsSimulatedFullscreen(false)
            setTimeout(() => window.dispatchEvent(new Event('resize')), 80)
            return
        }
        try {
            if (activeEl) {
                if (document.exitFullscreen) await document.exitFullscreen()
                else if (document.webkitExitFullscreen) await document.webkitExitFullscreen()
                return
            }
            if (rootEl.requestFullscreen) {
                await rootEl.requestFullscreen()
                return
            }
            if (rootEl.webkitRequestFullscreen) {
                await rootEl.webkitRequestFullscreen()
                return
            }
            // Fallback for Chrome/Safari on iOS where requestFullscreen is undefined
            setIsSimulatedFullscreen(true)
            setTimeout(() => window.dispatchEvent(new Event('resize')), 80)
        } catch {
            // Fallback for Chrome/Safari on iOS where requestFullscreen throws or is blocked
            setIsSimulatedFullscreen(prev => !prev)
            setTimeout(() => window.dispatchEvent(new Event('resize')), 80)
        }
    }

    // Setup Cmd+K / Ctrl+K listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowGlobalSearch(true);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [notifCount, setNotifCount] = useState(0)
    const [lastSeenCount, setLastSeenCount] = useState(0)
    const notifRef = useRef(null)

    // Birthdays
    const [birthdayUsers, setBirthdayUsers] = useState([])
    const [showBirthdayPopup, setShowBirthdayPopup] = useState(false)

    const handleLogout = () => {
        logout()
        navigate('/admin/login')
    }

    // Auto-refresh admin profile (name, avatar) without re-login
    useEffect(() => {
        const refreshProfile = async () => {
            try {
                const res = await api.get('/admin/me')
                if (res.data) updateAdmin(res.data)
            } catch { /* silently fail */ }
        }
        refreshProfile()
    }, [])

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const res = await api.get('/admin/notifications/feed')
            const events = res.data?.events || []
            setNotifications(events)
            setNotifCount(events.length)
        } catch (e) { /* silently fail */ }
    }

    useEffect(() => {
        fetchNotifications()
        const t = setInterval(fetchNotifications, 30000)
        return () => clearInterval(t)
    }, [])

    const currentSubdomain = useTenantStore((state) => state.getCurrentSubdomain())

    useEffect(() => {
        if (!currentSubdomain && (admin?.role === 'SUPER_ADMIN' || admin?.is_super_admin) && location.pathname === '/admin/planning') {
            navigate('/admin/organizations', { replace: true })
        }
    }, [currentSubdomain, admin, location.pathname, navigate])

    // Fetch Birthdays
    useEffect(() => {
        const checkBirthdays = async () => {
            const todayStr = new Date().toISOString().split('T')[0]
            const lastShown = localStorage.getItem('pontaj_birthday_shown_date')
            if (lastShown === todayStr) return

            try {
                const res = await api.get('/admin/users/')
                const users = res.data || []
                const today = new Date()
                const todayMonth = today.getMonth() + 1
                const todayDay = today.getDate()

                const bdays = users.filter(u => {
                    if (!u.birth_date || u.birth_date === 'None') return false
                    const b = new Date(u.birth_date)
                    return b.getMonth() + 1 === todayMonth && b.getDate() === todayDay
                })

                if (bdays.length > 0) {
                    setBirthdayUsers(bdays)
                    setShowBirthdayPopup(true)
                    localStorage.setItem('pontaj_birthday_shown_date', todayStr)
                }
            } catch(e) {}
        }
        checkBirthdays()
    }, [])

    // Fetch open complaints count for badge
    const [openComplaintsCount, setOpenComplaintsCount] = useState(0)
    const fetchComplaintsCount = async () => {
        try {
            const res = await api.get('/admin/complaints/unread-count')
            setOpenComplaintsCount(res.data?.count || 0)
        } catch { /* silently */ }
    }
    useEffect(() => {
        fetchComplaintsCount()
        const t = setInterval(fetchComplaintsCount, 60000)
        return () => clearInterval(t)
    }, [])

    // Fetch pending leaves count for badge
    const [pendingLeavesCount, setPendingLeavesCount] = useState(0)
    const fetchLeavesCount = async () => {
        try {
            const res = await api.get('/admin/leaves/pending-count')
            setPendingLeavesCount(res.data?.count || 0)
        } catch { /* silently */ }
    }
    useEffect(() => {
        fetchLeavesCount()
        const t = setInterval(fetchLeavesCount, 60000)
        return () => clearInterval(t)
    }, [])

    // Dynamic Favicon based on Tenant Logo or Favicon
    useEffect(() => {
        const iconUrl = tenant?.favicon_url ? getImageUrl(tenant.favicon_url) : (tenant?.logo_url ? getImageUrl(tenant.logo_url) : null);
        if (iconUrl) {
            const url = iconUrl;
            
            let iconLink = document.querySelector("link[rel~='icon']")
            if (!iconLink) {
                iconLink = document.createElement('link')
                iconLink.rel = 'icon'
                document.head.appendChild(iconLink)
            }
            iconLink.href = url

            let appleLink = document.querySelector("link[rel='apple-touch-icon']")
            if (!appleLink) {
                appleLink = document.createElement('link')
                appleLink.rel = 'apple-touch-icon'
                document.head.appendChild(appleLink)
            }
            appleLink.href = url
        }
    }, [tenant?.logo_url, tenant?.favicon_url])
    // Close panel on outside click
    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const unreadCount = Math.max(0, notifCount - lastSeenCount)

    // Sidebar Categories
    const categories = [
        {
            id: 'general',
            label: t('nav.cat_general', 'Général'),
            items: [
                { path: '/admin/planning', icon: LayoutDashboard, label: t('nav.planning', 'Planning') },
                { path: '/admin/tracking', icon: Radio, label: t('admin_overview.live_tracking', 'Suivi en Direct') },
                { path: '/admin/quotes', icon: FileText, label: t('nav.quotes', 'Devis / Offres') },
                { path: '/admin/logistica', icon: Truck, label: t('nav.logistics', 'Logistique') },
                { path: '/admin/client-analytics', icon: BarChart3, label: t('nav.client_analytics', 'Analyse Clients') },
                { path: '/admin/invoicing', icon: FileText, label: t('nav.invoicing', 'Facturation') },
                { path: '/admin/chats', icon: MessageSquare, label: t('nav.chats', 'Messages Clients') },
                { path: '/admin/isoflex-history', icon: History, label: t('nav.isoflex_history', 'Historique Isoflex') },
                { path: '/admin/timesheets', icon: Clock, label: t('nav.timesheets', 'Pointages') },
                { path: '/admin/reports', icon: FileText, label: t('nav.reports', 'Rapports') },
            ]
        },
        {
            id: 'hr',
            label: t('nav.cat_hr', 'Ressources Humaines'),
            items: [
                { path: '/admin/employees', icon: HardHat, label: t('nav.employees', 'Employés') },
                { path: '/admin/teams', icon: Users, label: t('nav.teams', 'Équipes') },
                { path: '/admin/leaves', icon: CalendarDays, label: t('nav.leaves', 'Congés & Absences'), badge: pendingLeavesCount },
                { path: '/admin/accommodations', icon: BedDouble, label: t('nav.accommodations', 'Hébergements') },
            ]
        },
        {
            id: 'operations',
            label: t('nav.cat_operations', 'Opérations'),
            items: [
                { path: '/admin/sites', icon: Building2, label: t('nav.sites', 'Chantiers') },
                { path: '/admin/clients', icon: Briefcase, label: t('nav.clients', 'Clients') },
                { path: '/calculator', icon: Calculator, label: t('nav.calculator', 'Calculateur Clients (Public)') },
                { path: '/admin/activities', icon: Activity, label: t('nav.activities', 'Activités') },
                { path: '/admin/site-photos', icon: Camera, label: t('nav.site_photos', 'Photos de Chantiers') },
            ]
        },
        {
            id: 'logistics',
            label: t('nav.cat_logistics', 'Logistique & Finances'),
            items: [
                { path: '/admin/warehouse', icon: Package, label: t('nav.warehouse', 'Entrepôt') },
                { path: '/admin/fleet', icon: Truck, label: t('nav.fleet', 'Flotte') },
                { path: '/admin/transport', icon: Navigation, label: t('nav.transport', 'Feuilles de Route') },
                { path: '/admin/material-requests', icon: PackageSearch, label: t('nav.material_requests', 'Demandes Matériel') },
                { path: '/admin/expenses', icon: Wallet, label: t('nav.expenses', 'Dépenses / Frais') },
            ]
        },
        {
            id: 'support',
            label: t('nav.cat_support', 'Support & Alertes'),
            items: [
                { path: '/admin/alerts', icon: Megaphone, label: t('nav.alerts', 'Avis (Alertes)') },
                { path: '/admin/emergencies', icon: AlertTriangle, label: t('nav.emergencies', 'Urgences') },
                { path: '/admin/complaints', icon: MessageSquareWarning, label: t('nav.complaints', 'Plaintes'), badge: openComplaintsCount },
            ]
        },
        {
            id: 'system',
            label: t('nav.cat_system', 'Système'),
            items: [
                { path: '/admin/users', icon: Shield, label: t('nav.users', 'Utilisateurs') },
                { path: '/admin/partners', icon: Handshake, label: t('nav.partners', 'Partenaires') },
                { path: '/admin/pricing-settings', icon: Calculator, label: t('nav.pricing_settings', 'Tarifs') },
                { path: '/admin/audit-logs', icon: History, label: t('nav.audit_logs', 'Journaux d\'Activité') },
                { path: '/admin/emails', icon: Mail, label: t('nav.email_logs', 'Journaux d\'E-mails') },
                { path: '/admin/backups', icon: HardDrive, label: t('nav.backups', 'Sauvegardes (Backups)') },
                { path: '/admin/settings', icon: Settings, label: t('nav.settings', 'Paramètres') },
                { path: '/admin/notifications', icon: Bell, label: t('nav.notifications', 'Notifications') },
            ]
        }
    ]

    // Dacă e Super Admin și NU suntem pe un subdomeniu, eliminăm elementele operaționale / de tenant din Sistem
    if ((admin?.role === 'SUPER_ADMIN' || admin?.is_super_admin) && !currentSubdomain) {
        const systemCategory = categories.find(c => c.id === 'system')
        if (systemCategory) {
            // Un Super Admin de SaaS ar trebui să aibă probabil doar setări generale sau propriul cont, 
            // NU rapoarte de email, audit de tenant, notificări de tenant sau utilizatori de tenant.
            // Vom ascunde tot ce ține de tenant din Sistem pentru el.
            systemCategory.items = systemCategory.items.filter(item => 
                !['/admin/users', '/admin/audit-logs', '/admin/emails', '/admin/notifications', '/admin/settings'].includes(item.path)
            )
        }
    }

    // Adăugăm meniul SaaS Management doar dacă este Master Admin
    if (admin?.role === 'SUPER_ADMIN' || admin?.is_super_admin) {
        categories.push({
            id: 'saas',
            label: t('nav.cat_saas', 'Plateforme SaaS'),
            items: [
                { path: '/admin/organizations', icon: Globe, label: t('nav.organizations', 'Organisations (Tenants)') }
            ]
        })
    }

    const tenantFeatures = tenant?.features || []
    const hasLongTerm = tenant?.has_long_term_sites !== false
    const hasShortTerm = tenant?.has_short_term_interventions === true
    const isScreeds = hasShortTerm || tenantFeatures.includes('screeds') === true || tenant?.name?.toLowerCase().includes('davide')

    const isFeatureEnabled = (path) => {
        if (['/admin/sites', '/admin/site-photos'].includes(path)) return hasLongTerm
        if (path === '/admin/work-orders') return hasShortTerm
        if (path === '/admin/planning') return isScreeds
        if (path === '/admin/timesheets') return !tenantFeatures.includes('disable_timesheets')
        if (path === '/admin/logistica') return tenantFeatures.includes('logistica')
        if (['/admin/fleet', '/admin/transport', '/admin/tracking'].includes(path)) return tenantFeatures.includes('fleet')
        if (['/admin/warehouse', '/admin/material-requests'].includes(path)) return tenantFeatures.includes('warehouse') || tenant?.has_warehouse === true
        if (path === '/admin/accommodations') return tenantFeatures.includes('accommodations')
        if (['/admin/expenses', '/admin/import-factura'].includes(path)) return tenantFeatures.includes('expenses')
        if (path === '/admin/reports') return tenantFeatures.includes('reports')
        if (path === '/admin/invoicing') return tenantFeatures.includes('invoicing')
        if (path === '/admin/pricing-settings') return isScreeds
        return true
    }

    const filteredCategories = categories.map(cat => {
        let roleFilteredItems = admin?.role === 'LOGISTIC'
            ? cat.items.filter(item => ['/admin/warehouse', '/admin/import-factura', '/admin/fleet', '/admin/transport', '/admin/settings', '/admin/pricing-settings', '/admin/notifications'].includes(item.path))
            : cat.items
            
        let featureFilteredItems = roleFilteredItems.filter(item => isFeatureEnabled(item.path))

        return {
            ...cat,
            items: featureFilteredItems
        }
    }).filter(cat => {
        // Dacă e super admin FĂRĂ tenant selectat (fără subdomeniu), ascundem operațiunile (doar SaaS și System)
        if ((admin?.role === 'SUPER_ADMIN' || admin?.is_super_admin) && !currentSubdomain) {
            return ['saas', 'system'].includes(cat.id)
        }
        return cat.items.length > 0
    })

    const [expandedCategories, setExpandedCategories] = useState({ general: true, operations: true, logistics: true })

    // Auto-expand category based on current route
    useEffect(() => {
        setExpandedCategories(prev => {
            const next = { ...prev }
            let found = false
            filteredCategories.forEach(cat => {
                if (cat.items.some(item => location.pathname.startsWith(item.path))) {
                    next[cat.id] = true
                    found = true
                }
            })
            return found ? next : prev
        })
        
        // Auto-close sidebar on mobile & iPad/tablet after navigation
        if (typeof window !== 'undefined') {
            const isTouchTablet = window.matchMedia && window.matchMedia('(pointer: coarse)').matches
            if (window.innerWidth < 1280 || isTouchTablet) {
                setSidebarOpen(false)
            }
        }
    }, [location.pathname])

    const toggleCategory = (id) => {
        setExpandedCategories(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark'
        }
        return false
    })

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
            document.documentElement.setAttribute('data-theme', 'dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            document.documentElement.setAttribute('data-theme', 'light')
            localStorage.setItem('theme', 'light')
        }
    }, [darkMode])

    const pageTitle = (() => {
        const p = location.pathname;
        if (p.match(/\/(invoices|work-orders)\/[a-zA-Z0-9_-]+/)) return null;
        
        if (p.includes('/planning') || p === '/admin') return t('nav.planning', 'Planning');
        if (p.includes('/logistica')) return t('nav.logistics', 'Logistique');
        if (p.includes('/isoflex-history')) return t('nav.isoflex_history', 'Historique Isoflex');
        if (p.includes('/work-orders')) return t('nav.work_orders', 'Commandes');
        if (p.includes('/screed-analytics')) return t('nav.screed_analytics', 'Tableau de calcul');
        if (p.includes('/pricing-analytics')) return t('nav.pricing_analytics', 'Analyse Devis');
        if (p.includes('/timesheets')) return t('nav.timesheets', 'Pointages');
        if (p.includes('/reports')) return t('nav.reports', 'Rapports');
        if (p.includes('/sites')) return t('nav.sites', 'Chantiers');
        if (p.includes('/clients')) return t('nav.clients', 'Clients');
        if (p.includes('/employees')) return t('nav.employees', 'Employés');
        if (p.includes('/teams')) return t('nav.teams', 'Équipes');
        if (p.includes('/leaves')) return t('nav.leaves', 'Congés');
        if (p.includes('/accommodations')) return t('nav.accommodations', 'Hébergements');
        if (p.includes('/activities')) return t('nav.activities', 'Activités');
        if (p.includes('/site-photos')) return t('nav.site_photos', 'Photos Chantier');
        if (p.includes('/warehouse')) return t('nav.warehouse', 'Entrepôt');
        if (p.includes('/fleet')) return t('nav.fleet', 'Flotte');
        if (p.includes('/transport')) return t('nav.transport', 'Transport');
        if (p.includes('/material-requests')) return t('nav.material_requests', 'Demandes de matériel');
        if (p.includes('/expenses')) return t('nav.expenses', 'Dépenses');
        if (p.includes('/alerts')) return t('nav.alerts', 'Avis');
        if (p.includes('/emergencies')) return t('nav.emergencies', 'Urgences');
        if (p.includes('/complaints')) return t('nav.complaints', 'Plaintes');
        if (p.includes('/partners')) return t('nav.partners', 'Partenaires');
        if (p.includes('/users')) return t('nav.users', 'Utilisateurs');
        if (p.includes('/pricing-settings')) return t('nav.pricing_settings', 'Tarifs');
        if (p.includes('/settings')) return t('nav.settings', 'Paramètres');
        if (p.includes('/notifications')) return t('nav.notifications', 'Notifications');
        if (p.includes('/organizations')) return t('nav.organizations', 'Organisations');
        if (p.includes('/invoicing') || p.includes('/invoices')) return null;
        if (p.includes('/quotes')) return null;
        if (p.includes('/planning') || p === '/admin') return t('nav.planning', 'Planning');
        return null;
    })();

    return (
        <div
            className={`h-[100dvh] w-full ${darkMode ? 'bg-[#0C0C0E] text-[#F5F5F7]' : 'bg-[color:var(--ui-canvas)] text-[#1D1D1F]'} flex flex-col font-sans transition-colors duration-300 overflow-hidden`}
        >
            
                {/* Floating Exit Fullscreen Button when in iOS Chrome/Safari Simulated Fullscreen Mode */}
                {isSimulatedFullscreen && (
                    <button
                        type="button"
                        onClick={() => { void handleToggleFullscreen() }}
                        title={t('admin.exit_fullscreen', 'Quitter le mode Plein écran')}
                        aria-label={t('admin.exit_fullscreen', 'Quitter le mode Plein écran')}
                        className="hidden md:flex fixed top-2.5 right-2.5 z-[9990] w-9 h-9 rounded-full bg-slate-900/75 text-white backdrop-blur-xl border border-white/25 shadow-lg items-center justify-center cursor-pointer"
                    >
                        <Minimize2 className="w-4 h-4" />
                    </button>
                )}

                {/* Header Bar */}
                <header 
                    className={`apple-header-glass relative h-12 md:h-16 px-2.5 md:px-6 ${isSimulatedFullscreen ? 'hidden' : 'flex'} items-center justify-between z-40 shadow-md transition-colors md:mx-4 md:mt-3 md:mb-3 md:rounded-[24px] shrink-0 ${
                        darkMode
                            ? 'bg-[#1C1C1E] text-[#F5F5F7] border border-white/10'
                            : 'bg-[color:var(--tenant-accent)] text-[color:var(--tenant-accent-fg)]'
                    }`}
                >
                    <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
                         <button 
                             type="button"
                             onClick={() => setSidebarOpen(!sidebarOpen)}
                             className="p-1.5 rounded-lg opacity-85 hover:opacity-100 hover:bg-black/10 transition-colors hidden md:block"
                             title={sidebarOpen ? t('admin.collapse_menu', 'Réduire le menu') : t('admin.expand_menu', 'Agrandir le menu')}
                             aria-label={sidebarOpen ? t('admin.collapse_menu', 'Réduire le menu') : t('admin.expand_menu', 'Agrandir le menu')}
                         >
                             <Menu className="w-5 h-5" />
                         </button>
                         
                         {/* Mobile Back Button */}
                         {location.pathname !== '/admin/planning' && location.pathname !== '/admin' && (
                             <button
                                 type="button"
                                 onClick={() => {
                                     if (location.pathname.startsWith('/admin/chats/') && location.pathname !== '/admin/chats') {
                                         navigate('/admin/chats');
                                     } else {
                                         navigate(-1);
                                     }
                                 }}
                                 aria-label={t('common.back', 'Retour')}
                                 className="md:hidden p-1 -ml-1 opacity-90 hover:opacity-100 transition-colors"
                             >
                                 <ChevronLeft className="w-6 h-6" />
                             </button>
                         )}

                     {/* Desktop Logo — Animated SVG for Davide Chape (Click from any page goes Home to Planning Today) */}
                     <button
                         type="button"
                         onClick={() => {
                             setSidebarOpen(false)
                             setIsMobileNavCompact(false)
                             window.dispatchEvent(new CustomEvent('jump-to-calendar-date', { detail: { date: new Date().toISOString() } }))
                             const mainEl = document.querySelector('.tps-main-workspace')
                             if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' })
                             navigate('/admin/planning')
                         }}
                         className="hidden md:flex items-center justify-center mr-2 cursor-pointer group bg-transparent border-0 p-0 outline-none"
                         title="Davide Chape — Planning (Acasă)"
                         aria-label="Davide Chape — Planning"
                     >
                         {tenant ? (
                             (tenant.slug?.toLowerCase().includes('davide') || tenant.name?.toLowerCase().includes('davide') || (tenant.logo_url && tenant.logo_url.includes('davide_logo'))) ? (
                                 <img
                                     src="/davide_logo.svg?v=anim30s"
                                     alt={tenant.name || 'Davide Chape'}
                                     className="h-10 max-h-12 w-auto object-contain bg-transparent transition-transform duration-300 group-hover:scale-[1.03] pointer-events-none select-none"
                                 />
                             ) : tenant.logo_url ? (
                                 <img 
                                     src={getImageUrl(tenant.logo_url)} 
                                     alt={tenant.name || 'Logo'} 
                                     className="h-10 max-h-12 w-auto object-contain bg-transparent transition-transform duration-300 group-hover:scale-[1.03] pointer-events-none select-none"
                                     onError={(e) => {
                                         if (!e.currentTarget.dataset.failedOnce) {
                                             e.currentTarget.dataset.failedOnce = 'true';
                                             e.currentTarget.src = '/davide_logo.svg?v=anim30s';
                                         }
                                     }}
                                 />
                             ) : (
                                 <div className="font-extrabold text-xl text-white px-2">{tenant.name || 'Tenant'}</div>
                             )
                         ) : (
                             <img src="/getapp_smart_timesheet_icon.png" alt="Smart Timesheet" className="h-10 object-contain opacity-70 pointer-events-none select-none" />
                         )}
                     </button>

                     {/* Mobile Logo — Tap from ANY page goes Home to Planning Today */}
                     <button
                         type="button"
                         onClick={() => {
                             setSidebarOpen(false)
                             setIsMobileNavCompact(false)
                             window.dispatchEvent(new CustomEvent('jump-to-calendar-date', { detail: { date: new Date().toISOString() } }))
                             const mainEl = document.querySelector('.tps-main-workspace')
                             if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' })
                             navigate('/admin/planning')
                         }}
                         aria-label="Davide Chape — Planning"
                         className="md:hidden flex items-center justify-center mr-1 py-1 px-1 cursor-pointer shrink-0 bg-transparent border-0 outline-none active:scale-95 transition-transform"
                     >
                         {tenant ? (
                             (tenant.slug?.toLowerCase().includes('davide') || tenant.name?.toLowerCase().includes('davide') || (tenant.logo_url && tenant.logo_url.includes('davide_logo'))) ? (
                                 <img
                                     src="/davide_logo.svg?v=anim30s"
                                     alt={tenant.name || 'Davide Chape'}
                                     className="h-6 max-h-7 w-auto object-contain bg-transparent pointer-events-none select-none"
                                 />
                             ) : tenant.logo_url ? (
                                 <img 
                                     src={getImageUrl(tenant.logo_url)} 
                                     alt={tenant.name || 'Logo'} 
                                     className="h-6 max-h-7 w-auto object-contain bg-transparent pointer-events-none select-none"
                                     onError={(e) => {
                                         if (!e.currentTarget.dataset.failedOnce) {
                                             e.currentTarget.dataset.failedOnce = 'true';
                                             e.currentTarget.src = '/davide_logo.svg?v=anim30s';
                                         }
                                     }}
                                 />
                             ) : (
                                 <div className="font-extrabold text-[13px] leading-tight tracking-tighter text-white truncate max-w-[90px]">{tenant.name || 'Tenant'}</div>
                             )
                         ) : (
                             <img src="/getapp_smart_timesheet_icon.png" alt="Smart Timesheet" className="h-6 object-contain opacity-70 pointer-events-none select-none" />
                         )}
                     </button>

                    </div>

                    {/* Apple Dynamic Island — Starts as compact icon, expands to broadcast latest notifications, then retracts back to icon */}
                    {(isScreeds || currentSubdomain) && (
                        <div className="flex flex-1 items-center justify-center px-1.5 md:px-4 min-w-0 z-50">
                            <HeaderDynamicIsland />
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 sm:gap-5 shrink-0">
                        {/* Stacked Clock (Time top, Date bottom, no capsule) + User Location Weather next to it */}
                        <div className="hidden md:flex items-center gap-4 text-white select-none">
                            {(() => {
                                const langMap = {
                                    'fr': 'fr-FR',
                                    'nl': 'nl-NL',
                                    'ro': 'ro-RO',
                                    'en': 'en-US',
                                    'de': 'de-DE'
                                };
                                const locale = langMap[i18n.language] || 'fr-FR';
                                const accessTz = userWeather?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                                const tzOpts = accessTz ? { timeZone: accessTz } : {};
                                const timeStr = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', ...tzOpts });
                                const dateStr = now.toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', ...tzOpts });
                                return (
                                    <div className="flex flex-col items-end justify-center leading-tight tabular-nums">
                                        <span className="text-[15px] font-black tracking-tight text-white">
                                            {timeStr}
                                        </span>
                                        <span className="text-[11px] font-semibold text-white/80">
                                            {dateStr}
                                        </span>
                                    </div>
                                );
                            })()}

                            {userWeather && (() => {
                                const code = userWeather.code;
                                let WeatherIcon = Sun;
                                let iconColor = 'text-amber-300';
                                if (code >= 95) { WeatherIcon = CloudLightning; iconColor = 'text-amber-300'; }
                                else if (code >= 71 && code <= 86) { WeatherIcon = CloudSnow; iconColor = 'text-sky-200'; }
                                else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) { WeatherIcon = CloudRain; iconColor = 'text-sky-200'; }
                                else if (code >= 3 && code <= 48) { WeatherIcon = Cloud; iconColor = 'text-white/90'; }
                                else if (code === 1 || code === 2) { WeatherIcon = CloudSun; iconColor = 'text-amber-200'; }

                                return (
                                    <>
                                        <div className="w-[1px] h-7 bg-white/20" />
                                        <button
                                            type="button"
                                            onClick={() => { void fetchUserLocationWeather(true) }}
                                            title={`${userWeather.city}: ${userWeather.temp}°C · ${userWeather.wind} km/h (Click pentru actualizare GPS)`}
                                            className="flex items-center gap-2 text-left cursor-pointer hover:opacity-90 transition-opacity"
                                        >
                                            <WeatherIcon className={`w-5 h-5 shrink-0 ${iconColor}`} />
                                            <div className="flex flex-col justify-center leading-tight tabular-nums">
                                                <span className="text-[15px] font-black tracking-tight text-white">
                                                    {userWeather.temp}°C
                                                </span>
                                                <span className="text-[11px] font-semibold text-white/80 max-w-[115px] truncate">
                                                    {userWeather.city}
                                                </span>
                                            </div>
                                        </button>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Right side items: Language, Theme, Notifications */}
                        <div className="flex items-center gap-2.5 md:gap-2">
                           <div className="hidden md:block">
                               <LanguageSelector variant="dark" className="!text-white !border-white/30 !bg-white/10 hover:!bg-white/20" />
                           </div>
                           <div className="w-[1px] h-5 bg-white/20 mx-1 hidden md:block"></div>
                           
                           {!(admin?.role === 'SUPER_ADMIN' || admin?.is_super_admin) && (
                               <>
                                   <button
                                       type="button"
                                       onClick={() => setShowGlobalSearch(true)}
                                       title={t('search.placeholder', 'Rechercher (Cmd+K)')}
                                       aria-label={t('search.placeholder', 'Rechercher (Cmd+K)')}
                                       className="hidden md:flex w-9 h-9 rounded-full items-center justify-center border border-current/25 bg-black/10 hover:bg-black/20 transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] cursor-pointer shrink-0"
                                   >
                                       <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
                                   </button>
                               </>
                           )}

                           <button
                               type="button"
                               aria-pressed={isAppFullscreen}
                               onClick={() => { void handleToggleFullscreen() }}
                               title={isAppFullscreen ? t('admin.exit_fullscreen', 'Quitter le mode Plein écran (Esc)') : t('admin.enter_fullscreen', 'Activer le mode Plein écran (5K / Ultra-Wide)')}
                               aria-label={isAppFullscreen ? t('admin.exit_fullscreen', 'Quitter le mode Plein écran') : t('admin.enter_fullscreen', 'Plein écran')}
                               className={`hidden md:flex w-9 h-9 rounded-full items-center justify-center border transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] cursor-pointer shrink-0 ${
                                   isAppFullscreen
                                       ? 'bg-white text-[#111113] border-white shadow-md'
                                       : 'border-current/25 bg-black/10 hover:bg-black/20'
                               }`}
                           >
                               {isAppFullscreen ? <Minimize2 className="w-4 h-4 shrink-0" aria-hidden="true" /> : <Maximize2 className="w-4 h-4 shrink-0" aria-hidden="true" />}
                           </button>

                           <button
                               type="button"
                               onClick={() => setDarkMode(!darkMode)}
                               title={darkMode ? t('admin.light_mode', 'Mode Clair') : t('admin.dark_mode', 'Mode Sombre')}
                               aria-label={darkMode ? t('admin.light_mode', 'Mode Clair') : t('admin.dark_mode', 'Mode Sombre')}
                               className="w-9 h-9 rounded-full flex items-center justify-center border border-current/25 bg-black/10 hover:bg-black/20 transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] cursor-pointer shrink-0"
                           >
                               {darkMode
                                   ? <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />
                                   : <Sun className="w-4 h-4 shrink-0" aria-hidden="true" />
                               }
                           </button>

                           {!(admin?.role === 'SUPER_ADMIN' || admin?.is_super_admin) && !isScreeds && (
                               <>
                                   <button
                                       type="button"
                                       onClick={() => navigate('/admin/complaints')}
                                       className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full border border-current/25 bg-black/10 transition-colors relative hover:bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] cursor-pointer shrink-0"
                                       title={t('admin.new_complaints', 'Nouvelles plaintes')}
                                       aria-label={t('admin.new_complaints', 'Nouvelles plaintes')}
                                   >
                                       <MessageSquareWarning className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" aria-hidden="true" />
                                       {openComplaintsCount > 0 && (
                                           <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-orange-500 text-white text-[9px] font-bold rounded-full border-2 border-white dark:border-slate-900 tabular-nums">
                                               {openComplaintsCount > 99 ? '99+' : openComplaintsCount}
                                           </span>
                                       )}
                                   </button>
                               </>
                           )}

                           {!(admin?.role === 'SUPER_ADMIN' || admin?.is_super_admin) && !(isScreeds || currentSubdomain) && (
                               <HeaderNotifications />
                           )}
                        </div>
                        
                        <div className="w-[1px] h-8 bg-current/20 hidden sm:block"></div>

                        {/* User Profile */}
                        <div className="hidden sm:flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold leading-none">{admin?.full_name}</p>
                                <button type="button" onClick={handleLogout} className="text-xs opacity-85 hover:opacity-100 font-semibold flex items-center justify-end w-full gap-1 mt-1 cursor-pointer hover:underline group">
                                    <LogOut className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform"/> {t('admin.logout', 'Déconnexion')}
                                </button>
                            </div>
                            {admin?.avatar_path ? (
                                <img 
                                    src={admin.avatar_path.startsWith('http') ? admin.avatar_path : `${API_BASE}${admin.avatar_path}`}
                                    alt={admin.full_name}
                                    className="hidden sm:block w-9 h-11 rounded-lg object-cover object-[center_20%] ring-2 ring-white/20 shadow-md transition-all cursor-pointer hover:scale-105"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                />
                            ) : null}
                            <div className={`w-9 h-9 bg-black/15 rounded-full items-center justify-center font-bold shadow-sm cursor-pointer hover:bg-black/25 transition-all border border-current/25 ${admin?.avatar_path ? 'hidden' : 'hidden sm:flex'}`}>
                                {admin?.full_name?.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>


            {/* Layout below header */}
            <div className="flex-1 flex min-h-0 relative">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div 
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[75] transition-opacity" 
                    onClick={() => setSidebarOpen(false)} 
                />
            )}

            {/* Sidebar */}
            <aside className={`
                ${sidebarOpen ? 'w-56 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'} 
                max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[80]
                ${darkMode
                    ? 'bg-[#1C1C1E] border border-white/10 text-[#F5F5F7]'
                    : 'bg-[color:var(--tenant-accent)] text-[color:var(--tenant-accent-fg)]'
                } shadow-2xl
                md:mb-3 md:ml-4 md:h-[calc(100dvh-100px)] md:rounded-[24px] max-md:border-r transition-all duration-300 flex flex-col relative shrink-0 overflow-hidden
            `}>
                
                {/* Mobile Quick Actions inside Sidebar (Language + Logout) */}
                <div className="md:hidden px-3 pt-3 pb-2 border-b border-white/15 flex items-center justify-between gap-2">
                    <LanguageSelector variant="dark" className="!text-white !border-white/30 !bg-white/10" />
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="h-8 px-3 rounded-full bg-white/10 hover:bg-rose-500/80 text-white text-xs font-bold flex items-center gap-1.5 border border-white/25 transition-colors"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('admin.logout', 'Déconnexion')}</span>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {filteredCategories.map((cat, index) => (
                        <div key={cat.id} className="space-y-1">
                            {/* Category Header (Only visible if sidebar open) */}
                            {sidebarOpen && (
                                <div 
                                    onClick={() => toggleCategory(cat.id)}
                                    className="flex items-center justify-between px-2 py-1.5 mb-1 cursor-pointer group select-none"
                                >
                                    <span className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${darkMode ? 'text-[#8E8E93] group-hover:text-[#F5F5F7]' : 'opacity-75 group-hover:opacity-100'}`}>
                                        {cat.label}
                                    </span>
                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedCategories[cat.id] ? 'rotate-90' : ''} ${darkMode ? 'text-[#8E8E93] group-hover:text-[#F5F5F7]' : 'opacity-75 group-hover:opacity-100'}`} />
                                </div>
                            )}

                            {/* Items Container */}
                            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${sidebarOpen ? (expandedCategories[cat.id] ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0') : 'max-h-none opacity-100'}`}>
                                {cat.items.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) => {
                                            let finalIsActive = isActive;
                                            if (location.pathname.startsWith('/admin/work-orders') && location.state?.from === '/admin/quotes') {
                                                if (item.path === '/admin/quotes') finalIsActive = true;
                                                if (item.path === '/admin/work-orders') finalIsActive = false;
                                            }
                                            return `flex items-center gap-3 px-3 py-2.5 rounded-full transition-all duration-200 ${finalIsActive
                                                ? (darkMode
                                                    ? 'ui-segment-active font-bold'
                                                    : 'bg-white !text-[#111113] font-bold shadow-md')
                                                : (darkMode
                                                    ? 'text-[#AEAEB2] font-medium hover:bg-white/10 hover:text-white'
                                                    : 'opacity-90 font-medium hover:bg-black/10 hover:opacity-100')
                                            }`
                                        }}
                                        title={!sidebarOpen ? item.label : undefined}
                                        aria-label={item.label}
                                    >
                                        <item.icon className="w-5 h-5 shrink-0" />
                                        {sidebarOpen && <span className="text-sm truncate flex-1">{item.label}</span>}
                                        
                                        {/* Badge Support */}
                                        {sidebarOpen && item.badge > 0 && (
                                            <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                {item.badge > 99 ? '99+' : item.badge}
                                            </span>
                                        )}
                                        {!sidebarOpen && item.badge > 0 && (
                                            <span className="absolute left-7 top-1 w-2 h-2 bg-orange-500 rounded-full" />
                                        )}
                                    </NavLink>
                                ))}
                            </div>

                            {/* Separator when collapsed */}
                            {!sidebarOpen && index < filteredCategories.length - 1 && (
                                <div className={`h-px my-3 mx-2 ${darkMode ? 'bg-white/10' : 'bg-current/15'}`} />
                            )}
                        </div>
                    ))}
                </nav>

                {/* Footer Brand */}
                <div className={`py-5 px-4 border-t shrink-0 flex flex-col items-center justify-center gap-2 w-full overflow-hidden ${darkMode ? 'border-white/10' : 'border-current/15'}`}>
                    <div 
                        className="flex items-center justify-center w-full"
                        title="Smart Timesheet"
                    >
                        {sidebarOpen ? (
                             <div className="bg-slate-900/40 px-4 py-2 rounded-xl shadow-inner flex items-center justify-center">
                                 <img src="https://getapp.ro/logo_getapp_original.png" alt="GetApp Smart Timesheet" className="h-6 w-auto object-contain" />
                             </div>
                        ) : (
                             <div className="bg-slate-900/40 p-1.5 rounded-xl shadow-inner flex items-center justify-center">
                                 <img src="/getapp_smart_timesheet_icon.png" alt="Smart Timesheet Icon" className="w-8 h-8 object-contain" />
                             </div>
                        )}
                    </div>
                    {sidebarOpen && (
                        <div className={`text-[10px] tabular-nums mt-1 opacity-70 select-none text-center ${darkMode ? 'text-slate-400' : 'text-white'}`}>
                            Build v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}
                            <br />
                            {typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : ''}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
                {/* Main View Outlet */}
                <main
                    onScroll={handleWorkspaceScroll}
                    className={`tps-main-workspace flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar transition-colors ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
                >
                    {/* Page Content with smooth fade transition */}
                    <div
                        key={location.pathname}
                        style={{
                            animation: 'pageFade 0.2s ease both'
                        }}
                    >
                        <style>{`
                            @keyframes pageFade {
                                from { opacity: 0; }
                                to   { opacity: 1; }
                            }
                            .tps-main-inner > div:not(.bg-white):not([class*="rounded-"]) {
                                max-width: 100% !important;
                                margin-left: 0 !important;
                                margin-right: 0 !important;
                                padding-left: 0 !important;
                                padding-right: 0 !important;
                                padding-top: 0 !important;
                            }
                        `}</style>
                        <div className="tps-main-inner px-2.5 pt-2 pb-20 md:p-4 md:pt-0 md:pb-24 w-full">
                            <Suspense fallback={<div className="py-16 flex items-center justify-center"><div className="w-7 h-7 border-2 border-[color:var(--tenant-bg)] border-t-transparent rounded-full animate-spin" /></div>}>
                                <Outlet />
                            </Suspense>
                        </div>
                    </div>
                </main>
            </div>

            {/* Bottom Navigation Bar (Admin Mobile — Same Color & Opacity as Header in Normal Mode; Hides Completely on Scroll Down, Reappears on Scroll Up) */}
            <nav 
                className={`apple-header-glass md:hidden fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] py-1.5 px-2 rounded-full flex justify-between items-center z-[70] shadow-[0_14px_34px_rgba(15,23,42,0.28)] transition-all duration-300 ${
                    darkMode
                        ? 'bg-[#1C1C1E] text-[#F5F5F7] border border-white/10'
                        : 'bg-[color:var(--tenant-accent)] text-[color:var(--tenant-accent-fg)] border-0'
                } ${
                    isMobileNavCompact
                        ? 'translate-y-[145%] opacity-0 pointer-events-none'
                        : 'translate-y-0 opacity-100 pointer-events-auto'
                }`}
            >
                {/* 1. Harta (Live Fleet) */}
                <NavLink
                    to="/admin/tracking"
                    className={({isActive}) => `flex flex-col items-center justify-center py-1 rounded-full flex-1 transition-all duration-200 ${isActive ? 'bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]' : 'text-white/80 hover:text-white'}`}
                >
                    <MapIcon className="w-5 h-5" />
                    <span className="text-[10px] font-semibold text-center leading-tight mt-0.5">
                        {t('live.fleet_map_short', 'Carte')}
                    </span>
                </NavLink>

                {/* 2. Devize */}
                <NavLink
                    to="/admin/quotes"
                    className={({isActive}) => `flex flex-col items-center justify-center py-1 rounded-full flex-1 transition-all duration-200 ${isActive ? 'bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]' : 'text-white/80 hover:text-white'}`}
                >
                    <Calculator className="w-5 h-5" />
                    <span className="text-[10px] font-semibold text-center leading-tight mt-0.5">
                        {i18n.language?.startsWith('ro') ? 'Devize' : 'Devis'}
                    </span>
                </NavLink>

                {/* 3. Planning */}
                <NavLink
                    to="/admin/planning"
                    className={({isActive}) => `flex flex-col items-center justify-center py-1 rounded-full flex-1 transition-all duration-200 ${isActive ? 'bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]' : 'text-white/80 hover:text-white'}`}
                >
                    <CalendarDays className="w-5 h-5" />
                    <span className="text-[10px] font-semibold text-center leading-tight mt-0.5">
                        Planning
                    </span>
                </NavLink>

                {/* 4. Logistique */}
                <NavLink
                    to="/admin/logistica"
                    className={({isActive}) => `flex flex-col items-center justify-center py-1 rounded-full flex-1 transition-all duration-200 ${isActive ? 'bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]' : 'text-white/80 hover:text-white'}`}
                >
                    <Truck className="w-5 h-5" />
                    <span className="text-[10px] font-semibold text-center leading-tight mt-0.5 truncate max-w-[60px]">
                        {t('nav.logistics', 'Logistique')}
                    </span>
                </NavLink>

                {/* 5. Chat */}
                <NavLink
                    to="/admin/chats"
                    className={({isActive}) => `flex flex-col items-center justify-center py-1 rounded-full flex-1 transition-all duration-200 ${isActive ? 'bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]' : 'text-white/80 hover:text-white'}`}
                >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-[10px] font-semibold text-center leading-tight mt-0.5">
                        Chat
                    </span>
                </NavLink>

                {/* 6. Menu — Burger Icon Only (Zero Text) */}
                <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    aria-label={t('nav.menu', 'Menu')}
                    title={t('nav.menu', 'Menu')}
                    className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center transition-all duration-200 text-white/85 hover:text-white active:bg-white/20 cursor-pointer"
                >
                    <Menu className="w-5 h-5" />
                </button>

            </nav>

            {/* Birthday Popup */}
            {showBirthdayPopup && birthdayUsers.length > 0 && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-md" onClick={() => setShowBirthdayPopup(false)}></div>
                    <div className="bg-white dark:bg-slate-900 rounded-[24px] border-[1.5px] border-slate-300 dark:border-slate-700 shadow-[0_32px_80px_-12px_rgba(15,23,42,0.45),0_0_0_1px_rgba(15,23,42,0.08)] w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-center">
                            <div className="w-16 h-16 bg-slate-200 dark:bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                                <span className="text-3xl"></span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1">{t('admin.happy_birthday', 'Joyeux anniversaire !')}</h3>
                            <p className="text-pink-100 text-sm">{t('admin.celebrating_today', 'Aujourd\'hui c\'est l\'anniversaire de :')}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {birthdayUsers.map(u => (
                                <div key={u.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-[16px] border border-slate-200 dark:border-slate-700">
                                    <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold text-lg overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm shrink-0">
                                        {u.avatar_path ? <img src={u.avatar_path.startsWith('http') ? u.avatar_path : `${API_BASE}${u.avatar_path}`} className="w-full h-full object-cover" alt="" /> : u.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{u.full_name}</p>
                                        <p className="text-xs text-slate-500">{u.employee_code} • {Math.floor((new Date() - new Date(u.birth_date)) / 31557600000)} {t('admin.years', 'ans')}</p>
                                    </div>
                                </div>
                            ))}
                            <button 
                                onClick={() => setShowBirthdayPopup(false)}
                                className="w-full h-11 bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-[13px] transition-colors mt-2"
                            >
                                {t('common.close', 'Fermer')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            <GlobalSearch 
                isOpen={showGlobalSearch} 
                onClose={() => setShowGlobalSearch(false)} 
            />
        </div>
    )
}

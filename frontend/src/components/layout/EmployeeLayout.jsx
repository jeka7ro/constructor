import React, { useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Wrench, AlertTriangle, Calendar, ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTenantStore } from '../../store/tenantStore'
import api from '../../lib/api'

export default function EmployeeLayout() {
    const { t } = useTranslation()
    const location = useLocation()
    const navigate = useNavigate()
    const isHome = location.pathname === '/'
    const tenant = useTenantStore((state) => state.tenant)
    const hasLongTerm = tenant?.has_long_term_sites !== false

    // ── Live Location Tracking (pasiv) ───────────────────────────────────────
    // Trimite pozitia GPS la server din 60 in 60s, indiferent de modul de lucru
    const locationRef = useRef(null)
    useEffect(() => {
        if (!navigator.geolocation) return

        const watchId = navigator.geolocation.watchPosition(
            (pos) => { locationRef.current = pos.coords },
            () => {},
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        )
        return () => navigator.geolocation.clearWatch(watchId)
    }, [])

    useEffect(() => {
        const sendLocation = async () => {
            if (document.visibilityState !== 'visible') return
            const coords = locationRef.current
            if (!coords) return
            try {
                await api.post('/worker/location', {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    speed: coords.speed ?? null,
                    accuracy: coords.accuracy ?? null
                })
            } catch (e) { /* silently fail */ }
        }
        sendLocation()
        const interval = setInterval(sendLocation, 60000)
        const onVisible = () => { if (document.visibilityState === 'visible') sendLocation() }
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [])
    // ─────────────────────────────────────────────────────────────────────────

    const handleHomePress = async () => {
        if (isHome) {
            try {
                if ('caches' in window) {
                    const keys = await caches.keys()
                    await Promise.all(keys.map(k => caches.delete(k)))
                }
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations()
                    await Promise.all(regs.map(r => r.unregister()))
                }
            } catch (e) { /* ignore */ }
            window.location.reload(true)
        } else {
            navigate('/')
        }
    }

    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        const base = API_BASE.replace(/\/$/, '');
        const path = url.startsWith('/') ? url : `/${url}`;
        return `${base}${path}`;
    };

    return (
        <div className="flex flex-col min-h-[100dvh] bg-slate-50">
            {/* Main Content Area */}
            <main className="flex-grow flex flex-col pb-24">
                <Outlet />
            </main>

            {/* Bottom Navigation Bar */}
            <nav 
                className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-4 border-b-0 border-white/20 px-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex justify-between items-center shadow-[0_-10px_25px_rgba(0,0,0,0.2)] z-50 rounded-t-3xl transition-colors duration-300"
                style={{ backgroundColor: tenant?.primary_color || '#2563EB' }}
            >

                {/* 1. Istoric sau Spacer */}
                {hasLongTerm ? (
                    <NavLink
                        to="/history"
                        className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-white scale-110 drop-shadow-md' : 'text-white/60'}`}
                    >
                        <Calendar className="w-7 h-7 mb-1.5" />
                        <span className="text-xs font-bold">{t('nav.history', 'Istoric')}</span>
                    </NavLink>
                ) : (
                    <NavLink
                        to="/istoric"
                        className={({isActive}) => `flex flex-col items-center p-2 w-[80px] transition-all ${isActive ? 'text-white scale-110 drop-shadow-md' : 'text-white/60'}`}
                    >
                        <Calendar className="w-7 h-7 mb-1.5" />
                        <span className="text-[10px] font-bold text-center leading-tight">{t('nav.history', 'Istoric')}</span>
                    </NavLink>
                )}

                {/* Slot 2: For LongTerm it's Comenzi, for ShortWorks it's Acasa (Middle) */}
                {hasLongTerm ? (
                    <NavLink
                        to="/comenzi"
                        className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-white scale-110 drop-shadow-md' : 'text-white/60'}`}
                    >
                        <ClipboardList className="w-7 h-7 mb-1.5" />
                        <span className="text-xs font-bold">{t('nav.work_orders', 'Comenzi')}</span>
                    </NavLink>
                ) : (
                    <div className="relative flex justify-center w-[96px]">
                        <button
                            onClick={handleHomePress}
                            style={{ backgroundColor: tenant?.primary_color || '#2563EB' }}
                            className={`absolute -top-14 flex flex-col items-center justify-center w-[76px] h-[76px] text-white rounded-full transition-all active:scale-95 border-4 border-white backdrop-blur-xl shadow-[0_0_20px_rgba(255,255,255,1),inset_0_2px_6px_rgba(255,255,255,0.4)] ${isHome ? 'scale-105' : ''}`}
                        >
                            {tenant?.favicon_url ? (
                                <img src={getImageUrl(tenant.favicon_url)} alt="Favicon" className="w-9 h-9 object-contain drop-shadow-md rounded-xl" />
                            ) : tenant?.logo_url ? (
                                <img src={getImageUrl(tenant.logo_url)} alt="Logo" className="w-10 h-10 object-contain drop-shadow-md rounded-xl" />
                            ) : (
                                <Home className="w-8 h-8 drop-shadow-md text-white" />
                            )}
                        </button>
                    </div>
                )}

                {/* Slot 3: For LongTerm it's Acasa (Middle), for ShortWorks it's Comenzi de lucru */}
                {hasLongTerm ? (
                    <div className="relative flex justify-center w-[96px]">
                        <button
                            onClick={handleHomePress}
                            style={{ backgroundColor: tenant?.primary_color || '#2563EB' }}
                            className={`absolute -top-14 flex flex-col items-center justify-center w-[76px] h-[76px] text-white rounded-full transition-all active:scale-95 border-4 border-white backdrop-blur-xl shadow-[0_0_20px_rgba(255,255,255,1),inset_0_2px_6px_rgba(255,255,255,0.4)] ${isHome ? 'scale-105' : ''}`}
                        >
                            {tenant?.favicon_url ? (
                                <img src={getImageUrl(tenant.favicon_url)} alt="Favicon" className="w-9 h-9 object-contain drop-shadow-md rounded-xl" />
                            ) : tenant?.logo_url ? (
                                <img src={getImageUrl(tenant.logo_url)} alt="Logo" className="w-10 h-10 object-contain drop-shadow-md rounded-xl" />
                            ) : (
                                <Home className="w-8 h-8 drop-shadow-md text-white" />
                            )}
                        </button>
                    </div>
                ) : (
                    <NavLink
                        to="/comenzi"
                        className={({isActive}) => `flex flex-col items-center p-2 w-[80px] transition-all ${isActive ? 'text-white scale-110 drop-shadow-md' : 'text-white/60'}`}
                    >
                        <ClipboardList className="w-7 h-7 mb-1.5" />
                        <span className="text-[10px] font-bold text-center leading-tight">{t('nav.work_orders_full', 'Comenzi de lucru')}</span>
                    </NavLink>
                )}

                {/* 4. Inventar */}
                {hasLongTerm && (
                    <NavLink
                        to="/my-inventory"
                        className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-white scale-110 drop-shadow-md' : 'text-white/60'}`}
                    >
                        <Wrench className="w-7 h-7 mb-1.5" />
                        <span className="text-xs font-bold">{t('nav.inventory', 'Inventar')}</span>
                    </NavLink>
                )}

                {/* 5. Sesizari */}
                {hasLongTerm && (
                    <NavLink
                        to="/sesizari"
                        className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-white scale-110 drop-shadow-md' : 'text-white/60'}`}
                    >
                        <AlertTriangle className="w-7 h-7 mb-1.5" />
                        <span className="text-xs font-bold">{t('nav.complaints', 'Sesizări')}</span>
                    </NavLink>
                )}
            </nav>
        </div>
    )
}

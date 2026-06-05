import React from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Wrench, AlertTriangle, Calendar, ClipboardList } from 'lucide-react'
import { useTenantStore } from '../../store/tenantStore'

export default function EmployeeLayout() {
    const location = useLocation()
    const navigate = useNavigate()
    const isHome = location.pathname === '/'
    const tenant = useTenantStore((state) => state.tenant)
    const hasLongTerm = tenant?.has_long_term_sites !== false

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

            {/* Bottom Navigation Bar (Glossy Glass Theme) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-blue-100/40 backdrop-blur-xl border-4 border-b-0 border-white/80 px-2 py-3 flex justify-between items-center shadow-[0_-10px_25px_rgba(59,130,246,0.5)] z-50 rounded-t-3xl">

                {/* 1. Istoric */}
                <NavLink
                    to="/history"
                    className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-blue-700 scale-110 drop-shadow-md' : (isHome ? 'text-blue-600/90' : 'text-slate-400')}`}
                >
                    <Calendar className="w-7 h-7 mb-1.5" />
                    <span className="text-xs font-bold">Istoric</span>
                </NavLink>

                {/* Slot 2: For LongTerm it's Comenzi, for ShortWorks it's Acasa (Middle) */}
                {hasLongTerm ? (
                    <NavLink
                        to="/comenzi"
                        className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-green-700 scale-110 drop-shadow-md' : (isHome ? 'text-green-600/90' : 'text-slate-400')}`}
                    >
                        <ClipboardList className="w-7 h-7 mb-1.5" />
                        <span className="text-xs font-bold">Comenzi</span>
                    </NavLink>
                ) : (
                    <div className="relative flex justify-center w-[96px]">
                        <button
                            onClick={handleHomePress}
                            className={`absolute -top-14 flex flex-col items-center justify-center w-[84px] h-[84px] text-white rounded-full transition-all active:scale-95 border-4 border-white/80 backdrop-blur-xl bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 shadow-[0_10px_25px_rgba(59,130,246,0.6),inset_0_2px_6px_rgba(255,255,255,0.9),inset_0_-2px_6px_rgba(0,0,0,0.2)] bg-[color:var(--mobile-bg)] ${isHome ? 'ring-4 ring-[color:var(--mobile-bg)] scale-105' : 'ring-2 ring-[color:var(--mobile-bg)] opacity-90'}`}
                            style={{ '--mobile-bg': tenant?.primary_color || '#2563EB' }}
                        >
                            {tenant?.favicon_url ? (
                                <img src={getImageUrl(tenant.favicon_url)} alt="Favicon" className="w-10 h-10 object-contain drop-shadow-md rounded-xl" />
                            ) : tenant?.logo_url ? (
                                <img src={getImageUrl(tenant.logo_url)} alt="Logo" className="w-12 h-12 object-contain drop-shadow-md rounded-xl" />
                            ) : (
                                <Home className="w-10 h-10 drop-shadow-md" />
                            )}
                        </button>
                    </div>
                )}

                {/* Slot 3: For LongTerm it's Acasa (Middle), for ShortWorks it's Comenzi de lucru */}
                {hasLongTerm ? (
                    <div className="relative flex justify-center w-[96px]">
                        <button
                            onClick={handleHomePress}
                            className={`absolute -top-14 flex flex-col items-center justify-center w-[84px] h-[84px] text-white rounded-full transition-all active:scale-95 border-4 border-white/80 backdrop-blur-xl bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 shadow-[0_10px_25px_rgba(59,130,246,0.6),inset_0_2px_6px_rgba(255,255,255,0.9),inset_0_-2px_6px_rgba(0,0,0,0.2)] bg-[color:var(--mobile-bg)] ${isHome ? 'ring-4 ring-[color:var(--mobile-bg)] scale-105' : 'ring-2 ring-[color:var(--mobile-bg)] opacity-90'}`}
                            style={{ '--mobile-bg': tenant?.primary_color || '#2563EB' }}
                        >
                            {tenant?.favicon_url ? (
                                <img src={getImageUrl(tenant.favicon_url)} alt="Favicon" className="w-10 h-10 object-contain drop-shadow-md rounded-xl" />
                            ) : tenant?.logo_url ? (
                                <img src={getImageUrl(tenant.logo_url)} alt="Logo" className="w-12 h-12 object-contain drop-shadow-md rounded-xl" />
                            ) : (
                                <Home className="w-10 h-10 drop-shadow-md" />
                            )}
                        </button>
                    </div>
                ) : (
                    <NavLink
                        to="/comenzi"
                        className={({isActive}) => `flex flex-col items-center p-2 w-[80px] transition-all ${isActive ? 'text-green-700 scale-110 drop-shadow-md' : (isHome ? 'text-green-600/90' : 'text-slate-400')}`}
                    >
                        <ClipboardList className="w-7 h-7 mb-1.5" />
                        <span className="text-[10px] font-bold text-center leading-tight">Comenzi<br/>de lucru</span>
                    </NavLink>
                )}

                {/* 4. Inventar */}
                {hasLongTerm && (
                    <NavLink
                        to="/my-inventory"
                        className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-emerald-600 scale-110 drop-shadow-md' : (isHome ? 'text-emerald-600/90' : 'text-slate-400')}`}
                    >
                        <Wrench className="w-7 h-7 mb-1.5" />
                        <span className="text-xs font-bold">Inventar</span>
                    </NavLink>
                )}

                {/* 5. Sesizari */}
                {hasLongTerm && (
                    <NavLink
                        to="/sesizari"
                        className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-red-600 scale-110 drop-shadow-md' : (isHome ? 'text-red-500/90' : 'text-slate-400')}`}
                    >
                        <AlertTriangle className="w-7 h-7 mb-1.5" />
                        <span className="text-xs font-bold">Sesizari</span>
                    </NavLink>
                )}
            </nav>
        </div>
    )
}

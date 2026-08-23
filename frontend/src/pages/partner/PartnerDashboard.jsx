import { useState, useEffect } from 'react'
import { useNavigate, Outlet, NavLink, useLocation } from 'react-router-dom'
import { usePartnerStore } from '../../store/partnerStore'
import { useTenantStore } from '../../store/tenantStore'
import { Handshake, LogOut, Globe, LayoutDashboard } from 'lucide-react'
import i18n from '../../i18n'

const LANGUAGES = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
]

const TRANSLATIONS = {
    fr: { logout: 'Déconnexion', welcome: 'Bienvenue', planning: 'Planning' },
    nl: { logout: 'Uitloggen', welcome: 'Welkom', planning: 'Planning' },
    en: { logout: 'Log out', welcome: 'Welcome', planning: 'Planning' },
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function PartnerDashboard() {
    const { partner, logout } = usePartnerStore()
    const { tenant } = useTenantStore()
    const navigate = useNavigate()
    const [lang, setLang] = useState(partner?.preferred_language || 'fr')

    useEffect(() => {
        i18n.changeLanguage(lang)
        localStorage.setItem('language', lang)
    }, [lang])

    const t = TRANSLATIONS[lang] || TRANSLATIONS.fr

    const handleLogout = () => {
        logout()
        navigate('/partner/login')
    }

    const logoUrl = tenant?.logo_url
        ? (tenant.logo_url.startsWith('http') ? tenant.logo_url : `${API_BASE}${tenant.logo_url}`)
        : null

    // Tenant primary color
    const primaryColor = tenant?.primary_color || '#2563eb'

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
            {/* ── Header ── */}
            <header
                className="sticky top-0 z-50 h-16 flex items-center justify-between px-4 md:px-6 shadow-md"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
            >
                {/* Left: Logo + Company Name */}
                <div className="flex items-center gap-3">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={tenant?.name || 'Partner'}
                            className="h-9 object-contain"
                        />
                    ) : (
                        <div className="h-9 w-9 bg-white/20 rounded flex items-center justify-center">
                            <Handshake className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div className="hidden sm:block">
                        <h1 className="text-white font-bold text-base leading-tight">
                            {partner?.client_name || 'Partner'}
                        </h1>
                        <p className="text-white/60 text-xs">
                            {t.welcome}, {partner?.full_name}
                        </p>
                    </div>
                </div>

                {/* Right: Lang + Logout */}
                <div className="flex items-center gap-2">
                    {/* Language selector */}
                    <div className="flex gap-0.5 bg-white/10 rounded-lg p-0.5">
                        {LANGUAGES.map(l => (
                            <button
                                key={l.code}
                                onClick={() => setLang(l.code)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${lang === l.code
                                        ? 'bg-white/25 text-white shadow-sm'
                                        : 'text-white/50 hover:text-white/80'
                                    }`}
                            >
                                {l.flag} {l.code.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.logout}</span>
                    </button>
                </div>
            </header>

            

            {/* ── Content ── */}
            <main className="flex-1 p-4 md:p-6">
                <Outlet context={{ lang }} />
            </main>
        </div>
    )
}

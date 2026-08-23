import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePartnerStore } from '../../store/partnerStore'
import { useTenantStore } from '../../store/tenantStore'
import partnerApi from '../../lib/partnerApi'
import { Handshake, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, Globe, ShieldOff } from 'lucide-react'
import i18n from '../../i18n'

const LANGUAGES = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
]

const TRANSLATIONS = {
    fr: {
        title: 'Portail Partenaire',
        subtitle: 'Connectez-vous pour gérer vos commandes',
        email: 'Adresse e-mail',
        password: 'Mot de passe',
        login: 'Se connecter',
        logging_in: 'Connexion...',
        error: 'E-mail ou mot de passe incorrect',
    },
    nl: {
        title: 'Partnerportaal',
        subtitle: 'Log in om uw bestellingen te beheren',
        email: 'E-mailadres',
        password: 'Wachtwoord',
        login: 'Inloggen',
        logging_in: 'Inloggen...',
        error: 'Onjuist e-mailadres of wachtwoord',
    },
    en: {
        title: 'Partner Portal',
        subtitle: 'Log in to manage your orders',
        email: 'Email address',
        password: 'Password',
        login: 'Log in',
        logging_in: 'Logging in...',
        error: 'Incorrect email or password',
        disabled_title: 'Portal not available',
        disabled_desc: 'The partner portal is not enabled for this organization.',
    },
}

const DISABLED_TEXTS = {
    fr: { title: 'Portail non disponible', desc: 'Le portail partenaire n\'est pas activé pour cette organisation.' },
    nl: { title: 'Portaal niet beschikbaar', desc: 'Het partnerportaal is niet geactiveerd voor deze organisatie.' },
    en: { title: 'Portal not available', desc: 'The partner portal is not enabled for this organization.' },
}

const NO_TENANT_TEXTS = {
    fr: { title: 'Lien invalide', desc: 'Veuillez utiliser le lien spécifique fourni par l\'entreprise.' },
    nl: { title: 'Ongeldige link', desc: 'Gebruik de specifieke link die door het bedrijf is verstrekt.' },
    en: { title: 'Invalid link', desc: 'Please use the specific link provided by the company.' },
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function PartnerLogin() {
    const tenant = useTenantStore((state) => state.tenant)
    const getCurrentSubdomain = useTenantStore((state) => state.getCurrentSubdomain)
    const subdomain = getCurrentSubdomain()
    
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [lang, setLang] = useState('fr')
    const navigate = useNavigate()
    const setAuth = usePartnerStore((state) => state.setAuth)

    useEffect(() => {
        i18n.changeLanguage(lang)
        localStorage.setItem('language', lang)
    }, [lang])

    const t = TRANSLATIONS[lang] || TRANSLATIONS.fr

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await partnerApi.post('/login', { email, password })
            const { access_token, partner } = response.data
            setAuth(partner, access_token)
            navigate('/partner/planning')
        } catch (err) {
            setError(err.response?.data?.detail || t.error)
        } finally {
            setLoading(false)
        }
    }

    const logoUrl = tenant?.logo_url
        ? (tenant.logo_url.startsWith('http') ? tenant.logo_url : `${API_BASE}${tenant.logo_url}`)
        : null

    // Check if partner portal module is enabled
    const isPortalEnabled = !tenant || (tenant.features || []).includes('partner_portal')

    // If no subdomain (raw domain access), show invalid link message
    if (!subdomain) {
        const nt = NO_TENANT_TEXTS[lang] || NO_TENANT_TEXTS.fr
        return (
            <div className="min-h-screen flex items-center justify-center p-4"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
                <div className="absolute top-4 right-4 flex gap-1">
                    {LANGUAGES.map(l => (
                        <button key={l.code} onClick={() => setLang(l.code)}
                            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${lang === l.code ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'}`}>
                            {l.flag}
                        </button>
                    ))}
                </div>
                <div className="w-full max-w-md text-center">
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-10">
                        <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto mb-6">
                            <Globe className="w-8 h-8 text-slate-400" />
                        </div>
                        <h1 className="text-xl font-bold text-white mb-2">{nt.title}</h1>
                        <p className="text-white/50 text-sm">{nt.desc}</p>
                    </div>
                </div>
            </div>
        )
    }

    // If tenant loaded and module disabled, show disabled page
    if (tenant && !isPortalEnabled) {
        const dt = DISABLED_TEXTS[lang] || DISABLED_TEXTS.fr
        return (
            <div className="min-h-screen flex items-center justify-center p-4"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
                {/* Language selector */}
                <div className="absolute top-4 right-4 flex gap-1">
                    {LANGUAGES.map(l => (
                        <button key={l.code} onClick={() => setLang(l.code)}
                            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${lang === l.code ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'}`}>
                            {l.flag}
                        </button>
                    ))}
                </div>
                <div className="w-full max-w-md text-center">
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-10">
                        <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto mb-6">
                            <ShieldOff className="w-8 h-8 text-slate-400" />
                        </div>
                        <h1 className="text-xl font-bold text-white mb-2">{dt.title}</h1>
                        <p className="text-white/50 text-sm">{dt.desc}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>

            {/* Language selector — floating top right */}
            <div className="absolute top-4 right-4 flex gap-1">
                {LANGUAGES.map(l => (
                    <button
                        key={l.code}
                        onClick={() => setLang(l.code)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${lang === l.code
                                ? 'bg-white/20 text-white shadow-lg'
                                : 'text-white/50 hover:text-white/80 hover:bg-white/10'
                            }`}
                    >
                        <span className="mr-1">{l.flag}</span>
                        {l.code.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8">
                    <div className="flex flex-col items-center mb-8">
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={tenant?.name || 'Partner Portal'}
                                className="h-16 mb-4 object-contain"
                            />
                        ) : (
                            <div className="h-16 w-16 mb-4 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                <Handshake className="w-8 h-8 text-indigo-400" />
                            </div>
                        )}
                        <h1 className="text-2xl font-extrabold text-white">{t.title}</h1>
                        <p className="text-white/60 text-sm mt-1">{t.subtitle}</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">{t.email}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                    placeholder="partner@company.com"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">{t.password}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {t.logging_in}
                                </>
                            ) : (
                                <>
                                    {t.login}
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-xs mt-8">
                    {tenant?.name || 'Partner Portal'} &mdash; {t.title}
                </p>
            </div>
        </div>
    )
}

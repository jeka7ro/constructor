import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAdminStore } from '../../store/adminStore'
import { useTenantStore } from '../../store/tenantStore'
import api from '../../lib/api'
import { Shield, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function AdminLogin() {
    const { t } = useTranslation()
    const tenant = useTenantStore((state) => state.tenant)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)

    // Load saved credentials on mount
    useEffect(() => {
        const saved = localStorage.getItem('pontaj_admin_saved_login')
        if (saved) {
            try {
                const { email: savedEmail, password: savedPassword } = JSON.parse(saved)
                setEmail(savedEmail || '')
                setPassword(savedPassword || '')
                setRememberMe(true)
            } catch (e) { }
        }
    }, [])

    const navigate = useNavigate()
    const setAuth = useAdminStore((state) => state.setAuth)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await api.post('/admin/login', {
                email,
                password,
                tenant_id: tenant?.id || null
            })

            const { access_token, admin } = response.data
            
            // Save or clear credentials
            if (rememberMe) {
                localStorage.setItem('pontaj_admin_saved_login', JSON.stringify({ email, password }))
            } else {
                localStorage.removeItem('pontaj_admin_saved_login')
            }

            setAuth(admin, access_token)
            navigate('/admin/planning')
        } catch (err) {
            setError(err.response?.data?.detail || t('admin_login.auth_error', 'Erreur d\'authentification'))
        } finally {
            setLoading(false)
        }
    }

    const subdomain = useTenantStore((state) => state.getCurrentSubdomain())

    return (
        <div 
            className="min-h-screen flex items-center justify-center p-4 relative bg-slate-900"
            style={{
                backgroundImage: `linear-gradient(to bottom right, rgba(15, 23, 42, 0.6), rgba(30, 58, 138, 0.6), rgba(49, 46, 129, 0.75)), url('/login_bg.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 20%',
                backgroundAttachment: 'fixed',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10 mt-8">
                {/* Login Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 border border-slate-200/50 slide-up">
                    {/* Logo & Title */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-48 h-32 mt-2 mb-2 drop-shadow-sm">
                            {tenant?.logo_url ? (
                                <img src={tenant.logo_url} alt={tenant.name} className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-5xl font-extrabold text-white shadow-lg border-4 border-slate-50">
                                    {tenant?.name?.charAt(0) || "P"}
                                </div>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-1">
                            {tenant?.name || "Pontaj Digital"} Admin
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            {t('admin_login.manager_login', 'Authentification pour les managers')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Input */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl 
                         focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 
                         outline-none transition-all duration-200 text-slate-900 font-medium
                         placeholder:text-slate-400 placeholder:font-normal"
                                placeholder="admin@pontaj.ro"
                                required
                                autoFocus
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                {t('common.password', 'Mot de passe')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 pr-12 bg-slate-50 border-2 border-slate-200 rounded-2xl 
                             focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 
                             outline-none transition-all duration-200 text-slate-900 font-medium
                             placeholder:text-slate-400 placeholder:font-normal"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4.5 h-4.5 rounded border-2 border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                            />
                            <span className="text-sm text-slate-600 font-medium">{t('admin_login.remember_me', 'Se souvenir de moi')}</span>
                        </label>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 scale-in">
                                <p className="text-red-700 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
                       px-6 py-3.5 rounded-2xl font-semibold text-base
                       hover:from-blue-700 hover:to-indigo-700
                       active:scale-[0.98] transition-all duration-200
                       shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>{t('admin_login.authenticating', 'Authentification en cours...')}</span>
                                </>
                            ) : (
                                <>
                                    <span>{t('admin_login.admin_auth_btn', 'Authentification Admin')}</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Back to Main App */}
                    <div className="mt-6 text-center">
                        <a href="/" className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">
                            {t('admin_login.worker_access', '← Accès travailleurs')}
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center flex flex-col items-center justify-center fade-in stagger-2 gap-3">
                    <p className="text-sm text-blue-200/90 font-medium tracking-wide">
                        Une solution de <a href="https://getapp.ro" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-300 font-bold transition-all underline decoration-blue-400/50 underline-offset-4">getapp.ro</a>
                    </p>
                    <a href="https://getapp.ro" target="_blank" rel="noopener noreferrer" className="inline-block opacity-90 hover:opacity-100 transition-all transform hover:scale-105">
                        <img src="https://getapp.ro/logo_getapp_original.png" alt="Smart Timesheet" className="h-12 w-auto object-contain mx-auto drop-shadow-md" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-white font-bold border border-white/30 px-4 py-2 rounded-lg">Powered by Smart Timesheet</span>' }} />
                    </a>
                </div>
            </div>
        </div>
    )
}

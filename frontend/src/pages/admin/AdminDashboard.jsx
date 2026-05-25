import { useState, useEffect, useRef } from 'react'
import { useNavigate, Outlet, NavLink } from 'react-router-dom'
import { useAdminStore } from '../../store/adminStore'
import api from '../../lib/api'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '../../components/LanguageSelector'
import {
    LayoutDashboard, Users, Building2, FileText, Settings, LogOut,
    ChevronLeft, Clock, Activity, Bell, ChevronRight, Camera, Sun, Moon, Truck, Package, Briefcase, Shield, HardHat, MessageSquareWarning, BedDouble
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function AdminDashboard() {
    const { admin, logout } = useAdminStore()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [notifCount, setNotifCount] = useState(0)
    const [lastSeenCount, setLastSeenCount] = useState(0)
    const notifRef = useRef(null)

    const handleLogout = () => {
        logout()
        navigate('/admin/login')
    }

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

    const allNavItems = [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
        { path: '/admin/employees', icon: HardHat, label: 'Angajați' },
        { path: '/admin/clients', icon: Briefcase, label: t('nav.clients', 'Clienți') },
        { path: '/admin/sites', icon: Building2, label: t('nav.sites') },
        { path: '/admin/timesheets', icon: Clock, label: t('nav.timesheets') },
        { path: '/admin/activities', icon: Activity, label: t('nav.activities') },
        { path: '/admin/reports', icon: FileText, label: t('nav.reports') },
        { path: '/admin/site-photos', icon: Camera, label: t('nav.site_photos') },
        { path: '/admin/teams', icon: Users, label: t('nav.teams') },
        { path: '/admin/fleet', icon: Truck, label: t('nav.fleet') },
        { path: '/admin/warehouse', icon: Package, label: t('nav.warehouse', 'Magazie') },
        { path: '/admin/accommodations', icon: BedDouble, label: 'Cazări' },
        { path: '/admin/complaints', icon: MessageSquareWarning, label: 'Sesizări', badge: openComplaintsCount },
        { path: '/admin/settings', icon: Settings, label: t('nav.settings') },
        { path: '/admin/users', icon: Shield, label: 'Utilizatori' },
        { path: '/admin/notifications', icon: Bell, label: t('nav.notifications') },
    ]

    const navItems = admin?.role === 'LOGISTIC' 
        ? allNavItems.filter(item => ['/admin/warehouse', '/admin/fleet', '/admin/settings', '/admin/notifications'].includes(item.path))
        : allNavItems

    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark'
        }
        return false
    })

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }, [darkMode])

    return (
        <div className={`h-screen w-full ${darkMode ? 'bg-slate-950' : 'bg-slate-50'} flex font-sans text-slate-800 transition-colors duration-300 overflow-hidden`}>
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-white/10 text-white transition-all duration-300 flex flex-col z-50 relative`}>
                
                {/* Floating Toggle Button */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="absolute -right-3.5 top-7 w-7 h-7 bg-blue-600 border-2 border-slate-900 rounded-full flex items-center justify-center text-white hover:bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)] z-[60] transition-transform duration-200 hover:scale-110"
                    title={sidebarOpen ? t('admin.collapse_menu') : t('admin.expand_menu')}
                >
                    {sidebarOpen ? <ChevronLeft className="w-4 h-4 ml-[-1px]" /> : <ChevronRight className="w-4 h-4 mr-[-1px]" />}
                </button>
                {/* Logo Area matches Header height */}
                <div className={`h-20 flex items-center border-b border-white/10 shrink-0 transition-colors ${sidebarOpen ? 'px-3' : 'px-0 justify-center'}`}>
                    <div className={`flex items-center ${sidebarOpen ? 'gap-2 w-full' : 'justify-center'}`}>
                        <div className={`flex items-center justify-center shrink-0 ${sidebarOpen ? 'w-20 h-20 ml-2' : 'w-14 h-14'}`}>
                            <img src="/log_elef.png" alt="Elefant Logo" className={`w-full h-full object-contain origin-center transition-transform pointer-events-none select-none ${sidebarOpen ? 'scale-[2.0] translate-y-1' : 'scale-[1.3]'}`} />
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0 pl-6 pr-2">
                                <h2 className={`font-extrabold text-[12.5px] leading-tight tracking-tighter text-white/95`}>Smart Timesheet</h2>
                                <p className="text-[8.5px] text-blue-500 uppercase tracking-widest font-bold mt-0.5">Pontaj Digital</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {sidebarOpen && <span className="text-sm truncate flex-1">{item.label}</span>}
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
                </nav>

                {/* Footer Brand */}
                <div className="py-5 px-4 border-t border-white/10 shrink-0 flex flex-col items-center justify-center gap-1.5 w-full overflow-hidden">
                    <a 
                        href="https://www.getapp.ro" 
                        target="_blank" 
                        rel="noreferrer" 
                        className={`transition-opacity hover:opacity-100 flex items-center justify-center w-full ${sidebarOpen ? 'ml-7' : 'ml-0'}`}
                        title="Smart Timesheet by GetApp.ro"
                    >
                        {sidebarOpen ? (
                             <img src="/getapp_smart_timesheet_white.png" alt="GetApp" className="w-[188px] h-auto object-contain opacity-90 hover:opacity-100 transition-opacity" />
                        ) : (
                             <img src="/getapp_smart_timesheet_icon.png" alt="GetApp Icon" className="w-10 h-10 object-contain opacity-90 hover:opacity-100 transition-opacity scale-110" />
                        )}
                    </a>
                    {sidebarOpen && (
                        <a 
                            href="https://www.getapp.ro" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[11.5px] font-bold text-slate-400 hover:text-white transition-colors mt-0.5"
                        >
                            www.getapp.ro
                        </a>
                    )}
                </div>
            </aside>

            {/* Main Content Area — dark class on html element handles all dark: variants */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Header Bar */}
                <header className={`h-20 bg-slate-900 border-b border-white/10 px-6 flex items-center justify-between sticky top-0 z-40 text-white shadow-sm transition-colors shadow-slate-900/10`}>
                    <div className="flex items-center gap-4">
                         <span className={`font-bold text-lg hidden sm:block tracking-tight text-white/90`}>{t('admin.admin_system')}</span>
                    </div>

                    <div className="flex items-center gap-5">
                        {/* Language Selector */}
                        <LanguageSelector variant="dark" />

                        <div className="w-[1px] h-5 bg-white/20"></div>

                        {/* Theme Toggle Button & Notifications */}
                        <div className="flex items-center gap-2">
                           {/* Compact icon-only theme toggle */}
                           <button
                               onClick={() => setDarkMode(!darkMode)}
                               title={darkMode ? t('admin.light_mode') : t('admin.dark_mode')}
                               className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                           >
                               {darkMode
                                   ? <Moon className="w-4 h-4 text-blue-300" />
                                   : <Sun className="w-4 h-4 text-amber-400" />
                               }
                           </button>
                           <button onClick={() => navigate('/admin/complaints')} className={`p-2.5 rounded-full transition-colors relative text-slate-300 hover:text-white hover:bg-white/10`} title="Sesizări Noi">
                               <MessageSquareWarning className="w-5 h-5" />
                               {openComplaintsCount > 0 && (
                                   <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 flex items-center justify-center bg-orange-500 text-white text-[9px] font-bold rounded-full border-2 border-slate-900">
                                       {openComplaintsCount > 99 ? '99+' : openComplaintsCount}
                                   </span>
                               )}
                           </button>
                           <button className={`p-2.5 rounded-full transition-colors relative text-slate-300 hover:text-white hover:bg-white/10`} onClick={() => setShowNotifications(!showNotifications)}>
                               <Bell className="w-5 h-5" />
                               {unreadCount > 0 && (
                                   <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
                               )}
                           </button>
                        </div>
                        
                        <div className="w-[1px] h-8 bg-white/20"></div>

                        {/* User Profile */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold leading-none">{admin?.full_name}</p>
                                <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center justify-end w-full gap-1 mt-1 cursor-pointer hover:underline group">
                                    <LogOut className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform"/> {t('admin.logout')}
                                </button>
                            </div>
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center font-bold text-white shadow-md cursor-pointer hover:shadow-lg transition-all border-2 border-white/20">
                                {admin?.full_name?.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main View Outlet */}
                <main className={`flex-1 overflow-auto relative p-4 custom-scrollbar transition-colors ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

import { useUIStore } from '../../store/uiStore'
import { useTenantStore } from '../../store/tenantStore'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const base = API_BASE.replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
}

export function ToastOverlay() {
    const { toast, showToast } = useUIStore()
    const { tenant } = useTenantStore()

    if (!toast) return null

    const typeConfig = {
        success: {
            bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        },
        error: {
            bg: 'bg-red-50 border-red-200 text-red-800',
            icon: <AlertCircle className="w-5 h-5 text-red-500" />
        },
        info: {
            bg: 'bg-blue-50 border-blue-200 text-blue-800',
            icon: <Info className="w-5 h-5 text-blue-500" />
        }
    }

    const config = typeConfig[toast.type] || typeConfig.info
    const iconUrl = tenant?.favicon_url ? getImageUrl(tenant.favicon_url) : (tenant?.logo_url ? getImageUrl(tenant.logo_url) : null)

    return (
        <div className="fixed top-6 right-0 left-0 sm:left-auto sm:right-6 mx-4 sm:mx-0 z-[999999] flex justify-center sm:justify-end animate-in slide-in-from-top-5 fade-in duration-300">
            <div className={`flex items-center gap-2.5 p-2 rounded-2xl border shadow-2xl shadow-blue-900/10 max-w-xs w-full ${config.bg}`}>
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm overflow-hidden">
                    {iconUrl ? (
                        <img src={iconUrl} alt="Favicon" className="w-5 h-5 object-contain drop-shadow-sm" />
                    ) : (
                        config.icon
                    )}
                </div>
                <div className="flex-1 text-[12px] font-bold pr-2 whitespace-pre-wrap break-words leading-tight">
                    {typeof toast.message === 'string' ? toast.message : JSON.stringify(toast.message)}
                </div>
                <button 
                    onClick={() => useUIStore.setState({ toast: null })}
                    className="shrink-0 -mr-1 p-2 bg-white/50 hover:bg-white rounded-full transition-colors"
                >
                    <X className="w-4 h-4 opacity-70" />
                </button>
            </div>
        </div>
    )
}

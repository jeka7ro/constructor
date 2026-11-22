import { createPortal } from 'react-dom'
import { useUIStore } from '../../store/uiStore'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export function ToastOverlay() {
    const { toast } = useUIStore()

    if (!toast) return null

    const typeConfig = {
        success: {
            badge: 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
            dot: 'bg-emerald-500',
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        },
        error: {
            badge: 'bg-rose-500/15 dark:bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400',
            dot: 'bg-rose-500',
            icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        },
        info: {
            badge: 'bg-sky-500/15 dark:bg-sky-500/20 border-sky-500/30 text-sky-600 dark:text-sky-400',
            dot: 'bg-sky-500',
            icon: <Info className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        }
    }

    const config = typeConfig[toast.type] || typeConfig.info

    return createPortal(
        <div className="fixed top-5 right-0 left-0 sm:left-auto sm:right-6 mx-4 sm:mx-0 z-[999999] flex justify-center sm:justify-end pointer-events-none animate-in slide-in-from-top-4 fade-in duration-200">
            <div className="pointer-events-auto flex items-center gap-3 p-2 pr-2.5 rounded-full bg-[#F2F4F8] dark:bg-slate-900 text-slate-900 dark:text-white backdrop-blur-2xl saturate-150 border-[1.5px] border-slate-300/95 dark:border-slate-600/85 ring-1 ring-slate-900/10 dark:ring-white/10 shadow-[0_22px_48px_-10px_rgba(15,23,42,0.34),0_6px_18px_-4px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] max-w-sm w-auto">
                <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border ${config.badge}`}>
                    {config.icon}
                </div>
                <div className="flex-1 text-[12.5px] font-semibold text-slate-900 dark:text-white pr-1 whitespace-pre-wrap break-words leading-snug">
                    {typeof toast.message === 'string' ? toast.message : JSON.stringify(toast.message)}
                </div>
                <button 
                    type="button"
                    onClick={() => useUIStore.setState({ toast: null })}
                    className="shrink-0 w-6 h-6 rounded-full hover:bg-slate-200/80 dark:hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>,
        document.body
    )
}

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Info } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'

export function DialogOverlay() {
    const { dialog, closeDialog } = useUIStore()

    useEffect(() => {
        if (!dialog) return
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') closeDialog()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [dialog, closeDialog])

    if (!dialog) return null

    const isDanger = dialog.type === 'danger'

    return createPortal(
        <div 
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={closeDialog}
        >
            <div 
                className="w-full max-w-[370px] rounded-[24px] bg-[#F2F4F8] dark:bg-slate-900 text-slate-900 dark:text-white backdrop-blur-3xl saturate-150 border-[1.5px] border-slate-300/95 dark:border-slate-600/85 ring-1 ring-slate-900/10 dark:ring-white/10 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_28px_64px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.16)] p-3.5 overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="rounded-[16px] bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/85 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-5 flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3.5 border ${isDanger ? 'bg-rose-500/12 dark:bg-rose-500/20 border-rose-500/25 text-rose-600 dark:text-rose-400' : 'bg-sky-500/12 dark:bg-sky-500/20 border-sky-500/25 text-sky-600 dark:text-sky-400'}`}>
                        {isDanger ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                    </div>
                    <h3 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-snug">{dialog.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-[13.5px] leading-relaxed">{dialog.message}</p>
                </div>
                
                <div className="flex gap-2.5 w-full mt-3">
                    <button 
                        type="button"
                        className="flex-1 h-10 px-4 rounded-[14px] bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/90 dark:border-slate-600/80 text-[13.5px] font-semibold transition-all cursor-pointer shadow-2xs"
                        onClick={closeDialog}
                    >
                        {dialog.cancelText || 'Annuler'}
                    </button>
                    <button 
                        type="button"
                        className={`flex-1 h-10 px-4 rounded-[14px] font-semibold text-[13.5px] text-white shadow-sm transition-all cursor-pointer ${isDanger ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'}`}
                        onClick={async () => {
                            if (dialog.onConfirm) {
                                await dialog.onConfirm()
                            }
                            closeDialog()
                        }}
                    >
                        {dialog.confirmText || 'Confirmer'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

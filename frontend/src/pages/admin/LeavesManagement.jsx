import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function LeavesManagement() {
    const { t } = useTranslation()
    return (
        <div className="w-full space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight leading-none">
                            {t('leaves.title', 'Congés & Absences')}
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[15px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </span>
                    </div>
                    <p className="text-[15.5px] font-medium text-slate-500 dark:text-slate-400 mt-1">{t('leaves.desc', 'Gestion des demandes de congé et des absences')}</p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] p-12 text-center">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-[18px] font-bold text-slate-700 dark:text-slate-300">{t('common.module_in_progress', 'Module en construction')}</h3>
                <p className="text-[15px] text-slate-500 max-w-md mx-auto mt-2">
                    {t('common.module_in_progress_desc', 'Ce module est en cours de développement et sera disponible prochainement.')}
                </p>
            </div>
        </div>
    )
}

import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function LeavesManagement() {
    const { t } = useTranslation()
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-blue-600" />
                        {t('leaves.title', 'Congés & Absences')}
                    </h1>
                    <p className="text-slate-500 mt-1">{t('leaves.desc', 'Gestion des demandes de congé et des absences')}</p>
                </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-700">{t('common.module_in_progress', 'Module en construction')}</h3>
                <p className="text-slate-500 max-w-md mx-auto mt-2">
                    {t('common.module_in_progress_desc', 'Ce module est en cours de développement et sera disponible prochainement.')}
                </p>
            </div>
        </div>
    )
}

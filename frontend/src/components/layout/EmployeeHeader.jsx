import React from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTenantStore } from '../../store/tenantStore'

import { useUIStore } from '../../store/uiStore'

export default function EmployeeHeader({ title, showBack = false, badge = null, rightContent = null }) {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const tenant = useTenantStore(state => state.tenant)
    const globalTheme = useUIStore(state => state.globalTheme)

    return (
        <div 
            className={`shrink-0 z-20 text-white p-4 shadow-lg sticky top-0 transition-colors ${globalTheme === 'dark' ? 'bg-slate-900' : 'bg-[color:var(--mobile-bg)]'}`}
            style={globalTheme === 'dark' ? {} : { '--mobile-bg': tenant?.primary_color || '#2563EB' }}
        >
            <div className="flex items-center justify-between max-w-md mx-auto">
                <div className="flex items-center gap-3">
                    {showBack && (
                        <button 
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/20 transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        {badge}
                        <h1 className="font-bold text-lg text-white tracking-wide">{title}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {rightContent}
                </div>
            </div>
        </div>
    )
}

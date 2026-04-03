import { LayoutGrid, List } from 'lucide-react'

/**
 * ViewToggle Component
 * Allows users to switch between list and grid views
 */
export default function ViewToggle({ viewMode, onViewModeChange, className = '' }) {
    return (
        <div className={`inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-1 ${className}`}>
            <button
                onClick={() => onViewModeChange('list')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'list'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                title="List View"
            >
                <List className="w-5 h-5" />
            </button>
            <button
                onClick={() => onViewModeChange('grid')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'grid'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                title="Grid View"
            >
                <LayoutGrid className="w-5 h-5" />
            </button>
        </div>
    )
}

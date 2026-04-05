import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/**
 * DataTable — macOS Tahoe style, reusable
 *
 * Props:
 *   columns: [{ key, label, sortable?, render?(row, rowIndex) }]
 *   data: array of row objects
 *   loading?: boolean
 *   defaultPageSize?: number
 *   emptyText?: string
 */
export default function DataTable({
    columns = [],
    data = [],
    loading = false,
    defaultPageSize = 25,
    emptyText,
}) {
    const { t } = useTranslation()
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(defaultPageSize)
    const [sortKey, setSortKey] = useState(null)
    const [sortDir, setSortDir] = useState('asc') // 'asc' | 'desc'

    const sorted = useMemo(() => {
        if (!sortKey) return data
        return [...data].sort((a, b) => {
            const av = a[sortKey] ?? ''
            const bv = b[sortKey] ?? ''
            if (av === bv) return 0
            const cmp = av < bv ? -1 : 1
            return sortDir === 'asc' ? cmp : -cmp
        })
    }, [data, sortKey, sortDir])

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
    const safePage = Math.min(page, totalPages)
    const from = (safePage - 1) * pageSize
    const slice = sorted.slice(from, from + pageSize)

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
        setPage(1)
    }

    const handlePageSize = (e) => {
        setPageSize(Number(e.target.value))
        setPage(1)
    }

    const SortIcon = ({ col }) => {
        if (!col.sortable) return null
        if (sortKey !== col.key) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
        return sortDir === 'asc'
            ? <ChevronUp className="w-3.5 h-3.5 text-blue-500 ml-1" />
            : <ChevronDown className="w-3.5 h-3.5 text-blue-500 ml-1" />
    }

    return (
        <div className="flex flex-col min-h-0">
            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                            {/* Row number column */}
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 w-10 select-none">
                                {t('common.row_number')}
                            </th>
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={[
                                        'px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap select-none',
                                        col.sortable ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''
                                    ].join(' ')}
                                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                                >
                                    <span className="inline-flex items-center">
                                        {col.label}
                                        <SortIcon col={col} />
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-sm text-slate-400">
                                    {t('common.loading')}
                                </td>
                            </tr>
                        ) : slice.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-sm text-slate-400">
                                    {emptyText || t('common.no_data')}
                                </td>
                            </tr>
                        ) : (
                            slice.map((row, idx) => (
                                <tr
                                    key={row.id ?? idx}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                    <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                                        {from + idx + 1}
                                    </td>
                                    {columns.map(col => (
                                        <td key={col.key} className="px-4 py-3 text-slate-700 dark:text-slate-200">
                                            {col.render ? col.render(row, from + idx) : (row[col.key] ?? '—')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between mt-3 px-1 flex-wrap gap-2">
                {/* Rows per page */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{t('common.rows_per_page')}</span>
                    <select
                        value={pageSize}
                        onChange={handlePageSize}
                        className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                        {PAGE_SIZE_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* Page info */}
                <span className="text-xs text-slate-400 dark:text-slate-500">
                    {t('common.showing', {
                        from: sorted.length === 0 ? 0 : from + 1,
                        to: Math.min(from + pageSize, sorted.length),
                        count: sorted.length
                    })}
                </span>

                {/* Prev / Next */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        className="px-3 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        &larr;
                    </button>

                    <span className="px-3 py-1 text-xs text-slate-500 dark:text-slate-400">
                        {t('common.page_of', { current: safePage, total: totalPages })}
                    </span>

                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        className="px-3 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        &rarr;
                    </button>
                </div>
            </div>
        </div>
    )
}

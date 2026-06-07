import re

with open("src/pages/admin/WorkOrders.jsx", "r") as f:
    code = f.read()

old_config = """const STATUS_CONFIG = {
    draft:       { label: 'Nouă',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-400' },
    sent:        { label: 'Trimisă',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
    confirmed:   { label: 'Confirmată',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
    in_progress: { label: 'În Execuție', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
    completed:   { label: 'Finalizată',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', dot: 'bg-violet-500' },
    cancelled:   { label: 'Anulată',     color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
}"""

new_config = """const STATUS_CONFIG = {
    draft:       { label: 'Nouă',       color: 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', dot: 'bg-slate-400' },
    sent:        { label: 'Trimisă',     color: 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500' },
    confirmed:   { label: 'Confirmată',  color: 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500' },
    in_progress: { label: 'În Execuție', color: 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', dot: 'bg-blue-500' },
    completed:   { label: 'Finalizată',  color: 'bg-violet-50 text-violet-600 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800', dot: 'bg-violet-500' },
    cancelled:   { label: 'Anulată',     color: 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', dot: 'bg-red-500' },
}"""

code = code.replace(old_config, new_config)

with open("src/pages/admin/WorkOrders.jsx", "w") as f:
    f.write(code)


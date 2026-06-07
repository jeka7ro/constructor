import re

with open("src/pages/admin/WorkOrders.jsx", "r") as f:
    code = f.read()

# Add border to Timer button
code = code.replace(
    'className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-slate-500 hover:text-blue-600"',
    'className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-slate-500 hover:text-blue-600"'
)

# Add border to Package button
code = code.replace(
    'className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors text-slate-500 hover:text-emerald-600"',
    'className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors text-slate-500 hover:text-emerald-600"'
)

# Add border to Trash button
code = code.replace(
    'className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-slate-500 hover:text-red-500"',
    'className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-slate-500 hover:text-red-500"'
)

with open("src/pages/admin/WorkOrders.jsx", "w") as f:
    f.write(code)


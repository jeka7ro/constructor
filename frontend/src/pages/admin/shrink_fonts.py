import os

filepath = "/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(filepath, "r") as f:
    c = f.read()

# Shrink Section Title font
c = c.replace(
    "h2 className=\"font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide\">{title}</h2",
    "h2 className=\"font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wide\">{title}</h2"
)

# Shrink text in Confirmations & Materials specifically (we can just replace some common classes to be safer)
# Confirmations & Materials are generally text-xs and text-[10px].
# Let's target the exact strings from those sections to be safe.

# In Materials:
# "text-xs font-bold text-slate-500 uppercase tracking-wider" -> "text-[10px] font-bold text-slate-500 uppercase tracking-wider"
c = c.replace(
    "text-xs font-bold text-slate-500 uppercase tracking-wider",
    "text-[10px] font-bold text-slate-500 uppercase tracking-wider"
)

# "Niciun material consumat" is text-sm -> text-xs
c = c.replace(
    "className=\"text-sm text-slate-400 text-center py-4\">{t('work_order_detail.materials_volumes.no_consumed_materials'",
    "className=\"text-xs text-slate-400 text-center py-4\">{t('work_order_detail.materials_volumes.no_consumed_materials'"
)

# In Confirmations:
# "text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2" -> "text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2"
c = c.replace(
    "text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2",
    "text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2"
)

# "text-xs text-slate-500" -> "text-[10px] text-slate-500"
# Only do it for the "non confirmă" parts
c = c.replace(
    "className=\"text-xs text-slate-500 dark:text-slate-400 text-center py-4\"",
    "className=\"text-[10px] text-slate-500 dark:text-slate-400 text-center py-4\""
)

with open(filepath, "w") as f:
    f.write(c)

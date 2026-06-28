import os

filepath = "/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(filepath, "r") as f:
    c = f.read()

# Make Confirmations card compact
c = c.replace(
    "title={t('work_order_detail.status_confirmations.title', \"Confirmări Status\")}>",
    "title={t('work_order_detail.status_confirmations.title', \"Confirmări Status\")} contentClassName=\"p-3\">"
)

# Make Materials card compact
c = c.replace(
    "title={t('work_order_detail.materials_volumes.title', \"Cantități & Materiale (Estimate vs Consumate)\")}>",
    "title={t('work_order_detail.materials_volumes.title', \"Cantități & Materiale (Estimate vs Consumate)\")} contentClassName=\"p-3\">"
)

# Replace gaps and paddings in right column
c = c.replace("flex-col xl:flex-row gap-6", "flex-col xl:flex-row gap-2")
c = c.replace("space-y-2", "space-y-1")
c = c.replace("mb-4", "mb-2")
c = c.replace("gap-4 mb-4", "gap-3 mb-2")
c = c.replace("pt-4", "pt-2")
c = c.replace("pt-5", "pt-2")
c = c.replace("gap-5 mb-5", "gap-4 mb-4")

with open(filepath, "w") as f:
    f.write(c)

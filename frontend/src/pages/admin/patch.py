import os

with open("/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/pages/admin/WorkOrderDetail.jsx", "r") as f:
    c = f.read()

c = c.replace(
    "t('work_order_detail.materials.title',",
    "t('work_order_detail.materials_volumes.title',"
)
c = c.replace(
    "t('work_order_detail.materials.planned_estimated',",
    "t('work_order_detail.materials_volumes.planned',"
)
c = c.replace(
    "t('work_order_detail.materials.works_volumes',",
    "t('work_order_detail.materials_volumes.works_volumes',"
)
c = c.replace(
    "t('work_order_detail.materials.actual_consumed',",
    "t('work_order_detail.materials_volumes.consumed',"
)
c = c.replace(
    ">Niciun material consumat înregistrat</p>",
    ">{t('work_order_detail.materials_volumes.no_consumed_materials', 'Niciun material consumat înregistrat')}</p>"
)

c = c.replace(
    "title={t('work_order_detail.invoicing.title', \"Documente & Fișiere\")}",
    "title={t('work_order_detail.documents.title', \"Documente & Fișiere\")}"
)

c = c.replace(
    "title={t('work_order_detail.invoicing.title_invoice', 'Facturare')}",
    "title={t('work_order_detail.invoicing.title', 'Facturare')}"
)

# Flex replacements for ALL xl:flex-row to sm:flex-row in the related sections
c = c.replace("flex-col xl:flex-row gap-6", "flex-col sm:flex-row gap-6")
c = c.replace("hidden xl:block", "hidden sm:block")
c = c.replace("xl:border-t-0", "sm:border-t-0")
c = c.replace("xl:pt-0", "sm:pt-0")

with open("/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/pages/admin/WorkOrderDetail.jsx", "w") as f:
    f.write(c)

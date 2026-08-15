import re

file_path = "frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Clientul a solicitat reprogramarea -> t('work_order_detail.reschedule_requested', 'Le client a demandé une reprogrammation')
content = content.replace(
    '<span className="font-bold text-amber-800 uppercase text-[10px]">Clientul a solicitat reprogramarea</span>',
    '<span className="font-bold text-amber-800 uppercase text-[10px]">{t(\'work_order_detail.reschedule_requested\', \'Le client a demandé une reprogrammation\')}</span>'
)

# Data dorită: -> t('work_order_detail.requested_date', 'Date souhaitée:')
content = content.replace(
    'Data dorită: {new Date(wo.reschedule_requested_date).toLocaleDateString(\'ro-RO\')}',
    '{t(\'work_order_detail.requested_date\', \'Date souhaitée :\')} {new Date(wo.reschedule_requested_date).toLocaleDateString(\'fr-FR\')}'
)

# Răspunde clientului -> t('work_order_detail.reply_to_client', 'Répondre au client')
content = content.replace(
    'Răspunde clientului',
    '{t(\'work_order_detail.reply_to_client\', \'Répondre au client\')}'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("WorkOrderDetail translations patched")

import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

content = content.replace(
    """Folosește ca Estimare</button>""",
    """{t('common.use_as_estimate', 'Utiliser comme Estimation')}</button>"""
)

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)

print("Translated button")

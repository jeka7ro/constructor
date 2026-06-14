import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# 1. Update EMPTY_FORM to include custom_prices
empty_form_target = "volumes: [{ label: 'Montaj sapa', quantity: '', unit: 'm²', thickness: '' }],"
empty_form_repl = "volumes: [{ label: 'Montaj sapa', quantity: '', unit: 'm²', thickness: '', custom_prices: { base: 12.5, extra: 1.25, foil: 1.2, mesh: 2.5 } }],"
content = content.replace(empty_form_target, empty_form_repl)

# 2. Re-insert the "Calcul Cost" UI and computation logic before the "Pret Estimativ" section
# Wait, I need to compute the auto variables during render, but not force them into estimated_amount!
# So I'll put the computation block before the return statement or right inside the render.
# Let's check where to put it.


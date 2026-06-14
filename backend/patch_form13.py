import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# Remove Date Limite
target_deadline = """                    <Field label={t('work_order_form.deadline', 'Date Limite')}>
                        <input type="date" value={form.deadline_date}
                            onChange={e => set('deadline_date', e.target.value)}
                            className={INPUT} />
                    </Field>"""

if target_deadline in content:
    content = content.replace(target_deadline, "")
else:
    print("Could not find deadline field")

# Also let's adjust the grid columns for Planificare if needed
target_planificare_grid = """<div className="grid grid-cols-3 gap-2 items-end">"""
repl_planificare_grid = """<div className="grid grid-cols-2 gap-2 items-end">"""
content = content.replace(target_planificare_grid, repl_planificare_grid)

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)

print("Applied fix 13")

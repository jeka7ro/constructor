import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# Remove the isAutoRender block completely
# Find {isAutoRender && ( ... )} inside the section.
auto_render_regex = re.compile(r"\{\s*isAutoRender\s*&&\s*\(\s*<div className=\"bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 w-full mt-2\">.*?</div>\n\s*\)\}", re.DOTALL)

content = auto_render_regex.sub("", content)

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)

print("Removed auto render")

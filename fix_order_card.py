import re

file_path = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(file_path, 'r') as f:
    content = f.read()

# Add translateDynamicLabel function globally
translate_func = """
const translateDynamicLabel = (text) => {
    if (!text) return '—';
    let res = text;
    if (/^[sșş]ap[aăâ]$/i.test(res)) return 'Chape';
    if (/[sșş]ap[aăâ]/i.test(res)) res = res.replace(/[sșş]ap[aăâ]/ig, 'Chape');
    if (/manoper[aă]/i.test(res)) res = res.replace(/manoper[aă]/ig, "Main-d'œuvre");
    return res;
};

"""
if 'const translateDynamicLabel = (text) =>' not in content[:500]:
    content = content.replace('function WorkerOrdersPage() {', translate_func + 'function WorkerOrdersPage() {')

# Remove duplicate translation function from TabApercu
content = re.sub(r'const translateDynamicLabel = \(\w+\) => \{[\s\S]*?return res;\s*?};\s*', '', content)

# Replace 'Șapă' in OrderCard rendering
content = re.sub(r"\{\(order\.volumes\s*&&\s*order\.volumes\[0\]\?.label\)\s*\|\|\s*'Șapă'\}", "{translateDynamicLabel(order.volumes && order.volumes[0]?.label) || 'Chape'}", content)
content = re.sub(r"\{\(order\.volumes\s*&&\s*order\.volumes\[0\]\?.label\)\s*\|\|\s*'Șapă'\s*\}", "{translateDynamicLabel(order.volumes && order.volumes[0]?.label) || 'Chape'}", content)

with open(file_path, 'w') as f:
    f.write(content)

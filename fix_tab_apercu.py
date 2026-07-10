import re

file_path = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(file_path, 'r') as f:
    content = f.read()

# Fix fmtDate and fmtTime
content = content.replace("'ro-RO'", "'fr-FR'")

# Add translate function in TabApercu (around line 364)
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
content = content.replace('function TabApercu({ order, isLeader }) {\n    const comments =', 
                          'function TabApercu({ order, isLeader }) {\n' + translate_func + '    const comments =')

# Replace Detalii Lucrare
content = content.replace('label="Detalii Lucrare"', 'label="Détails du travail"')

# Replace v.label
content = content.replace('v.label || `Zonă ${idx + 1}`', 'translateDynamicLabel(v.label) || `Zone ${idx + 1}`')

# Replace Termen:
content = content.replace('Termen:', 'Délai:')

with open(file_path, 'w') as f:
    f.write(content)

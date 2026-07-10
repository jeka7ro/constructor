import re

file_path = 'frontend/src/pages/admin/AdminOverview.jsx'
with open(file_path, 'r') as f:
    content = f.read()

# Fix fmtDate
content = content.replace("'ro-RO'", "'fr-FR'")

# Add translateDynamicLabel function
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
content = content.replace('function AdminOverview() {\n    const { t } =', 
                          'function AdminOverview() {\n' + translate_func + '    const { t } =')

# Apply translation to Quick Edit
content = content.replace("label: 'Șapă'", "label: 'Chape'")
content = content.replace("label: 'Sapa'", "label: 'Chape'")

with open(file_path, 'w') as f:
    f.write(content)

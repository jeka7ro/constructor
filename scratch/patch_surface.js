const fs = require('fs');

const file = 'frontend/src/pages/admin/WorkOrderDetail.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the old condition:
// (v.label === 'Chape' ? t('materials.surface_n', 'Surface {{n}}', { n: i + 1 }) : v.label || 'Surface')
// With the new one using regex
content = content.replace(
  /\(v\.label === 'Chape' \? t\('materials\.surface_n', 'Surface \{\{n\}\}', \{ n: i \+ 1 \}\) : v\.label \|\| 'Surface'\)/g,
  "((v.label || '').toLowerCase().match(/chape|[sșş]ap[aăâ]/) ? t('materials.surface_n', 'Surface {{n}}', { n: i + 1 }) : v.label || 'Surface')"
);

fs.writeFileSync(file, content);
console.log("Patched WorkOrderDetail.jsx");

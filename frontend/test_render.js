import fs from 'fs';
import { parse } from '@babel/parser';

const code = fs.readFileSync('src/pages/admin/WorkOrderForm.jsx', 'utf8');

try {
  parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('WorkOrderForm JSX parses successfully');
} catch (e) {
  console.error('WorkOrderForm Parse Error:', e);
}

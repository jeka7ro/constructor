const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('frontend/src/components/ShortWorksCalendar.jsx', 'utf8');
try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('Valid JSX');
} catch (e) {
  console.log('Error at line ' + e.loc.line + ' col ' + e.loc.column);
  console.log(e.message);
}

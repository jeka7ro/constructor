const parser = require('@babel/parser');
const fs = require('fs');

try {
  const code = fs.readFileSync('src/components/ShortWorksCalendar.jsx', 'utf8');
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log("Parsed successfully!");
} catch (e) {
  console.log(e.message);
}

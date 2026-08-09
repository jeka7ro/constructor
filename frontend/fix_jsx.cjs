const fs = require('fs');
let code = fs.readFileSync('src/components/ShortWorksCalendar.jsx', 'utf8');

// I'll replace the 4 extra divs I added
code = code.replace(/            <\/div>\n                <\/div>\n            <\/div>\n        <\/div>\n            {\/\* Planning Modal \*\//, '            {/* Planning Modal */');
fs.writeFileSync('src/components/ShortWorksCalendar.jsx', code);

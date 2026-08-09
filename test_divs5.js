const fs = require('fs');
const code = fs.readFileSync('frontend/src/components/ShortWorksCalendar.jsx', 'utf8');
const lines = code.split('\n');
let divCount = 0;
for (let i = 527; i < 1222; i++) {
  const line = lines[i];
  
  // Ignore simple comments
  if (line.trim().startsWith('//') || line.trim().startsWith('{/*')) continue;
  
  const openMatch = line.match(/<div[^>]*>/g) || line.match(/<div[\s\n]/g) || line.match(/<div$/g);
  const closeMatch = line.match(/<\/div>/g);
  
  if (openMatch) divCount += openMatch.length;
  if (closeMatch) divCount -= closeMatch.length;
}
console.log(`Open divs in Desktop View: ${divCount}`);

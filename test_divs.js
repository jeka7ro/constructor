const fs = require('fs');
const code = fs.readFileSync('frontend/src/components/ShortWorksCalendar.jsx', 'utf8');
const lines = code.split('\n');
let divCount = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const openMatch = line.match(/<div/g);
  const closeMatch = line.match(/<\/div/g);
  if (openMatch) divCount += openMatch.length;
  if (closeMatch) divCount -= closeMatch.length;
  if (divCount < 0) {
    console.log(`Mismatch at line ${i + 1}: count went below 0!`);
    divCount = 0;
  }
}
console.log(`Final div count: ${divCount}`);

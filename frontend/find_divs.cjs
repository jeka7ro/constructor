const parser = require('@babel/parser');
const fs = require('fs');

let code = fs.readFileSync('src/components/ShortWorksCalendar.jsx', 'utf8');

for (let i = 1; i <= 10; i++) {
  try {
    parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });
    console.log(`Success! Added ${i - 1} div tags.`);
    fs.writeFileSync('src/components/ShortWorksCalendar.jsx', code);
    process.exit(0);
  } catch (e) {
    // replace `</>` with `</div></>`
    code = code.replace(/<\/>/, '</div>\n        </>');
  }
}
console.log("Failed to find the right number of divs.");

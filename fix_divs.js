const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/ShortWorksCalendar.jsx', 'utf8');

// I will find where the Planning Modal starts and insert </div></div></div> before it!
// First, let's just use my count script to find exactly how many I need to add!

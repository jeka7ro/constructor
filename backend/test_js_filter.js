const fs = require('fs');

// Read the curl response
const data = JSON.parse(fs.readFileSync('curl_resp.json', 'utf8'));
console.log("Is array?", Array.isArray(data));
if (!Array.isArray(data)) {
    console.log("Data keys:", Object.keys(data));
} else {
    const validQuotes = data.filter(q => q.status !== 'cancelled' && q.status !== 'planning' && !q.start_date);
    console.log("Valid quotes count:", validQuotes.length);
}

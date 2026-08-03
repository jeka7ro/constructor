const Fuse = require('./frontend/node_modules/fuse.js');
const data = [
    { title: "50-60m - Huldenberg - Camas - Camille", subtitle: "BV ISOFLEX", raw_data: "50-60m - Huldenberg - Camas - Camille BV ISOFLEX" },
    { title: "560m² - chape - Cazari Torhout", subtitle: "BV ISOFLEX", raw_data: "560m² - chape - Cazari Torhout BV ISOFLEX" },
    { title: "20m² - chape? - Camas", subtitle: "BV ISOFLEX", raw_data: "20m² - chape? - Camas BV ISOFLEX" },
    { title: "Cazmal SRL", subtitle: "Some address", raw_data: "Cazmal SRL Some address" },
    { title: "Eugeniu Cazmal", subtitle: "", raw_data: "Eugeniu Cazmal" }
];
const fuse = new Fuse(data, {
    keys: ['title', 'subtitle', 'raw_data'],
    includeScore: true,
    threshold: 0.2,
    ignoreLocation: true
});
console.log("Searching for 'cazmal' with threshold 0.2:");
const results = fuse.search("cazmal");
results.forEach(r => console.log(r.score, r.item.title));

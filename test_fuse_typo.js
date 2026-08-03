const Fuse = require('./frontend/node_modules/fuse.js');
const data = [
    { title: "BV ISOFLEX", subtitle: "Some address", raw_data: "BV ISOFLEX Some address" }
];
const fuse = new Fuse(data, {
    keys: ['title', 'subtitle', 'raw_data'],
    includeScore: true,
    threshold: 0.2,
    ignoreLocation: true
});
console.log("Searching for 'isofex' (missing L) with threshold 0.2:");
const results = fuse.search("isofex");
results.forEach(r => console.log(r.score, r.item.title));

const fuse3 = new Fuse(data, {
    keys: ['title', 'subtitle', 'raw_data'],
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true
});
console.log("Searching for 'isofex' (missing L) with threshold 0.3:");
fuse3.search("isofex").forEach(r => console.log(r.score, r.item.title));

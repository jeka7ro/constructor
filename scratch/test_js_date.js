const d1 = new Date("2026-08-15 18:05:45.322579");
const threshold = new Date('2026-08-01T00:00:00Z');
console.log(d1 >= threshold);
console.log(isNaN(d1.getTime()));

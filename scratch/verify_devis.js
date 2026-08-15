// Simulate DevisView calculation with fix applied
const surface = 220, thick = 8, stdThick = 5;
const extraThick = Math.max(0, thick - stdThick); // 3

// FIXED: use extra_large (1.20) since 220 > extra_threshold (200)
const extraRate = 1.20; // was 1.25 before fix

const base = 12 * surface; // 2640
const extra = extraThick * extraRate * surface; // 3 * 1.20 * 220 = 792
const foil = 1.2 * surface; // 264
const fiber = 2.0 * surface; // 440

// PUR items
const purBase = 13.95 + (8-3)*1.65; // 13.95 + 8.25 = 22.20 ... wait
// Actually: purBase = 13.95, purThick=8, 3<8<=10 -> purBase += (8-3)*1.65 = 8.25 -> 22.20
// surface discount: 220>100 -> floor((220-100)/100)*(-0.50) = 1*(-0.50) = -0.50 -> 22.20-0.50=21.70
const purPrice = 21.70;
const pur = purPrice * surface; // 4774
const aspiration = 2 * surface; // 440
const nivellement = 4.25 * surface; // 935

const transport = 250;

const totalNet = base + extra + foil + fiber + pur + aspiration + nivellement + transport; // all items

// isChapeItem excludes: eps, pur, isolation, ponçage, aspiration, nivellement, protection
// So chapeItems = base + extra + foil + fiber + transport
const chapeTotalGross = base + extra + foil + fiber + transport;
// = 2640 + 792 + 264 + 440 + 250 = 4386

const discountPct = 10;
const discountAmount = chapeTotalGross * discountPct / 100; // 438.60
const netAfterDiscount = totalNet - discountAmount;
const totalGross = netAfterDiscount * 1.21;

console.log("totalNet:", totalNet);
console.log("chapeTotalGross:", chapeTotalGross);
console.log("discountAmount:", discountAmount);
console.log("netAfterDiscount:", netAfterDiscount);
console.log("totalGross:", totalGross);
console.log("---");
console.log("Expected (CALCUL DES COÛTS): 12216.64");

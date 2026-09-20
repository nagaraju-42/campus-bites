const fs = require('fs');
let code = fs.readFileSync('src/app/student/menu/[shopId]/page.tsx', 'utf8');

// 1. Remove variables
code = code.replace(/const isRenukaTheme = [^\n]+;\n/g, '');
code = code.replace(/const isBakeryTheme = [^\n]+;\n/g, '');
code = code.replace(/const theme = [^\n]+;\n/g, '');

// 2. We need to extract the exact renuka block.
// The easiest way is to use regex or split.
// The renuka block starts with           {/* Renuka Theme (Split layout) */}
// and ends with           {/* Bakery Theme */}
const renukaStartMarker = "{/* Renuka Theme (Split layout) */}";
const bakeryStartMarker = "{/* Bakery Theme */}";
const defaultStartMarker = "{/* Default / Zomato Theme */}";
const endOfThemesMarker = "{/* 🌟 Tab Bar: Menu | Reviews | Info 🌟 */}";

const dynListMarker = "{/* 🌟 Dynamic Themed List Layout 🌟 */}";

const dynListIdx = code.indexOf(dynListMarker);
const endOfThemesIdx = code.indexOf(endOfThemesMarker);
const renukaIdx = code.indexOf(renukaStartMarker);
const bakeryIdx = code.indexOf(bakeryStartMarker);

if (dynListIdx === -1 || endOfThemesIdx === -1 || renukaIdx === -1 || bakeryIdx === -1) {
    console.log("MARKERS NOT FOUND");
    process.exit(1);
}

// Extract the renuka block
// It is between enukaIdx and akeryIdx
let renukaBlock = code.substring(renukaIdx, bakeryIdx);

// Clean up the renuka block wrapper: {theme === 'renuka' && (
renukaBlock = renukaBlock.replace(/{theme === 'renuka' && \(/, '');

// Clean up the closing )} of renuka block
// It's at the very end of renukaBlock
renukaBlock = renukaBlock.trim();
if (renukaBlock.endsWith(')}')) {
    renukaBlock = renukaBlock.substring(0, renukaBlock.length - 2);
}

// Ensure the dynListMarker is still there
const replacement = dynListMarker + "\n\n          " + renukaBlock + "\n\n      ";

const newCode = code.substring(0, dynListIdx) + replacement + code.substring(endOfThemesIdx);

fs.writeFileSync('src/app/student/menu/[shopId]/page.tsx', newCode);
console.log("Refactored themes successfully!");
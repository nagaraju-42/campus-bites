const fs = require('fs');
let code = fs.readFileSync('src/app/student/menu/[shopId]/page.tsx', 'utf8');

code = code.replace(/const isRenukaTheme = [^\n]+;\n/g, '');
code = code.replace(/const isBakeryTheme = [^\n]+;\n/g, '');
code = code.replace(/const theme = [^\n]+;\n/g, '');

const renukaStartMarker = "{/* Renuka Theme (Split layout) */}";
const bakeryStartMarker = "{/* Bakery Theme */}";
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

let renukaBlock = code.substring(renukaIdx, bakeryIdx);
renukaBlock = renukaBlock.replace(/{theme === 'renuka' && \(/, '');

renukaBlock = renukaBlock.trim();
if (renukaBlock.endsWith(')}')) {
    renukaBlock = renukaBlock.substring(0, renukaBlock.length - 2);
}

const replacement = dynListMarker + "\n\n          " + renukaBlock + "\n\n      ";
const newCode = code.substring(0, dynListIdx) + replacement + code.substring(endOfThemesIdx);

fs.writeFileSync('src/app/student/menu/[shopId]/page.tsx', newCode);
console.log("Refactored themes successfully!");
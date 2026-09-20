const fs = require('fs');
let code = fs.readFileSync('src/app/student/menu/[shopId]/page.tsx', 'utf8');

// Replace itemsWithoutImages filtering
code = code.replace(/.filter\(item => !item.image_url\)/g, '');

fs.writeFileSync('src/app/student/menu/[shopId]/page.tsx', code);
console.log("Tweaked successfully!");
const fs = require('fs');
let code = fs.readFileSync('src/app/student/menu/[shopId]/page.tsx', 'utf8');

// 1. Update theme logic
code = code.replace(
  /const isRenukaTheme = [^\n]+;\n/,
  ""
);
code = code.replace(
  "const theme = isRenukaTheme ? 'renuka' : isBakeryTheme ? 'bakery' : 'default';",
  "let theme = isBakeryTheme ? 'bakery' : 'renuka';\n"
);

// 2. Modify renuka text list to show ALL items
// We find: const itemsWithoutImages = menuItems\n                    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))\n                    .filter(item => !item.image_url)
code = code.replace(/\.filter\(item => !item\.image_url\)/, '');

fs.writeFileSync('src/app/student/menu/[shopId]/page.tsx', code);
console.log("Updated themes successfully!");
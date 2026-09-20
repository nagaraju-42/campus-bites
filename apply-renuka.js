const fs = require('fs');
let code = fs.readFileSync('src/app/student/menu/[shopId]/page.tsx', 'utf8');

// 1. Force theme to be always 'renuka'
code = code.replace(
  "const theme = isRenukaTheme ? 'renuka' : isBakeryTheme ? 'bakery' : 'default';",
  "const theme = 'renuka';"
);

// 2. In Renuka theme, make the bottom section show ALL items instead of only items without images.
// Original: .filter(item => !item.image_url)
// We just remove this filter completely.
// But wait, there might be other places where `.filter(item => !item.image_url)` is used?
// Let's replace ONLY inside the renuka theme. Actually, it's only used once in the file for this exact purpose.
code = code.replace(
  /\.filter\(item => !item\.image_url\)/g,
  ""
);

fs.writeFileSync('src/app/student/menu/[shopId]/page.tsx', code);
console.log("Renuka theme forced successfully!");
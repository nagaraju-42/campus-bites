const fs = require('fs');
let code = fs.readFileSync('src/app/student/menu/[shopId]/page.tsx', 'utf8');

// Inside Yes, Clear button
code = code.replace(
  "toast.dismiss(t.id)\n                }}\n                className=\"bg-[#EA580C] text-white",
  "toast.dismiss(t.id)\n                  if (variantName) setSelectedVariantItem(null);\n                }}\n                className=\"bg-[#EA580C] text-white"
);

// At the end of handleAddToCart
code = code.replace(
  "image_url: item.image_url ?? undefined, variantName\n    })\n  }\n\n  const handleFavoriteClick",
  "image_url: item.image_url ?? undefined, variantName\n    })\n    if (variantName) setSelectedVariantItem(null);\n  }\n\n  const handleFavoriteClick"
);

fs.writeFileSync('src/app/student/menu/[shopId]/page.tsx', code);
console.log("Fixed variant closing successfully!");
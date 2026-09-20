const fs = require('fs');
let code = fs.readFileSync('src/app/student/menu/[shopId]/page.tsx', 'utf8');

// 1. Add handleRemoveFromCart function
const funcToAdd = `
  const handleRemoveFromCart = (item: MenuItem) => {
    if (item.variants && item.variants.length > 0) {
      setSelectedVariantItem(item);
      return;
    }
    const qty = getItemQuantity(item.id);
    updateQuantity(item.id, qty - 1);
  }

  const handleFavoriteClick = () => {`;

code = code.replace(
  "const handleFavoriteClick = () => {",
  funcToAdd
);

// 2. Replace all instances of updateQuantity(item.id, qty - 1) with handleRemoveFromCart(item)
// Be careful not to replace the one inside the variant modal which uses selectedVariantItem.id
code = code.replace(/updateQuantity\(item\.id, qty - 1\)/g, "handleRemoveFromCart(item)");

fs.writeFileSync('src/app/student/menu/[shopId]/page.tsx', code);
console.log("Minus fixed");
const fs = require('fs');
let code = fs.readFileSync('src/app/shop/ShopLayoutClient.tsx', 'utf8');

// 1. Initial load
code = code.replace(
  "setShopIsOpen(shopData.is_open)",
  "setShopIsOpen(shopData.is_open)\n          useShopOrdersStore.getState().setLiveStatus(shopData.is_open)"
);

// 2. Realtime updates
code = code.replace(
  "const isNowOpen = payload.new.is_open\n            setShopIsOpen(isNowOpen)",
  "const isNowOpen = payload.new.is_open\n            setShopIsOpen(isNowOpen)\n            useShopOrdersStore.getState().setLiveStatus(isNowOpen)"
);

fs.writeFileSync('src/app/shop/ShopLayoutClient.tsx', code);
console.log("KDS toggle fixed!");
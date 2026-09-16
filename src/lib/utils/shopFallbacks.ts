export const shopFallbacks = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?auto=format&fit=crop&w=800&q=80'
];

export const getShopFallbackImage = (shopName?: string) => {
  if (!shopName) return shopFallbacks[0];
  let hash = 0;
  for (let i = 0; i < shopName.length; i++) {
    hash = shopName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % shopFallbacks.length;
  return shopFallbacks[idx];
}
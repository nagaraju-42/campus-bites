const fs = require('fs');

const path = 'src/app/student/menu/[shopId]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Insert theme logic
content = content.replace(
  '  if (isLoading) return <MenuSkeleton />',
  `  if (isLoading) return <MenuSkeleton />

  const isRenukaTheme = shop?.name.toLowerCase().includes('renuka') || shop?.name.toLowerCase().includes('street 11');
  const isBakeryTheme = shop?.name.toLowerCase().includes('baker') || shop?.name.toLowerCase().includes('sweet') || shop?.name.toLowerCase().includes('softy');
  const theme = isRenukaTheme ? 'renuka' : isBakeryTheme ? 'bakery' : 'default';`
);

// 2. Extract Zomato and Renuka logic and replace with conditional theme logic.
const ZOMATO_START = '          {/* ── Zomato-style list layout (WITH IMAGES) ── */}';
const END_OF_RENUKA = '          )}';
const NEXT_BANNER = '            {/* Offers banner at the bottom */}';

const startIndex = content.indexOf(ZOMATO_START);
let endIndex = content.indexOf(NEXT_BANNER, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `          {/* ── Dynamic Themed List Layout ── */}
          
          {/* Default / Zomato Theme */}
          {theme === 'default' && (
            <div className="bg-white">
              {Object.entries(groupedMenu).map(([category, menuItems]) => {
                const filteredItems = menuItems
                  .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .sort((a, b) => {
                    if (a.is_available === b.is_available) return 0
                    return a.is_available ? -1 : 1
                  });
                if (filteredItems.length === 0) return null;

                return (
                  <div key={category} id={\`category-\${category}\`}>
                    <div className="px-4 pt-5 pb-3">
                      <h2 className="text-[17px] font-extrabold text-gray-900">{category}</h2>
                    </div>
                    {filteredItems.map((item, itemIdx) => {
                      const qty = getItemQuantity(item.id);
                      return (
                        <div key={item.id}>
                          <div className={\`px-4 py-4 flex gap-3 items-start \${!item.is_available ? 'opacity-60' : ''}\`}>
                            <div className="flex-1 min-w-0 flex flex-col">
                              <h3 className="text-[16px] font-bold text-gray-900 leading-snug">{item.name}</h3>
                              {item.variants && item.variants.length > 0 ? (
                                <p className="text-gray-900 font-bold text-[15px] mt-0.5">₹{item.variants[0].price}</p>
                              ) : (
                                <p className="text-gray-900 font-bold text-[15px] mt-1.5">₹{item.price}</p>
                              )}
                              {item.description && (
                                <p className="text-gray-500 text-xs mt-1 line-clamp-2">{item.description}</p>
                              )}
                            </div>
                            <div className="shrink-0 relative pb-3">
                              {item.image_url ? (
                                <div className="w-[118px] h-[118px] rounded-2xl overflow-hidden bg-gray-100 relative">
                                  <Image src={item.image_url!} alt={item.name} fill className="object-cover img-cinematic" sizes="118px" />
                                </div>
                              ) : (
                                <div className="w-[118px] h-[118px] rounded-2xl overflow-hidden bg-gray-100 relative flex justify-center items-center">
                                  <span className="text-3xl">🍲</span>
                                </div>
                              )}
                              <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-[90px]">
                                {qty === 0 ? (
                                  <button onClick={() => handleAddToCart(item)} className="w-full h-9 bg-white border-2 border-[#E23744] rounded-xl flex items-center justify-center gap-1 font-extrabold text-[14px] text-[#E23744] shadow-md">
                                    ADD
                                  </button>
                                ) : (
                                  <div className="w-full h-9 flex items-center justify-between bg-[#E23744] rounded-xl shadow-md px-1.5">
                                    <button onClick={() => updateQuantity(item.id, qty - 1)} className="w-6 h-6 flex items-center justify-center rounded-lg text-white"><Minus size={13} /></button>
                                    <span className="text-white font-extrabold text-sm">{qty}</span>
                                    <button onClick={() => handleAddToCart(item)} className="w-6 h-6 flex items-center justify-center rounded-lg text-white"><Plus size={13} /></button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {itemIdx < filteredItems.length - 1 && <div className="mx-4 border-b border-gray-200" />}
                        </div>
                      );
                    })}
                    <div className="h-3 bg-gray-100 w-full mt-4" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Renuka Theme */}
          {theme === 'renuka' && (
            <div className="bg-[#F6EAD5] pt-6 pb-20 mt-2 min-h-screen">
              {Object.entries(groupedMenu).map(([category, menuItems]) => {
                const filteredItems = menuItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
                if (filteredItems.length === 0) return null;
                return (
                  <div key={\`renuka-\${category}\`} id={\`category-\${category}\`} className="mb-10">
                    <div className="flex items-center justify-center gap-4 px-4 mb-6">
                      <div className="border-b-2 border-dashed border-[#C54932] opacity-60 flex-1" />
                      <h2 className="text-3xl font-black text-[#C54932] tracking-wide" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' }}>{category}</h2>
                      <div className="border-b-2 border-dashed border-[#C54932] opacity-60 flex-1" />
                    </div>
                    <div className="px-4 flex flex-col gap-0">
                      {filteredItems.map((item, itemIdx) => {
                        const qty = getItemQuantity(item.id);
                        return (
                          <div key={item.id} className={\`pt-4 pb-4 border-b border-dashed border-[#D1BFA5] last:border-0 \${!item.is_available ? 'opacity-60' : ''}\`}>
                            <div className="mb-2">
                              {item.is_veg ? (
                                <span className="bg-[#4D6840] text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">VEG</span>
                              ) : (
                                <span className="bg-[#C54932] text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">NON VEG</span>
                              )}
                            </div>
                            <div className="flex justify-between items-start">
                              <div className="flex-1 pr-4">
                                <h3 className="text-[#332214] font-bold text-[16px] leading-tight mb-1">{item.name}</h3>
                                {item.variants && item.variants.length > 0 ? (
                                  <p className="text-[#C54932] font-semibold text-[14px] mt-1">₹{item.variants[0].price}</p>
                                ) : (
                                  <p className="text-[#C54932] font-semibold text-[14px] mt-1">₹{item.price}</p>
                                )}
                              </div>
                              <div className="shrink-0 pt-1">
                                {qty === 0 ? (
                                  <button onClick={() => handleAddToCart(item)} className="bg-[#C54932] hover:bg-[#a83c20] text-white px-6 py-1.5 rounded-full text-[12px] font-bold tracking-widest shadow-sm">
                                    ADD
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-between bg-[#C54932] rounded-full shadow-sm px-1.5 h-8 w-[80px]">
                                    <button onClick={() => updateQuantity(item.id, qty - 1)} className="w-6 h-6 flex items-center justify-center rounded-full text-white"><Minus size={13} /></button>
                                    <span className="text-white font-extrabold text-sm">{qty}</span>
                                    <button onClick={() => handleAddToCart(item)} className="w-6 h-6 flex items-center justify-center rounded-full text-white"><Plus size={13} /></button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bakery Theme */}
          {theme === 'bakery' && (
            <div className="bg-[#FFF0F5] pt-6 pb-20 mt-2 min-h-screen">
              {Object.entries(groupedMenu).map(([category, menuItems]) => {
                const filteredItems = menuItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
                if (filteredItems.length === 0) return null;
                return (
                  <div key={\`bakery-\${category}\`} id={\`category-\${category}\`} className="mb-10 px-4">
                    <div className="mb-6">
                      <h2 className="text-2xl italic text-[#D81B60]" style={{ fontFamily: 'Georgia, serif' }}>{category}</h2>
                      <div className="w-12 h-1 bg-[#D81B60] mt-2 rounded-full" />
                    </div>
                    <div className="flex flex-col gap-4">
                      {filteredItems.map((item) => {
                        const qty = getItemQuantity(item.id);
                        return (
                          <div key={item.id} className={\`bg-white p-4 rounded-2xl shadow-sm border border-[#FFE4E1] flex gap-4 \${!item.is_available ? 'opacity-60' : ''}\`}>
                            {item.image_url ? (
                               <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-[#FFE4E1]">
                                 <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="80px" />
                               </div>
                            ) : (
                               <div className="w-20 h-20 shrink-0 rounded-xl bg-[#FFE4E1] flex items-center justify-center">
                                 <span className="text-3xl">🍰</span>
                               </div>
                            )}
                            <div className="flex-1 flex flex-col justify-between">
                               <div>
                                 <h3 className="text-[#880E4F] font-bold text-[16px] leading-tight" style={{ fontFamily: 'Georgia, serif' }}>{item.name}</h3>
                                 <p className="text-[#D81B60] font-bold text-[14px] mt-1">₹{item.price}</p>
                               </div>
                               <div className="self-end">
                                 {qty === 0 ? (
                                   <button onClick={() => handleAddToCart(item)} className="bg-[#D81B60] text-white px-5 py-1.5 rounded-lg text-[12px] font-bold shadow-md">
                                     ADD
                                   </button>
                                 ) : (
                                   <div className="flex items-center justify-between bg-[#D81B60] rounded-lg shadow-md px-1.5 h-7 w-[75px]">
                                     <button onClick={() => updateQuantity(item.id, qty - 1)} className="w-6 h-6 flex items-center justify-center text-white"><Minus size={12} /></button>
                                     <span className="text-white font-extrabold text-sm">{qty}</span>
                                     <button onClick={() => handleAddToCart(item)} className="w-6 h-6 flex items-center justify-center text-white"><Plus size={12} /></button>
                                   </div>
                                 )}
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
`;
  
  content = content.substring(0, startIndex) + replacement + '\n' + content.substring(endIndex);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully updated themes!');
} else {
  console.log('Could not find ZOMATO_START or NEXT_BANNER markers.');
}

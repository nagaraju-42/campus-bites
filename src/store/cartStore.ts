import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string           // menu_item id
  shopId: string       // which shop this belongs to
  shopName: string     // for display
  name: string
  price: number
  quantity: number
  image_url?: string
  partnerShopId?: string // if this item is a cross-shop add-on
  variantName?: string
}

interface CartState {
  items: CartItem[]
  shopId: string | null       // cart is locked to one shop at a time

  // Actions
  addItem: (item: CartItem) => void
  removeItem: (itemId: string, variantName?: string) => void
  updateQuantity: (itemId: string, quantity: number, variantName?: string) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  getDeliveryFee: () => number
  getPlatformFee: () => number
  getGrandTotal: () => number
  setCart: (shopId: string, items: CartItem[]) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      shopId: null,

      addItem: (newItem) => {
        const { items, shopId } = get()

        // If cart has items from a different shop, clear cart first
        if (shopId && shopId !== newItem.shopId) {
          set({ items: [{ ...newItem, quantity: 1 }], shopId: newItem.shopId })
          return
        }

        const existingItem = items.find((i) => i.id === newItem.id && i.variantName === newItem.variantName)
        if (existingItem) {
          set({
            items: items.map((i) =>
              (i.id === newItem.id && i.variantName === newItem.variantName)
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          })
        } else {
          set({
            items: [...items, { ...newItem, quantity: 1 }],
            shopId: newItem.shopId,
          })
        }
      },

      removeItem: (itemId, variantName) => {
        const { items } = get()
        const filtered = items.filter((i) => !(i.id === itemId && i.variantName === variantName))
        set({ items: filtered, shopId: filtered.length === 0 ? null : get().shopId })
      },

      updateQuantity: (itemId, quantity, variantName) => {
        if (quantity <= 0) {
          get().removeItem(itemId, variantName)
          return
        }
        set({
          items: get().items.map((i) =>
            (i.id === itemId && i.variantName === variantName) ? { ...i, quantity } : i
          ),
        })
      },

      setCart: (shopId, items) => {
        set({ shopId, items })
      },

      clearCart: () => set({ items: [], shopId: null }),

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getTotalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      getDeliveryFee: () => 10,

      getPlatformFee: () => 0,

      getGrandTotal: () =>
        get().getTotalPrice() + get().getDeliveryFee() + get().getPlatformFee(),
    }),
    {
      name: 'campusbites-cart', // key in localStorage
    }
  )
)

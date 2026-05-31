import { create } from 'zustand'
import { Order } from '@/types'

interface ShopOrdersState {
  orders: Order[]
  isLive: boolean
  shopId: string | null
  setShopId: (id: string | null) => void
  setOrders: (orders: Order[]) => void
  addOrder: (order: Order) => void
  updateOrderStatus: (orderId: string, status: Order['status']) => void
  removeOrder: (orderId: string) => void
  setLiveStatus: (status: boolean) => void
  getNewOrders: () => Order[]
  getPreparingOrders: () => Order[]
  getReadyOrders: () => Order[]
}

export const useShopOrdersStore = create<ShopOrdersState>((set, get) => ({
  orders: [],
  isLive: false,
  shopId: null,

  setShopId: (id) => set({ shopId: id }),
  setOrders: (orders) => set({ orders }),
  
  addOrder: (newOrder) => set((state) => {
    // Avoid duplicates
    if (state.orders.find(o => o.id === newOrder.id)) return state;
    return { orders: [newOrder, ...state.orders] }
  }),

  updateOrderStatus: (orderId, status) => set((state) => ({
    orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o)
  })),

  removeOrder: (orderId) => set((state) => ({
    orders: state.orders.filter(o => o.id !== orderId)
  })),

  setLiveStatus: (status) => set({ isLive: status }),

  getNewOrders: () => get().orders.filter(o => o.status === 'pending'),
  getPreparingOrders: () => get().orders.filter(o => o.status === 'preparing'),
  getReadyOrders: () => get().orders.filter(o => o.status === 'ready'),
}))

import { create } from 'zustand'
import { Order } from '@/types'

interface RiderState {
  availableOrders: Order[]
  activeDelivery: Order | null
  setAvailableOrders: (orders: Order[]) => void
  addAvailableOrder: (order: Order) => void
  removeAvailableOrder: (orderId: string) => void
  setActiveDelivery: (order: Order | null) => void
}

export const useRiderStore = create<RiderState>((set) => ({
  availableOrders: [],
  activeDelivery: null,
  setAvailableOrders: (orders) => set({ availableOrders: orders }),
  addAvailableOrder: (order) => set((state) => {
    if (state.availableOrders.find(o => o.id === order.id)) return state
    return { availableOrders: [order, ...state.availableOrders] }
  }),
  removeAvailableOrder: (orderId) => set((state) => ({ 
    availableOrders: state.availableOrders.filter(o => o.id !== orderId) 
  })),
  setActiveDelivery: (order) => set({ activeDelivery: order }),
}))

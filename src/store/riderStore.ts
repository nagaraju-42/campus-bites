import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Order } from '@/types'

interface RiderState {
  availableOrders: Order[]
  activeDeliveries: Order[]
  setAvailableOrders: (orders: Order[]) => void
  addAvailableOrder: (order: Order) => void
  removeAvailableOrder: (orderId: string) => void
  addActiveDelivery: (order: Order) => void
  removeActiveDelivery: (orderId: string) => void
  setActiveDeliveries: (orders: Order[]) => void
  isOnline: boolean
  lastOnlineAt: number | null
  setIsOnline: (status: boolean) => void
  checkAutoOffline: () => void
}

export const useRiderStore = create<RiderState>()(
  persist(
    (set, get) => ({
      availableOrders: [],
      activeDeliveries: [],
      isOnline: false,
      lastOnlineAt: null,
      
      setAvailableOrders: (orders) => set({ availableOrders: orders }),
      
      addAvailableOrder: (order) => set((state) => {
        if (state.availableOrders.find(o => o.id === order.id)) return state
        return { availableOrders: [order, ...state.availableOrders] }
      }),
      
      removeAvailableOrder: (orderId) => set((state) => ({ 
        availableOrders: state.availableOrders.filter(o => o.id !== orderId) 
      })),
      
      addActiveDelivery: (order) => set((state) => {
        if (state.activeDeliveries.find(o => o.id === order.id)) return state
        return { activeDeliveries: [...state.activeDeliveries, order] }
      }),
      
      removeActiveDelivery: (orderId) => set((state) => ({
        activeDeliveries: state.activeDeliveries.filter(o => o.id !== orderId)
      })),
      
      setActiveDeliveries: (orders) => set({ activeDeliveries: orders }),

      setIsOnline: (status) => set({ 
        isOnline: status,
        lastOnlineAt: status ? Date.now() : null
      }),

      checkAutoOffline: () => {
        const { isOnline, lastOnlineAt } = get()
        if (isOnline) {
          const THIRTY_MINS = 30 * 60 * 1000
          if (lastOnlineAt && Date.now() - lastOnlineAt > THIRTY_MINS) {
            set({ isOnline: false, lastOnlineAt: null })
          } else {
            set({ lastOnlineAt: Date.now() })
          }
        }
      }
    }),
    {
      name: 'rider-storage',
      partialize: (state) => ({ isOnline: state.isOnline, lastOnlineAt: state.lastOnlineAt }),
    }
  )
)

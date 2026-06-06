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
  pickedUpOrders: string[]
  markOrderPickedUp: (orderId: string) => void
  removePickedUpOrder: (orderId: string) => void
}

export const useRiderStore = create<RiderState>()(
  persist(
    (set, get) => ({
      availableOrders: [],
      activeDeliveries: [],
      isOnline: false,
      lastOnlineAt: null,
      pickedUpOrders: [],
      
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
      },

      markOrderPickedUp: (orderId) => set((state) => {
        if (state.pickedUpOrders.includes(orderId)) return state
        return { pickedUpOrders: [...state.pickedUpOrders, orderId] }
      }),

      removePickedUpOrder: (orderId) => set((state) => ({
        pickedUpOrders: state.pickedUpOrders.filter(id => id !== orderId)
      }))
    }),
    {
      name: 'rider-storage',
      partialize: (state) => ({ 
        isOnline: state.isOnline, 
        lastOnlineAt: state.lastOnlineAt,
        pickedUpOrders: state.pickedUpOrders
      }),
    }
  )
)

// Global Audio Controller for Rider
export let activeRiderAudio: HTMLAudioElement | null = null;

export const playRiderAlarm = () => {
  if (typeof window === 'undefined') return;
  try {
    if (activeRiderAudio) {
      activeRiderAudio.pause();
      activeRiderAudio.currentTime = 0;
    }
    activeRiderAudio = new Audio('/sounds/bell-alarm.mp3');
    activeRiderAudio.volume = 1.0;
    activeRiderAudio.loop = true;
    activeRiderAudio.play().catch(e => console.log("Audio blocked:", e));
    
    // Auto stop after 15 seconds
    setTimeout(() => {
      stopRiderAlarm();
    }, 15000);
  } catch (e) {}
}

export const stopRiderAlarm = () => {
  if (activeRiderAudio) {
    activeRiderAudio.pause();
    activeRiderAudio.currentTime = 0;
    activeRiderAudio = null;
  }
}

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
  isAlarmRinging: boolean
  alarmReason: { title: string, message: string } | null
  setIsAlarmRinging: (status: boolean, reason?: { title: string, message: string } | null) => void
}

export const useRiderStore = create<RiderState>()(
  persist(
    (set, get) => ({
      availableOrders: [],
      activeDeliveries: [],
      isOnline: false,
      lastOnlineAt: null,
      pickedUpOrders: [],
      isAlarmRinging: false,
      alarmReason: null,
      
      setIsAlarmRinging: (status, reason = null) => set({ isAlarmRinging: status, alarmReason: reason }),
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
export let isRiderAudioUnlocked = false;

export const initRiderAudio = () => {
  if (typeof window === 'undefined' || isRiderAudioUnlocked) return;
  activeRiderAudio = new Audio('/sounds/bell-alarm.mp3');
  activeRiderAudio.volume = 0; // Mute for unlock
  activeRiderAudio.play().then(() => {
    activeRiderAudio?.pause();
    if (activeRiderAudio) activeRiderAudio.volume = 1.0;
    isRiderAudioUnlocked = true;
  }).catch(() => {});
}

export const playRiderAlarm = (reason?: { title: string, message: string }) => {
  if (typeof window === 'undefined') return;
  useRiderStore.getState().setIsAlarmRinging(true, reason);
  try {
    if (!activeRiderAudio) {
      activeRiderAudio = new Audio('/sounds/bell-alarm.mp3');
    }
    activeRiderAudio.currentTime = 0;
    activeRiderAudio.volume = 1.0;
    activeRiderAudio.loop = true;
    
    const playPromise = activeRiderAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => console.log("Audio blocked:", e));
    }
    
    // Auto stop after 25 seconds
    setTimeout(() => {
      stopRiderAlarm();
    }, 25000);
  } catch (e) {}
}

export const stopRiderAlarm = () => {
  useRiderStore.getState().setIsAlarmRinging(false, null);
  if (activeRiderAudio) {
    activeRiderAudio.pause();
    activeRiderAudio.currentTime = 0;
    activeRiderAudio = null;
  }
}

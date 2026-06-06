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
  isAlarmRinging: boolean
  isDND: boolean
  setIsAlarmRinging: (status: boolean) => void
  setIsDND: (status: boolean) => void
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

  isAlarmRinging: false,
  isDND: false,
  setIsAlarmRinging: (status) => set({ isAlarmRinging: status }),
  setIsDND: (status) => set({ isDND: status }),
}))

// Global Audio Controller for KDS
export let activeKdsAudio: HTMLAudioElement | null = null;
export let isAudioUnlocked = false;

export const initShopAudio = () => {
  if (typeof window === 'undefined' || isAudioUnlocked) return;
  activeKdsAudio = new Audio('/sounds/bell-alarm.mp3');
  activeKdsAudio.volume = 0; // Mute for unlock
  activeKdsAudio.play().then(() => {
    activeKdsAudio?.pause();
    if (activeKdsAudio) activeKdsAudio.volume = 1.0;
    isAudioUnlocked = true;
  }).catch(() => {
    // If it fails, we just try again on the next interaction
  });
}

export const playShopAlarm = () => {
  if (typeof window === 'undefined') return;
  const { isDND } = useShopOrdersStore.getState();
  useShopOrdersStore.getState().setIsAlarmRinging(true);
  
  if (isDND) {
    // Just visual, auto stop visual after 25s
    setTimeout(() => {
      stopShopAlarm();
    }, 25000);
    return;
  }

  try {
    if (!activeKdsAudio) {
      activeKdsAudio = new Audio('/sounds/bell-alarm.mp3');
    }
    activeKdsAudio.currentTime = 0;
    activeKdsAudio.volume = 1.0;
    activeKdsAudio.loop = true;
    
    // Using a setTimeout hack can sometimes help background tabs if play fails immediately
    const playPromise = activeKdsAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => console.log("Audio blocked:", e));
    }
    
    // Auto stop after 25 seconds
    setTimeout(() => {
      stopShopAlarm();
    }, 25000);
  } catch (e) {}
}

export const stopShopAlarm = () => {
  useShopOrdersStore.getState().setIsAlarmRinging(false);
  if (activeKdsAudio) {
    activeKdsAudio.pause();
    activeKdsAudio.currentTime = 0;
    activeKdsAudio = null;
  }
}

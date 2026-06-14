/**
 * homeDataStore.ts
 * Persists shops, categories, delivery locations, and promotions in localStorage.
 * Prevents re-fetching the same data every time the user navigates back to /student/home.
 * Data is considered "fresh" for CACHE_TTL_MS (5 minutes). After that, background refresh happens.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Shop } from '@/types'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export interface CachedCategory {
  name: string
  icon_url: string
  display_order?: number
}

interface HomeDataState {
  // ── Cached data ──────────────────────────────────────────────────
  shops: Shop[]
  categories: CachedCategory[]
  deliveryLocations: string[]
  lastFetchedAt: number | null   // epoch ms

  // ── Setters ──────────────────────────────────────────────────────
  setShops: (shops: Shop[]) => void
  setCategories: (cats: CachedCategory[]) => void
  setDeliveryLocations: (locs: string[]) => void
  markFetched: () => void

  // ── Helpers ──────────────────────────────────────────────────────
  isStale: () => boolean
  clearCache: () => void
}

export const useHomeDataStore = create<HomeDataState>()(
  persist(
    (set, get) => ({
      shops: [],
      categories: [],
      deliveryLocations: [],
      lastFetchedAt: null,

      setShops: (shops) => set({ shops }),
      setCategories: (categories) => set({ categories }),
      setDeliveryLocations: (deliveryLocations) => set({ deliveryLocations }),
      markFetched: () => set({ lastFetchedAt: Date.now() }),

      isStale: () => {
        const { lastFetchedAt } = get()
        if (!lastFetchedAt) return true
        return Date.now() - lastFetchedAt > CACHE_TTL_MS
      },

      clearCache: () =>
        set({ shops: [], categories: [], deliveryLocations: [], lastFetchedAt: null }),
    }),
    {
      name: 'dnd-home-data', // localStorage key
      // Only persist serializable data – exclude functions
      partialize: (state) => ({
        shops: state.shops,
        categories: state.categories,
        deliveryLocations: state.deliveryLocations,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
)

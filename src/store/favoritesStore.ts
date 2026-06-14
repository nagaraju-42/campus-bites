import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

interface FavoritesState {
  favoriteShopIds: string[]
  isLoading: boolean
  fetchFavorites: (studentId: string) => Promise<void>
  toggleFavorite: (studentId: string, shopId: string) => Promise<void>
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteShopIds: [],
  isLoading: false,

  fetchFavorites: async (studentId: string) => {
    set({ isLoading: true })
    const supabase = createClient()
    const { data, error } = await supabase
      .from('favorite_shops')
      .select('shop_id')
      .eq('student_id', studentId)

    if (!error && data) {
      set({ favoriteShopIds: data.map((f: any) => f.shop_id), isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },

  toggleFavorite: async (studentId: string, shopId: string) => {
    const { favoriteShopIds } = get()
    const isFav = favoriteShopIds.includes(shopId)
    const supabase = createClient()

    // Optimistic update
    set({
      favoriteShopIds: isFav 
        ? favoriteShopIds.filter(id => id !== shopId)
        : [...favoriteShopIds, shopId]
    })

    if (isFav) {
      // Remove
      await supabase
        .from('favorite_shops')
        .delete()
        .eq('student_id', studentId)
        .eq('shop_id', shopId)
    } else {
      // Add
      await supabase
        .from('favorite_shops')
        .insert({ student_id: studentId, shop_id: shopId })
    }
  }
}))

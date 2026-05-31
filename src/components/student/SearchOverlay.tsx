'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, Plus } from 'lucide-react'
import { searchMenuItems } from '@/lib/supabase/queries/menu'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const TRENDING = ['Maggi', 'Cold Coffee', 'Biryani', 'Samosa', 'Burger']

export default function SearchOverlay({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { setCart, addItem } = useCartStore()

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([])
        return
      }
      setIsSearching(true)
      try {
        const data = await searchMenuItems(query.trim())
        setResults(data)
      } catch (err) {
        console.error("Failed to search", err)
      } finally {
        setIsSearching(false)
      }
    }

    const delayDebounce = setTimeout(() => {
      fetchResults()
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [query])

  const handleAddToCart = (item: any) => {
    // Basic multi-shop cart handling (same logic as ShopMenu)
    const state = useCartStore.getState()
    if (state.shopId && state.shopId !== item.shop_id) {
      if (confirm('Adding items from a different shop will clear your current cart. Continue?')) {
        setCart(item.shop_id, [])
        addItem({
          id: item.id,
          shopId: item.shop_id,
          shopName: item.shops.name,
          name: item.name,
          price: item.price,
          quantity: 1
        })
        toast.success(`Added ${item.name} to cart!`)
      }
    } else {
      if (!state.shopId) {
        setCart(item.shop_id, [])
      }
      addItem({
        id: item.id,
        shopId: item.shop_id,
        shopName: item.shops.name,
        name: item.name,
        price: item.price,
        quantity: 1
      })
      toast.success(`Added ${item.name} to cart!`)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 bg-white z-[100] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-100 shadow-sm bg-white sticky top-0 z-10">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600">
              <ArrowLeft size={24} />
            </button>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for 'Maggi' or 'Cold Coffee'..."
                className="w-full bg-gray-100 text-gray-900 placeholder-gray-500 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#EAB308] transition font-medium"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {!query ? (
              <div>
                <h3 className="text-gray-900 font-display font-bold mb-4 flex items-center gap-2">
                  <Search size={18} className="text-[#EAB308]" /> Trending Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {TRENDING.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="bg-white border border-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl shadow-sm active:scale-95 transition"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : isSearching ? (
              <div className="flex justify-center pt-20">
                <div className="w-8 h-8 border-4 border-[#EAB308] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                {results.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900">{item.name}</h4>
                      <p className="text-sm font-bold text-green-600">{formatCurrency(item.price)}</p>
                      <p className="text-xs text-gray-400 mt-1 font-medium bg-gray-50 inline-block px-2 py-0.5 rounded-md">
                        {item.shops.name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center font-bold active:scale-95 transition hover:bg-green-100"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center pt-20 text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-medium text-lg text-gray-600">No items found</p>
                <p className="text-sm">Try searching for something else.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

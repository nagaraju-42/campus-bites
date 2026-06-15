'use client'

import React, { useEffect, useState } from 'react'
import { X, Search, Check, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { adminImportMenuItems } from '@/app/actions/adminMenu'

interface ImportMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetShopId: string;
  onImportSuccess: () => void;
}

export function ImportMenuModal({ isOpen, onClose, targetShopId, onImportSuccess }: ImportMenuModalProps) {
  const [shops, setShops] = useState<any[]>([])
  const [selectedShopId, setSelectedShopId] = useState<string>('')
  
  const [sourceItems, setSourceItems] = useState<any[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  
  const [isLoadingShops, setIsLoadingShops] = useState(false)
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadShops()
      setSelectedShopId('')
      setSourceItems([])
      setSelectedItemIds(new Set())
      setSearch('')
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedShopId) {
      loadSourceItems(selectedShopId)
    } else {
      setSourceItems([])
    }
  }, [selectedShopId])

  const loadShops = async () => {
    setIsLoadingShops(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('shops')
      .select('id, name')
      .neq('id', targetShopId)
      .order('name')
    
    if (data) setShops(data)
    setIsLoadingShops(false)
  }

  const loadSourceItems = async (shopId: string) => {
    setIsLoadingItems(true)
    setSelectedItemIds(new Set())
    const supabase = createClient()
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_archived', false)
      .order('name')
      
    if (data) setSourceItems(data)
    setIsLoadingItems(false)
  }

  const toggleItem = (id: string) => {
    const newSet = new Set(selectedItemIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedItemIds(newSet)
  }

  const toggleAll = () => {
    if (selectedItemIds.size === filteredItems.length) {
      setSelectedItemIds(new Set())
    } else {
      setSelectedItemIds(new Set(filteredItems.map(i => i.id)))
    }
  }

  const handleImport = async () => {
    if (selectedItemIds.size === 0) return;
    
    setIsImporting(true)
    try {
      await adminImportMenuItems(targetShopId, Array.from(selectedItemIds))
      toast.success(`Successfully imported ${selectedItemIds.size} items!`)
      onImportSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      toast.error('Failed to import items')
    }
    setIsImporting(false)
  }

  if (!isOpen) return null;

  const filteredItems = sourceItems.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1E293B] border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Copy size={20} className="text-orange-500" />
              Import Menu Items
            </h2>
            <p className="text-slate-400 text-sm mt-1">Copy existing items from another shop to save time.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
          
          {/* Shop Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">1. Select Source Shop</label>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500"
              disabled={isLoadingShops}
            >
              <option value="">-- Choose a Shop --</option>
              {shops.map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </select>
          </div>

          {/* Items Selector */}
          {selectedShopId && (
            <div className="flex-1 flex flex-col min-h-[300px]">
              <div className="flex justify-between items-end mb-3">
                <label className="block text-sm font-medium text-slate-300">2. Select Items to Import</label>
                <div className="relative w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text"
                    placeholder="Search source items..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>
              </div>

              {isLoadingItems ? (
                <div className="flex-1 flex items-center justify-center text-slate-500">Loading items...</div>
              ) : sourceItems.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                  This shop has no active menu items.
                </div>
              ) : (
                <div className="flex-1 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
                  {/* Table Header */}
                  <div className="bg-slate-800 grid grid-cols-[40px_1fr_100px] gap-4 p-3 border-b border-slate-700 items-center">
                    <button onClick={toggleAll} className="w-5 h-5 rounded border border-slate-600 flex items-center justify-center hover:border-orange-500 transition ml-1">
                      {selectedItemIds.size > 0 && selectedItemIds.size === filteredItems.length && <Check size={14} className="text-orange-500" />}
                    </button>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Item Name</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Price</span>
                  </div>
                  
                  {/* Table Body */}
                  <div className="flex-1 overflow-y-auto max-h-[350px]">
                    {filteredItems.map(item => (
                      <div 
                        key={item.id} 
                        className={`grid grid-cols-[40px_1fr_100px] gap-4 p-3 border-b border-slate-700/50 items-center cursor-pointer hover:bg-slate-800/50 transition ${selectedItemIds.has(item.id) ? 'bg-orange-500/10' : ''}`}
                        onClick={() => toggleItem(item.id)}
                      >
                        <div className="w-5 h-5 rounded border flex items-center justify-center ml-1 transition-colors border-slate-600">
                          {selectedItemIds.has(item.id) && <Check size={14} className="text-orange-500" />}
                        </div>
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-slate-800" />
                          )}
                          <span className="text-sm text-white font-medium">{item.name}</span>
                        </div>
                        <span className="text-sm text-slate-300 text-right">₹{item.price}</span>
                      </div>
                    ))}
                    {filteredItems.length === 0 && (
                      <div className="p-8 text-center text-slate-500">No items match your search.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <div className="text-sm text-slate-400">
            {selectedItemIds.size} item(s) selected
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition"
              disabled={isImporting}
            >
              Cancel
            </button>
            <button 
              onClick={handleImport}
              disabled={isImporting || selectedItemIds.size === 0}
              className="bg-orange-500 hover:bg-orange-400 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isImporting ? 'Importing...' : 'Import Selected Items'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

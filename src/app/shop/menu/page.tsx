'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { getAllMenuItemsByShop, addMenuItem } from '@/lib/supabase/queries/menu'
import { MenuItem } from '@/types'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import ImageUploadWebP from '@/components/shared/ImageUploadWebP'

export default function ShopMenuPage() {
  const { shopId } = useShopOrdersStore()
  const [items, setItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Mains',
    image_url: '',
    variants: [] as { name: string, price: number, is_available?: boolean }[]
  })
  const [debugError, setDebugError] = useState<string | null>(null)

  useEffect(() => {
    if (!shopId) return
    async function load() {
      try {
        const data = await getAllMenuItemsByShop(shopId!)
        setItems(data)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [shopId])

  const toggleAvailability = async (id: string, current: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !current })
        .eq('id', id)
      
      if (error) throw error
      setItems(items.map(item => item.id === id ? { ...item, is_available: !current } : item))
      toast.success(current ? 'Item marked Sold Out' : 'Item marked Available')
    } catch (err) {
      toast.error('Failed to update item status')
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('menu_items').update({ 
        is_archived: true, 
        is_available: false 
      }).eq('id', id)
      
      if (error) throw error
      setItems(items.filter(i => i.id !== id))
      toast.success('Item deleted')
    } catch (err) {
      toast.error('Failed to delete item')
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopId) {
      toast.error('Cannot add item: No shop ID found. Are you logged in correctly?')
      return
    }
    setIsSubmitting(true)
    try {
      const newItem = await addMenuItem({
        shop_id: shopId,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        image_url: formData.image_url || null,
        is_available: true,
        variants: formData.variants.length > 0 ? formData.variants : null
      })
      
      setItems([newItem, ...items])
      setIsModalOpen(false)
      setFormData({ name: '', description: '', price: '', category: 'Mains', image_url: '', variants: [] })
      setDebugError(null)
      toast.success('Item added to menu!')
    } catch (err: any) {
      console.error("ADD ITEM ERROR:", err)
      setDebugError(err.message || JSON.stringify(err))
      toast.error('Failed to add item. Check red error text.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-500 font-medium text-sm">Add, edit, or remove items from your menu</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Add New Item
        </button>
      </div>

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-900">Add New Menu Item</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            {debugError && (
              <div className="p-3 mx-5 mt-2 bg-red-100 text-red-800 text-xs font-mono rounded-lg break-words">
                ERROR: {debugError}
              </div>
            )}
            <form onSubmit={handleAddItem} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="mb-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Item Image</label>
                <ImageUploadWebP 
                  bucket="campus_assets" 
                  folderPath={`menus/${shopId}`}
                  currentImage={formData.image_url}
                  onUploadSuccess={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Item Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" placeholder="e.g. Chicken Biryani" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Price (₹)</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" placeholder="150" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white">
                    <option value="Starters">Starters</option>
                    <option value="Mains">Mains</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Variants (Optional)</label>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, variants: [...prev.variants, { name: '', price: 0, is_available: true }] }))} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Plus size={12} /> Add Size/Quantity
                  </button>
                </div>
                {formData.variants.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {formData.variants.map((v, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" placeholder="e.g. 250ml" value={v.name} onChange={e => {
                          const newV = [...formData.variants]
                          newV[i].name = e.target.value
                          setFormData({ ...formData, variants: newV })
                        }} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white" />
                        <input type="number" placeholder="Price" value={v.price || ''} onChange={e => {
                          const newV = [...formData.variants]
                          newV[i].price = parseFloat(e.target.value) || 0
                          setFormData({ ...formData, variants: newV })
                        }} className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white" />
                        <button type="button" onClick={() => {
                          const newV = [...formData.variants]
                          newV[i].is_available = !newV[i].is_available
                          setFormData({ ...formData, variants: newV })
                        }} className={`px-2 py-1.5 text-xs font-bold rounded-lg border ${v.is_available === false ? 'bg-red-50 text-red-500 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                          {v.is_available === false ? 'Out' : 'In'}
                        </button>
                        <button type="button" onClick={() => {
                          const newV = formData.variants.filter((_, idx) => idx !== i)
                          setFormData({ ...formData, variants: newV })
                        }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 font-medium leading-tight">If variants are added, the Base Price is still required for sorting but users will choose a variant to add to cart.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" placeholder="Brief description of the item..." rows={3}></textarea>
              </div>
              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-[#2563EB] text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Loading menu...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No items found. Add your first item!</td></tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 relative">
                          {item.image_url ? (
                            <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="40px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No img</div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-400 line-clamp-1 max-w-[200px]">{item.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{item.category}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {item.variants && item.variants.length > 0 ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 font-medium">Starts from</span>
                          {formatCurrency(Math.min(...item.variants.map(v => v.price)))}
                        </div>
                      ) : (
                        formatCurrency(item.price)
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleAvailability(item.id, item.is_available)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                          item.is_available ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {item.is_available ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {item.is_available ? 'Available' : 'Sold Out'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => deleteItem(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

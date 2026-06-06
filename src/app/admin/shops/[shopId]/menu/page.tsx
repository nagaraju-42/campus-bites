'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Search, Edit2, Trash2, ArrowLeft, Image as ImageIcon, Save, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const ImageSizeBadge = ({ url }: { url?: string }) => {
  const [size, setSize] = useState<string | null>(null);
  
  useEffect(() => {
    if (!url || !url.startsWith('http')) return setSize(null);
    fetch(`/api/image-size?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(data => {
        if (data.bytes) {
          const kb = (data.bytes / 1024).toFixed(1);
          setSize(`${kb} KB`);
        } else {
          setSize('Unknown');
        }
      })
      .catch(() => setSize('Error'));
  }, [url]);

  if (!size) return null;
  return <span className="ml-2 text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{size}</span>;
}

export default function AdminShopMenuPage() {
  const { shopId } = useParams()
  const router = useRouter()
  
  const [shopName, setShopName] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      const { data: shop } = await supabase.from('shops').select('name').eq('id', shopId).single()
      if (shop) setShopName(shop.name)

      const { data: catData } = await supabase.from('app_categories').select('*')
      if (catData) setCategories(catData)

      const { data: itemsData } = await supabase.from('menu_items').select('*').eq('shop_id', shopId).order('name')
      if (itemsData) setItems(itemsData)

      setIsLoading(false)
    }
    loadData()
  }, [shopId])

  const handleSaveEdit = async () => {
    if (!editForm.id) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('menu_items').update({
        name: editForm.name,
        description: editForm.description,
        price: editForm.price,
        is_veg: editForm.is_veg,
        is_available: editForm.is_available,
        category_id: editForm.category_id || null,
        image_url: editForm.image_url
      }).eq('id', editForm.id)

      if (error) throw error

      setItems(items.map(item => item.id === editForm.id ? { ...item, ...editForm } : item))
      setIsEditing(null)
      toast.success('Item updated successfully')
    } catch (err) {
      toast.error('Failed to update item')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      const supabase = createClient()
      await supabase.from('menu_items').delete().eq('id', id)
      setItems(items.filter(item => item.id !== id))
      toast.success('Item deleted')
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const handleCreateNew = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('menu_items').insert({
        shop_id: shopId,
        name: 'New Item',
        price: 0,
        category: 'Uncategorized',
        is_veg: true,
        is_available: false,
      }).select().single()

      if (error) throw error
      setItems([data, ...items])
      setEditForm(data)
      setIsEditing(data.id)
    } catch (err: any) {
      console.error("Create Item Error:", err);
      toast.error(err.message || 'Failed to create new item')
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'all' || item.category_id === activeCategory
    return matchesSearch && matchesCategory
  })

  if (isLoading) return <div className="p-10 font-bold text-white">Loading Menu...</div>

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Manage Menu</h1>
            <p className="text-slate-400 text-sm">Shop: <span className="text-orange-400 font-bold">{shopName}</span></p>
          </div>
        </div>
        <button 
          onClick={handleCreateNew}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-4 shadow-xl mb-6 flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-orange-500 text-sm"
          />
        </div>
        <select 
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-orange-500 text-sm min-w-[150px]"
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs font-bold border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 w-16">Image</th>
              <th className="px-4 py-3">Item Details</th>
              <th className="px-4 py-3 w-32">Price</th>
              <th className="px-4 py-3 w-32">Stock</th>
              <th className="px-4 py-3 w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredItems.map(item => isEditing === item.id ? (
              <tr key={item.id} className="bg-slate-800/80">
                <td className="px-4 py-3" colSpan={5}>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs font-bold text-slate-400 mb-1">Name</label>
                      <input 
                        type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white" 
                      />
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <div className="flex items-center mb-1">
                        <label className="block text-xs font-bold text-slate-400">Image URL (WebP)</label>
                        <ImageSizeBadge url={editForm.image_url} />
                      </div>
                      <input 
                        type="text" value={editForm.image_url || ''} onChange={e => setEditForm({...editForm, image_url: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white" 
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 mb-1">Price (₹)</label>
                      <input 
                        type="number" value={editForm.price === '' || isNaN(editForm.price) ? '' : editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white" 
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 mb-1">Category</label>
                      <select 
                        value={editForm.category_id || ''} onChange={e => setEditForm({...editForm, category_id: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white"
                      >
                        <option value="">None</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-6 md:col-span-1 flex flex-col items-start justify-center pt-5 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editForm.is_available} onChange={e => setEditForm({...editForm, is_available: e.target.checked})} className="rounded text-green-500 focus:ring-green-500" />
                        <span className="text-xs font-bold">In Stock</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editForm.is_veg} onChange={e => setEditForm({...editForm, is_veg: e.target.checked})} className="rounded text-green-500 focus:ring-green-500" />
                        <span className="text-xs font-bold">Pure Veg</span>
                      </label>
                    </div>
                    <div className="col-span-6 md:col-span-1 flex flex-col justify-end gap-2 pb-0.5">
                      <button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded font-bold text-xs flex items-center justify-center gap-1">
                        <Save size={14} /> Save
                      </button>
                      <button onClick={() => setIsEditing(null)} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded font-bold text-xs flex items-center justify-center">
                        Cancel
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={item.id} className="hover:bg-slate-800/30 transition">
                <td className="px-4 py-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-slate-500" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${item.is_veg ? 'border-green-500' : 'border-red-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </span>
                    <span className="font-bold text-white text-base">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                      {categories.find(c => c.id === item.category_id)?.name || 'Uncategorized'}
                    </span>
                    <ImageSizeBadge url={item.image_url} />
                  </div>
                </td>
                <td className="px-4 py-3 font-mono font-bold text-white text-base">
                  ₹{item.price}
                </td>
                <td className="px-4 py-3">
                  <button 
                    onClick={async () => {
                      const supabase = createClient()
                      const newStatus = !item.is_available
                      await supabase.from('menu_items').update({ is_available: newStatus }).eq('id', item.id)
                      setItems(items.map(i => i.id === item.id ? { ...i, is_available: newStatus } : i))
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                      item.is_available ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                    }`}
                  >
                    {item.is_available ? 'In Stock' : 'Out of Stock'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => { setEditForm(item); setIsEditing(item.id); }} className="text-slate-400 hover:text-blue-400 p-2 bg-slate-800 rounded-lg transition" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-400 p-2 bg-slate-800 rounded-lg transition" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && !isEditing && (
          <div className="text-center py-10 text-slate-500">
            No items found. Click "Add Item" to create one.
          </div>
        )}
      </div>
    </div>
  )
}

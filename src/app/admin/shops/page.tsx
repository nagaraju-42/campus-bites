'use client'

import { useEffect, useState } from 'react'
import { Store, ShieldCheck, ShieldAlert, Power, Edit2, X, Eye, Trash2, Menu } from 'lucide-react'
import { getAllShops, updateShopApproval, updateShopDetails, softDeleteShop } from '@/lib/supabase/queries/admin'
import { useAuthStore } from '@/store/authStore'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ImageUploadWebP from '@/components/shared/ImageUploadWebP'

export default function AdminShopsPage() {
  const [shops, setShops] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingShop, setEditingShop] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ name: '', address: '', description: '', cover_image: '' })
  
  const router = useRouter()
  const { user, setAdminUser, setUser } = useAuthStore()
  const { setShopId } = useShopOrdersStore()

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllShops()
        setShops(data)
      } catch (err) {
        console.error("Failed to load shops", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleToggleStatus = async (shopId: string, currentStatus: boolean) => {
    try {
      await updateShopApproval(shopId, !currentStatus)
      setShops(shops.map(s => s.id === shopId ? { ...s, is_open: !currentStatus } : s))
      toast.success(currentStatus ? 'Shop suspended/closed.' : 'Shop activated!')
    } catch (err) {
      toast.error('Failed to update shop status.')
    }
  }

  const handleEditClick = (shop: any) => {
    setEditingShop(shop)
    setEditForm({ name: shop.name, address: shop.address || '', description: shop.description || '', cover_image: shop.cover_image || '' })
  }

  const handleSaveEdit = async () => {
    if (!editingShop) return
    try {
      await updateShopDetails(editingShop.id, editForm)
      setShops(shops.map(s => s.id === editingShop.id ? { ...s, name: editForm.name, address: editForm.address, description: editForm.description, cover_image: editForm.cover_image } : s))
      toast.success('Shop details updated!')
      setEditingShop(null)
    } catch (err) {
      toast.error('Failed to update shop details.')
    }
  }

  const handleDeleteShop = async (shopId: string) => {
    if (!window.confirm("Are you sure you want to delete this shop? This action hides it from all users.")) return
    try {
      await softDeleteShop(shopId)
      setShops(shops.filter(s => s.id !== shopId))
      toast.success('Shop deleted successfully.')
    } catch (err) {
      toast.error('Failed to delete shop.')
    }
  }

  const handleImpersonate = (shop: any) => {
    if (!user) return
    setAdminUser(user) // Save the admin session
    setUser({ id: shop.owner_id, role: 'shop_owner', email: shop.name + '@shop.com', full_name: shop.name, phone: null, avatar_url: null })
    setShopId(shop.id)
    toast.success(`Impersonating ${shop.name}`)
    router.push('/shop/dashboard')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">Restaurant Partners</h1>
          <p className="text-slate-400 mt-1">Approve or suspend platform restaurants</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 p-10 text-center text-slate-500">Loading shops...</div>
        ) : shops.length === 0 ? (
          <div className="col-span-3 p-10 text-center text-slate-500">No restaurants onboarded yet.</div>
        ) : (
          shops.map(shop => (
            <div key={shop.id} className="bg-[#1E293B] rounded-2xl border border-slate-700/50 p-6 flex flex-col shadow-lg relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1 h-full ${shop.is_open ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              
              <div className="flex justify-between items-start mb-4 pl-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                    <Store size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg leading-tight">{shop.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      {shop.is_open ? (
                         <><ShieldCheck size={14} className="text-emerald-500" /> Active on Platform</>
                      ) : (
                         <><ShieldAlert size={14} className="text-red-500" /> Suspended / Offline</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditClick(shop)}
                    className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-lg transition"
                    title="Edit Shop"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                  onClick={() => handleImpersonate(shop)}
                  className="text-slate-400 hover:text-[#2563EB] p-2 bg-slate-800 rounded-lg transition"
                  title="Impersonate Shop"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => router.push(`/admin/shops/${shop.id}/menu`)}
                  className="text-slate-400 hover:text-green-400 p-2 bg-slate-800 rounded-lg transition"
                  title="Manage Menu (Blinkit Style)"
                >
                  <Menu size={16} />
                </button>
                <button
                  onClick={() => handleDeleteShop(shop.id)}
                  className="text-slate-400 hover:text-red-500 p-2 bg-slate-800 rounded-lg transition"
                  title="Delete Shop"
                >
                  <Trash2 size={16} />
                </button>
                </div>
              </div>

              <div className="pl-2 mb-6">
                <p className="text-sm text-slate-300 line-clamp-2 min-h-[40px]">{shop.description || 'No description provided.'}</p>
                <p className="text-xs text-slate-500 mt-2">Address: {shop.address || 'N/A'}</p>
              </div>

              <div className="mt-auto pl-2 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Orders</p>
                  <p className="font-bold text-white font-mono">{shop.order_count?.toLocaleString() || 0}</p>
                </div>
                <button
                  onClick={() => handleToggleStatus(shop.id, shop.is_open)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition shadow-md ${
                    shop.is_open 
                      ? 'bg-slate-800 text-red-400 border border-slate-700 hover:bg-red-500/10 hover:border-red-500/30' 
                      : 'bg-[#F97316] text-white border border-[#F97316] hover:bg-orange-600 shadow-orange-500/20'
                  }`}
                >
                  <Power size={16} />
                  {shop.is_open ? 'Force Close' : 'Approve & Open'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingShop && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative overflow-hidden">
            <button 
              onClick={() => setEditingShop(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Edit Shop: {editingShop.name}</h2>
              <div className="overflow-y-auto max-h-[70vh] mb-4 pr-2">
                <div className="space-y-4">
                  <div className="mb-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Shop Cover Image</label>
                    <ImageUploadWebP 
                      bucket="campus_assets" 
                      folderPath={`shops/${editingShop.id}`}
                      currentImage={editForm.cover_image}
                      onUploadSuccess={(url) => setEditForm(prev => ({ ...prev, cover_image: url }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Keywords)</label>
                    <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" rows={2}></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>
              <button 
                onClick={handleSaveEdit}
                className="w-full bg-[#F97316] text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition"
              >
                Save Changes
              </button>
          </div>
        </div>
      )}
    </div>
  )
}

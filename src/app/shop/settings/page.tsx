'use client'

import { useEffect, useState } from 'react'
import { Save, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { getShopById } from '@/lib/supabase/queries/shops'
import toast from 'react-hot-toast'
import { Shop } from '@/types'

export default function ShopSettingsPage() {
  const { shopId } = useShopOrdersStore()
  const [shop, setShop] = useState<Shop | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/shop/login')
  }

  useEffect(() => {
    if (!shopId) return
    async function load(id: string) {
      const shopData = await getShopById(id)
      setShop(shopData)
    }
    load(shopId)
  }, [shopId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!shop) return
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setShop({ ...shop, [e.target.name]: value })
  }

  const handleSave = async () => {
    if (!shop) return
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('shops')
        .update({
          name: shop.name,
          description: shop.description,
          phone: shop.phone,
          dine_in_enabled: shop.dine_in_enabled,
        })
        .eq('id', shop.id)
      
      if (error) throw error
      toast.success('Settings saved successfully!')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (!shop) return <div className="p-10 text-center">Loading settings...</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Shop Settings</h1>
        <p className="text-gray-500 font-medium text-sm">Update your public profile and configurations</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">Shop Name</label>
          <input
            type="text"
            name="name"
            value={shop.name}
            onChange={handleChange}
            className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-50 text-gray-900 focus:outline-none focus:border-[#2563EB] focus:bg-white shadow-sm transition"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">Description (Visible to students)</label>
          <textarea
            name="description"
            rows={3}
            value={shop.description || ''}
            onChange={handleChange}
            className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-50 text-gray-900 focus:outline-none focus:border-[#2563EB] focus:bg-white shadow-sm transition resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">Shop Phone Number</label>
          <input
            type="tel"
            name="phone"
            value={shop.phone || ''}
            onChange={handleChange}
            placeholder="+91..."
            className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-50 text-gray-900 focus:outline-none focus:border-[#2563EB] focus:bg-white shadow-sm transition"
          />
          <p className="text-xs text-gray-400 mt-1">This number will be visible to students and riders to contact you.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">UPI ID for Payments</label>
          <input
            type="text"
            disabled
            value="shop@upi"
            className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-100 text-gray-500 cursor-not-allowed shadow-sm transition"
          />
          <p className="text-xs text-gray-400 mt-1">Contact admin to change your payout UPI ID.</p>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-gray-100">
          <div>
            <label className="block text-sm font-bold text-gray-900">Enable Dine-In Orders</label>
            <p className="text-xs text-gray-500 mt-1">Allow students to browse menu and order for dine-in.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              name="dine_in_enabled"
              checked={!!shop.dine_in_enabled} 
              onChange={handleChange}
              className="sr-only peer" 
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#2563EB]"></div>
          </label>
        </div>

        <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#2563EB] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-sm disabled:opacity-70 w-full md:w-auto justify-center"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            onClick={handleLogout}
            className="text-red-600 font-bold flex items-center gap-2 hover:bg-red-50 px-4 py-3 rounded-xl transition w-full md:hidden justify-center border border-red-100 bg-white"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

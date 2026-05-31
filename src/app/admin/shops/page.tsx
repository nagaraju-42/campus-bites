'use client'

import { useEffect, useState } from 'react'
import { Store, ShieldCheck, ShieldAlert, Power } from 'lucide-react'
import { getAllShops, updateShopApproval } from '@/lib/supabase/queries/admin'
import toast from 'react-hot-toast'

export default function AdminShopsPage() {
  const [shops, setShops] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
              </div>

              <div className="pl-2 mb-6">
                <p className="text-sm text-slate-300 line-clamp-2 min-h-[40px]">{shop.description || 'No description provided.'}</p>
              </div>

              <div className="mt-auto pl-2 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Orders</p>
                  <p className="font-bold text-white font-mono">1,245</p>
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
    </div>
  )
}

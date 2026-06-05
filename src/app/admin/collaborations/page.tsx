'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Link2, Trash2, Plus, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AdminCollaborationsPage() {
  const [shops, setShops] = useState<any[]>([])
  const [collaborations, setCollaborations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [primaryShopId, setPrimaryShopId] = useState('')
  const [partnerShopId, setPartnerShopId] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const supabase = createClient()
      
      const { data: shopsData } = await supabase.from('shops').select('id, name').order('name')
      if (shopsData) setShops(shopsData)

      const { data: collabsData } = await supabase.from('shop_collaborations')
        .select(`
          id,
          is_active,
          primary:primary_shop_id(id, name),
          partner:partner_shop_id(id, name)
        `)
        .order('created_at', { ascending: false })
      
      if (collabsData) setCollaborations(collabsData)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddCollaboration(e: React.FormEvent) {
    e.preventDefault()
    if (!primaryShopId || !partnerShopId) {
      toast.error('Select both shops')
      return
    }
    if (primaryShopId === partnerShopId) {
      toast.error('A shop cannot collaborate with itself')
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.from('shop_collaborations').insert({
        primary_shop_id: primaryShopId,
        partner_shop_id: partnerShopId,
        is_active: true
      })

      if (error) {
        if (error.code === '23505') toast.error('Collaboration already exists')
        else toast.error(error.message)
        return
      }

      toast.success('Collaboration added successfully')
      setPrimaryShopId('')
      setPartnerShopId('')
      fetchData()
    } catch (err) {
      toast.error('Failed to add collaboration')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this collaboration?')) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('shop_collaborations').delete().eq('id', id)
      if (error) throw error
      toast.success('Collaboration removed')
      fetchData()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('shop_collaborations')
        .update({ is_active: !currentStatus })
        .eq('id', id)
      if (error) throw error
      toast.success(currentStatus ? 'Collaboration disabled' : 'Collaboration enabled')
      fetchData()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  if (isLoading) {
    return <div className="p-8 text-slate-400">Loading...</div>
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto text-slate-100">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/dashboard" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-display font-bold">Cross-Shop Collaborations</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Create Form */}
        <div className="md:col-span-1">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 sticky top-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Link2 size={20} className="text-indigo-400" /> Link Shops
            </h2>
            <form onSubmit={handleAddCollaboration} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Primary Shop</label>
                <select 
                  value={primaryShopId}
                  onChange={(e) => setPrimaryShopId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="">Select Primary Shop...</option>
                  {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Students ordering from this shop...</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Partner Shop (Add-ons)</label>
                <select 
                  value={partnerShopId}
                  onChange={(e) => setPartnerShopId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="">Select Partner Shop...</option>
                  {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">...will see suggested items from this shop.</p>
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Plus size={20} /> Create Link
              </button>
            </form>
          </div>
        </div>

        {/* List View */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold mb-4">Active Collaborations</h2>
          
          {collaborations.length === 0 ? (
            <div className="text-center p-8 bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed">
              <p className="text-slate-400">No collaborations found.</p>
            </div>
          ) : (
            collaborations.map(collab => (
              <motion.div 
                key={collab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-slate-800 rounded-2xl p-5 border flex items-center justify-between ${collab.is_active ? 'border-slate-700' : 'border-slate-700/50 opacity-60'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-slate-200">{collab.primary?.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Primary</span>
                  </div>
                  <div className="px-3">
                    <div className="h-0.5 w-8 bg-slate-600 relative">
                      <div className="absolute right-0 -top-1.5 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[7px] border-l-slate-600"></div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-indigo-400">{collab.partner?.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Add-ons</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleActive(collab.id, collab.is_active)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition ${collab.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'}`}
                  >
                    {collab.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button 
                    onClick={() => handleDelete(collab.id)}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

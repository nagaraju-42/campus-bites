'use client'

import { useEffect, useState } from 'react'
import { Tag, Plus, Edit2, Trash2, Power } from 'lucide-react'
import { getAllPromotions, createPromotion, updatePromotion, deletePromotion } from '@/lib/supabase/queries/admin'
import { Promotion } from '@/types'
import toast from 'react-hot-toast'

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  
  const [form, setForm] = useState({
    code: '',
    discount_percent: 0,
    is_active: true,
    banner_text: ''
  })

  useEffect(() => {
    loadPromotions()
  }, [])

  async function loadPromotions() {
    try {
      const data = await getAllPromotions()
      setPromotions(data)
    } catch (err) {
      toast.error('Failed to load promotions')
    } finally {
      setIsLoading(false)
    }
  }

  const openNewModal = () => {
    setEditingPromo(null)
    setForm({ code: '', discount_percent: 10, is_active: true, banner_text: '' })
    setIsModalOpen(true)
  }

  const openEditModal = (promo: Promotion) => {
    setEditingPromo(promo)
    setForm({
      code: promo.code,
      discount_percent: promo.discount_percent,
      is_active: promo.is_active,
      banner_text: promo.banner_text || ''
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.code) {
      toast.error('Code is required')
      return
    }
    try {
      if (editingPromo) {
        await updatePromotion(editingPromo.id, form)
        toast.success('Promotion updated')
      } else {
        await createPromotion(form)
        toast.success('Promotion created')
      }
      setIsModalOpen(false)
      loadPromotions()
    } catch (err) {
      toast.error('Failed to save promotion')
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await updatePromotion(id, { is_active: !current })
      toast.success(current ? 'Deactivated' : 'Activated')
      loadPromotions()
    } catch (err) {
      toast.error('Failed to toggle status')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return
    try {
      await deletePromotion(id)
      toast.success('Promotion deleted')
      loadPromotions()
    } catch (err) {
      toast.error('Failed to delete promotion')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">Promotions</h1>
          <p className="text-slate-400 mt-1">Manage discount codes and banners</p>
        </div>
        <button 
          onClick={openNewModal}
          className="flex items-center gap-2 bg-[#F97316] text-white px-4 py-2 rounded-xl text-sm font-bold border border-orange-500 hover:bg-orange-600 transition"
        >
          <Plus size={16} /> New Promotion
        </button>
      </div>

      {isLoading ? (
        <div className="p-10 text-slate-400">Loading...</div>
      ) : promotions.length === 0 ? (
        <div className="p-10 text-slate-500 bg-[#1E293B] rounded-2xl border border-slate-700/50 text-center">
          No promotions created yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map(promo => (
            <div key={promo.id} className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700/50 shadow-lg relative group overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${promo.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div className="flex justify-between items-start pl-2 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                    <Tag size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white font-mono">{promo.code}</h3>
                    <p className={`text-xs font-bold ${promo.is_active ? 'text-emerald-500' : 'text-red-500'}`}>
                      {promo.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(promo)} className="text-slate-400 hover:text-white" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(promo.id)} className="text-slate-400 hover:text-red-400" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="pl-2 space-y-2">
                <p className="text-3xl font-bold text-[#F97316]">{promo.discount_percent}% OFF</p>
                {promo.banner_text && (
                  <p className="text-sm text-slate-400 italic">"{promo.banner_text}"</p>
                )}
              </div>
              <div className="pl-2 mt-6 pt-4 border-t border-slate-700/50">
                <button
                  onClick={() => handleToggle(promo.id, promo.is_active)}
                  className={`w-full flex justify-center items-center gap-2 py-2 rounded-lg text-sm font-bold transition ${
                    promo.is_active 
                      ? 'bg-slate-800 text-red-400 hover:bg-slate-700' 
                      : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                  }`}
                >
                  <Power size={16} /> {promo.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl p-6 w-full max-w-md relative">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingPromo ? 'Edit Promotion' : 'New Promotion'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Coupon Code</label>
                <input 
                  type="text"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. WELCOME10"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Discount Percent (%)</label>
                <input 
                  type="number"
                  min="0"
                  max="100"
                  value={form.discount_percent}
                  onChange={e => setForm({ ...form, discount_percent: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Banner Text (Optional)</label>
                <input 
                  type="text"
                  value={form.banner_text}
                  onChange={e => setForm({ ...form, banner_text: e.target.value })}
                  placeholder="e.g. Get 10% off your first order!"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="isActive"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 bg-slate-800 border-slate-700 rounded text-[#F97316] focus:ring-[#F97316]"
                />
                <label htmlFor="isActive" className="text-sm text-slate-300">Active Immediately</label>
              </div>
              <div className="flex gap-4 mt-6">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-[#F97316] text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

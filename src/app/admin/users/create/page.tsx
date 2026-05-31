'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function AdminCreateUserPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'student',
    shopName: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Create a temporary Supabase client that does NOT persist the session.
      // This prevents the Admin from being instantly logged out when creating a new user!
      const { createClient } = await import('@supabase/supabase-js')
      const tempSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
      
      // 1. Create the Auth User and pass metadata for the trigger to use
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role // Passing this explicitly to the DB trigger
          }
        }
      })
      
      if (authError) throw authError
      if (!authData.user) throw new Error("Failed to create user")

      // 2. Automatically create the Shop if role is shop_owner
      if (formData.role === 'shop_owner' && formData.shopName) {
        // We must use the regular supabase client because it has the Admin session,
        // which grants permission to insert into shops.
        const supabase = createClient()
        const { error: shopError } = await supabase.from('shops').insert({
          owner_id: authData.user.id,
          name: formData.shopName,
          description: 'A new CampusBites restaurant',
          is_open: true,
          address: 'Campus Food Court'
        })
        
        if (shopError) throw new Error("User created, but shop creation failed: " + shopError.message)
      }

      toast.success(`User ${formData.fullName} created as ${formData.role}!`)
      router.push('/admin/users')
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6"
      >
        <ArrowLeft size={18} /> Back to Users
      </button>

      <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 shadow-lg p-8">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-700/50 pb-6">
          <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-[#F97316]">
            <UserPlus size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Create New User</h1>
            <p className="text-slate-400 text-sm mt-1">Add a new Student, Shop Owner, or Rider to the platform.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] transition"
                placeholder="John Doe"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assign Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-[#0F172A] border border-slate-700 text-white focus:outline-none focus:border-[#F97316] transition font-bold"
              >
                <option value="student">Student</option>
                <option value="shop_owner">Shop Owner</option>
                <option value="rider">Rider</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {formData.role === 'shop_owner' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-[#F97316]">Restaurant / Shop Name</label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={e => setFormData({...formData, shopName: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-[#F97316]/5 border border-[#F97316]/30 text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] transition"
                placeholder="e.g. Spicy Hub"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] transition"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Initial Password</label>
            <input
              type="text"
              required
              minLength={6}
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] transition font-mono"
              placeholder="Min 6 characters"
            />
            <p className="text-xs text-slate-500 mt-2">The user can change this later.</p>
          </div>

          <div className="pt-6 border-t border-slate-700/50">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#F97316] text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-70"
            >
              {isLoading ? 'Provisioning Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart, Store, Users, Banknote, LogOut, Tag, MessageSquare, Link2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Overview', Icon: BarChart },
  { href: '/admin/orders', label: 'God Mode Orders', Icon: Store },
  { href: '/admin/shops', label: 'Shops & Partners', Icon: Store },
  { href: '/admin/collaborations', label: 'Collaborations', Icon: Link2 },
  { href: '/admin/users', label: 'User Management', Icon: Users },
  { href: '/admin/promotions', label: 'Promotions', Icon: Tag },
  { href: '/admin/payouts', label: 'Financials', Icon: Banknote },
  { href: '/admin/settings', label: 'Settings', Icon: Store },
  { href: '/admin/support', label: 'Support Inbox', Icon: MessageSquare },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuthStore()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  return (
    <div className="h-full flex flex-col pt-6 pb-4 bg-[#0F172A]">
      <div className="px-6 mb-8">
        <h1 className="text-2xl font-display font-bold text-white tracking-wide">
          TapNosh<span className="text-[#F97316]">Admin</span>
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">God Mode</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-bold text-sm ${
                isActive
                  ? 'bg-[#1E293B] text-white'
                  : 'text-slate-400 hover:bg-[#1E293B]/50 hover:text-white'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-[#F97316]' : 'text-slate-500'} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 mt-auto">
        <div className="bg-[#1E293B] p-4 rounded-xl mb-4 border border-slate-700/50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Logged In As</p>
          <p className="text-sm font-bold text-white truncate">{user?.full_name}</p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-bold text-sm transition"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  )
}

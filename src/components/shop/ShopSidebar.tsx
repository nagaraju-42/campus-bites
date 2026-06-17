'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Monitor, Utensils, Settings, LogOut, Banknote, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/shop/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/shop/orders', label: 'Orders', Icon: ClipboardList },
  { href: '/shop/kds', label: 'Kitchen (KDS)', Icon: Monitor },
  { href: '/shop/menu', label: 'Menu', Icon: Utensils },
  { href: '/shop/settlements', label: 'Settlements', Icon: Banknote },
  { href: '/shop/reports', label: 'End of Day Report', Icon: FileText },
  { href: '/shop/settings', label: 'Settings', Icon: Settings },
]

export default function ShopSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/shop/login')
  }

  return (
    <div className="flex-1 w-full bg-white flex flex-col z-40">
      <div className="p-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">
          Campus<span className="text-[#2563EB]">Shop</span>
        </h1>
        <p className="text-xs text-gray-400 font-medium mt-1">Partner Portal</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                isActive
                  ? 'bg-[#2563EB] text-white shadow-md shadow-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
